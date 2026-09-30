from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from typing import Optional, Any
import asyncio

from app.database import get_database
from app.schemas.dashboard import OfficerDashboardMetrics
from app.services.customer_service import CustomerService
from app.utils.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def safe_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


@router.get("/officer", response_model=OfficerDashboardMetrics)
async def get_officer_dashboard(
    latitude: Optional[float] = Query(21.1458),
    longitude: Optional[float] = Query(79.0882),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    try:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        # 1. Fetch officer record first
        officer_doc = await db.officers.find_one({
            "$or": [
                {"user_id": current_user["_id"]},
                {"email": current_user.get("email")}
            ]
        })
        officer_id = officer_doc.get("officer_id") if officer_doc else None

        # Build query filters for officer isolation
        cus_filter = {"$or": [{"assigned_officer_id": officer_id}, {"uploaded_by_officer_id": officer_id}]} if officer_id else {}
        pending_match = {"status": {"$in": ["pending", "overdue", "partially_paid"]}}
        paid_match = {"status": "paid"}
        if officer_id:
            officer_or = [{"assigned_officer_id": officer_id}, {"uploaded_by_officer_id": officer_id}]
            pending_match["$or"] = officer_or
            paid_match["$or"] = officer_or

        pmt_filter = {"officer_id": officer_id} if officer_id else {}
        today_pmt_match = {"created_at": {"$gte": today_start}}
        if officer_id:
            today_pmt_match["officer_id"] = officer_id


        # Run independent DB queries concurrently with officer filters
        (
            total_assigned,
            pending_agg,
            paid_count,
            total_payments_count,
            today_agg,
        ) = await asyncio.gather(
            # Total customer count for officer
            db.customers.count_documents(cus_filter),
            # Pending amount + count via aggregation for officer
            db.customers.aggregate([
                {"$match": pending_match},
                {"$group": {
                    "_id": None,
                    "total_amount": {"$sum": "$pending_amount"},
                    "count": {"$sum": 1}
                }}
            ]).to_list(1),
            # Paid customers count for officer
            db.customers.count_documents(paid_match),
            # Total payments count for officer
            db.payments.count_documents(pmt_filter),
            # Today's payment aggregation for officer
            db.payments.aggregate([
                {"$match": today_pmt_match},
                {"$group": {
                    "_id": None,
                    "total_amount": {"$sum": "$amount"},
                    "count": {"$sum": 1}
                }}
            ]).to_list(1),
        )


        # Extract aggregation results
        pending_result = pending_agg[0] if pending_agg else {}
        total_pending_amt = safe_float(pending_result.get("total_amount"), 0.0)
        pending_bills_count = int(pending_result.get("count", 0))

        completed_collections_count = max(total_payments_count, paid_count)

        today_result = today_agg[0] if today_agg else {}
        todays_collected_amt = safe_float(today_result.get("total_amount"), 0.0)
        today_payments_count = int(today_result.get("count", 0))

        todays_target = safe_float(officer_doc.get("target_collection_amount"), 25000.0) if officer_doc else 25000.0
        remaining_count = max(0, int(total_assigned) - today_payments_count)
        remaining_amt = max(0.0, todays_target - todays_collected_amt)

        # Nearby pending customers (already optimised with batch queries)
        nearby_customers = await CustomerService.get_nearby_customers(
            db=db,
            latitude=latitude or 21.1458,
            longitude=longitude or 79.0882,
            radius_meters=5000.0,
            officer_id=officer_id
        )

        # Aggregate disconnection status categories (TD, PD, BUR, DIS)
        disconn_match = dict(cus_filter)
        disconn_match["$or"] = [
            {"disconnection_status": {"$in": ["TD", "PD", "BUR", "DIS", "td", "pd", "bur", "dis"]}},
            {"status": {"$in": ["TD", "PD", "BUR", "DIS", "td", "pd", "bur", "dis"]}}
        ]
        if officer_id:
            disconn_match = {
                "$and": [
                    {"$or": [{"assigned_officer_id": officer_id}, {"uploaded_by_officer_id": officer_id}]},
                    {"$or": [
                        {"disconnection_status": {"$in": ["TD", "PD", "BUR", "DIS", "td", "pd", "bur", "dis"]}},
                        {"status": {"$in": ["TD", "PD", "BUR", "DIS", "td", "pd", "bur", "dis"]}}
                    ]}
                ]
            }

        disconn_agg = await db.customers.aggregate([
            {"$match": disconn_match},
            {"$group": {
                "_id": {
                    "$toUpper": {
                        "$ifNull": ["$disconnection_status", "$status"]
                    }
                },
                "total_amount": {"$sum": "$pending_amount"},
                "count": {"$sum": 1}
            }}
        ]).to_list(10)

        status_map = {item["_id"]: item for item in disconn_agg if item.get("_id")}

        def get_stat(code: str):
            item = status_map.get(code.upper(), {})
            return int(item.get("count", 0)), round(safe_float(item.get("total_amount"), 0.0), 2)

        td_cnt, td_amt = get_stat("TD")
        pd_cnt, pd_amt = get_stat("PD")
        bur_cnt, bur_amt = get_stat("BUR")
        dis_cnt, dis_amt = get_stat("DIS")

        return OfficerDashboardMetrics(
            total_assigned_customers=int(total_assigned),
            total_pending_amount=round(total_pending_amt, 2),
            number_of_pending_bills=pending_bills_count,
            number_of_completed_collections=completed_collections_count,
            todays_collection_target=todays_target,
            todays_collected_amount=round(todays_collected_amt, 2),
            remaining_collections_count=remaining_count,
            remaining_collections_amount=round(remaining_amt, 2),
            td_customers_count=td_cnt,
            td_pending_amount=td_amt,
            pd_customers_count=pd_cnt,
            pd_pending_amount=pd_amt,
            bur_customers_count=bur_cnt,
            bur_pending_amount=bur_amt,
            dis_customers_count=dis_cnt,
            dis_pending_amount=dis_amt,
            nearby_pending_customers=nearby_customers
        )
    except Exception as err:
        logger.error(f"Error building officer dashboard metrics: {err}")
        return OfficerDashboardMetrics(
            total_assigned_customers=0,
            total_pending_amount=0.0,
            number_of_pending_bills=0,
            number_of_completed_collections=0,
            todays_collection_target=25000.0,
            todays_collected_amount=0.0,
            remaining_collections_count=0,
            remaining_collections_amount=0.0,
            td_customers_count=0,
            td_pending_amount=0.0,
            pd_customers_count=0,
            pd_pending_amount=0.0,
            bur_customers_count=0,
            bur_pending_amount=0.0,
            dis_customers_count=0,
            dis_pending_amount=0.0,
            nearby_pending_customers=[]
        )



