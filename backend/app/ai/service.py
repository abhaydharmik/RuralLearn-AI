from google import genai
from uuid import uuid4
import json
import re

from app.ai.prompts import FEEDBACK_PROMPT, QUIZ_PROMPT, TUTOR_PROMPT
from app.config import Settings
from app.models.quiz import DifficultyLevel, QuizQuestion


class TutorAIService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

        if settings.google_api_key and not settings.use_mock_ai:
            self.client = genai.Client(api_key=settings.google_api_key)
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
                if "generateContent" in str(m.supported_actions):
                    print("FOUND MODEL:", m.name)
                    return m.name

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

    # ✅ QUIZ (AI GENERATED)
    async def generate_quiz(self, topic: str, difficulty: DifficultyLevel):
        if not self.client or not self.model_name:
            return self._mock_quiz(topic, difficulty), "mock"

        try:
            prompt = f"""
Generate 5 multiple choice questions on topic: {topic}

Difficulty: {difficulty}

Return STRICT JSON in this format:

{{
  "questions": [
    {{
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "one option exactly",
      "explanation": "short explanation"
    }}
  ]
}}
"""

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
            )

            raw_text = response.text

            # ✅ Extract JSON safely
            parsed = self._extract_json(raw_text)

            questions = []

            for item in parsed.get("questions", [])[:5]:
                raw_options = item.get("options", [])

                # ✅ CLEAN OPTIONS
                options = [
                    str(opt)
                    .replace("A)", "")
                    .replace("B)", "")
                    .replace("C)", "")
                    .replace("D)", "")
                    .strip()
                    for opt in raw_options
                ]

                # ✅ Ensure exactly 4 options
                if len(options) != 4:
                    options = ["Option A", "Option B", "Option C", "Option D"]

                questions.append(
                    QuizQuestion(
                        id=str(uuid4()),
                        question=item.get("question", "").strip(),
                        options=options,
                        correctAnswer=item.get("correctAnswer", "").strip(),
                        explanation=item.get("explanation", "").strip(),
                    )
                )

            # ✅ Ensure exactly 5 questions
            if len(questions) != 5:
                return self._mock_quiz(topic, difficulty), "mock"

            return questions, "gemini"

        except Exception as e:
            print("Quiz error:", e)
            return self._mock_quiz(topic, difficulty), "mock"

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

    # 🔧 JSON extractor
    def _extract_json(self, text: str):
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            return {}

        try:
            return json.loads(match.group(0))
        except Exception:
            return {}

    # 🔧 Mock fallback quiz
    def _mock_quiz(self, topic, difficulty):
        return [
            QuizQuestion(
                id=str(uuid4()),
                question=f"What is {topic}?",
                options=["Option A", "Option B", "Option C", "Option D"],
                correctAnswer="Option A",
                explanation="This is a sample explanation."
            )
            for _ in range(5)
        ], "mock"