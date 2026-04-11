from dataclasses import dataclass

from fastapi import Depends, Header # type: ignore

from app.config import get_settings
from app.dependencies import get_repository, get_supabase_auth_client
from app.exceptions import AppError


@dataclass
class AuthenticatedUser:
    id: str
    email: str | None = None
    full_name: str | None = None
    school: str | None = None
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

        user_response = supabase_client.auth.get_user(jwt=token)
        user = getattr(user_response, "user", None)
        if user is None:
            raise AppError("Unable to resolve the authenticated user.", status_code=401)

        metadata = getattr(user, "user_metadata", None) or {}
        authenticated_user = AuthenticatedUser(
            id=str(user.id),
            email=getattr(user, "email", None),
            full_name=metadata.get("full_name") or metadata.get("name"),
            school=metadata.get("school"),
            is_demo=False,
        )

        await repository.upsert_user(
            {
                "id": authenticated_user.id,
                "email": authenticated_user.email,
                "password": None,
            }
        )
        return authenticated_user

    return AuthenticatedUser(id=settings.default_user_id, is_demo=True)
