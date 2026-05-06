from __future__ import annotations

from collections import defaultdict
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Protocol

from app.config import Settings

try:
    from supabase import Client, create_client
except ImportError:  # pragma: no cover
    Client = None
    create_client = None


class Repository(Protocol):
    async def upsert_user(self, payload: dict) -> None: ...

    async def get_user(self, user_id: str) -> dict | None: ...

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

    async def store_audit_log(self, payload: dict) -> None: ...

    async def list_audit_logs(self) -> list[dict]: ...

    async def upsert_system_settings(self, settings: dict[str, Any]) -> None: ...

    async def get_system_settings(self) -> dict[str, Any]: ...

    async def store_ai_usage(self, payload: dict) -> None: ...

    async def list_ai_usage(self) -> list[dict]: ...


class ResilientRepository:
    def __init__(self, primary: Repository, fallback: Repository) -> None:
        self.primary = primary
        self.fallback = fallback

    async def _run(self, primary_method, fallback_method, *args, **kwargs):
        try:
            return await primary_method(*args, **kwargs)
        except Exception:
            return await fallback_method(*args, **kwargs)

    async def upsert_user(self, payload: dict) -> None:
        await self._run(self.primary.upsert_user, self.fallback.upsert_user, payload)

    async def get_user(self, user_id: str) -> dict | None:
        return await self._run(self.primary.get_user, self.fallback.get_user, user_id)

    async def list_users(self) -> list[dict]:
        return await self._run(self.primary.list_users, self.fallback.list_users)

    async def store_chat_message(self, payload: dict) -> None:
        await self._run(self.primary.store_chat_message, self.fallback.store_chat_message, payload)

    async def list_chat_messages(self, user_id: str) -> list[dict]:
        return await self._run(self.primary.list_chat_messages, self.fallback.list_chat_messages, user_id)

    async def store_quiz(self, payload: dict) -> None:
        await self._run(self.primary.store_quiz, self.fallback.store_quiz, payload)

    async def store_result(self, payload: dict) -> None:
        await self._run(self.primary.store_result, self.fallback.store_result, payload)

    async def list_results(self, user_id: str) -> list[dict]:
        return await self._run(self.primary.list_results, self.fallback.list_results, user_id)

    async def list_all_results(self) -> list[dict]:
        return await self._run(self.primary.list_all_results, self.fallback.list_all_results)

    async def upsert_progress(self, payload: dict) -> None:
        await self._run(self.primary.upsert_progress, self.fallback.upsert_progress, payload)

    async def get_progress(self, user_id: str) -> dict | None:
        return await self._run(self.primary.get_progress, self.fallback.get_progress, user_id)

    async def list_progress(self) -> list[dict]:
        return await self._run(self.primary.list_progress, self.fallback.list_progress)

    async def store_audit_log(self, payload: dict) -> None:
        await self._run(self.primary.store_audit_log, self.fallback.store_audit_log, payload)

    async def list_audit_logs(self) -> list[dict]:
        return await self._run(self.primary.list_audit_logs, self.fallback.list_audit_logs)

    async def upsert_system_settings(self, settings: dict[str, Any]) -> None:
        await self._run(self.primary.upsert_system_settings, self.fallback.upsert_system_settings, settings)

    async def get_system_settings(self) -> dict[str, Any]:
        return await self._run(self.primary.get_system_settings, self.fallback.get_system_settings)

    async def store_ai_usage(self, payload: dict) -> None:
        await self._run(self.primary.store_ai_usage, self.fallback.store_ai_usage, payload)

    async def list_ai_usage(self) -> list[dict]:
        return await self._run(self.primary.list_ai_usage, self.fallback.list_ai_usage)


class InMemoryRepository:
    def __init__(self) -> None:
        self.users: dict[str, dict] = {}
        self.chat_messages_by_user: dict[str, list[dict]] = defaultdict(list)
        self.quizzes: dict[str, dict] = {}
        self.results_by_user: dict[str, list[dict]] = defaultdict(list)
        self.progress_by_user: dict[str, dict] = {}
        self.audit_logs: list[dict] = []
        self.system_settings: dict[str, Any] = {}
        self.ai_usage_logs: list[dict] = []

    async def upsert_user(self, payload: dict) -> None:
        existing = self.users.get(payload["id"], {})
        merged = {
            **existing,
            **deepcopy(payload),
        }
        merged.setdefault("created_at", self._now())
        self.users[payload["id"]] = merged

    async def get_user(self, user_id: str) -> dict | None:
        user = self.users.get(user_id)
        return deepcopy(user) if user else None

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

    async def store_audit_log(self, payload: dict) -> None:
        self.audit_logs.append(deepcopy(payload))

    async def list_audit_logs(self) -> list[dict]:
        return deepcopy(self.audit_logs)

    async def upsert_system_settings(self, settings: dict[str, Any]) -> None:
        self.system_settings.update(deepcopy(settings))

    async def get_system_settings(self) -> dict[str, Any]:
        return deepcopy(self.system_settings)

    async def store_ai_usage(self, payload: dict) -> None:
        self.ai_usage_logs.append(deepcopy(payload))

    async def list_ai_usage(self) -> list[dict]:
        return deepcopy(self.ai_usage_logs)

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()


class SupabaseRepository:
    def __init__(self, settings: Settings) -> None:
        if not create_client or not settings.supabase_url or not settings.supabase_service_role_key:
            raise ValueError("Supabase configuration is incomplete.")

        self.client: Client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )

    async def upsert_user(self, payload: dict) -> None:
        current = await self.get_user(payload["id"])
        merged = {
            **(current or {}),
            **payload,
        }
        merged.setdefault("created_at", self._now())
        self.client.table("users").upsert(merged).execute()

    async def get_user(self, user_id: str) -> dict | None:
        response = (
            self.client.table("users")
            .select("*")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        if not response.data:
            return None
        return response.data[0]

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
        payload = {**payload, "updated_at": self._now()}
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

    async def store_audit_log(self, payload: dict) -> None:
        self.client.table("audit_logs").insert(payload).execute()

    async def list_audit_logs(self) -> list[dict]:
        response = (
            self.client.table("audit_logs")
            .select("*")
            .order("created_at", desc=False)
            .execute()
        )
        return response.data or []

    async def upsert_system_settings(self, settings: dict[str, Any]) -> None:
        for key, value in settings.items():
            self.client.table("system_settings").upsert(
                {
                    "key": key,
                    "value": value,
                    "updated_at": self._now(),
                }
            ).execute()

    async def get_system_settings(self) -> dict[str, Any]:
        response = self.client.table("system_settings").select("*").execute()
        rows = response.data or []
        return {row["key"]: row.get("value") for row in rows if row.get("key")}

    async def store_ai_usage(self, payload: dict) -> None:
        self.client.table("ai_usage_logs").insert(payload).execute()

    async def list_ai_usage(self) -> list[dict]:
        response = (
            self.client.table("ai_usage_logs")
            .select("*")
            .order("created_at", desc=False)
            .execute()
        )
        return response.data or []

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()
