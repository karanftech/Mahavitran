import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import bcrypt

from app.config import settings

def get_hash(p: str) -> str:
    pw_bytes = p.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')

MONGODB_URI = settings.MONGODB_URI
DATABASE_NAME = settings.DATABASE_NAME

async def seed_database():
    print(f"Connecting to MongoDB at {MONGODB_URI}...")
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DATABASE_NAME]

    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    today = datetime.utcnow()

    # 1. Clear existing collections for clean seed
    print("Resetting database collections...")
    await db.users.delete_many({})
    await db.officers.delete_many({})
    await db.customers.delete_many({})
    await db.meters.delete_many({})
    await db.payments.delete_many({})
    await db.assignments.delete_many({})
    await db.audit_logs.delete_many({})


    # 2. Insert Admin User
    admin_user = {
        "email": "admin@electricity.gov.in",
        "password_hash": get_hash("admin123"),
        "full_name": "Executive Engineer (Admin)",
        "role": "admin",
        "phone": "+91 9876543210",
        "is_active": True,
        "created_at": now_str
    }
    admin_res = await db.users.insert_one(admin_user)
    print("✔ Inserted Admin Account: admin@electricity.gov.in / admin123")

    # 3. Insert Field Officers
    off1_user = {
        "email": "officer1@electricity.gov.in",
        "password_hash": get_hash("officer123"),
        "full_name": "Rajesh Verma",
        "role": "field_officer",
        "phone": "+91 9822114455",
        "is_active": True,
        "created_at": now_str
    }
    off1_res = await db.users.insert_one(off1_user)

    off1_profile = {
        "officer_id": "OFF-1001",
        "user_id": str(off1_res.inserted_id),
        "full_name": "Rajesh Verma",
        "email": "officer1@electricity.gov.in",
        "phone": "+91 9822114455",
        "assigned_area": "Central Ward & Sitabuldi",
        "target_collections_count": 15,
        "target_collection_amount": 35000.0,
        "current_latitude": 21.1458,
        "current_longitude": 79.0882,
        "is_active": True,
        "created_at": now_str
    }
    await db.officers.insert_one(off1_profile)

    off2_user = {
        "email": "officer2@electricity.gov.in",
        "password_hash": get_hash("officer123"),
        "full_name": "Suresh Patil",
        "role": "field_officer",
        "phone": "+91 9833225566",
        "is_active": True,
        "created_at": now_str
    }
    off2_res = await db.users.insert_one(off2_user)

    off2_profile = {
        "officer_id": "OFF-1002",
        "user_id": str(off2_res.inserted_id),
        "full_name": "Suresh Patil",
        "email": "officer2@electricity.gov.in",
        "phone": "+91 9833225566",
        "assigned_area": "Dharampeth & Ramdaspeth",
        "target_collections_count": 12,
        "target_collection_amount": 28000.0,
        "current_latitude": 21.1400,
        "current_longitude": 79.0750,
        "is_active": True,
        "created_at": now_str
    }
    await db.officers.insert_one(off2_profile)
    print("✔ Inserted Field Officers: officer1@electricity.gov.in & officer2@electricity.gov.in / officer123")

    # 4. 32 Electricity Consumer Accounts & Meters across Nagpur
    customers_data = [
        {"customer_id": "CUS-1001", "name": "Rajesh Kumar Sharma", "meter_number": "MTR-8801", "phone": "+91 9822100101", "email": "rajesh.sharma@example.com", "address": "Plot 12, Main Road, Sitabuldi", "area": "Sitabuldi", "latitude": 21.1458, "longitude": 79.0882, "pending_amount": 4250.0, "due_date": "2026-09-15", "status": "overdue", "priority": "high", "assigned_officer_id": "OFF-1001"},
        {"customer_id": "CUS-1002", "name": "Sunita Devi Deshmukh", "meter_number": "MTR-8802", "phone": "+91 9822100102", "email": "sunita.d@example.com", "address": "45 West High Court Road, Dharampeth", "area": "Dharampeth", "latitude": 21.1412, "longitude": 79.0715, "pending_amount": 1850.0, "due_date": "2026-09-18", "status": "pending", "priority": "normal", "assigned_officer_id": "OFF-1002"},
        {"customer_id": "CUS-1003", "name": "Amitabh Kulkarni", "meter_number": "MTR-8803", "phone": "+91 9822100103", "email": "amit.kulkarni@example.com", "address": "78 Mount Road, Sadar", "area": "Sadar", "latitude": 21.1595, "longitude": 79.0820, "pending_amount": 7400.0, "due_date": "2026-09-10", "status": "overdue", "priority": "critical", "assigned_officer_id": "OFF-1001"},
        {"customer_id": "CUS-1004", "name": "Priya Ramesh Patel", "meter_number": "MTR-8804", "phone": "+91 9822100104", "email": "priya.patel@example.com", "address": "102 Central Avenue, Ramdaspeth", "area": "Ramdaspeth", "latitude": 21.1380, "longitude": 79.0790, "pending_amount": 3100.0, "due_date": "2026-09-20", "status": "pending", "priority": "normal", "assigned_officer_id": "OFF-1002"},
        {"customer_id": "CUS-1005", "name": "Vikram Singh Joshi", "meter_number": "MTR-8805", "phone": "+91 9822100105", "email": "vikram.joshi@example.com", "address": "Plot 24, Wardha Road, Dhantoli", "area": "Dhantoli", "latitude": 21.1325, "longitude": 79.0845, "pending_amount": 0.0, "due_date": "2026-09-25", "status": "paid", "priority": "normal", "assigned_officer_id": "OFF-1001"},
        {"customer_id": "CUS-1006", "name": "Ananya Mukherjee", "meter_number": "MTR-8806", "phone": "+91 9822100106", "email": "ananya.m@example.com", "address": "Flat 301, Civil Lines", "area": "Civil Lines", "latitude": 21.1530, "longitude": 79.0720, "pending_amount": 5600.0, "due_date": "2026-09-12", "status": "overdue", "priority": "high", "assigned_officer_id": "OFF-1002"},
        {"customer_id": "CUS-1007", "name": "Manoj Kumar Gupta", "meter_number": "MTR-8807", "phone": "+91 9822100107", "email": "manoj.gupta@example.com", "address": "Shop 14, Itwari Market", "area": "Itwari", "latitude": 21.1510, "longitude": 79.1100, "pending_amount": 8900.0, "due_date": "2026-09-08", "status": "overdue", "priority": "critical", "assigned_officer_id": "OFF-1001"},
        {"customer_id": "CUS-1008", "name": "Kavita Rao", "meter_number": "MTR-8808", "phone": "+91 9822100108", "email": "kavita.rao@example.com", "address": "88 Mahal Road, Mahal", "area": "Mahal", "latitude": 21.1440, "longitude": 79.1020, "pending_amount": 2100.0, "due_date": "2026-09-22", "status": "pending", "priority": "normal", "assigned_officer_id": "OFF-1002"},
        {"customer_id": "CUS-1009", "name": "Sanjay Shinde", "meter_number": "MTR-8809", "phone": "+91 9822100109", "email": "sanjay.shinde@example.com", "address": "Plot 5, Mankapur Ring Road", "area": "Mankapur", "latitude": 21.1810, "longitude": 79.0750, "pending_amount": 3450.0, "due_date": "2026-09-16", "status": "pending", "priority": "normal", "assigned_officer_id": "OFF-1001"},
        {"customer_id": "CUS-1010", "name": "Meena Agarwal", "meter_number": "MTR-8810", "phone": "+91 9822100110", "email": "meena.a@example.com", "address": "12 Gokulpeth Square", "area": "Gokulpeth", "latitude": 21.1415, "longitude": 79.0590, "pending_amount": 6200.0, "due_date": "2026-09-14", "status": "overdue", "priority": "high", "assigned_officer_id": "OFF-1002"},
        {"customer_id": "CUS-1011", "name": "Ganesh Fadnavis", "meter_number": "MTR-8811", "phone": "+91 9822100111", "email": "ganesh.f@example.com", "address": "90 Laxmi Nagar", "area": "Laxmi Nagar", "latitude": 21.1270, "longitude": 79.0680, "pending_amount": 1400.0, "due_date": "2026-09-24", "status": "pending", "priority": "normal", "assigned_officer_id": "OFF-1001"},
        {"customer_id": "CUS-1012", "name": "Pooja Wankhede", "meter_number": "MTR-8812", "phone": "+91 9822100112", "email": "pooja.w@example.com", "address": "Plot 33, Pratap Nagar", "area": "Pratap Nagar", "latitude": 21.1180, "longitude": 79.0595, "pending_amount": 0.0, "due_date": "2026-09-28", "status": "paid", "priority": "normal", "assigned_officer_id": "OFF-1002"},
        {"customer_id": "CUS-1013", "name": "Deepak Raut", "meter_number": "MTR-8813", "phone": "+91 9822100113", "email": "deepak.raut@example.com", "address": "15 Bajaj Nagar", "area": "Bajaj Nagar", "latitude": 21.1310, "longitude": 79.0640, "pending_amount": 4900.0, "due_date": "2026-09-11", "status": "overdue", "priority": "high", "assigned_officer_id": "OFF-1001"},
        {"customer_id": "CUS-1014", "name": "Shalini Mohite", "meter_number": "MTR-8814", "phone": "+91 9822100114", "email": "shalini.m@example.com", "address": "66 Shankar Nagar", "area": "Shankar Nagar", "latitude": 21.1375, "longitude": 79.0625, "pending_amount": 2750.0, "due_date": "2026-09-19", "status": "pending", "priority": "normal", "assigned_officer_id": "OFF-1002"},
        {"customer_id": "CUS-1015", "name": "Rohan Deshpande", "meter_number": "MTR-8815", "phone": "+91 9822100115", "email": "rohan.d@example.com", "address": "Plot 8, Khamla Road", "area": "Khamla", "latitude": 21.1120, "longitude": 79.0650, "pending_amount": 9300.0, "due_date": "2026-09-07", "status": "overdue", "priority": "critical", "assigned_officer_id": "OFF-1001"},
        {"customer_id": "CUS-1016", "name": "Archana Gawande", "meter_number": "MTR-8816", "phone": "+91 9822100116", "email": "archana.g@example.com", "address": "22 Manish Nagar Main Rd", "area": "Manish Nagar", "latitude": 21.0920, "longitude": 79.0780, "pending_amount": 3800.0, "due_date": "2026-09-17", "status": "pending", "priority": "normal", "assigned_officer_id": "OFF-1002"},
        {"customer_id": "CUS-1017", "name": "Nitin Gadkari Jr.", "meter_number": "MTR-8817", "phone": "+91 9822100117", "email": "nitin.g@example.com", "address": "Plot 50, Somalwada", "area": "Somalwada", "latitude": 21.0980, "longitude": 79.0690, "pending_amount": 1600.0, "due_date": "2026-09-23", "status": "pending", "priority": "normal", "assigned_officer_id": "OFF-1001"},
        {"customer_id": "CUS-1018", "name": "Smita Bhole", "meter_number": "MTR-8818", "phone": "+91 9822100118", "email": "smita.b@example.com", "address": "7 Wardhaman Nagar", "area": "Wardhaman Nagar", "latitude": 21.1470, "longitude": 79.1290, "pending_amount": 5100.0, "due_date": "2026-09-13", "status": "overdue", "priority": "high", "assigned_officer_id": "OFF-1002"},
        {"customer_id": "CUS-1019", "name": "Pankaj Tiwari", "meter_number": "MTR-8819", "phone": "+91 9822100119", "email": "pankaj.t@example.com", "address": "Plot 18, Lakadganj", "area": "Lakadganj", "latitude": 21.1550, "longitude": 79.1180, "pending_amount": 2900.0, "due_date": "2026-09-21", "status": "pending", "priority": "normal", "assigned_officer_id": "OFF-1001"},
        {"customer_id": "CUS-1020", "name": "Nisha Thakre", "meter_number": "MTR-8820", "phone": "+91 9822100120", "email": "nisha.t@example.com", "address": "Plot 9, Sakkardara Square", "area": "Sakkardara", "latitude": 21.1260, "longitude": 79.1060, "pending_amount": 7800.0, "due_date": "2026-09-09", "status": "overdue", "priority": "critical", "assigned_officer_id": "OFF-1002"},
        {"customer_id": "CUS-1021", "name": "Ashok Khedekar", "meter_number": "MTR-8821", "phone": "+91 9822100121", "email": "ashok.k@example.com", "address": "40 Nandanvan Colony", "area": "Nandanvan", "latitude": 21.1340, "longitude": 79.1190, "pending_amount": 0.0, "due_date": "2026-09-29", "status": "paid", "priority": "normal", "assigned_officer_id": "OFF-1001"},
        {"customer_id": "CUS-1022", "name": "Varsha Charde", "meter_number": "MTR-8822", "phone": "+91 9822100122", "email": "varsha.c@example.com", "address": "Plot 14, Ayodhya Nagar", "area": "Ayodhya Nagar", "latitude": 21.1190, "longitude": 79.1090, "pending_amount": 3300.0, "due_date": "2026-09-18", "status": "pending", "priority": "normal", "assigned_officer_id": "OFF-1002"},
        {"customer_id": "CUS-1023", "name": "Mahesh Bobde", "meter_number": "MTR-8823", "phone": "+91 9822100123", "email": "mahesh.b@example.com", "address": " Plot 88, Hudkeshwar Road", "area": "Hudkeshwar", "latitude": 21.0990, "longitude": 79.1150, "pending_amount": 4600.0, "due_date": "2026-09-15", "status": "overdue", "priority": "high", "assigned_officer_id": "OFF-1001"},
        {"customer_id": "CUS-1024", "name": "Harish Borikar", "meter_number": "MTR-8824", "phone": "+91 9822100124", "email": "harish.b@example.com", "address": "55 Besa Power House Rd", "area": "Besa", "latitude": 21.0790, "longitude": 79.0950, "pending_amount": 2200.0, "due_date": "2026-09-22", "status": "pending", "priority": "normal", "assigned_officer_id": "OFF-1002"},
        {"customer_id": "CUS-1025", "name": "Kiran Somani", "meter_number": "MTR-8825", "phone": "+91 9822100125", "email": "kiran.s@example.com", "address": "Plot 3, Jaripatka Main Market", "area": "Jaripatka", "latitude": 21.1850, "longitude": 79.0890, "pending_amount": 8100.0, "due_date": "2026-09-08", "status": "overdue", "priority": "critical", "assigned_officer_id": "OFF-1001"},
        {"customer_id": "CUS-1026", "name": "Leena Meshram", "meter_number": "MTR-8826", "phone": "+91 9822100126", "email": "leena.m@example.com", "address": "19 Indora Chowk", "area": "Indora", "latitude": 21.1730, "longitude": 79.0880, "pending_amount": 1950.0, "due_date": "2026-09-20", "status": "pending", "priority": "normal", "assigned_officer_id": "OFF-1002"},
        {"customer_id": "CUS-1027", "name": "Tushar Tembhare", "meter_number": "MTR-8827", "phone": "+91 9822100127", "email": "tushar.t@example.com", "address": "Plot 61, Kamptee Road", "area": "Kamptee Road", "latitude": 21.1890, "longitude": 79.1020, "pending_amount": 6700.0, "due_date": "2026-09-10", "status": "overdue", "priority": "high", "assigned_officer_id": "OFF-1001"},
        {"customer_id": "CUS-1028", "name": "Savita Mendhe", "meter_number": "MTR-8828", "phone": "+91 9822100128", "email": "savita.m@example.com", "address": "77 Koradi Road", "area": "Koradi Road", "latitude": 21.2050, "longitude": 79.0780, "pending_amount": 0.0, "due_date": "2026-09-30", "status": "paid", "priority": "normal", "assigned_officer_id": "OFF-1002"},
        {"customer_id": "CUS-1029", "name": "Dinesh Parate", "meter_number": "MTR-8829", "phone": "+91 9822100129", "email": "dinesh.p@example.com", "address": "Plot 11, Katol Road", "area": "Katol Road", "latitude": 21.1680, "longitude": 79.0550, "pending_amount": 5400.0, "due_date": "2026-09-13", "status": "overdue", "priority": "high", "assigned_officer_id": "OFF-1001"},
        {"customer_id": "CUS-1030", "name": "Bharti Zingare", "meter_number": "MTR-8830", "phone": "+91 9822100130", "email": "bharti.z@example.com", "address": "80 Friends Colony", "area": "Friends Colony", "latitude": 21.1780, "longitude": 79.0480, "pending_amount": 3150.0, "due_date": "2026-09-19", "status": "pending", "priority": "normal", "assigned_officer_id": "OFF-1002"},
        {"customer_id": "CUS-1031", "name": "Yogesh Badwaik", "meter_number": "MTR-8831", "phone": "+91 9822100131", "email": "yogesh.b@example.com", "address": "Plot 29, Hingna Road", "area": "Hingna Road", "latitude": 21.1210, "longitude": 79.0250, "pending_amount": 9800.0, "due_date": "2026-09-06", "status": "overdue", "priority": "critical", "assigned_officer_id": "OFF-1001"},
        {"customer_id": "CUS-1032", "name": "Swati Mahajan", "meter_number": "MTR-8832", "phone": "+91 9822100132", "email": "swati.m@example.com", "address": "14 Trimurti Nagar Chowk", "area": "Trimurti Nagar", "latitude": 21.1150, "longitude": 79.0410, "pending_amount": 2600.0, "due_date": "2026-09-25", "status": "pending", "priority": "normal", "assigned_officer_id": "OFF-1002"}
    ]

    for c in customers_data:
        location = {"type": "Point", "coordinates": [c["longitude"], c["latitude"]]}
        
        # 1. Customer Doc
        cus_doc = {
            "customer_id": c["customer_id"],
            "name": c["name"],
            "meter_number": c["meter_number"],
            "phone": c["phone"],
            "email": c["email"],
            "address": c["address"],
            "area": c["area"],
            "latitude": c["latitude"],
            "longitude": c["longitude"],
            "location": location,
            "pending_amount": c["pending_amount"],
            "due_date": c["due_date"],
            "status": c["status"],
            "priority": c["priority"],
            "assigned_officer_id": c["assigned_officer_id"],
            "created_at": now_str,
            "updated_at": now_str
        }
        await db.customers.insert_one(cus_doc)

        # 2. Meter Doc
        meter_doc = {
            "meter_id": f"MTR-{c['meter_number']}",
            "meter_number": c["meter_number"],
            "customer_id": c["customer_id"],
            "latitude": c["latitude"],
            "longitude": c["longitude"]
        }
        await db.meters.insert_one(meter_doc)

    print(f"✔ Inserted {len(customers_data)} Customer accounts and Meters.")

    # 5. Insert Field Visit History Logs (matching image)
    await db.field_visits.delete_many({})
    field_visits_data = [
        {"visit_id": "V-101", "date_time": "26/8/2026 • 09:25 am", "consumer_id": "413840001191", "meter_id": "07501900442", "status": "Payment Recovered", "amount_collected": 0.0, "officer_remarks": "", "gps_position": "21.2310, 79.0840"},
        {"visit_id": "V-102", "date_time": "26/8/2026 • 07:17 am", "consumer_id": "410190876831", "meter_id": "07670186586", "status": "Payment Recovered", "amount_collected": 1425.74, "officer_remarks": "", "gps_position": "21.1693, 79.1183"},
        {"visit_id": "V-103", "date_time": "26/8/2026 • 07:17 am", "consumer_id": "413840825852", "meter_id": "06507155091", "status": "Payment Recovered", "amount_collected": 2282.02, "officer_remarks": "", "gps_position": "21.1693, 79.1183"},
        {"visit_id": "V-104", "date_time": "26/8/2026 • 07:16 am", "consumer_id": "413840001191", "meter_id": "07501900442", "status": "Payment Recovered", "amount_collected": 5702.53, "officer_remarks": "", "gps_position": "21.1692, 79.1183"},
        {"visit_id": "V-105", "date_time": "26/8/2026 • 07:16 am", "consumer_id": "413840820818", "meter_id": "06505692026", "status": "Payment Recovered", "amount_collected": 5142.57, "officer_remarks": "", "gps_position": "21.1692, 79.1183"},
        {"visit_id": "V-106", "date_time": "26/8/2026 • 07:11 am", "consumer_id": "410195553665", "meter_id": "06506979926", "status": "Not Recovered", "amount_collected": 2477.00, "officer_remarks": "", "gps_position": "21.1692, 79.1184"},
        {"visit_id": "V-107", "date_time": "26/8/2026 • 07:09 am", "consumer_id": "413840820761", "meter_id": "05375819996", "status": "Payment Recovered", "amount_collected": 3288.40, "officer_remarks": "", "gps_position": "21.1693, 79.1184"},
        {"visit_id": "V-108", "date_time": "26/8/2026 • 07:08 am", "consumer_id": "410195553665", "meter_id": "06506979926", "status": "Not Recovered", "amount_collected": 0.0, "officer_remarks": "", "gps_position": "21.1693, 79.1183"},
        {"visit_id": "V-109", "date_time": "26/8/2026 • 07:08 am", "consumer_id": "410195553665", "meter_id": "06506979926", "status": "Payment Recovered", "amount_collected": 2477.23, "officer_remarks": "", "gps_position": "21.1693, 79.1183"}
    ]
    await db.field_visits.insert_many(field_visits_data)
    print(f"✔ Inserted {len(field_visits_data)} Field Visit Logs.")
    print("-------------------------------------------------------")
    print("Database seeding completed successfully!")
    print("Run backend with: uvicorn app.main:app --reload")

if __name__ == "__main__":
    asyncio.run(seed_database())
