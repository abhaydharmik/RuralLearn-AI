from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import Depends, Header  # type: ignore

from app.config import get_settings
from app.dependencies import get_repository, get_supabase_auth_client
from app.exceptions import AppError


@dataclass
class AuthenticatedUser:
    id: str
    email: str | None = None
    full_name: str | None = None
    school: str | None = None
    class_grade: str | None = None
    role: str = "student"
    status: str = "active"
    is_admin: bool = False
    is_demo: bool = False


async def get_current_user(
    authorization: str | None = Header(default=None),
    repository=Depends(get_repository),
    supabase_client=Depends(get_supabase_auth_client),
) -> AuthenticatedUser:
    settings = get_settings()

    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise AppError("Invalid authorization header.", status_code=401)

        if supabase_client is None:
            raise AppError(
                "Supabase backend auth is not configured. Add server credentials first.",
                status_code=503,
            )

        try:
            user_response = supabase_client.auth.get_user(jwt=token)
        except Exception as exc:
            raise AppError("Invalid or expired login token. Please sign in again.", status_code=401) from exc

        user = getattr(user_response, "user", None)
        if user is None:
            raise AppError("Unable to resolve the authenticated user.", status_code=401)

        metadata = getattr(user, "user_metadata", None) or {}
        app_metadata = getattr(user, "app_metadata", None) or {}
        email = getattr(user, "email", None)
        existing_user = await repository.get_user(str(user.id))
        role = str(
            (existing_user or {}).get("role")
            or app_metadata.get("role")
            or metadata.get("role")
            or metadata.get("user_role")
            or "student"
        ).lower()
        status = str((existing_user or {}).get("status") or "active").lower()
        if status not in {"active", "disabled", "suspended"}:
            status = "active"

        if status != "active":
            raise AppError("This account is currently disabled. Please contact the administrator.", status_code=403)

        is_admin = role in {"admin", "teacher"} or (
            email is not None and email.lower() in settings.admin_email_list
        )
        authenticated_user = AuthenticatedUser(
            id=str(user.id),
            email=email,
            full_name=(existing_user or {}).get("full_name") or metadata.get("full_name") or metadata.get("name"),
            school=(existing_user or {}).get("school") or metadata.get("school"),
            class_grade=(existing_user or {}).get("class_grade"),
            role="admin" if is_admin else role,
            status=status,
            is_admin=is_admin,
            is_demo=False,
        )

        await repository.upsert_user(
            {
                "id": authenticated_user.id,
                "email": authenticated_user.email or f"{authenticated_user.id}@supabase.local",
                "full_name": authenticated_user.full_name or "Student",
                "school": authenticated_user.school or "Rural Community School",
                "class_grade": authenticated_user.class_grade or "",
                "role": authenticated_user.role,
                "status": authenticated_user.status,
                "is_admin": authenticated_user.is_admin,
                "password": None,
                "last_login": datetime.now(timezone.utc).isoformat(),
            }
        )
        return authenticated_user

    return AuthenticatedUser(id=settings.default_user_id, status="active", is_demo=True)


async def require_admin(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if not current_user.is_admin:
        raise AppError("Admin access is required for this dashboard.", status_code=403)
    return current_user
