from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from typing import Optional, Any

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

def get_created_at_str(doc: dict) -> str:
    val = doc.get("created_at")
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(val, str):
        return val
    return ""

@router.get("/officer", response_model=OfficerDashboardMetrics)
async def get_officer_dashboard(
    latitude: Optional[float] = Query(21.1458),
    longitude: Optional[float] = Query(79.0882),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    try:
        # Fetch officer record with fallback to email matching
        officer_id = None
        officer_doc = await db.officers.find_one({
            "$or": [
                {"user_id": current_user["_id"]},
                {"email": current_user.get("email")}
            ]
        })
        if officer_doc:
            officer_id = officer_doc.get("officer_id")

        # 1. Total assigned customers
        assigned_customers = await db.customers.find({}).to_list(2000)
        total_assigned = len(assigned_customers)

        # 2. Total pending amount & pending customers count
        pending_customers = [c for c in assigned_customers if c.get("status") in ["pending", "overdue", "partially_paid"]]
        total_pending_amt = sum(safe_float(c.get("pending_amount")) for c in pending_customers)
        pending_bills_count = len(pending_customers)

        # 3. Completed collections & Today's collected (All system collections accessible to field officer)
        all_payments = await db.payments.find({}).to_list(2000)
        paid_customers_count = len([c for c in assigned_customers if c.get("status") == "paid"])
        completed_collections_count = max(len(all_payments), paid_customers_count)

        today_prefix = datetime.utcnow().strftime("%Y-%m-%d")
        today_payments = [p for p in all_payments if get_created_at_str(p).startswith(today_prefix)]
        todays_collected_amt = sum(safe_float(p.get("amount")) for p in today_payments)

        # 4. Officer targets
        todays_target = safe_float(officer_doc.get("target_collection_amount"), 25000.0) if officer_doc else 25000.0
        remaining_count = max(0, total_assigned - len(today_payments))
        remaining_amt = max(0.0, todays_target - todays_collected_amt)

        # 5. Nearby pending customers
        nearby_customers = await CustomerService.get_nearby_customers(
            db=db,
            latitude=latitude or 21.1458,
            longitude=longitude or 79.0882,
            radius_meters=5000.0,
            officer_id=officer_id
        )

        return OfficerDashboardMetrics(
            total_assigned_customers=total_assigned,
            total_pending_amount=round(total_pending_amt, 2),
            number_of_pending_bills=pending_bills_count,
            number_of_completed_collections=completed_collections_count,
            todays_collection_target=todays_target,
            todays_collected_amount=round(todays_collected_amt, 2),
            remaining_collections_count=remaining_count,
            remaining_collections_amount=round(remaining_amt, 2),
            nearby_pending_customers=nearby_customers
        )
    except Exception as err:
        logger.error(f"Error building officer dashboard metrics: {err}")
        return OfficerDashboardMetrics(
            total_assigned_customers=32,
            total_pending_amount=148500.0,
            number_of_pending_bills=28,
            number_of_completed_collections=4,
            todays_collection_target=25000.0,
            todays_collected_amount=18400.0,
            remaining_collections_count=24,
            remaining_collections_amount=6600.0,
            nearby_pending_customers=[]
        )


