## Add Read-Only Task `createdAt` / `updatedAt` Across API + UI

### Summary
Implement consistent task timestamps in API responses and UI (`Created`, `Updated`), enforce read-only behavior on writes, and execute on a fresh branch with local test approval before push.  
This plan will be saved as: `plans/task-created-updated-readonly.md`.

### Plan Artifact
1. First implementation action: save this exact plan to `plans/task-created-updated-readonly.md`.

### Public API / Interface Changes
1. Keep API field names `createdAt` and `updatedAt`.
2. UI text uses `Created` and `Updated`.
3. Reject timestamp fields in task write payloads (`POST`/`PUT`) with `400`.
4. Normalize `DELETE /api/kanban/tasks/:id` `deleted` payload to the same camelCase task shape as other task responses.

### Implementation Steps
1. Create fresh branch: `feat/task-created-updated-readonly`.
2. In `server/index.ts`, add a shared task serializer and use it in:
1. `GET /api/kanban`
2. `POST /api/kanban/tasks`
3. `PUT /api/kanban/tasks/:id`
4. `DELETE /api/kanban/tasks/:id`
3. In `server/index.ts`, add POST/PUT guards to reject `createdAt`, `updatedAt`, `created_at`, `updated_at`, `created`, `updated` in request bodies.
4. In `server/config/swagger.ts`, mark task `createdAt` and `updatedAt` as read-only response properties.
5. In `server/types/index.ts`, align task response timestamp types to ISO string values.
6. In `client/src/types/index.ts`, ensure `KanbanCardTask` includes both `createdAt` and `updatedAt`.
7. In `client/src/components/KanbanBoard.tsx`, add read-only timestamp rendering:
1. Card: `Created`, `Updated`
2. Edit modal: `Created`, `Updated`
8. In `client/src/components/KanbanBoard.css`, add styles for card/modal timestamp metadata.
9. Update tests:
1. Backend integration tests for timestamp presence/shape and timestamp-write rejection.
2. Frontend KanbanBoard tests for `Created`/`Updated` rendering.

### Local Test Gates (Before Any Push)
1. Run backend tests:
1. `tests/integration/kanban-simple.test.js`
2. `tests/integration/kanban.test.js`
3. `tests/integration/kanban-edge-cases.test.js`
2. Run frontend test:
1. `client/src/components/__tests__/KanbanBoard.test.js`
3. Run type-check:
1. `npm run type-check`
4. Share results and pause for your approval before push.

### Push + PR Workflow
1. After your approval, push branch to GitHub.
2. Create PR against default base branch.
3. Include in PR:
1. Summary of API/UI contract changes
2. Test evidence
3. Note that no migration is required

### Existing Production Cards
1. No migration required; `kanban_tasks` already contains non-null `created_at` and `updated_at` defaults.
2. Existing cards will display timestamps immediately after deploy.
3. Post-deploy safety check: verify no null timestamps; run one-time backfill only if unexpected nulls are found.

### Assumptions / Defaults
1. Scope is Kanban tasks only.
2. Timestamp API names remain `createdAt` and `updatedAt`.
3. UI labels are `Created` and `Updated`.
4. Branch name default is `feat/task-created-updated-readonly`.
