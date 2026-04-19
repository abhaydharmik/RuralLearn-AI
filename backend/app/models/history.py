from pydantic import Field  # type: ignore

from app.models.base import APIModel
from app.models.quiz import DifficultyLevel, QuestionReview


class QuizHistoryItem(APIModel):
    id: str
    topic: str
    score: float
    correct_answers: int = Field(..., alias="correctAnswers")
    total_questions: int = Field(..., alias="totalQuestions")
    difficulty: DifficultyLevel
    feedback: str
    question_review: list[QuestionReview] = Field(default_factory=list, alias="questionReview")
    submitted_at: str = Field(..., alias="submittedAt")


class QuizHistoryResponse(APIModel):
    results: list[QuizHistoryItem] = Field(default_factory=list)
