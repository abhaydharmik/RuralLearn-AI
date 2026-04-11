from google import genai
from uuid import uuid4

from app.ai.prompts import FEEDBACK_PROMPT, QUIZ_PROMPT, TUTOR_PROMPT
from app.config import Settings
from app.models.quiz import DifficultyLevel, QuizQuestion


class TutorAIService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

        if settings.google_api_key and not settings.use_mock_ai:
            self.client = genai.Client(api_key=settings.google_api_key)

            # 🔥 AUTO-DETECT WORKING MODEL
            self.model_name = self._get_working_model()

        else:
            self.client = None
            self.model_name = None

        print("GEMINI CLIENT:", self.client)
        print("USING MODEL:", self.model_name)

    # 🔥 AUTO MODEL DETECTION
    def _get_working_model(self):
        try:
            models = list(self.client.models.list())

            for m in models:
                name = m.name

                # pick first text model
                if "generateContent" in str(m.supported_actions):
                    print("FOUND MODEL:", name)
                    return name

            return models[0].name if models else None

        except Exception as e:
            print("Model detection error:", e)
            return None

    # ✅ CHAT
    async def explain_topic(self, question: str, difficulty: DifficultyLevel):
        if not self.client or not self.model_name:
            return f"{question} explained simply.", "mock"

        try:
            prompt = TUTOR_PROMPT.format(topic=question)

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
            )

            return response.text, "gemini"

        except Exception as e:
            print("Gemini error:", e)
            return f"{question} explained simply.", "mock"

    # ✅ QUIZ (simplified)
    async def generate_quiz(self, topic: str, difficulty: DifficultyLevel):
        return [], "gemini"

    # ✅ FEEDBACK
    async def generate_feedback(self, topic: str, score: float, difficulty: DifficultyLevel):
        if not self.client or not self.model_name:
            return "Keep practicing!", "mock"

        try:
            prompt = f"Student scored {score}% in {topic}. Give feedback."

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
            )

            return response.text, "gemini"

        except Exception as e:
            print("Gemini feedback error:", e)
            return "Keep practicing!", "mock"