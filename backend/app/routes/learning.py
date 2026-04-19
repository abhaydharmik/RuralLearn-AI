from fastapi import APIRouter, Depends, status

from app.auth import AuthenticatedUser, get_current_user, require_admin
from app.dependencies import get_learning_service
from app.models import (
    AdminDashboardResponse,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ProgressResponse,
    QuizHistoryResponse,
    QuizRequest,
    QuizResponse,
    QuizSubmissionRequest,
    QuizSubmissionResponse,
    RevisionRequest,
    RevisionResponse,
)
from app.services.learning_service import LearningService

router = APIRouter(prefix="/api", tags=["learning"])


@router.get("/me", status_code=status.HTTP_200_OK)
async def get_me(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    return {
        "id": current_user.id,
        "email": current_user.email,
        "fullName": current_user.full_name,
        "school": current_user.school,
        "role": current_user.role,
        "isAdmin": current_user.is_admin,
    }


@router.get("/chat/history", response_model=list[ChatMessage], status_code=status.HTTP_200_OK)
async def get_chat_history(
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: LearningService = Depends(get_learning_service),
) -> list[ChatMessage]:
    return await service.get_chat_history(current_user.id)


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat(
    payload: ChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: LearningService = Depends(get_learning_service),
) -> ChatResponse:
    payload.user_id = current_user.id
    return await service.handle_chat(payload)


@router.post("/quiz", response_model=QuizResponse, status_code=status.HTTP_200_OK)
async def create_quiz(
    payload: QuizRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: LearningService = Depends(get_learning_service),
) -> QuizResponse:
    payload.user_id = current_user.id
    return await service.generate_quiz(payload)


@router.post("/submit", response_model=QuizSubmissionResponse, status_code=status.HTTP_200_OK)
async def submit_quiz(
    payload: QuizSubmissionRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: LearningService = Depends(get_learning_service),
) -> QuizSubmissionResponse:
    payload.user_id = current_user.id
    return await service.submit_quiz(payload)


@router.get("/progress", response_model=ProgressResponse, status_code=status.HTTP_200_OK)
async def get_progress(
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: LearningService = Depends(get_learning_service),
) -> ProgressResponse:
    return await service.get_progress(user_id=current_user.id)


@router.post("/revision", response_model=RevisionResponse, status_code=status.HTTP_200_OK)
async def create_revision(
    payload: RevisionRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: LearningService = Depends(get_learning_service),
) -> RevisionResponse:
    return await service.get_revision(current_user.id, payload)


@router.get("/history", response_model=QuizHistoryResponse, status_code=status.HTTP_200_OK)
async def get_quiz_history(
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: LearningService = Depends(get_learning_service),
) -> QuizHistoryResponse:
    return await service.get_quiz_history(current_user.id)


@router.get("/admin/dashboard", response_model=AdminDashboardResponse, status_code=status.HTTP_200_OK)
async def get_admin_dashboard(
    _current_user: AuthenticatedUser = Depends(require_admin),
    service: LearningService = Depends(get_learning_service),
) -> AdminDashboardResponse:
    return await service.get_admin_dashboard()
