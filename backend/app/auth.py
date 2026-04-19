from dataclasses import dataclass

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
    role: str = "student"
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
        role = str(
            app_metadata.get("role")
            or metadata.get("role")
            or metadata.get("user_role")
            or "student"
        ).lower()
        is_admin = role in {"admin", "teacher"} or (
            email is not None and email.lower() in settings.admin_email_list
        )
        authenticated_user = AuthenticatedUser(
            id=str(user.id),
            email=email,
            full_name=metadata.get("full_name") or metadata.get("name"),
            school=metadata.get("school"),
            role="admin" if is_admin else role,
            is_admin=is_admin,
            is_demo=False,
        )

        await repository.upsert_user(
            {
                "id": authenticated_user.id,
                "email": authenticated_user.email or f"{authenticated_user.id}@supabase.local",
                "password": None,
            }
        )
        return authenticated_user

    return AuthenticatedUser(id=settings.default_user_id, is_demo=True)


async def require_admin(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if not current_user.is_admin:
        raise AppError("Admin access is required for this dashboard.", status_code=403)
    return current_user
