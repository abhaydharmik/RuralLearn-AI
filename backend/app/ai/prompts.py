TUTOR_PROMPT = (
    "Explain {topic} in very simple language for a beginner student with examples. "
    "Keep the answer under 90 words, warm, and easy to understand."
)

QUIZ_PROMPT = (
    "Generate 5 MCQs with answers and explanations for topic: {topic}. "
    "Return strict JSON with this shape: "
    '{"questions":[{"question":"...","options":["A","B","C","D"],"correctAnswer":"...","explanation":"..."}]}. '
    "The questions should match {difficulty} difficulty and be suitable for rural students."
)

FEEDBACK_PROMPT = (
    "Analyze answers and suggest improvements. "
    "Return a short response under 60 words for a student who scored {score}% in {topic}."
)
