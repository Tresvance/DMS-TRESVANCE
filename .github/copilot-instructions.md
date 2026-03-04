# Copilot Instructions for DMS-TRESVANCE

## Big picture
- Monorepo with Django REST backend (`backend/`) and React + Vite frontend (`frontend/`).
- Backend is organized by bounded apps: `users`, `clinics`, `patients`, `appointments`, `records`, `medicines`, `billing`, `support`.
- API root wiring is centralized in `backend/dms_project/urls.py` under `/api/*`.
- Frontend consumes API through one Axios client in `frontend/src/services/api.js`; page components should call these wrappers, not raw `fetch`.

## Auth, roles, and data scoping (critical)
- JWT auth via SimpleJWT (`/api/auth/login/`, `/api/auth/token/refresh/`, `/api/auth/logout/`).
- Source of truth for roles is `apps.users.models.User.Role` (`SUPER_ADMIN`, `SUPPORT_AGENT`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTION`).
- Permission classes live in `backend/apps/users/permissions.py`; reuse these before creating new permission logic.
- Most ViewSets enforce visibility by overriding `get_queryset()` based on `request.user.role` and `request.user.clinic` (see `patients/views.py`, `records/views.py`, `support/views.py`).
- When adding endpoints, preserve tenant boundaries: non-super users should be scoped to clinic or self-owned records.

## Backend implementation patterns
- Standard pattern per app: `models.py` + `serializers.py` + `views.py` + router in `urls.py`.
- Prefer DRF `ModelViewSet` with `filter_backends`, `filterset_fields`, `search_fields`, and optional `ordering`.
- Use `perform_create()` to stamp clinic/user ownership (examples: `patients/views.py`, `support/views.py`).
- `users/views.py` uses custom actions (`@action`) for `/users/me/` and `/users/change_password/`; follow this style for non-CRUD operations.
- Keep queryset performance pattern: `select_related(...)` is used consistently for related FK data.

## Frontend implementation patterns
- Routing + RBAC is in `frontend/src/App.jsx` (`ProtectedRoute` + `allowedRoles` + dashboard redirect map).
- Role-specific navigation is centralized in `frontend/src/components/Layout.jsx` (`navConfig` / `roleLabels`).
- Keep API calls in `frontend/src/services/api.js`; add resource sections as `{resource}API` with `list/get/create/update/patch/delete` naming.
- Auth state is managed by `frontend/src/context/AuthContext.jsx`; tokens are in `localStorage` keys `access_token` and `refresh_token`.
- Axios interceptor auto-refreshes access token on `401` and redirects to `/login` on refresh failure.

## Run/build workflows
- Docker full stack: `docker-compose up --build` (backend on `:8000`, frontend on `:5173`).
- Local helper script: `start.bat` opens 2 shells and expects `backend/venv/Scripts/activate` + `npm run dev`.
- Backend dev: `cd backend && python manage.py runserver`.
- Frontend dev: `cd frontend && npm run dev`.
- Frontend build: `cd frontend && npm run build`.

## Environment/integration gotchas
- `frontend/vite.config.js` proxies `/api` to `http://backend:8000` (Docker service name). For non-Docker local runs, set `VITE_API_URL=http://localhost:8000/api`.
- `backend/dms_project/settings.py` is configured for MySQL by default (`DB_HOST` defaults to `db`), while repo also contains `backend/db.sqlite3` and a commented SQLite config.
- `docker-compose.yml` runs `makemigrations` for each app on startup before `migrate`; avoid introducing noisy model changes unless intended.
- Support module includes custom routes/actions under `/api/support/tickets/*` and `/api/support/agents/`; keep frontend `supportAPI` in sync when adding actions.

## What to check before finishing changes
- Verify role access paths in both backend permissions and frontend route guards.
- If model/serializer fields change, update corresponding UI forms/pages and API wrapper methods together.
- There is no established test suite in this repo; validate by running key role flows manually via UI/API.
