from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict, Any, Optional
from collections import defaultdict
from app.schemas.customer import NearbyCustomerResponse, CustomerResponse, MeterSchema
from app.services.maps_service import haversine_distance

class CustomerService:

    @staticmethod
    async def get_nearby_customers(
        db: AsyncIOMotorDatabase,
        latitude: float,
        longitude: float,
        radius_meters: float = 5000.0,
        status_filter: Optional[str] = None,
        officer_id: Optional[str] = None,
        limit: int = 15,
    ) -> List[NearbyCustomerResponse]:
        query: Dict[str, Any] = {}
        if status_filter:
            query["status"] = status_filter
        else:
            # By default exclude fully paid customers for field officer collections
            query["status"] = {"$ne": "paid"}

        if officer_id:
            query["$or"] = [
                {"assigned_officer_id": officer_id},
                {"uploaded_by_officer_id": officer_id}
            ]

        # Projection to avoid pulling massive unused fields across remote Atlas connection
        customer_projection = {
            "name": 1,
            "customer_id": 1,
            "meter_number": 1,
            "phone": 1,
            "email": 1,
            "address": 1,
            "area": 1,
            "latitude": 1,
            "longitude": 1,
            "dtc_code": 1,
            "disconnection_status": 1,
            "pending_amount": 1,
            "due_date": 1,
            "pending_days": 1,
            "pending days": 1,
            "days": 1,
            "status": 1,
            "priority": 1,
            "assigned_officer_id": 1,
            "uploaded_by_officer_id": 1,
            "created_at": 1,
            "updated_at": 1,
        }

        # Fetch candidate customers with projection
        customers = await db.customers.find(query, customer_projection).to_list(1000)
        if not customers:
            return []

        # Step 1: Calculate candidate distances in memory FIRST
        candidates_with_dist = []
        for cus in customers:
            c_lat = float(cus.get("latitude", 0.0))
            c_lng = float(cus.get("longitude", 0.0))
            # If coordinates are 0, skip for nearby calculation
            if c_lat == 0.0 or c_lng == 0.0:
                continue

            dist = haversine_distance(latitude, longitude, c_lat, c_lng)
            if dist <= radius_meters:
                candidates_with_dist.append((dist, cus, c_lat, c_lng))

        # Sort by distance primarily and take top matching candidates
        candidates_with_dist.sort(key=lambda x: x[0])
        top_candidates = candidates_with_dist[:limit]

        if not top_candidates:
            return []

        # Step 2: Batch fetch meters ONLY for the top candidate customers (instead of all 1,000)
        top_customer_ids = [cus.get("customer_id") for _, cus, _, _ in top_candidates if cus.get("customer_id")]
        meter_projection = {
            "meter_id": 1,
            "meter_number": 1,
            "customer_id": 1,
            "latitude": 1,
            "longitude": 1,
            "assigned_officer_id": 1,
            "uploaded_by_officer_id": 1,
        }
        all_meters_docs = await db.meters.find(
            {"customer_id": {"$in": top_customer_ids}},
            meter_projection
        ).to_list(100)

        # Step 3: Collect only officer IDs relevant to these top candidates
        relevant_officer_ids = set()
        for _, cus, _, _ in top_candidates:
            if cus.get("assigned_officer_id"):
                relevant_officer_ids.add(cus.get("assigned_officer_id"))
            if cus.get("uploaded_by_officer_id"):
                relevant_officer_ids.add(cus.get("uploaded_by_officer_id"))
        for m in all_meters_docs:
            if m.get("assigned_officer_id"):
                relevant_officer_ids.add(m.get("assigned_officer_id"))
            if m.get("uploaded_by_officer_id"):
                relevant_officer_ids.add(m.get("uploaded_by_officer_id"))

        officer_names_map = {}
        if relevant_officer_ids:
            officers_docs = await db.officers.find(
                {"officer_id": {"$in": list(relevant_officer_ids)}},
                {"officer_id": 1, "full_name": 1}
            ).to_list(50)
            officer_names_map = {o.get("officer_id"): o.get("full_name") for o in officers_docs if o.get("officer_id")}

        meters_by_customer = defaultdict(list)
        for m in all_meters_docs:
            cid = m.get("customer_id")
            m_off_id = m.get("assigned_officer_id")
            if cid:
                meters_by_customer[cid].append(
                    MeterSchema(
                        meter_id=m.get("meter_id", ""),
                        meter_number=m.get("meter_number", ""),
                        customer_id=m.get("customer_id", ""),
                        latitude=float(m.get("latitude", 0.0)),
                        longitude=float(m.get("longitude", 0.0)),
                        assigned_officer_id=m_off_id,
                        assigned_officer_name=officer_names_map.get(m_off_id) if m_off_id else None,
                        uploaded_by_officer_id=m.get("uploaded_by_officer_id")
                    )
                )

        nearby_list = []
        for dist, cus, c_lat, c_lng in top_candidates:
            cid = cus.get("customer_id")
            meters = meters_by_customer.get(cid, [])
            dur_mins = round((dist * 1.35 / 6.94) / 60.0, 1)
            officer_name = officer_names_map.get(cus.get("assigned_officer_id"))

            nearby_item = NearbyCustomerResponse(
                id=str(cus.get("_id")),
                customer_id=cid,
                name=cus.get("name"),
                meter_number=cus.get("meter_number", ""),
                phone=cus.get("phone", ""),
                email=cus.get("email"),
                address=cus.get("address", ""),
                area=cus.get("area", ""),
                latitude=c_lat,
                longitude=c_lng,
                dtc_code=cus.get("dtc_code"),
                disconnection_status=cus.get("disconnection_status"),
                pending_amount=float(cus.get("pending_amount", 0.0)),
                due_date=cus.get("due_date"),
                pending_days=cus.get("pending_days") if cus.get("pending_days") is not None else (cus.get("pending days") if cus.get("pending days") is not None else cus.get("days")),
                status=cus.get("status", "pending"),
                priority=cus.get("priority", "normal"),
                assigned_officer_id=cus.get("assigned_officer_id"),
                assigned_officer_name=officer_name,
                uploaded_by_officer_id=cus.get("uploaded_by_officer_id"),
                meters=meters,
                created_at=str(cus.get("created_at", "")),
                updated_at=str(cus.get("updated_at", "")),
                distance_meters=round(dist, 1),
                estimated_duration_mins=max(1.0, dur_mins)
            )
            nearby_list.append(nearby_item)

        return nearby_list

