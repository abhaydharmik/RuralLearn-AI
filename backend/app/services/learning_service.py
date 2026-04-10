from __future__ import annotations

from collections import defaultdict
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
    RecentResult,
    TopicBreakdown,
)
from app.models.quiz import DifficultyLevel
from app.services.personalization import resolve_difficulty
from app.services.repository import Repository


class LearningService:
    def __init__(self, repository: Repository, ai_service: TutorAIService, default_user_id: str) -> None:
        self.repository = repository
        self.ai_service = ai_service
        self.default_user_id = default_user_id

    async def handle_chat(self, payload: ChatRequest) -> ChatResponse:
        user_id = payload.user_id or self.default_user_id
        progress = await self.get_progress(user_id=user_id)
        difficulty = payload.difficulty or progress.current_difficulty
        user_message = {
            "id": str(uuid4()),
            "user_id": user_id,
            "role": "user",
            "content": payload.question,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await self.repository.store_chat_message(user_message)
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
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        return ChatResponse(answer=answer, difficulty=difficulty, source=source)

    async def get_chat_history(self, user_id: str) -> list[ChatMessage]:
        messages = await self.repository.list_chat_messages(user_id)
        if not messages:
            return [
                ChatMessage(
                    id=str(uuid4()),
                    role="assistant",
                    content=(
                        "Hello! I am your AI tutor. Ask me any topic and I will explain it in very simple language."
                    ),
                    createdAt=datetime.now(timezone.utc).isoformat(),
                )
            ]

        return [
            ChatMessage(
                id=item["id"],
                role=item["role"],
                content=item["content"],
                createdAt=item["created_at"],
            )
            for item in messages
        ]

    async def generate_quiz(self, payload: QuizRequest) -> QuizResponse:
        user_id = payload.user_id or self.default_user_id
        progress = await self.get_progress(user_id=user_id)
        difficulty = payload.difficulty or progress.current_difficulty
        questions, source = await self.ai_service.generate_quiz(
            topic=payload.topic,
            difficulty=difficulty,
        )
        quiz = QuizResponse(
            id=str(uuid4()),
            topic=payload.topic,
            difficulty=difficulty,
            questions=questions,
            source=source,
        )
        await self.repository.store_quiz(
            {
                "id": quiz.id,
                "user_id": user_id,
                "topic": quiz.topic,
                "difficulty": quiz.difficulty,
                "questions": [item.model_dump(by_alias=True) for item in quiz.questions],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        return quiz

    async def submit_quiz(self, payload: QuizSubmissionRequest) -> QuizSubmissionResponse:
        user_id = payload.user_id or self.default_user_id
        if not payload.questions:
            raise ValidationError("At least one question is required.")

        correct_answers = 0
        review = []

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
        difficulty = resolve_difficulty(score)
        feedback, _source = await self.ai_service.generate_feedback(
            topic=payload.topic,
            score=score,
            difficulty=difficulty,
        )

        result = QuizSubmissionResponse(
            id=str(uuid4()),
            topic=payload.topic,
            score=score,
            totalQuestions=total_questions,
            correctAnswers=correct_answers,
            difficulty=difficulty,
            feedback=feedback,
            questionReview=review,
            submittedAt=datetime.now(timezone.utc).isoformat(),
        )

        await self.repository.store_result(
            {
                "id": result.id,
                "user_id": user_id,
                "topic": result.topic,
                "score": result.score,
                "correct_answers": result.correct_answers,
                "total_questions": result.total_questions,
                "difficulty": result.difficulty,
                "feedback": result.feedback,
                "question_review": [item.model_dump(by_alias=True) for item in result.question_review],
                "submitted_at": result.submitted_at,
            }
        )

        await self.get_progress(user_id=user_id, force_refresh=True)
        return result

    async def get_progress(self, user_id: str, force_refresh: bool = False) -> ProgressResponse:
        cached_progress = None if force_refresh else await self.repository.get_progress(user_id)
        if cached_progress:
            return ProgressResponse(**cached_progress)

        results = await self.repository.list_results(user_id)
        if not results:
            progress = ProgressResponse(
                userId=user_id,
                accuracy=0,
                completedQuizzes=0,
                currentDifficulty=DifficultyLevel.easy,
                weakTopics=[],
                weeklyAccuracy=[0, 0, 0, 0, 0, 0, 0],
                topicBreakdown=[],
                recentResults=[],
            )
            await self.repository.upsert_progress(self._progress_to_storage(progress))
            return progress

        accuracy = round(sum(item["score"] for item in results) / len(results), 2)
        completed_quizzes = len(results)
        topic_scores: dict[str, list[float]] = defaultdict(list)

        for result in results:
            topic_scores[result["topic"]].append(float(result["score"]))

        topic_breakdown = [
            TopicBreakdown(topic=topic, accuracy=round(sum(scores) / len(scores), 2))
            for topic, scores in topic_scores.items()
        ]
        topic_breakdown.sort(key=lambda item: item.accuracy)

        weak_topics = [item.topic for item in topic_breakdown[:3]]
        weekly_accuracy = [int(round(item["score"])) for item in results[-7:]]
        while len(weekly_accuracy) < 7:
            weekly_accuracy.insert(0, 0)

        recent_results = [
            RecentResult(
                id=item["id"],
                topic=item["topic"],
                score=float(item["score"]),
                correctAnswers=int(item["correct_answers"]),
                totalQuestions=int(item["total_questions"]),
                difficulty=item["difficulty"],
                submittedAt=item["submitted_at"],
            )
            for item in reversed(results[-5:])
        ]

        progress = ProgressResponse(
            userId=user_id,
            accuracy=accuracy,
            completedQuizzes=completed_quizzes,
            currentDifficulty=resolve_difficulty(accuracy),
            weakTopics=weak_topics,
            weeklyAccuracy=weekly_accuracy,
            topicBreakdown=topic_breakdown,
            recentResults=recent_results,
        )
        await self.repository.upsert_progress(self._progress_to_storage(progress))
        return progress

    def _progress_to_storage(self, progress: ProgressResponse) -> dict:
        return {
            "user_id": progress.user_id,
            "accuracy": progress.accuracy,
            "completed_quizzes": progress.completed_quizzes,
            "current_difficulty": progress.current_difficulty,
            "weak_topics": progress.weak_topics,
            "weekly_accuracy": progress.weekly_accuracy,
            "topic_breakdown": [item.model_dump() for item in progress.topic_breakdown],
            "recent_results": [item.model_dump(by_alias=True) for item in progress.recent_results],
        }
