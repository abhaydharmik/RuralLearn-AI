from pydantic import Field

from app.models.base import APIModel
from app.models.quiz import DifficultyLevel


class ChatRequest(APIModel):
    question: str = Field(..., min_length=2, max_length=500)
    difficulty: DifficultyLevel | None = None
    user_id: str | None = Field(default=None, alias="userId")


class ChatResponse(APIModel):
    answer: str
    difficulty: DifficultyLevel
    source: str = "mock"


class ChatMessage(APIModel):
    id: str
    role: str
    content: str
    created_at: str = Field(..., alias="createdAt")
