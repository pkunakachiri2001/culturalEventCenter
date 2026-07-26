import asyncio
from app.database import init_db

async def main():
    await init_db()
    print("Done")

if __name__ == "__main__":
    asyncio.run(main())
