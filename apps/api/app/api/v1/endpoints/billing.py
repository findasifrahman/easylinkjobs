from fastapi import APIRouter, Depends

from app.core.authz import get_current_user
from app.core.db import db
from app.core.responses import ok

router = APIRouter()


@router.get("/plans")
async def list_plans() -> dict:
    plans = await db.subscriptionplan.find_many(where={"isActive": True}, order={"amountCents": "asc"}, take=50)
    return ok([plan.model_dump(mode="json") for plan in plans])


@router.get("/providers")
async def list_billing_providers(_: dict[str, str] = Depends(get_current_user)) -> dict:
    return ok(
        {
            "providers": [
                {"code": "stripe_placeholder", "status": "planned", "notes": "Card billing integration later"},
                {"code": "manual_invoice", "status": "available", "notes": "Ops-assisted invoicing placeholder"},
            ]
        }
    )
