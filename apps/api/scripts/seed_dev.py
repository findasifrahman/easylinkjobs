import asyncio
from decimal import Decimal

from prisma import Json, Prisma

from app.core.security import hash_password


DEV_PASSWORD = "DevPass123"


async def _ensure_role_with_permissions(
    db: Prisma, *, role_key: str, role_name: str, permission_keys: list[str], is_system: bool = True
) -> str:
    role = await db.role.upsert(
        where={"key": role_key},
        data={
            "create": {"key": role_key, "name": role_name, "isSystem": is_system},
            "update": {"name": role_name, "isSystem": is_system},
        },
    )
    for key in permission_keys:
        permission = await db.permission.upsert(
            where={"key": key},
            data={"create": {"key": key, "name": key}, "update": {"name": key}},
        )
        await db.rolepermission.upsert(
            where={"roleId_permissionId": {"roleId": role.id, "permissionId": permission.id}},
            data={"create": {"roleId": role.id, "permissionId": permission.id}, "update": {}},
        )
    return role.id


async def _seed() -> None:
    db = Prisma()
    await db.connect()
    try:
        dev_password_hash = hash_password(DEV_PASSWORD)
        super_admin_user = await db.user.upsert(
            where={"email": "superadmin@easylinkjobs.dev"},
            data={
                "create": {
                    "email": "superadmin@easylinkjobs.dev",
                    "passwordHash": dev_password_hash,
                    "status": "ACTIVE",
                },
                "update": {"status": "ACTIVE", "passwordHash": dev_password_hash},
            },
        )
        job_admin_user = await db.user.upsert(
            where={"email": "admin@acmechina.dev"},
            data={
                "create": {
                    "email": "admin@acmechina.dev",
                    "passwordHash": dev_password_hash,
                    "status": "ACTIVE",
                },
                "update": {"status": "ACTIVE", "passwordHash": dev_password_hash},
            },
        )
        candidate_user = await db.user.upsert(
            where={"email": "candidate@easylinkjobs.dev"},
            data={
                "create": {
                    "email": "candidate@easylinkjobs.dev",
                    "passwordHash": dev_password_hash,
                    "status": "ACTIVE",
                },
                "update": {"status": "ACTIVE", "passwordHash": dev_password_hash},
            },
        )

        super_admin_role_id = await _ensure_role_with_permissions(
            db,
            role_key="super_admin",
            role_name="Super Admin",
            permission_keys=[
                "admin:access",
                "platform.manage",
                "rbac.manage",
                "company.verify",
                "companies:create",
                "companies:update",
                "jobs:create",
                "jobs:update",
                "jobs:delete",
                "applications:read",
                "applications:update",
            ],
        )
        job_admin_role_id = await _ensure_role_with_permissions(
            db,
            role_key="job_admin",
            role_name="Job Admin",
            permission_keys=[
                "companies:create",
                "companies:update",
                "jobs:create",
                "jobs:update",
                "applications:read",
                "applications:update",
            ],
        )
        candidate_role_id = await _ensure_role_with_permissions(
            db,
            role_key="job_seeker",
            role_name="Job Seeker",
            permission_keys=["applications:create", "applications:read_own", "profile:manage_own"],
        )

        super_admin_user_role = await db.userrole.find_first(
            where={"userId": super_admin_user.id, "roleId": super_admin_role_id, "companyId": None}
        )
        if super_admin_user_role is None:
            await db.userrole.create(data={"userId": super_admin_user.id, "roleId": super_admin_role_id})

        company = await db.company.upsert(
            where={"slug": "acme-china-tech"},
            data={
                "create": {
                    "name": "ACME China Tech",
                    "slug": "acme-china-tech",
                    "companyType": "WFOE",
                    "orgSize": "MEDIUM",
                    "website": "https://acmechina.dev",
                    "description": "Demo employer for seed data.",
                    "city": "Shanghai",
                    "province": "Shanghai",
                    "country": "China",
                    "verificationStatus": "VERIFIED",
                },
                "update": {
                    "companyType": "WFOE",
                    "orgSize": "MEDIUM",
                    "city": "Shanghai",
                    "province": "Shanghai",
                    "country": "China",
                    "verificationStatus": "VERIFIED",
                },
            },
        )

        await db.companymember.upsert(
            where={"companyId_userId": {"companyId": company.id, "userId": job_admin_user.id}},
            data={
                "create": {
                    "companyId": company.id,
                    "userId": job_admin_user.id,
                    "roleId": job_admin_role_id,
                    "title": "Recruiter Lead",
                },
                "update": {"roleId": job_admin_role_id, "title": "Recruiter Lead", "status": "ACTIVE"},
            },
        )
        await db.userrole.upsert(
            where={"userId_roleId_companyId": {"userId": job_admin_user.id, "roleId": job_admin_role_id, "companyId": company.id}},
            data={
                "create": {"userId": job_admin_user.id, "roleId": job_admin_role_id, "companyId": company.id},
                "update": {},
            },
        )

        candidate_user_role = await db.userrole.find_first(
            where={"userId": candidate_user.id, "roleId": candidate_role_id, "companyId": None}
        )
        if candidate_user_role is None:
            await db.userrole.create(data={"userId": candidate_user.id, "roleId": candidate_role_id})

        industry = await db.industry.upsert(
            where={"slug": "education"},
            data={"create": {"slug": "education"}, "update": {"isActive": True}},
        )
        job_function = await db.jobfunction.upsert(
            where={"slug": "teaching"},
            data={"create": {"slug": "teaching"}, "update": {"isActive": True}},
        )
        category = await db.jobcategory.upsert(
            where={"slug": "esl-teaching"},
            data={
                "create": {
                    "slug": "esl-teaching",
                    "industryId": industry.id,
                    "jobFunctionId": job_function.id,
                },
                "update": {"industryId": industry.id, "jobFunctionId": job_function.id, "isActive": True},
            },
        )

        for locale, name in [("EN", "ESL Teaching"), ("ZH", "英语教学"), ("BN", "ইংরেজি শিক্ষাদান")]:
            await db.taxonomytranslation.upsert(
                where={
                    "entityType_entityId_locale": {
                        "entityType": "CATEGORY",
                        "entityId": category.id,
                        "locale": locale,
                    }
                },
                data={
                    "create": {
                        "entityType": "CATEGORY",
                        "entityId": category.id,
                        "locale": locale,
                        "name": name,
                    },
                    "update": {"name": name},
                },
            )

        urgent_tag = await db.jobtag.upsert(
            where={"slug": "urgent-hire"},
            data={"create": {"slug": "urgent-hire", "label": "Urgent Hire"}, "update": {"label": "Urgent Hire"}},
        )

        contact_entitlement = await db.entitlement.upsert(
            where={"code": "job.contact.view_premium"},
            data={
                "create": {
                    "code": "job.contact.view_premium",
                    "name": "View candidate contact",
                    "scope": "COMPANY",
                },
                "update": {"name": "View candidate contact", "scope": "COMPANY"},
            },
        )
        unlock_entitlement = await db.entitlement.upsert(
            where={"code": "company.contact.unlock"},
            data={
                "create": {
                    "code": "company.contact.unlock",
                    "name": "One-off contact unlock",
                    "scope": "COMPANY",
                },
                "update": {"name": "One-off contact unlock", "scope": "COMPANY"},
            },
        )
        candidate_search_entitlement = await db.entitlement.upsert(
            where={"code": "candidate.search.unlock"},
            data={
                "create": {
                    "code": "candidate.search.unlock",
                    "name": "Recruiter candidate search",
                    "scope": "COMPANY",
                },
                "update": {"name": "Recruiter candidate search", "scope": "COMPANY"},
            },
        )
        free_plan = await db.subscriptionplan.upsert(
            where={"code": "free_company"},
            data={
                "create": {
                    "code": "free_company",
                    "name": "Free Company",
                    "amountCents": 0,
                    "currency": "USD",
                    "billingInterval": "month",
                    "features": Json({"contact_locked": True}),
                },
                "update": {"name": "Free Company", "amountCents": 0, "features": Json({"contact_locked": True})},
            },
        )
        premium_plan = await db.subscriptionplan.upsert(
            where={"code": "premium_company"},
            data={
                "create": {
                    "code": "premium_company",
                    "name": "Premium Company",
                    "amountCents": 9900,
                    "currency": "USD",
                    "billingInterval": "month",
                    "features": Json({"contact_view": True, "candidate_search": True}),
                },
                "update": {
                    "name": "Premium Company",
                    "amountCents": 9900,
                    "features": Json({"contact_view": True, "candidate_search": True}),
                },
            },
        )
        await db.planentitlement.upsert(
            where={
                "subscriptionPlanId_entitlementId": {
                    "subscriptionPlanId": premium_plan.id,
                    "entitlementId": contact_entitlement.id,
                }
            },
            data={
                "create": {"subscriptionPlanId": premium_plan.id, "entitlementId": contact_entitlement.id},
                "update": {},
            },
        )
        await db.planentitlement.upsert(
            where={
                "subscriptionPlanId_entitlementId": {
                    "subscriptionPlanId": premium_plan.id,
                    "entitlementId": unlock_entitlement.id,
                }
            },
            data={
                "create": {"subscriptionPlanId": premium_plan.id, "entitlementId": unlock_entitlement.id},
                "update": {},
            },
        )
        await db.planentitlement.upsert(
            where={
                "subscriptionPlanId_entitlementId": {
                    "subscriptionPlanId": premium_plan.id,
                    "entitlementId": candidate_search_entitlement.id,
                }
            },
            data={
                "create": {"subscriptionPlanId": premium_plan.id, "entitlementId": candidate_search_entitlement.id},
                "update": {},
            },
        )

        direct_job = await db.job.upsert(
            where={"id": "00000000-0000-0000-0000-000000000001"},
            data={
                "create": {
                    "id": "00000000-0000-0000-0000-000000000001",
                    "companyId": company.id,
                    "categoryId": category.id,
                    "title": "ESL Teacher - Shanghai Campus",
                    "description": "Teach spoken English to middle school students.",
                    "languageCode": "EN",
                    "foreignerEligible": True,
                    "visaSponsorship": True,
                    "workPermitSupport": True,
                    "chineseRequiredLevel": "BASIC",
                    "englishRequired": True,
                    "relocationSupport": True,
                    "housingProvided": True,
                    "experienceYears": 2,
                    "educationLevel": "BACHELORS",
                    "salaryMin": 18000,
                    "salaryMax": 26000,
                    "currency": "CNY",
                    "city": "Shanghai",
                    "province": "Shanghai",
                    "country": "China",
                    "jobType": "FULL_TIME",
                    "remotePolicy": "ONSITE",
                    "headcount": 3,
                    "benefits": Json({"items": ["Housing", "Flight allowance"]}),
                    "screeningQuestions": Json({"questions": ["Have you taught in China before?"]}),
                    "source": "DIRECT",
                    "contactVisibilityPolicy": "APPLICANTS_ONLY",
                    "isPublished": True,
                },
                "update": {
                    "categoryId": category.id,
                    "source": "DIRECT",
                    "visaSponsorship": True,
                    "foreignerEligible": True,
                    "jobType": "FULL_TIME",
                    "remotePolicy": "ONSITE",
                },
            },
        )

        scraped_job = await db.job.upsert(
            where={"id": "00000000-0000-0000-0000-000000000002"},
            data={
                "create": {
                    "id": "00000000-0000-0000-0000-000000000002",
                    "companyId": company.id,
                    "categoryId": category.id,
                    "title": "Online IELTS Tutor",
                    "description": "Prepare students for IELTS modules.",
                    "languageCode": "EN",
                    "foreignerEligible": True,
                    "visaSponsorship": False,
                    "workPermitSupport": False,
                    "chineseRequiredLevel": "NONE",
                    "englishRequired": True,
                    "relocationSupport": False,
                    "housingProvided": False,
                    "experienceYears": 1,
                    "educationLevel": "BACHELORS",
                    "salaryMin": 12000,
                    "salaryMax": 18000,
                    "currency": "CNY",
                    "city": "Hangzhou",
                    "province": "Zhejiang",
                    "country": "China",
                    "jobType": "PART_TIME",
                    "remotePolicy": "REMOTE",
                    "headcount": 2,
                    "benefits": Json({"items": ["Flexible hours"]}),
                    "screeningQuestions": Json({"questions": ["Do you have IELTS tutoring experience?"]}),
                    "source": "SCRAPED",
                    "sourceUrl": "https://partner.example/jobs/ielts-001",
                    "contactVisibilityPolicy": "PREMIUM_ONLY",
                    "isPublished": True,
                },
                "update": {
                    "categoryId": category.id,
                    "source": "SCRAPED",
                    "sourceUrl": "https://partner.example/jobs/ielts-001",
                    "jobType": "PART_TIME",
                    "remotePolicy": "REMOTE",
                },
            },
        )

        for job in [direct_job, scraped_job]:
            await db.joblanguagerequirement.upsert(
                where={"jobId_language": {"jobId": job.id, "language": "ENGLISH"}},
                data={"create": {"jobId": job.id, "language": "ENGLISH", "level": "ADVANCED"}, "update": {"level": "ADVANCED"}},
            )
            await db.joblocation.delete_many(where={"jobId": job.id})
            await db.joblocation.create(
                data={
                    "jobId": job.id,
                    "country": "China",
                    "province": job.province,
                    "city": job.city,
                    "district": None,
                    "address": None,
                    "latitude": Decimal("31.230400") if job.city == "Shanghai" else Decimal("30.274100"),
                    "longitude": Decimal("121.473700") if job.city == "Shanghai" else Decimal("120.155100"),
                }
            )
        await db.jobtags.upsert(
            where={"jobId_tagId": {"jobId": direct_job.id, "tagId": urgent_tag.id}},
            data={"create": {"jobId": direct_job.id, "tagId": urgent_tag.id}, "update": {}},
        )
        await db.joballowednationality.upsert(
            where={"jobId_nationalityCode": {"jobId": direct_job.id, "nationalityCode": "BD"}},
            data={"create": {"jobId": direct_job.id, "nationalityCode": "BD"}, "update": {}},
        )

        candidate = await db.candidate.upsert(
            where={"userId": candidate_user.id},
            data={
                "create": {
                    "userId": candidate_user.id,
                    "status": "CLAIMED",
                    "source": "seed_dev",
                    "profileCompletionScore": 95,
                    "metadata": Json({"imported": False}),
                },
                "update": {"status": "CLAIMED", "profileCompletionScore": 95},
            },
        )
        await db.candidateprofile.upsert(
            where={"candidateId": candidate.id},
            data={
                "create": {
                    "candidateId": candidate.id,
                    "fullName": "Rahim Uddin",
                    "dob": "1998-05-12T00:00:00.000Z",
                    "fatherName": "Karim Uddin",
                    "motherName": "Amina Begum",
                    "nationality": "Bangladeshi",
                    "currentCountry": "Bangladesh",
                    "currentCity": "Dhaka",
                    "phone": "+8801700000000",
                    "email": "candidate@easylinkjobs.dev",
                    "chinaEducation": False,
                    "everBeenToChina": True,
                    "everRejectedChina": False,
                    "hskLevel": 4,
                    "englishProficiencyType": "IELTS",
                    "englishScoreOverall": Decimal("7.5"),
                    "desiredJobTitles": ["English Teacher"],
                    "desiredCities": ["Shanghai"],
                    "salaryExpectation": 22000,
                    "visaStatus": "No current work visa",
                    "workPermitStatus": "Not issued",
                },
                "update": {"desiredCities": ["Shanghai"], "salaryExpectation": 22000},
            },
        )

        application = await db.application.upsert(
            where={"jobId_candidateId": {"jobId": direct_job.id, "candidateId": candidate.id}},
            data={
                "create": {
                    "jobId": direct_job.id,
                    "candidateId": candidate.id,
                    "status": "APPLIED",
                    "candidateSnapshot": Json({
                        "full_name": "Rahim Uddin",
                        "nationality": "Bangladeshi",
                        "hsk_level": 4,
                        "ielts_overall": 7.5,
                    }),
                    "coverLetter": "I can relocate to Shanghai within 30 days.",
                    "screeningAnswers": Json({"can_relocate": True}),
                },
                "update": {"status": "APPLIED"},
            },
        )
        await db.applicationevent.create(
            data={
                "applicationId": application.id,
                "actorUserId": candidate_user.id,
                "statusFrom": None,
                "statusTo": "APPLIED",
                "eventName": "application_submitted",
                "payload": Json({"source": "seed_dev"}),
            }
        )

        print("Seed complete:")
        print("- super_admin: superadmin@easylinkjobs.dev")
        print("- job_admin: admin@acmechina.dev")
        print("- candidate: candidate@easylinkjobs.dev")
        print(f"- shared dev password: {DEV_PASSWORD}")
        print("- jobs: 1 direct + 1 scraped")
        print("- applications: 1")
    finally:
        await db.disconnect()


def main() -> None:
    asyncio.run(_seed())


if __name__ == "__main__":
    main()
