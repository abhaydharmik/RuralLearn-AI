from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from uuid import uuid4

from app.ai.service import TutorAIService
from app.exceptions import ValidationError
from app.models import (
    AIUsageResponse,
    AdminDashboardResponse,
    AdminPermissionsResponse,
    AdminSettingsResponse,
    AdminSettingsUpdateRequest,
    AdminStudentSummary,
    AdminUserRecord,
    AdminUserUpdateRequest,
    AdminUsersResponse,
    AuditLogEntry,
    AuditLogsResponse,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    PermissionMatrixRole,
    ProgressResponse,
    QuestionReview,
    QuizHistoryItem,
    QuizHistoryResponse,
    QuizRequest,
    QuizResponse,
    QuizSubmissionRequest,
    QuizSubmissionResponse,
    ReportExportRequest,
    ReportExportResponse,
    RevisionRequest,
    RevisionResponse,
    SystemSettingItem,
    WeakTopicCount,
)
from app.models.progress import RecentResult
from app.models.quiz import DifficultyLevel
from app.services.personalization import resolve_difficulty
from app.services.repository import Repository


class LearningService:
    SETTING_DEFINITIONS = {
        "maintenance_mode": {
            "label": "Maintenance mode",
            "description": "Temporarily pause learner activity while admins review or update the system.",
            "value": False,
            "inputType": "boolean",
        },
        "default_quiz_difficulty": {
            "label": "Default quiz difficulty",
            "description": "Starting level used before a learner has enough performance data.",
            "value": "easy",
            "inputType": "select",
        },
        "quiz_question_count": {
            "label": "Quiz question count",
            "description": "Default number of questions generated in each practice set.",
            "value": 5,
            "inputType": "number",
        },
        "ai_response_style": {
            "label": "AI response style",
            "description": "Controls how concise tutor explanations should be.",
            "value": "short",
            "inputType": "select",
        },
        "supported_languages": {
            "label": "Supported languages",
            "description": "Comma-separated languages shown in student preferences and admin reporting.",
            "value": "English,Hindi,Marathi",
            "inputType": "text",
        },
        "allow_teacher_exports": {
            "label": "Allow teacher exports",
            "description": "When enabled, teacher-role users can export assigned student reports.",
            "value": True,
            "inputType": "boolean",
        },
    }

    PERMISSION_MATRIX = [
        PermissionMatrixRole(
            role="student",
            label="Student",
            permissions=[
                "Use AI tutor",
                "Generate and submit quizzes",
                "View personal analytics",
                "Manage own profile",
            ],
        ),
        PermissionMatrixRole(
            role="teacher",
            label="Teacher",
            permissions=[
                "View assigned learner performance",
                "Export class-level reports",
                "Review weak-topic patterns",
                "Monitor activity trends",
            ],
        ),
        PermissionMatrixRole(
            role="admin",
            label="Administrator",
            permissions=[
                "Manage users and roles",
                "Export system-wide reports",
                "Review audit logs",
                "Update system settings",
                "Monitor AI usage",
            ],
        ),
    ]

    def __init__(self, repository: Repository, ai_service: TutorAIService, default_user_id: str) -> None:
        self.repository = repository
        self.ai_service = ai_service
        self.default_user_id = default_user_id

    async def handle_chat(self, payload: ChatRequest) -> ChatResponse:
        user_id = payload.user_id or self.default_user_id
        difficulty = self._normalize_difficulty(payload.difficulty)
        created_at = self._now()

        await self.repository.store_chat_message(
            {
                "id": str(uuid4()),
                "user_id": user_id,
                "role": "user",
                "content": payload.question,
                "created_at": created_at,
            }
        )

        answer, source = await self.ai_service.explain_topic(
            question=payload.question,
            difficulty=difficulty,
            language=payload.language,
        )

        await self.repository.store_chat_message(
            {
                "id": str(uuid4()),
                "user_id": user_id,
                "role": "assistant",
                "content": answer,
                "created_at": self._now(),
            }
        )
        await self._store_ai_usage(user_id=user_id, feature="chat", provider=source)

        return ChatResponse(answer=answer, difficulty=difficulty, source=source)

    async def get_chat_history(self, user_id: str) -> list[ChatMessage]:
        rows = await self.repository.list_chat_messages(user_id)
        if rows:
            return [
                ChatMessage(
                    id=str(row["id"]),
                    role=row["role"],
                    content=row["content"],
                    createdAt=self._to_iso(row.get("created_at")),
                )
                for row in rows
            ]

        return [
            ChatMessage(
                id=str(uuid4()),
                role="assistant",
                content="Hello! I am your AI tutor. Ask any topic and I will explain it simply.",
                createdAt=self._now(),
            )
        ]

    async def generate_quiz(self, payload: QuizRequest) -> QuizResponse:
        user_id = payload.user_id or self.default_user_id
        difficulty = self._normalize_difficulty(payload.difficulty)

        questions, source = await self.ai_service.generate_quiz(
            topic=payload.topic,
            difficulty=difficulty,
            language=payload.language,
        )
        quiz_id = str(uuid4())

        await self.repository.store_quiz(
            {
                "id": quiz_id,
                "user_id": user_id,
                "topic": payload.topic,
                "difficulty": difficulty.value,
                "questions": [
                    question.model_dump(by_alias=True) for question in questions
                ],
                "created_at": self._now(),
            }
        )
        await self._store_ai_usage(user_id=user_id, feature="quiz_generation", provider=source)

        return QuizResponse(
            id=quiz_id,
            topic=payload.topic,
            difficulty=difficulty,
            questions=questions,
            source=source,
        )

    async def submit_quiz(self, payload: QuizSubmissionRequest) -> QuizSubmissionResponse:
        if not payload.questions:
            raise ValidationError("At least one question is required.")

        user_id = payload.user_id or self.default_user_id
        correct_answers = 0
        review: list[QuestionReview] = []

        for question in payload.questions:
            selected_answer = payload.answers.get(question.id)
            is_correct = selected_answer == question.correct_answer

            if is_correct:
                correct_answers += 1

            review.append(
                QuestionReview(
                    question=question.question,
                    selectedAnswer=selected_answer,
                    correctAnswer=question.correct_answer,
                    explanation=question.explanation,
                    isCorrect=is_correct,
                )
            )

        total_questions = len(payload.questions)
        score = round((correct_answers / total_questions) * 100, 2)
        next_difficulty = resolve_difficulty(score)

        feedback, _source = await self.ai_service.generate_feedback(
            topic=payload.topic,
            score=score,
            difficulty=next_difficulty,
            language=payload.language,
        )

        result_id = str(uuid4())
        submitted_at = self._now()
        result_payload = {
            "id": result_id,
            "user_id": user_id,
            "topic": payload.topic,
            "score": score,
            "total_questions": total_questions,
            "correct_answers": correct_answers,
            "difficulty": next_difficulty.value,
            "feedback": feedback,
            "question_review": [item.model_dump(by_alias=True) for item in review],
            "submitted_at": submitted_at,
        }

        await self.repository.store_result(result_payload)
        await self._store_ai_usage(user_id=user_id, feature="quiz_submission", provider="system")
        await self._record_audit_log(
            actor_user_id=user_id,
            actor_email=(await self.repository.get_user(user_id) or {}).get("email"),
            action="student.quiz_submitted",
            target_type="quiz_result",
            target_id=result_id,
            summary=f"Quiz submitted for {payload.topic} with score {score}%.",
            metadata={"topic": payload.topic, "score": score},
        )
        await self._refresh_progress(user_id)

        return QuizSubmissionResponse(
            id=result_id,
            topic=payload.topic,
            score=score,
            totalQuestions=total_questions,
            correctAnswers=correct_answers,
            difficulty=next_difficulty,
            feedback=feedback,
            questionReview=review,
            submittedAt=submitted_at,
        )

    async def get_progress(self, user_id: str, force_refresh: bool = False) -> ProgressResponse:
        if force_refresh:
            return await self._refresh_progress(user_id)

        results = await self.repository.list_results(user_id)
        return self._build_progress(user_id, results)

    async def get_revision(
        self,
        user_id: str,
        payload: RevisionRequest,
    ) -> RevisionResponse:
        progress = await self.get_progress(user_id)
        topic = (payload.topic or "").strip()
        if not topic:
            topic = progress.weak_topics[0] if progress.weak_topics else "Fractions"

        revision = await self.ai_service.generate_revision(
            topic=topic,
            difficulty=self._normalize_difficulty(progress.current_difficulty),
            language=payload.language,
        )
        await self._store_ai_usage(user_id=user_id, feature="revision", provider=revision.source)
        return revision

    async def get_quiz_history(self, user_id: str) -> QuizHistoryResponse:
        results = await self.repository.list_results(user_id)
        return QuizHistoryResponse(
            results=[
                self._history_item_from_result(row)
                for row in [self._normalize_result(result) for result in results[::-1]]
            ]
        )

    async def get_admin_dashboard(self) -> AdminDashboardResponse:
        users, all_results, progress_rows = await self._load_admin_sources()
        user_ids, user_lookup, results_by_user, progress_by_user = self._prepare_admin_maps(
            users, all_results, progress_rows
        )

        students: list[AdminStudentSummary] = []
        weak_topic_counts: dict[str, int] = {}
        total_score = 0.0

        for user_id in sorted(user_ids):
            user = user_lookup.get(user_id, {})
            user_results = results_by_user.get(user_id, [])
            progress = self._progress_from_row_or_results(
                user_id=user_id,
                row=progress_by_user.get(user_id),
                results=user_results,
            )
            total_score += progress.accuracy
            for topic in progress.weak_topics:
                weak_topic_counts[topic] = weak_topic_counts.get(topic, 0) + 1

            last_active = user_results[-1]["submitted_at"] if user_results else user.get("last_login")
            students.append(
                AdminStudentSummary(
                    id=user_id,
                    email=user.get("email"),
                    accuracy=progress.accuracy,
                    completedQuizzes=progress.completed_quizzes,
                    currentDifficulty=progress.current_difficulty,
                    weakTopics=progress.weak_topics,
                    lastActive=last_active,
                )
            )

        recent_results = [
            {
                "id": row["id"],
                "topic": row["topic"],
                "score": row["score"],
                "totalQuestions": row["total_questions"],
                "correctAnswers": row["correct_answers"],
                "difficulty": row["difficulty"],
                "submittedAt": row["submitted_at"],
            }
            for row in sorted(
                [self._normalize_result(row) for row in all_results],
                key=lambda item: item["submitted_at"],
            )[-8:][::-1]
        ]

        average_accuracy = round(total_score / len(students), 2) if students else 0
        return AdminDashboardResponse(
            totalStudents=len(students),
            totalQuizzes=len(all_results),
            averageAccuracy=average_accuracy,
            weakTopicCounts=[
                WeakTopicCount(topic=topic, count=count)
                for topic, count in sorted(
                    weak_topic_counts.items(),
                    key=lambda item: item[1],
                    reverse=True,
                )[:8]
            ],
            students=students,
            recentResults=recent_results,
        )

    async def get_admin_users(self) -> AdminUsersResponse:
        users, all_results, progress_rows = await self._load_admin_sources()
        user_ids, user_lookup, results_by_user, progress_by_user = self._prepare_admin_maps(
            users, all_results, progress_rows
        )

        rows: list[AdminUserRecord] = []
        for user_id in sorted(user_ids):
            user = user_lookup.get(user_id, {})
            user_results = results_by_user.get(user_id, [])
            progress = self._progress_from_row_or_results(
                user_id=user_id,
                row=progress_by_user.get(user_id),
                results=user_results,
            )
            role = str(user.get("role") or "student")
            rows.append(
                AdminUserRecord(
                    id=user_id,
                    email=user.get("email"),
                    fullName=user.get("full_name") or self._display_name_from_email(user.get("email")),
                    school=user.get("school") or "Rural Community School",
                    classGrade=user.get("class_grade") or "",
                    role=role,
                    status=str(user.get("status") or "active"),
                    isAdmin=role == "admin" or bool(user.get("is_admin")),
                    accuracy=progress.accuracy,
                    completedQuizzes=progress.completed_quizzes,
                    weakTopics=progress.weak_topics,
                    lastActive=user_results[-1]["submitted_at"] if user_results else user.get("last_login"),
                    createdAt=user.get("created_at"),
                    lastLogin=user.get("last_login"),
                )
            )

        rows.sort(key=lambda item: (self._role_priority(item.role), item.full_name.lower()))
        return AdminUsersResponse(total=len(rows), users=rows)

    async def update_admin_user(
        self,
        user_id: str,
        payload: AdminUserUpdateRequest,
        actor_user_id: str,
        actor_email: str | None,
    ) -> AdminUserRecord:
        current = await self.repository.get_user(user_id)
        if not current:
            raise ValidationError("User could not be found.")

        role = str(payload.role or current.get("role") or "student").lower()
        if role not in {"student", "teacher", "admin"}:
            raise ValidationError("Role must be student, teacher, or admin.")

        status = str(payload.status or current.get("status") or "active").lower()
        if status not in {"active", "disabled", "suspended"}:
            raise ValidationError("Status must be active, disabled, or suspended.")

        merged = {
            **current,
            "full_name": payload.full_name or current.get("full_name") or "Student",
            "school": payload.school or current.get("school") or "Rural Community School",
            "class_grade": payload.class_grade if payload.class_grade is not None else current.get("class_grade") or "",
            "role": role,
            "status": status,
            "is_admin": role == "admin",
        }
        await self.repository.upsert_user(merged)
        await self._record_audit_log(
            actor_user_id=actor_user_id,
            actor_email=actor_email,
            action="admin.user_updated",
            target_type="user",
            target_id=user_id,
            summary=f"Updated user {merged.get('email') or user_id}: role={role}, status={status}.",
            metadata={
                "role": role,
                "status": status,
                "school": merged.get("school"),
                "classGrade": merged.get("class_grade"),
            },
        )

        users_response = await self.get_admin_users()
        updated = next((user for user in users_response.users if user.id == user_id), None)
        if not updated:
            raise ValidationError("Updated user could not be resolved.")
        return updated

    async def get_admin_permissions(self) -> AdminPermissionsResponse:
        return AdminPermissionsResponse(roles=self.PERMISSION_MATRIX)

    async def get_admin_logs(self) -> AuditLogsResponse:
        rows = await self.repository.list_audit_logs()
        entries = [
            AuditLogEntry(
                id=str(row.get("id") or uuid4()),
                actorUserId=str(row.get("actor_user_id") or ""),
                actorEmail=row.get("actor_email"),
                action=str(row.get("action") or ""),
                targetType=str(row.get("target_type") or "system"),
                targetId=str(row.get("target_id")) if row.get("target_id") else None,
                summary=str(row.get("summary") or ""),
                metadata=row.get("metadata") or {},
                createdAt=self._to_iso(row.get("created_at")),
            )
            for row in sorted(rows, key=lambda item: self._to_iso(item.get("created_at")), reverse=True)
        ]
        return AuditLogsResponse(total=len(entries), entries=entries[:120])

    async def get_admin_settings(self) -> AdminSettingsResponse:
        stored = await self.repository.get_system_settings()
        settings = []
        for key, definition in self.SETTING_DEFINITIONS.items():
            settings.append(
                SystemSettingItem(
                    key=key,
                    label=definition["label"],
                    description=definition["description"],
                    value=stored.get(key, definition["value"]),
                    inputType=definition["inputType"],
                )
            )
        return AdminSettingsResponse(settings=settings)

    async def update_admin_settings(
        self,
        payload: AdminSettingsUpdateRequest,
        actor_user_id: str,
        actor_email: str | None,
    ) -> AdminSettingsResponse:
        updates: dict[str, object] = {}
        for key, value in payload.settings.items():
            if key not in self.SETTING_DEFINITIONS:
                continue
            definition = self.SETTING_DEFINITIONS[key]
            updates[key] = self._coerce_setting_value(value, definition["inputType"])

        if not updates:
            raise ValidationError("No valid settings were provided.")

        await self.repository.upsert_system_settings(updates)
        await self._record_audit_log(
            actor_user_id=actor_user_id,
            actor_email=actor_email,
            action="admin.settings_updated",
            target_type="system_settings",
            target_id=None,
            summary="Updated system settings.",
            metadata=updates,
        )
        return await self.get_admin_settings()

    async def get_admin_ai_usage(self) -> AIUsageResponse:
        rows = await self.repository.list_ai_usage()
        users = {str(user.get("id")): user for user in await self.repository.list_users() if user.get("id")}

        metrics_by_feature: dict[str, dict] = {}
        user_activity: dict[str, dict] = {}
        provider = "mock" if self.ai_service.client is None else "groq"

        for row in rows:
            feature = str(row.get("feature") or "unknown")
            created_at = self._to_iso(row.get("created_at"))
            success = bool(row.get("success", True))
            user_id = str(row.get("user_id") or self.default_user_id)

            feature_entry = metrics_by_feature.setdefault(
                feature,
                {
                    "feature": feature,
                    "totalRequests": 0,
                    "successCount": 0,
                    "failureCount": 0,
                    "lastUsedAt": None,
                },
            )
            feature_entry["totalRequests"] += 1
            feature_entry["successCount" if success else "failureCount"] += 1
            feature_entry["lastUsedAt"] = created_at

            user_entry = user_activity.setdefault(
                user_id,
                {
                    "userId": user_id,
                    "email": (users.get(user_id) or {}).get("email"),
                    "totalRequests": 0,
                    "lastActivity": None,
                },
            )
            user_entry["totalRequests"] += 1
            user_entry["lastActivity"] = created_at
            if str(row.get("provider") or "").strip():
                provider = str(row.get("provider"))

        metrics = sorted(
            metrics_by_feature.values(),
            key=lambda item: item["totalRequests"],
            reverse=True,
        )
        user_rows = sorted(
            user_activity.values(),
            key=lambda item: item["totalRequests"],
            reverse=True,
        )[:12]
        return AIUsageResponse(
            provider=provider,
            totalRequests=sum(item["totalRequests"] for item in metrics),
            metrics=metrics,
            userActivity=user_rows,
        )

    async def export_admin_report(
        self,
        payload: ReportExportRequest,
        actor_user_id: str,
        actor_email: str | None,
    ) -> ReportExportResponse:
        report_type = str(payload.report_type or "").strip().lower()
        if report_type not in {"users", "performance", "ai-usage", "audit-logs", "settings"}:
            raise ValidationError("Unsupported report type.")

        output = io.StringIO()

        if report_type == "users":
            users = (await self.get_admin_users()).users
            writer = csv.DictWriter(
                output,
                fieldnames=["id", "email", "full_name", "school", "class_grade", "role", "status", "accuracy", "completed_quizzes"],
            )
            writer.writeheader()
            for user in users:
                writer.writerow(
                    {
                        "id": user.id,
                        "email": user.email or "",
                        "full_name": user.full_name,
                        "school": user.school or "",
                        "class_grade": user.class_grade or "",
                        "role": user.role,
                        "status": user.status,
                        "accuracy": user.accuracy,
                        "completed_quizzes": user.completed_quizzes,
                    }
                )
        elif report_type == "performance":
            dashboard = await self.get_admin_dashboard()
            writer = csv.DictWriter(
                output,
                fieldnames=["id", "email", "accuracy", "completed_quizzes", "current_difficulty", "weak_topics", "last_active"],
            )
            writer.writeheader()
            for student in dashboard.students:
                writer.writerow(
                    {
                        "id": student.id,
                        "email": student.email or "",
                        "accuracy": student.accuracy,
                        "completed_quizzes": student.completed_quizzes,
                        "current_difficulty": student.current_difficulty,
                        "weak_topics": ", ".join(student.weak_topics),
                        "last_active": student.last_active or "",
                    }
                )
        elif report_type == "ai-usage":
            usage = await self.get_admin_ai_usage()
            writer = csv.DictWriter(
                output,
                fieldnames=["feature", "total_requests", "success_count", "failure_count", "last_used_at"],
            )
            writer.writeheader()
            for metric in usage.metrics:
                writer.writerow(
                    {
                        "feature": metric.feature,
                        "total_requests": metric.total_requests,
                        "success_count": metric.success_count,
                        "failure_count": metric.failure_count,
                        "last_used_at": metric.last_used_at or "",
                    }
                )
        elif report_type == "audit-logs":
            logs = (await self.get_admin_logs()).entries
            writer = csv.DictWriter(
                output,
                fieldnames=["created_at", "actor_email", "action", "target_type", "target_id", "summary"],
            )
            writer.writeheader()
            for entry in logs:
                writer.writerow(
                    {
                        "created_at": entry.created_at,
                        "actor_email": entry.actor_email or "",
                        "action": entry.action,
                        "target_type": entry.target_type,
                        "target_id": entry.target_id or "",
                        "summary": entry.summary,
                    }
                )
        else:
            settings = (await self.get_admin_settings()).settings
            writer = csv.DictWriter(
                output,
                fieldnames=["key", "label", "value", "description", "input_type"],
            )
            writer.writeheader()
            for item in settings:
                writer.writerow(
                    {
                        "key": item.key,
                        "label": item.label,
                        "value": item.value,
                        "description": item.description,
                        "input_type": item.input_type,
                    }
                )

        await self._record_audit_log(
            actor_user_id=actor_user_id,
            actor_email=actor_email,
            action="admin.report_exported",
            target_type="report",
            target_id=report_type,
            summary=f"Exported {report_type} report.",
            metadata={"reportType": report_type},
        )

        return ReportExportResponse(
            fileName=f"admin-{report_type}-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.csv",
            content=output.getvalue(),
        )

    async def _refresh_progress(self, user_id: str) -> ProgressResponse:
        results = await self.repository.list_results(user_id)
        progress = self._build_progress(user_id, results)
        await self.repository.upsert_progress(
            {
                "user_id": user_id,
                "accuracy": progress.accuracy,
                "completed_quizzes": progress.completed_quizzes,
                "current_difficulty": self._difficulty_value(progress.current_difficulty),
                "weak_topics": progress.weak_topics,
                "weekly_accuracy": progress.weekly_accuracy,
                "topic_breakdown": [
                    item.model_dump(by_alias=True) if hasattr(item, "model_dump") else item
                    for item in progress.topic_breakdown
                ],
                "recent_results": [
                    item.model_dump(by_alias=True) if hasattr(item, "model_dump") else item
                    for item in progress.recent_results
                ],
            }
        )
        return progress

    def _build_progress(self, user_id: str, results: list[dict]) -> ProgressResponse:
        if not results:
            return ProgressResponse(
                userId=user_id,
                accuracy=0,
                completedQuizzes=0,
                currentDifficulty=DifficultyLevel.easy,
                weakTopics=[],
                weeklyAccuracy=[0, 0, 0, 0, 0, 0, 0],
                topicBreakdown=[],
                recentResults=[],
            )

        normalized_results = [self._normalize_result(row) for row in results]
        accuracy = round(
            sum(row["score"] for row in normalized_results) / len(normalized_results),
            2,
        )

        weekly_accuracy = [0.0] * 7
        recent_subset = normalized_results[-7:]
        start_index = max(0, 7 - len(recent_subset))
        for index, row in enumerate(recent_subset):
            weekly_accuracy[start_index + index] = row["score"]

        scores_by_topic: dict[str, list[float]] = {}
        for row in normalized_results:
            scores_by_topic.setdefault(row["topic"], []).append(row["score"])

        topic_breakdown = [
            {
                "topic": topic,
                "accuracy": round(sum(scores) / len(scores), 2),
            }
            for topic, scores in sorted(scores_by_topic.items())
        ]
        weak_topics = [
            item["topic"] for item in topic_breakdown if item["accuracy"] < 60
        ]
        recent_results = [
            RecentResult(
                id=row["id"],
                topic=row["topic"],
                score=row["score"],
                totalQuestions=row["total_questions"],
                correctAnswers=row["correct_answers"],
                difficulty=row["difficulty"],
                submittedAt=row["submitted_at"],
            )
            for row in normalized_results[-5:][::-1]
        ]

        return ProgressResponse(
            userId=user_id,
            accuracy=accuracy,
            completedQuizzes=len(normalized_results),
            currentDifficulty=resolve_difficulty(accuracy),
            weakTopics=weak_topics,
            weeklyAccuracy=weekly_accuracy,
            topicBreakdown=topic_breakdown,
            recentResults=recent_results,
        )

    def _normalize_result(self, row: dict) -> dict:
        return {
            "id": str(row["id"]),
            "user_id": str(row.get("user_id") or self.default_user_id),
            "topic": str(row.get("topic") or "Untitled topic"),
            "score": float(row.get("score") or 0),
            "correct_answers": int(row.get("correct_answers") or 0),
            "total_questions": int(row.get("total_questions") or 0),
            "difficulty": self._normalize_difficulty(row.get("difficulty")).value,
            "feedback": str(row.get("feedback") or ""),
            "question_review": row.get("question_review") or [],
            "submitted_at": self._to_iso(row.get("submitted_at")),
        }

    def _history_item_from_result(self, row: dict) -> QuizHistoryItem:
        return QuizHistoryItem(
            id=row["id"],
            topic=row["topic"],
            score=row["score"],
            correctAnswers=row["correct_answers"],
            totalQuestions=row["total_questions"],
            difficulty=row["difficulty"],
            feedback=row["feedback"],
            questionReview=[
                QuestionReview(
                    question=str(item.get("question") or ""),
                    selectedAnswer=item.get("selectedAnswer"),
                    correctAnswer=str(item.get("correctAnswer") or ""),
                    explanation=str(item.get("explanation") or ""),
                    isCorrect=bool(item.get("isCorrect")),
                )
                for item in row["question_review"]
                if item.get("question")
            ],
            submittedAt=row["submitted_at"],
        )

    def _progress_from_row_or_results(
        self,
        user_id: str,
        row: dict | None,
        results: list[dict],
    ) -> ProgressResponse:
        if not row:
            return self._build_progress(user_id, results)

        recent_results = [
            RecentResult(**item) if isinstance(item, dict) else item
            for item in list(row.get("recent_results") or [])
        ]
        return ProgressResponse(
            userId=user_id,
            accuracy=float(row.get("accuracy") or 0),
            completedQuizzes=int(row.get("completed_quizzes") or 0),
            currentDifficulty=self._normalize_difficulty(row.get("current_difficulty")),
            weakTopics=list(row.get("weak_topics") or []),
            weeklyAccuracy=list(row.get("weekly_accuracy") or []),
            topicBreakdown=list(row.get("topic_breakdown") or []),
            recentResults=recent_results,
        )

    async def _load_admin_sources(self) -> tuple[list[dict], list[dict], list[dict]]:
        users = await self.repository.list_users()
        all_results = await self.repository.list_all_results()
        progress_rows = await self.repository.list_progress()
        return users, all_results, progress_rows

    def _prepare_admin_maps(self, users: list[dict], all_results: list[dict], progress_rows: list[dict]):
        results_by_user: dict[str, list[dict]] = {}
        for row in all_results:
            normalized = self._normalize_result(row)
            results_by_user.setdefault(str(row.get("user_id") or self.default_user_id), []).append(
                normalized
            )

        user_ids = {
            str(user.get("id")) for user in users if user.get("id")
        } | set(results_by_user.keys())
        user_lookup = {str(user.get("id")): user for user in users if user.get("id")}
        progress_by_user = {
            str(row.get("user_id")): row for row in progress_rows if row.get("user_id")
        }
        return user_ids, user_lookup, results_by_user, progress_by_user

    async def _record_audit_log(
        self,
        actor_user_id: str,
        actor_email: str | None,
        action: str,
        target_type: str,
        target_id: str | None,
        summary: str,
        metadata: dict | None = None,
    ) -> None:
        await self.repository.store_audit_log(
            {
                "id": str(uuid4()),
                "actor_user_id": actor_user_id,
                "actor_email": actor_email,
                "action": action,
                "target_type": target_type,
                "target_id": target_id,
                "summary": summary,
                "metadata": metadata or {},
                "created_at": self._now(),
            }
        )

    async def _store_ai_usage(self, user_id: str, feature: str, provider: str, success: bool = True) -> None:
        await self.repository.store_ai_usage(
            {
                "id": str(uuid4()),
                "user_id": user_id,
                "feature": feature,
                "provider": provider,
                "success": success,
                "created_at": self._now(),
            }
        )

    def _coerce_setting_value(self, value, input_type: str):
        if input_type == "boolean":
            if isinstance(value, bool):
                return value
            return str(value).strip().lower() in {"true", "1", "yes", "on"}
        if input_type == "number":
            return max(1, int(value))
        return value

    def _role_priority(self, role: str) -> int:
        return {"admin": 0, "teacher": 1, "student": 2}.get(str(role).lower(), 3)

    def _display_name_from_email(self, email: str | None) -> str:
        if not email:
            return "Student"
        return email.split("@")[0].replace(".", " ").replace("_", " ").title()

    def _normalize_difficulty(self, value: DifficultyLevel | str | None) -> DifficultyLevel:
        if isinstance(value, DifficultyLevel):
            return value

        try:
            return DifficultyLevel(str(value or "easy").lower())
        except ValueError:
            return DifficultyLevel.easy

    def _difficulty_value(self, value: DifficultyLevel | str | None) -> str:
        return self._normalize_difficulty(value).value

    def _to_iso(self, value) -> str:
        if isinstance(value, datetime):
            return value.astimezone(timezone.utc).isoformat()
        if value:
            return str(value)
        return self._now()

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()
