# Dynamic RBAC model

## Principle
Roles and permissions are data, not code constants. New roles should be added via DB/admin tooling without requiring deployment.

## Core entities (planned)
- `roles`: role definitions (e.g., `job_seeker`, `job_admin`, `super_admin`, future custom roles).
- `permissions`: granular action keys (e.g., `job.create`, `job.publish`, `application.read`).
- `role_permissions`: many-to-many mapping.
- `user_roles`: user-to-role assignment (scoped globally or per company).

## Evaluation flow
1. Resolve user roles for current tenant/company scope.
2. Expand to effective permissions from role mappings.
3. Check endpoint policy against required permissions.
4. Cache effective permissions in Redis with short TTL + invalidation hooks.

## Notes
- Keep policy checks centralized in API authorization service.
- Use permission keys as stable API contracts across frontend/backend.
