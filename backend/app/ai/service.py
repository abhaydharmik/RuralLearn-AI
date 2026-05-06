from __future__ import annotations

import asyncio
import json
import re
from uuid import uuid4

from groq import Groq  # type: ignore

from app.ai.prompts import FEEDBACK_PROMPT, QUIZ_PROMPT, TUTOR_PROMPT
from app.config import Settings
from app.models.quiz import DifficultyLevel, QuizQuestion
from app.models.revision import RevisionPracticeQuestion, RevisionResponse


class TutorAIService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.model_name = settings.groq_model
        self.client = (
            Groq(api_key=settings.groq_api_key)
            if settings.groq_api_key and not settings.use_mock_ai
            else None
        )

    async def explain_topic(
        self,
        question: str,
        difficulty: DifficultyLevel,
        language: str | None = None,
    ) -> tuple[str, str]:
        language_name = self._normalize_language(language)
        if not self.client:
            return self._mock_explanation(question, difficulty, language_name), "mock"

        prompt = TUTOR_PROMPT.format(topic=question, language=language_name)
        try:
            answer = await self._chat_completion(
                [
                    {
                        "role": "system",
                        "content": (
                            "You are a kind AI tutor for rural beginner students. "
                            "Keep answers short, simple, practical, and encouraging. "
                            f"Always answer in {language_name}."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=180,
            )
            return answer or self._mock_explanation(question, difficulty, language_name), "groq"
        except Exception:
            return self._mock_explanation(question, difficulty, language_name), "mock"

    async def generate_quiz(
        self,
        topic: str,
        difficulty: DifficultyLevel,
        language: str | None = None,
    ) -> tuple[list[QuizQuestion], str]:
        language_name = self._normalize_language(language)
        if not self.client:
            return self._mock_quiz(topic, difficulty), "mock"

        difficulty = self._normalize_difficulty(difficulty)
        prompt = (
            QUIZ_PROMPT.format(topic=topic, difficulty=difficulty.value, language=language_name)
            + "\nEach correctAnswer must be the exact full text of one option."
            + "\nReturn exactly 5 questions and no extra text."
        )
        try:
            raw_text = await self._chat_completion(
                [
                    {
                        "role": "system",
                        "content": (
                            "Return only valid JSON. Do not include markdown, notes, "
                            "or text outside the JSON object. "
                            f"Write all learner-facing text in {language_name}."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=1100,
            )
            questions = self._parse_quiz_questions(raw_text or "")
            if len(questions) != 5:
                return self._mock_quiz(topic, difficulty), "mock"
            return questions, "groq"
        except Exception:
            return self._mock_quiz(topic, difficulty), "mock"

    async def generate_feedback(
        self,
        topic: str,
        score: float,
        difficulty: DifficultyLevel,
        language: str | None = None,
    ) -> tuple[str, str]:
        language_name = self._normalize_language(language)
        if not self.client:
            return self._mock_feedback(score, language_name), "mock"

        prompt = FEEDBACK_PROMPT.format(topic=topic, score=score, language=language_name)
        try:
            feedback = await self._chat_completion(
                [
                    {
                        "role": "system",
                        "content": (
                            "Give supportive, practical feedback in under 60 words. "
                            "Avoid long lectures. "
                            f"Answer in {language_name}."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"{prompt}\nNext difficulty: {self._difficulty_value(difficulty)}.",
                    },
                ],
                max_tokens=140,
            )
            return feedback or self._mock_feedback(score, language_name), "groq"
        except Exception:
            return self._mock_feedback(score, language_name), "mock"

    async def generate_revision(
        self,
        topic: str,
        difficulty: DifficultyLevel,
        language: str | None = None,
    ) -> RevisionResponse:
        difficulty = self._normalize_difficulty(difficulty)
        language_name = self._normalize_language(language)
        if not self.client:
            return self._mock_revision(topic, difficulty, "mock", language_name)

        prompt = f"""
Create a short revision plan for a beginner rural student.

Topic: {topic}
Difficulty: {difficulty.value}
Language: {language_name}

Return only JSON with this exact shape:
{{
  "summary": "4 short beginner-friendly sentences",
  "examples": ["example 1", "example 2"],
  "practiceQuestions": [
    {{"question": "short question 1", "answer": "short answer 1"}},
    {{"question": "short question 2", "answer": "short answer 2"}},
    {{"question": "short question 3", "answer": "short answer 3"}}
  ]
}}
"""
        try:
            raw_text = await self._chat_completion(
                [
                    {
                        "role": "system",
                        "content": (
                            "Return valid JSON only. Keep language simple and practical. "
                            f"Write every learner-facing field in {language_name}."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=700,
            )
            parsed = self._extract_json(raw_text or "")
            summary = str(parsed.get("summary", "")).strip()
            examples = [
                str(example).strip()
                for example in parsed.get("examples", [])
                if str(example).strip()
            ][:3]
            practice_questions = [
                RevisionPracticeQuestion(
                    question=str(item.get("question", "")).strip(),
                    answer=str(item.get("answer", "")).strip(),
                )
                for item in parsed.get("practiceQuestions", [])
                if str(item.get("question", "")).strip() and str(item.get("answer", "")).strip()
            ][:3]

            if not summary or len(practice_questions) < 3:
                return self._mock_revision(topic, difficulty, "mock", language_name)

            return RevisionResponse(
                topic=topic,
                difficulty=difficulty,
                summary=summary,
                examples=examples,
                practiceQuestions=practice_questions,
                source="groq",
            )
        except Exception:
            return self._mock_revision(topic, difficulty, "mock", language_name)

    async def _chat_completion(self, messages: list[dict], max_tokens: int) -> str:
        response = await asyncio.to_thread(
            lambda: self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.35,
                max_tokens=max_tokens,
            )
        )
        return (response.choices[0].message.content or "").strip()

    def _parse_quiz_questions(self, text: str) -> list[QuizQuestion]:
        parsed = self._extract_json(text)
        questions: list[QuizQuestion] = []

        for item in parsed.get("questions", []):
            options = [str(option).strip() for option in item.get("options", [])]
            correct_answer = str(item.get("correctAnswer", "")).strip()

            if len(options) != 4:
                continue
            correct_answer = self._normalize_correct_answer(correct_answer, options)
            if correct_answer not in options:
                continue

            question_text = str(item.get("question", "")).strip()
            explanation = str(item.get("explanation", "")).strip()
            if len(question_text) < 5 or len(explanation) < 5:
                continue

            questions.append(
                QuizQuestion(
                    id=str(uuid4()),
                    question=question_text,
                    options=options,
                    correctAnswer=correct_answer,
                    explanation=explanation,
                )
            )

            if len(questions) == 5:
                break

        return questions

    def _normalize_correct_answer(self, correct_answer: str, options: list[str]) -> str:
        if correct_answer in options:
            return correct_answer

        cleaned_answer = self._strip_option_marker(correct_answer).lower()
        for option in options:
            if self._strip_option_marker(option).lower() == cleaned_answer:
                return option

        letter_match = re.match(r"^\s*([A-Da-d])[\).:\-]?\s*$", correct_answer)
        if letter_match:
            return options[ord(letter_match.group(1).upper()) - ord("A")]

        return correct_answer

    def _strip_option_marker(self, value: str) -> str:
        return re.sub(r"^\s*[A-Da-d][\).:\-]\s*", "", str(value)).strip()

    def _extract_json(self, text: str) -> dict:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            return {}

        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return {}

    def _mock_explanation(self, question: str, difficulty: DifficultyLevel, language: str) -> str:
        difficulty = self._normalize_difficulty(difficulty)
        level_hint = {
            DifficultyLevel.easy: "simple words",
            DifficultyLevel.medium: "a small example",
            DifficultyLevel.hard: "one deeper idea",
        }[difficulty]
        if language == "Hindi":
            return (
                f"{question} को हम छोटे-छोटे कदमों में समझते हैं। "
                f"{level_hint} के साथ शुरू करें, एक उदाहरण देखें और फिर एक छोटा प्रश्न हल करें।"
            )
        if language == "Marathi":
            return (
                f"{question} आपण टप्प्याटप्प्याने समजतो. "
                f"{level_hint} पासून सुरुवात करा, एक उदाहरण पाहा आणि मग एक छोटा प्रश्न सोडवा."
            )
        return (
            f"{question} means we understand the idea step by step. "
            f"Think of it using {level_hint}: start with what you know, "
            "look at one example, then practice one small question."
        )

    def _mock_feedback(self, score: float, language: str) -> str:
        if language == "Hindi":
            if score < 50:
                return "अच्छी शुरुआत है। मूल विचार दोबारा पढ़ें और फिर आसान क्विज़ आज़माएँ।"
            if score <= 80:
                return "अच्छी प्रगति है। छूटे हुए प्रश्न दोहराएँ और फिर मध्यम क्विज़ करें।"
            return "बहुत बढ़िया। अब आप थोड़ा कठिन क्विज़ करने के लिए तैयार हैं।"
        if language == "Marathi":
            if score < 50:
                return "छान सुरुवात आहे. मूलभूत कल्पना पुन्हा पाहा आणि सोपी क्विझ करून पाहा."
            if score <= 80:
                return "चांगली प्रगती आहे. चुकलेले प्रश्न पुन्हा पाहा आणि मध्यम क्विझ करा."
            return "उत्तम काम. आता तुम्ही थोडी कठीण क्विझसाठी तयार आहात."
        if score < 50:
            return "Good start. Review the basic idea, then try an easier practice quiz."
        if score <= 80:
            return "Nice progress. Revise the missed questions and try one medium quiz next."
        return "Excellent work. You are ready for a harder quiz with deeper examples."

    def _mock_revision(
        self,
        topic: str,
        difficulty: DifficultyLevel,
        source: str,
        language: str,
    ) -> RevisionResponse:
        if language == "Hindi":
            summary = (
                f"{topic} को पहले सरल अर्थ से शुरू करें, फिर उसे एक दैनिक उदाहरण से जोड़ें। "
                "मुख्य विचार अपने शब्दों में लिखें। छोटे प्रश्नों से अभ्यास करें। "
                "फिर सुधार देखने के लिए क्विज़ दोबारा करें।"
            )
            examples = [
                f"उदाहरण: {topic} को छोटे छात्र को आसान शब्दों में समझाइए।",
                f"उदाहरण: {topic} का एक छोटा प्रश्न हल कीजिए और हर कदम बोलिए।",
            ]
            questions = [
                RevisionPracticeQuestion(
                    question=f"{topic} का मुख्य विचार क्या है?",
                    answer=f"मुख्य विचार {topic} का सरल अर्थ या मूल नियम है।",
                ),
                RevisionPracticeQuestion(
                    question=f"जब {topic} कठिन लगे तो क्या करें?",
                    answer="इसे छोटे कदमों में बांटें और एक-एक उदाहरण का अभ्यास करें।",
                ),
                RevisionPracticeQuestion(
                    question=f"{topic} को बेहतर याद कैसे रखें?",
                    answer="व्याख्या दोहराएँ और एक छोटा क्विज़ फिर से करें।",
                ),
            ]
        elif language == "Marathi":
            summary = (
                f"{topic} ची सुरुवात सोप्या अर्थापासून करा आणि मग ते एका दैनंदिन उदाहरणाशी जोडा. "
                "मुख्य कल्पना स्वतःच्या शब्दांत लिहा. लहान प्रश्नांपासून सराव करा. "
                "नंतर सुधारणा पाहण्यासाठी क्विझ पुन्हा करा."
            )
            examples = [
                f"उदाहरण: {topic} लहान विद्यार्थ्याला सोप्या शब्दांत समजावून सांगा.",
                f"उदाहरण: {topic} वर एक छोटा प्रश्न सोडवा आणि प्रत्येक टप्पा मोठ्याने सांगा.",
            ]
            questions = [
                RevisionPracticeQuestion(
                    question=f"{topic} ची मुख्य कल्पना काय आहे?",
                    answer=f"मुख्य कल्पना म्हणजे {topic} चा सोपा अर्थ किंवा मूलभूत नियम.",
                ),
                RevisionPracticeQuestion(
                    question=f"{topic} अवघड वाटल्यास काय करावे?",
                    answer="ते छोट्या टप्प्यांत विभागा आणि एकावेळी एक उदाहरण सराव करा.",
                ),
                RevisionPracticeQuestion(
                    question=f"{topic} अधिक चांगले लक्षात कसे राहील?",
                    answer="स्पष्टीकरण पुन्हा वाचा आणि एक छोटी क्विझ पुन्हा सोडवा.",
                ),
            ]
        else:
            summary = (
                f"Start {topic} with the basic meaning, then connect it to one real-life example. "
                "Write the key idea in your own words. Practice small questions first. "
                "After that, try one quiz again to check improvement."
            )
            examples = [
                f"Example: explain {topic} to a younger student using simple words.",
                f"Example: solve one small {topic} question and say each step aloud.",
            ]
            questions = [
                RevisionPracticeQuestion(
                    question=f"What is the main idea of {topic}?",
                    answer=f"The main idea is the simple meaning or basic rule of {topic}.",
                ),
                RevisionPracticeQuestion(
                    question=f"What should you do when {topic} feels hard?",
                    answer="Break it into small steps and practice one example at a time.",
                ),
                RevisionPracticeQuestion(
                    question=f"How can you remember {topic} better?",
                    answer="Revise the explanation and try a short practice quiz.",
                ),
            ]
        return RevisionResponse(
            topic=topic,
            difficulty=difficulty,
            summary=summary,
            examples=examples,
            practiceQuestions=questions,
            source=source,
        )

    def _mock_quiz(self, topic: str, difficulty: DifficultyLevel) -> list[QuizQuestion]:
        return [
            QuizQuestion(
                id=str(uuid4()),
                question=f"What is the main idea of {topic}?",
                options=[
                    f"A simple meaning of {topic}",
                    "A random unrelated idea",
                    "Only a memorized word",
                    "Something that cannot be learned",
                ],
                correctAnswer=f"A simple meaning of {topic}",
                explanation=f"{topic} is easier when you understand the main idea first.",
            ),
            QuizQuestion(
                id=str(uuid4()),
                question=f"Which method helps you learn {topic} better?",
                options=[
                    "Practice with examples",
                    "Skip all questions",
                    "Guess without reading",
                    "Avoid revision",
                ],
                correctAnswer="Practice with examples",
                explanation="Examples connect the topic to real life and make it easier to remember.",
            ),
            QuizQuestion(
                id=str(uuid4()),
                question=f"What should you do if {topic} feels difficult?",
                options=[
                    "Break it into small steps",
                    "Stop learning forever",
                    "Ignore the basics",
                    "Choose answers randomly",
                ],
                correctAnswer="Break it into small steps",
                explanation="Small steps reduce confusion and build confidence.",
            ),
            QuizQuestion(
                id=str(uuid4()),
                question=f"Why is revision useful for {topic}?",
                options=[
                    "It strengthens memory",
                    "It removes the need to practice",
                    "It makes learning impossible",
                    "It changes the topic",
                ],
                correctAnswer="It strengthens memory",
                explanation="Revision helps your brain remember important points for longer.",
            ),
            QuizQuestion(
                id=str(uuid4()),
                question=f"What is a good next step after studying {topic}?",
                options=[
                    "Try a short quiz",
                    "Close the book without practice",
                    "Forget the explanation",
                    "Avoid asking questions",
                ],
                correctAnswer="Try a short quiz",
                explanation="A quiz shows what you understood and what needs more practice.",
            ),
        ]

    def _normalize_difficulty(self, value: DifficultyLevel | str | None) -> DifficultyLevel:
        if isinstance(value, DifficultyLevel):
            return value
        try:
            return DifficultyLevel(str(value or "easy").lower())
        except ValueError:
            return DifficultyLevel.easy

    def _difficulty_value(self, value: DifficultyLevel | str | None) -> str:
        return self._normalize_difficulty(value).value

    def _normalize_language(self, language: str | None) -> str:
        normalized = str(language or "English").strip().lower()
        if normalized in {"hindi", "hi"}:
            return "Hindi"
        if normalized in {"marathi", "mr"}:
            return "Marathi"
        return "English"
