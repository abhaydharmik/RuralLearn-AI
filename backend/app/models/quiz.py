from enum import Enum
from uuid import uuid4

from pydantic import Field, field_validator

from app.models.base import APIModel


class DifficultyLevel(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class QuizQuestion(APIModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    question: str = Field(..., min_length=5)
    options: list[str] = Field(..., min_length=4, max_length=4)
    correct_answer: str = Field(..., alias="correctAnswer")
    explanation: str = Field(..., min_length=5)


class QuizRequest(APIModel):
    topic: str = Field(..., min_length=2, max_length=120)
    difficulty: DifficultyLevel | None = None
    user_id: str | None = Field(default=None, alias="userId")

    @field_validator("topic")
    @classmethod
    def normalize_topic(cls, value: str) -> str:
        return value.strip()


class QuizResponse(APIModel):
    id: str
    topic: str
    difficulty: DifficultyLevel
    questions: list[QuizQuestion]
    source: str = "mock"


class QuizSubmissionRequest(APIModel):
    id: str | None = None
    topic: str = Field(..., min_length=2, max_length=120)
    questions: list[QuizQuestion] = Field(..., min_length=1)
    answers: dict[str, str] = Field(default_factory=dict)
    user_id: str | None = Field(default=None, alias="userId")


class QuestionReview(APIModel):
    question: str
    selected_answer: str | None = Field(default=None, alias="selectedAnswer")
    correct_answer: str = Field(..., alias="correctAnswer")
    explanation: str
    is_correct: bool = Field(..., alias="isCorrect")


class QuizSubmissionResponse(APIModel):
    id: str
    topic: str
    score: float
    total_questions: int = Field(..., alias="totalQuestions")
    correct_answers: int = Field(..., alias="correctAnswers")
    difficulty: DifficultyLevel
    feedback: str
    question_review: list[QuestionReview] = Field(..., alias="questionReview")
    submitted_at: str = Field(..., alias="submittedAt")
