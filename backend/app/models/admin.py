from typing import Any

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


class AdminUserRecord(APIModel):
    id: str
    email: str | None = None
    full_name: str = Field(default="Student", alias="fullName")
    school: str | None = None
    class_grade: str | None = Field(default=None, alias="classGrade")
    role: str = "student"
    status: str = "active"
    is_admin: bool = Field(default=False, alias="isAdmin")
    accuracy: float = 0
    completed_quizzes: int = Field(default=0, alias="completedQuizzes")
    weak_topics: list[str] = Field(default_factory=list, alias="weakTopics")
    last_active: str | None = Field(default=None, alias="lastActive")
    created_at: str | None = Field(default=None, alias="createdAt")
    last_login: str | None = Field(default=None, alias="lastLogin")


class AdminUsersResponse(APIModel):
    total: int
    users: list[AdminUserRecord] = Field(default_factory=list)


class AdminUserUpdateRequest(APIModel):
    full_name: str | None = Field(default=None, alias="fullName")
    school: str | None = None
    class_grade: str | None = Field(default=None, alias="classGrade")
    role: str | None = None
    status: str | None = None


class PermissionMatrixRole(APIModel):
    role: str
    label: str
    permissions: list[str] = Field(default_factory=list)


class AdminPermissionsResponse(APIModel):
    roles: list[PermissionMatrixRole] = Field(default_factory=list)


class AuditLogEntry(APIModel):
    id: str
    actor_user_id: str = Field(..., alias="actorUserId")
    actor_email: str | None = Field(default=None, alias="actorEmail")
    action: str
    target_type: str = Field(..., alias="targetType")
    target_id: str | None = Field(default=None, alias="targetId")
    summary: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(..., alias="createdAt")


class AuditLogsResponse(APIModel):
    total: int
    entries: list[AuditLogEntry] = Field(default_factory=list)


class SystemSettingItem(APIModel):
    key: str
    label: str
    description: str
    value: Any
    input_type: str = Field(default="text", alias="inputType")


class AdminSettingsResponse(APIModel):
    settings: list[SystemSettingItem] = Field(default_factory=list)


class AdminSettingsUpdateRequest(APIModel):
    settings: dict[str, Any] = Field(default_factory=dict)


class AIUsageMetric(APIModel):
    feature: str
    total_requests: int = Field(..., alias="totalRequests")
    success_count: int = Field(..., alias="successCount")
    failure_count: int = Field(..., alias="failureCount")
    last_used_at: str | None = Field(default=None, alias="lastUsedAt")


class AIUsageUserSummary(APIModel):
    user_id: str = Field(..., alias="userId")
    email: str | None = None
    total_requests: int = Field(..., alias="totalRequests")
    last_activity: str | None = Field(default=None, alias="lastActivity")


class AIUsageResponse(APIModel):
    provider: str
    total_requests: int = Field(..., alias="totalRequests")
    metrics: list[AIUsageMetric] = Field(default_factory=list)
    user_activity: list[AIUsageUserSummary] = Field(default_factory=list, alias="userActivity")


class ReportExportRequest(APIModel):
    report_type: str = Field(..., alias="reportType")


class ReportExportResponse(APIModel):
    file_name: str = Field(..., alias="fileName")
    mime_type: str = Field(default="text/csv", alias="mimeType")
    content: str
