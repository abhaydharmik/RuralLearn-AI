from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "RuralLearn AI API"
    app_env: str = "development"
    debug: bool = True
    allowed_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    default_user_id: str = "demo-student"

    use_mock_ai: bool = True
    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"

    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_anon_key: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return value

        if not value:
            return []

        return [item.strip() for item in value.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
