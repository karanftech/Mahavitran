from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict, Any, Optional
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
    ) -> List[NearbyCustomerResponse]:
        query: Dict[str, Any] = {}
        # All customers in system are accessible/assigned to the field officer for now
        if status_filter:
            query["status"] = status_filter
        else:
            # By default exclude fully paid customers for field officer collections
            query["status"] = {"$ne": "paid"}

        # Fetch candidate customers
        customers = await db.customers.find(query).to_list(1000)

        nearby_list = []
        for cus in customers:
            c_lat = float(cus.get("latitude", 0.0))
            c_lng = float(cus.get("longitude", 0.0))
            
            dist = haversine_distance(latitude, longitude, c_lat, c_lng)
            if dist <= radius_meters:
                # Calculate duration (riding speed ~25km/h => 6.94 m/s + 1.35 urban detour factor)
                dur_mins = round((dist * 1.35 / 6.94) / 60.0, 1)

                # Fetch meters for customer
                meters_docs = await db.meters.find({"customer_id": cus.get("customer_id")}).to_list(10)
                meters = [
                    MeterSchema(
                        meter_id=m.get("meter_id", ""),
                        meter_number=m.get("meter_number", ""),
                        customer_id=m.get("customer_id", ""),
                        latitude=float(m.get("latitude", 0.0)),
                        longitude=float(m.get("longitude", 0.0))
                    )
                    for m in meters_docs
                ]

                # Resolve assigned officer name
                officer_name = None
                if cus.get("assigned_officer_id"):
                    off_doc = await db.officers.find_one({"officer_id": cus.get("assigned_officer_id")})
                    if off_doc:
                        officer_name = off_doc.get("full_name")

                nearby_item = NearbyCustomerResponse(
                    id=str(cus.get("_id")),
                    customer_id=cus.get("customer_id"),
                    name=cus.get("name"),
                    meter_number=cus.get("meter_number", ""),
                    phone=cus.get("phone", ""),
                    email=cus.get("email"),
                    address=cus.get("address", ""),
                    area=cus.get("area", ""),
                    latitude=c_lat,
                    longitude=c_lng,
                    pending_amount=float(cus.get("pending_amount", 0.0)),
                    due_date=cus.get("due_date"),
                    status=cus.get("status", "pending"),
                    priority=cus.get("priority", "normal"),
                    assigned_officer_id=cus.get("assigned_officer_id"),
                    assigned_officer_name=officer_name,
                    meters=meters,
                    created_at=str(cus.get("created_at", "")),
                    updated_at=str(cus.get("updated_at", "")),
                    distance_meters=round(dist, 1),
                    estimated_duration_mins=max(1.0, dur_mins)
                )
                nearby_list.append(nearby_item)

        # Sort by distance primarily
        nearby_list.sort(key=lambda x: x.distance_meters)
        return nearby_list
