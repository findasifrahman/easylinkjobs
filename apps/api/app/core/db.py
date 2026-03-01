import os

from prisma import Prisma

db = Prisma()


async def connect_db() -> None:
    if os.getenv("SKIP_DB_CONNECT") == "1":
        return
    if not os.getenv("DATABASE_URL"):
        return
    if not db.is_connected():
        await db.connect()


async def disconnect_db() -> None:
    if db.is_connected():
        await db.disconnect()
