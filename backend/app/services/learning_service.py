from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from app.ai.service import TutorAIService
from app.exceptions import ValidationError
from app.models import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ProgressResponse,
    QuestionReview,
    QuizRequest,
    QuizResponse,
    QuizSubmissionRequest,
    QuizSubmissionResponse,
)
from app.models.quiz import DifficultyLevel, QuizQuestion
from app.services.personalization import resolve_difficulty
from app.services.repository import Repository


class LearningService:
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
                    item.model_dump(by_alias=True) for item in progress.topic_breakdown
                ],
                "recent_results": [
                    item.model_dump(by_alias=True) for item in progress.recent_results
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
        for index, row in enumerate(normalized_results[-7:]):
            weekly_accuracy[index] = row["score"]

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
            {
                "id": row["id"],
                "topic": row["topic"],
                "score": row["score"],
                "totalQuestions": row["total_questions"],
                "correctAnswers": row["correct_answers"],
                "difficulty": row["difficulty"],
                "submittedAt": row["submitted_at"],
            }
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
            "topic": str(row.get("topic") or "Untitled topic"),
            "score": float(row.get("score") or 0),
            "correct_answers": int(row.get("correct_answers") or 0),
            "total_questions": int(row.get("total_questions") or 0),
            "difficulty": self._normalize_difficulty(row.get("difficulty")).value,
            "submitted_at": self._to_iso(row.get("submitted_at")),
        }

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
