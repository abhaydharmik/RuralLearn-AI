from __future__ import annotations

from collections import defaultdict
from copy import deepcopy
from datetime import datetime, timezone
from typing import Protocol

from app.config import Settings

try:
    from supabase import Client, create_client
except ImportError:  # pragma: no cover
    Client = None
    create_client = None


class Repository(Protocol):
    async def upsert_user(self, payload: dict) -> None: ...

    async def list_users(self) -> list[dict]: ...

    async def store_chat_message(self, payload: dict) -> None: ...

    async def list_chat_messages(self, user_id: str) -> list[dict]: ...

    async def store_quiz(self, payload: dict) -> None: ...

    async def store_result(self, payload: dict) -> None: ...

    async def list_results(self, user_id: str) -> list[dict]: ...

    async def list_all_results(self) -> list[dict]: ...

    async def upsert_progress(self, payload: dict) -> None: ...

    async def get_progress(self, user_id: str) -> dict | None: ...

    async def list_progress(self) -> list[dict]: ...


class InMemoryRepository:
    def __init__(self) -> None:
        self.users: dict[str, dict] = {}
        self.chat_messages_by_user: dict[str, list[dict]] = defaultdict(list)
        self.quizzes: dict[str, dict] = {}
        self.results_by_user: dict[str, list[dict]] = defaultdict(list)
        self.progress_by_user: dict[str, dict] = {}

    async def upsert_user(self, payload: dict) -> None:
        self.users[payload["id"]] = deepcopy(payload)

    async def list_users(self) -> list[dict]:
        return deepcopy(list(self.users.values()))

    async def store_chat_message(self, payload: dict) -> None:
        self.chat_messages_by_user[payload["user_id"]].append(deepcopy(payload))

    async def list_chat_messages(self, user_id: str) -> list[dict]:
        return deepcopy(self.chat_messages_by_user.get(user_id, []))

    async def store_quiz(self, payload: dict) -> None:
        self.quizzes[payload["id"]] = deepcopy(payload)

    async def store_result(self, payload: dict) -> None:
        self.results_by_user[payload["user_id"]].append(deepcopy(payload))

    async def list_results(self, user_id: str) -> list[dict]:
        return deepcopy(self.results_by_user.get(user_id, []))

    async def list_all_results(self) -> list[dict]:
        rows: list[dict] = []
        for results in self.results_by_user.values():
            rows.extend(deepcopy(results))
        return sorted(rows, key=lambda row: row.get("submitted_at") or "")

    async def upsert_progress(self, payload: dict) -> None:
        self.progress_by_user[payload["user_id"]] = deepcopy(payload)

    async def get_progress(self, user_id: str) -> dict | None:
        progress = self.progress_by_user.get(user_id)
        return deepcopy(progress) if progress else None

    async def list_progress(self) -> list[dict]:
        return deepcopy(list(self.progress_by_user.values()))


class SupabaseRepository:
    def __init__(self, settings: Settings) -> None:
        if not create_client or not settings.supabase_url or not settings.supabase_service_role_key:
            raise ValueError("Supabase configuration is incomplete.")

        self.client: Client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )

    async def upsert_user(self, payload: dict) -> None:
        self.client.table("users").upsert(payload).execute()

    async def list_users(self) -> list[dict]:
        response = self.client.table("users").select("*").execute()
        return response.data or []

    async def store_chat_message(self, payload: dict) -> None:
        self.client.table("chat_messages").insert(payload).execute()

    async def list_chat_messages(self, user_id: str) -> list[dict]:
        response = (
            self.client.table("chat_messages")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )
        return response.data or []

    async def store_quiz(self, payload: dict) -> None:
        self.client.table("quizzes").insert(payload).execute()

    async def store_result(self, payload: dict) -> None:
        self.client.table("results").insert(payload).execute()

    async def list_results(self, user_id: str) -> list[dict]:
        response = (
            self.client.table("results")
            .select("*")
            .eq("user_id", user_id)
            .order("submitted_at", desc=False)
            .execute()
        )
        return response.data or []

    async def list_all_results(self) -> list[dict]:
        response = (
            self.client.table("results")
            .select("*")
            .order("submitted_at", desc=False)
            .execute()
        )
        return response.data or []

    async def upsert_progress(self, payload: dict) -> None:
        payload = {**payload, "updated_at": datetime.now(timezone.utc).isoformat()}
        self.client.table("progress").upsert(payload).execute()

    async def get_progress(self, user_id: str) -> dict | None:
        response = (
            self.client.table("progress")
            .select("*")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not response.data:
            return None
        return response.data[0]

    async def list_progress(self) -> list[dict]:
        response = self.client.table("progress").select("*").execute()
        return response.data or []
