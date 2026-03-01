import argparse
import asyncio

from app.core.db import db
from app.services.archiving import run_archive


async def _main(tracking_days: int, application_days: int) -> None:
    await db.connect()
    try:
        result = await run_archive(tracking_days=tracking_days, application_days=application_days)
        print(result)
    finally:
        await db.disconnect()


def main() -> None:
    parser = argparse.ArgumentParser(description="Archive old tracking events and applications.")
    parser.add_argument("--tracking-days", type=int, default=90)
    parser.add_argument("--application-days", type=int, default=180)
    args = parser.parse_args()
    asyncio.run(_main(args.tracking_days, args.application_days))


if __name__ == "__main__":
    main()
