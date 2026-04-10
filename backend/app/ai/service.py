import json
import re
from uuid import uuid4

from app.ai.prompts import FEEDBACK_PROMPT, QUIZ_PROMPT, TUTOR_PROMPT
from app.config import Settings
from app.models.quiz import DifficultyLevel, QuizQuestion

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None


class TutorAIService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = (
            OpenAI(api_key=settings.openai_api_key)
            if OpenAI and settings.openai_api_key and not settings.use_mock_ai
            else None
        )

    async def explain_topic(self, question: str, difficulty: DifficultyLevel) -> tuple[str, str]:
        difficulty = self._normalize_difficulty(difficulty)
        if self.client is None:
            return self._mock_explanation(question=question, difficulty=difficulty), "mock"

        prompt = TUTOR_PROMPT.format(topic=question)
        response = self.client.responses.create(
            model=self.settings.openai_model,
            input=[{"role": "user", "content": prompt}],
        )
        answer = (response.output_text or "").strip()
        return answer or self._mock_explanation(question, difficulty), "openai"

    async def generate_quiz(
        self, topic: str, difficulty: DifficultyLevel
    ) -> tuple[list[QuizQuestion], str]:
        difficulty = self._normalize_difficulty(difficulty)
        if self.client is None:
            return self._mock_quiz(topic=topic, difficulty=difficulty), "mock"

        prompt = QUIZ_PROMPT.format(topic=topic, difficulty=difficulty.value)
        response = self.client.responses.create(
            model=self.settings.openai_model,
            input=[{"role": "user", "content": prompt}],
        )
        parsed = self._extract_json(response.output_text or "")

        questions = []
        for item in parsed.get("questions", [])[:5]:
            questions.append(
                QuizQuestion(
                    id=str(uuid4()),
                    question=item["question"],
                    options=item["options"],
                    correctAnswer=item["correctAnswer"],
                    explanation=item["explanation"],
                )
            )

        if len(questions) != 5:
            return self._mock_quiz(topic=topic, difficulty=difficulty), "mock"

        return questions, "openai"

    async def generate_feedback(
        self, *, topic: str, score: float, difficulty: DifficultyLevel
    ) -> tuple[str, str]:
        difficulty = self._normalize_difficulty(difficulty)
        if self.client is None:
            return self._mock_feedback(topic=topic, score=score, difficulty=difficulty), "mock"

        prompt = FEEDBACK_PROMPT.format(topic=topic, score=int(round(score)))
        response = self.client.responses.create(
            model=self.settings.openai_model,
            input=[{"role": "user", "content": prompt}],
        )
        answer = (response.output_text or "").strip()
        return answer or self._mock_feedback(topic, score, difficulty), "openai"

    def _extract_json(self, raw_text: str) -> dict:
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if not match:
            return {}

        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return {}

    def _normalize_difficulty(self, difficulty: DifficultyLevel | str) -> DifficultyLevel:
        if isinstance(difficulty, DifficultyLevel):
            return difficulty
        return DifficultyLevel(difficulty)

    def _mock_explanation(self, question: str, difficulty: DifficultyLevel) -> str:
        topic = question.strip().rstrip("?")
        level_hint = {
            DifficultyLevel.easy: "Start with the basic meaning.",
            DifficultyLevel.medium: "Try one simple idea, then add one more detail.",
            DifficultyLevel.hard: "Connect the main idea to a slightly deeper example.",
        }[difficulty]
        return (
            f"{topic} means understanding the main idea in a simple way. "
            f"For example, think of it like learning one small step before the next. "
            f"{level_hint}"
        )

    def _mock_quiz(self, topic: str, difficulty: DifficultyLevel) -> list[QuizQuestion]:
        templates = [
            (
                f"What is the simplest meaning of {topic}?",
                [
                    f"It explains the basic idea of {topic}.",
                    f"It means memorizing {topic} without understanding.",
                    f"It is never useful in daily life.",
                    f"It can only be learned by experts.",
                ],
                f"It explains the basic idea of {topic}.",
                f"A beginner answer should focus on the core meaning of {topic}.",
            ),
            (
                f"Which example best helps a student understand {topic}?",
                [
                    f"A real-life situation connected to {topic}.",
                    f"Skipping examples while reading.",
                    f"A random topic with no link to {topic}.",
                    f"Only memorizing definitions.",
                ],
                f"A real-life situation connected to {topic}.",
                f"Examples make {topic} easier to understand and remember.",
            ),
            (
                f"What is a good first step for studying {topic} at {difficulty.value} level?",
                [
                    "Learn the basics before solving harder questions.",
                    "Start with the most difficult question immediately.",
                    "Avoid checking the explanation.",
                    "Skip practice and only read once.",
                ],
                "Learn the basics before solving harder questions.",
                "Strong basics help students build confidence.",
            ),
            (
                f"Why are short explanations useful when learning {topic}?",
                [
                    "They help students understand one idea at a time.",
                    "They remove the need to practice.",
                    "They make every answer correct.",
                    "They replace all classroom learning.",
                ],
                "They help students understand one idea at a time.",
                "Small steps are easier for beginners to follow.",
            ),
            (
                f"What should a student do after learning about {topic}?",
                [
                    "Practice one more question and review the answer.",
                    "Stop after reading the title.",
                    "Choose answers randomly.",
                    "Avoid feedback from the teacher.",
                ],
                "Practice one more question and review the answer.",
                "Practice and feedback help learning become stronger.",
            ),
        ]

        return [
            QuizQuestion(
                id=str(uuid4()),
                question=question,
                options=options,
                correctAnswer=correct_answer,
                explanation=explanation,
            )
            for question, options, correct_answer, explanation in templates
        ]

    def _mock_feedback(self, topic: str, score: float, difficulty: DifficultyLevel) -> str:
        if score < 50:
            return (
                f"Revise the basics of {topic} with short examples first. "
                "Then try another easy quiz to build confidence."
            )
        if score <= 80:
            return (
                f"Good effort in {topic}. Review the missed explanations and practice a few more "
                f"{difficulty.value} questions."
            )
        return (
            f"Strong work in {topic}. You can now move to harder questions and explain the idea in your own words."
        )
