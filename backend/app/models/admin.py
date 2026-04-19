from pydantic import Field  # type: ignore

from app.models.base import APIModel
from app.models.progress import RecentResult
from app.models.quiz import DifficultyLevel


class WeakTopicCount(APIModel):
    topic: str
    count: int


class AdminStudentSummary(APIModel):
    id: str
    email: str | None = None
    accuracy: float
    completed_quizzes: int = Field(..., alias="completedQuizzes")
    current_difficulty: DifficultyLevel = Field(..., alias="currentDifficulty")
    weak_topics: list[str] = Field(default_factory=list, alias="weakTopics")
    last_active: str | None = Field(default=None, alias="lastActive")


class AdminDashboardResponse(APIModel):
    total_students: int = Field(..., alias="totalStudents")
    total_quizzes: int = Field(..., alias="totalQuizzes")
    average_accuracy: float = Field(..., alias="averageAccuracy")
    weak_topic_counts: list[WeakTopicCount] = Field(default_factory=list, alias="weakTopicCounts")
    students: list[AdminStudentSummary] = Field(default_factory=list)
    recent_results: list[RecentResult] = Field(default_factory=list, alias="recentResults")
