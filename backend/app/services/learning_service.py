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
from app.models.quiz import DifficultyLevel
from app.services.personalization import resolve_difficulty
from app.services.repository import Repository


class LearningService:
    def __init__(self, repository: Repository, ai_service: TutorAIService, default_user_id: str) -> None:
        self.repository = repository
        self.ai_service = ai_service
        self.default_user_id = default_user_id

    # ✅ FIXED CHAT (NO DATABASE)
    async def handle_chat(self, payload: ChatRequest) -> ChatResponse:
        user_id = payload.user_id or self.default_user_id

        # ❌ Removed DB dependency
        difficulty = payload.difficulty or DifficultyLevel.easy

        answer, source = await self.ai_service.explain_topic(
            question=payload.question,
            difficulty=difficulty,
        )

        return ChatResponse(answer=answer, difficulty=difficulty, source=source)

    # ✅ SAFE CHAT HISTORY (NO DB)
    async def get_chat_history(self, user_id: str) -> list[ChatMessage]:
        return [
            ChatMessage(
                id=str(uuid4()),
                role="assistant",
                content="Hello! I am your AI tutor. Ask me anything 😊",
                createdAt=datetime.now(timezone.utc).isoformat(),
            )
        ]

    # ✅ FIXED QUIZ (NO DB)
    async def generate_quiz(self, payload: QuizRequest) -> QuizResponse:
        difficulty = payload.difficulty or DifficultyLevel.easy

        questions, source = await self.ai_service.generate_quiz(
            topic=payload.topic,
            difficulty=difficulty,
        )

        return QuizResponse(
            id=str(uuid4()),
            topic=payload.topic,
            difficulty=difficulty,
            questions=questions,
            source=source,
        )

    # ✅ FIXED QUIZ SUBMISSION (NO DB)
    async def submit_quiz(self, payload: QuizSubmissionRequest) -> QuizSubmissionResponse:
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

        feedback, _ = await self.ai_service.generate_feedback(
            topic=payload.topic,
            score=score,
            difficulty=difficulty,
        )

        return QuizSubmissionResponse(
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

    # ✅ MOCK PROGRESS (NO DB)
    async def get_progress(self, user_id: str, force_refresh: bool = False) -> ProgressResponse:
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