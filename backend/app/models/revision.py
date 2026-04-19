from pydantic import Field  # type: ignore

from app.models.base import APIModel
from app.models.quiz import DifficultyLevel


class RevisionRequest(APIModel):
    topic: str | None = Field(default=None, max_length=120)


class RevisionPracticeQuestion(APIModel):
    question: str
    answer: str


class RevisionResponse(APIModel):
    topic: str
    difficulty: DifficultyLevel
    summary: str
    examples: list[str] = Field(default_factory=list)
    practice_questions: list[RevisionPracticeQuestion] = Field(
        default_factory=list,
        alias="practiceQuestions",
    )
    source: str = "mock"
