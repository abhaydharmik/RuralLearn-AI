from app.models.quiz import DifficultyLevel


def resolve_difficulty(score: float) -> DifficultyLevel:
    if score < 50:
        return DifficultyLevel.easy
    if score <= 80:
        return DifficultyLevel.medium
    return DifficultyLevel.hard
