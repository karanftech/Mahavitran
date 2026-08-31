from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from app.database import get_database
from app.schemas.officer import CustomerAssignmentRequest
from app.utils.dependencies import require_admin

router = APIRouter(prefix="/api/assignments", tags=["Assignments"])

@router.post("")
async def assign_customers(
    request: CustomerAssignmentRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(require_admin)
):
    officer = await db.officers.find_one({"officer_id": request.officer_id})
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")

    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    # Update assigned officer ID on customers
    result = await db.customers.update_many(
        {"customer_id": {"$in": request.customer_ids}},
        {"$set": {"assigned_officer_id": request.officer_id, "updated_at": now_str}}
    )

    # Update assigned officer ID on associated pending bills
    await db.bills.update_many(
        {"customer_id": {"$in": request.customer_ids}},
        {"$set": {"assigned_officer_id": request.officer_id, "updated_at": now_str}}
    )

    # Record assignment event
    await db.assignments.insert_one({
        "officer_id": request.officer_id,
        "customer_ids": request.customer_ids,
        "assigned_by": str(current_user["_id"]),
        "created_at": now_str
    })

    return {
        "message": f"Successfully assigned {result.modified_count} customers to officer '{officer.get('full_name')}'",
        "officer_id": request.officer_id,
        "count": result.modified_count
    }
