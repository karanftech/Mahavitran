from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.database import get_database
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/reports", tags=["Reports"])

def safe_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

@router.get("/field-performance")
async def get_field_performance_report(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    # 1. Fetch Customers & Officers count
    all_customers = await db.customers.find().to_list(5000)
    total_assigned = len(all_customers)
    
    # 2. Fetch Field Visits
    visit_docs = await db.field_visits.find().sort("date_time", -1).to_list(5000)
    
    # If no field_visits exist yet, fallback to constructing from db.payments & customers
    if not visit_docs:
        payment_docs = await db.payments.find().sort("created_at", -1).to_list(5000)
        visit_docs = []
        for p in payment_docs:
            visit_docs.append({
                "visit_id": p.get("payment_id", str(p["_id"])),
                "date_time": p.get("created_at", "26/8/2026 • 09:25 am"),
                "consumer_id": p.get("customer_id", "N/A"),
                "meter_id": p.get("meter_number") or p.get("meter_id", "N/A"),
                "status": "Payment Recovered",
                "amount_collected": float(p.get("amount", 0.0)),
                "officer_remarks": p.get("remarks") or "",
                "gps_position": f"{p.get('collection_latitude', 21.1458):.4f}, {p.get('collection_longitude', 79.0882):.4f}",
                "ward_name": "Thote & Thakre Ward (Godhani-Koradi)"
            })

    # Unique consumers visited
    visited_consumer_ids = set(v.get("consumer_id") for v in visit_docs if v.get("consumer_id"))
    total_visited = len(visited_consumer_ids)
    unvisited_remaining = max(0, total_assigned - total_visited)

    # Financial totals
    total_recovered = sum(safe_float(v.get("amount_collected")) for v in visit_docs if v.get("status") == "Payment Recovered")
    
    # Outstanding balance from pending customers
    pending_customers = [c for c in all_customers if c.get("status") in ["pending", "overdue", "partially_paid"]]
    outstanding_balance = sum(safe_float(c.get("pending_amount")) for c in pending_customers)
    
    total_ward_demand = total_recovered + outstanding_balance
    recovery_rate = round((total_recovered / total_ward_demand * 100.0), 1) if total_ward_demand > 0 else 0.0

    # Status Breakdown counts
    status_counts = {
        "Payment Recovered": 0,
        "Not Recovered": 0,
        "Contacted": 0,
        "Unavailable": 0,
        "Meter Issue": 0,
        "Other / Followup": 0
    }

    for v in visit_docs:
        st = v.get("status", "Other / Followup")
        if st in status_counts:
            status_counts[st] += 1
        else:
            status_counts["Other / Followup"] += 1

    # Filter visits based on search and status_filter
    filtered_visits = visit_docs
    if status_filter and status_filter != "All Statuses":
        filtered_visits = [v for v in filtered_visits if v.get("status") == status_filter]

    if search:
        s_lower = search.lower()
        filtered_visits = [
            v for v in filtered_visits
            if s_lower in str(v.get("consumer_id", "")).lower()
            or s_lower in str(v.get("meter_id", "")).lower()
            or s_lower in str(v.get("officer_remarks", "")).lower()
            or s_lower in str(v.get("status", "")).lower()
        ]

    # Standardize result format
    formatted_visits = []
    for v in filtered_visits:
        formatted_visits.append({
            "visit_id": v.get("visit_id", str(v.get("_id", ""))),
            "date_time": v.get("date_time", ""),
            "consumer_id": v.get("consumer_id", ""),
            "meter_id": v.get("meter_id", ""),
            "status": v.get("status", "Payment Recovered"),
            "amount_collected": safe_float(v.get("amount_collected")),
            "officer_remarks": v.get("officer_remarks", ""),
            "gps_position": v.get("gps_position", "21.1693, 79.1183")
        })

    return {
        "kpis": {
            "consumers_visited_count": total_visited,
            "total_assigned_consumers": total_assigned,
            "unvisited_consumers_remaining": unvisited_remaining,
            "total_recovered": round(total_recovered, 2),
            "outstanding_balance": round(outstanding_balance, 2),
            "recovery_rate": recovery_rate
        },
        "breakdown": status_counts,
        "visits": formatted_visits,
        "ward_name": "Thote & Thakre Ward (Godhani-Koradi)"
    }
