from pydantic import Field # type: ignore

from app.models.base import APIModel
from app.models.quiz import DifficultyLevel


class TopicBreakdown(APIModel):
    topic: str
    accuracy: float


class RecentResult(APIModel):
    id: str
    topic: str
    score: float
    correct_answers: int = Field(..., alias="correctAnswers")
    total_questions: int = Field(..., alias="totalQuestions")
    difficulty: DifficultyLevel
    submitted_at: str = Field(..., alias="submittedAt")


class ProgressResponse(APIModel):
    user_id: str = Field(..., alias="userId")
    accuracy: float
    completed_quizzes: int = Field(..., alias="completedQuizzes")
    current_difficulty: DifficultyLevel = Field(..., alias="currentDifficulty")
    weak_topics: list[str] = Field(default_factory=list, alias="weakTopics")
    weekly_accuracy: list[float] = Field(default_factory=list, alias="weeklyAccuracy")
    topic_breakdown: list[TopicBreakdown] = Field(default_factory=list, alias="topicBreakdown")
    recent_results: list[RecentResult] = Field(default_factory=list, alias="recentResults")
