from functools import lru_cache

from app.ai.service import TutorAIService
from app.config import get_settings
from app.services.learning_service import LearningService
from app.services.repository import InMemoryRepository, SupabaseRepository

try:
    from supabase import create_client
except ImportError:  # pragma: no cover
    create_client = None


@lru_cache
def get_repository():
    settings = get_settings()
    if settings.supabase_url and settings.supabase_service_role_key:
        return SupabaseRepository(settings)
    return InMemoryRepository()


@lru_cache
def get_ai_service() -> TutorAIService:
    return TutorAIService(get_settings())


@lru_cache
def get_supabase_auth_client():
    settings = get_settings()
    if (
        create_client
        and settings.supabase_url
        and settings.supabase_service_role_key
    ):
        return create_client(settings.supabase_url, settings.supabase_service_role_key)
    return None


@lru_cache
def get_learning_service() -> LearningService:
    settings = get_settings()
    return LearningService(
        repository=get_repository(),
        ai_service=get_ai_service(),
        default_user_id=settings.default_user_id,
    )
