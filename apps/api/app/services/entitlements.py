from app.core.db import db


async def company_has_contact_access(company_id: str) -> bool:
    query = """
    SELECT 1
    FROM subscriptions s
    LEFT JOIN plan_entitlements pe ON pe.subscription_plan_id = s.plan_id
    LEFT JOIN entitlements e1 ON e1.id = pe.entitlement_id
    LEFT JOIN subscription_entitlements se ON se.subscription_id = s.id
    LEFT JOIN entitlements e2 ON e2.id = se.entitlement_id
    WHERE s.company_id = $1::uuid
      AND s.status = 'ACTIVE'
      AND (
        e1.code IN ('job.contact.view_premium', 'company.contact.unlock')
        OR e2.code IN ('job.contact.view_premium', 'company.contact.unlock')
      )
    LIMIT 1
    """
    rows = await db.query_raw(query, company_id)
    return len(rows) > 0


async def company_has_candidate_search_access(company_id: str) -> bool:
    query = """
    SELECT 1
    FROM subscriptions s
    LEFT JOIN plan_entitlements pe ON pe.subscription_plan_id = s.plan_id
    LEFT JOIN entitlements e1 ON e1.id = pe.entitlement_id
    LEFT JOIN subscription_entitlements se ON se.subscription_id = s.id
    LEFT JOIN entitlements e2 ON e2.id = se.entitlement_id
    WHERE s.company_id = $1::uuid
      AND s.status = 'ACTIVE'
      AND (
        e1.code IN ('job.contact.view_premium', 'company.contact.unlock', 'candidate.search.unlock')
        OR e2.code IN ('job.contact.view_premium', 'company.contact.unlock', 'candidate.search.unlock')
      )
    LIMIT 1
    """
    rows = await db.query_raw(query, company_id)
    return len(rows) > 0
