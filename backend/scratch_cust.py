import asyncio
from app.database import connect_db, get_database

async def main():
    await connect_db()
    db = get_database()
    customers = await db['customers'].find({}).to_list(100)
    print(f'Total customers: {len(customers)}')
    for c in customers:
        meters = c.get('meters', [])
        dtc = c.get('dtc_code') or (meters[0].get('dtc_code') if meters else None)
        print(f"{c.get('customer_id')}: name={c.get('name')}, dtc={dtc}, lat={c.get('latitude')}, lng={c.get('longitude')}, status={c.get('status')}")

asyncio.run(main())
