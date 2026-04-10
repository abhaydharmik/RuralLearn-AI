import { getDifficultyLabel } from "@/lib/utils";

const CHAT_KEY = "rurallearn_chat_messages";
const QUIZ_KEY = "rurallearn_quiz_results";
const USER_KEY = "rurallearn_local_user";
const USERS_KEY = "rurallearn_local_users";

const topicInsights = {
  algebra: {
    overview: "Algebra uses letters and numbers together to find missing values.",
    example: "If 2x = 10, divide both sides by 2, so x = 5.",
    tip: "Look for the operation around the letter, then undo it step by step.",
  },
  fractions: {
    overview: "Fractions show parts of a whole. The top number shows the parts we have.",
    example: "In 3/4, three parts are shaded out of four equal parts.",
    tip: "When denominators match, add or subtract only the top numbers.",
  },
  photosynthesis: {
    overview: "Photosynthesis is how plants make food using sunlight, water, and carbon dioxide.",
    example: "A green leaf captures sunlight and helps the plant produce glucose.",
    tip: "Remember: sunlight in, food out, oxygen released.",
  },
  grammar: {
    overview: "Grammar helps us arrange words so our meaning is clear.",
    example: "A sentence needs a subject and a verb, like 'Birds fly.'",
    tip: "Read the sentence aloud to check if it sounds complete.",
  },
};

const starterTopics = ["Algebra", "Fractions", "Photosynthesis", "Grammar"];

function getStorageItem(key, fallback) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

function setStorageItem(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function buildQuestion(topic, difficulty, index) {
  const title = topic.trim() || "General Science";
  const difficultyText = difficulty.toLowerCase();

  const templates = [
    {
      question: `What is the best simple explanation of ${title}?`,
      options: [
        `${title} is about understanding key ideas in a clear way.`,
        `${title} only means memorizing facts without meaning.`,
        `${title} can never be used in daily life.`,
        `${title} is always too hard for beginners.`,
      ],
      correctAnswer: `${title} is about understanding key ideas in a clear way.`,
      explanation: `A beginner-friendly answer should focus on the main idea of ${title} without making it confusing.`,
    },
    {
      question: `Which example best matches ${title}?`,
      options: [
        `Using a real-life situation to understand ${title}.`,
        `Ignoring examples while learning ${title}.`,
        `Skipping the basics of ${title}.`,
        `Learning ${title} without asking questions.`,
      ],
      correctAnswer: `Using a real-life situation to understand ${title}.`,
      explanation: `Examples connect theory to practice, which makes ${title} easier to learn.`,
    },
    {
      question: `What should a student do first while learning ${title} at a ${difficultyText} level?`,
      options: [
        "Start with the basic concept before moving ahead.",
        "Begin with the hardest problem directly.",
        "Memorize every detail at once.",
        "Avoid checking answers.",
      ],
      correctAnswer: "Start with the basic concept before moving ahead.",
      explanation: "Strong basics make later questions much easier to solve.",
    },
    {
      question: `Why are short explanations useful in ${title}?`,
      options: [
        "They help beginners understand one idea at a time.",
        "They remove all need for practice.",
        "They make mistakes impossible.",
        "They replace teachers completely.",
      ],
      correctAnswer: "They help beginners understand one idea at a time.",
      explanation: "Breaking ideas into small parts is helpful for beginner students.",
    },
    {
      question: `What is a good habit after studying ${title}?`,
      options: [
        "Practice one more question and review the answer.",
        "Stop learning after reading one line.",
        "Skip feedback and move on.",
        "Choose answers randomly.",
      ],
      correctAnswer: "Practice one more question and review the answer.",
      explanation: "Practice plus review builds confidence and understanding.",
    },
  ];

  return {
    id: `${title.toLowerCase().replace(/\s+/g, "-")}-${difficultyText}-${index + 1}`,
    ...templates[index],
  };
}

export function getCurrentMockUser() {
  return getStorageItem(USER_KEY, null);
}

export function createLocalUser({ fullName, email, password }) {
  const users = getStorageItem(USERS_KEY, []);
  const existingUser = users.find((user) => user.email.toLowerCase() === email.toLowerCase());

  if (existingUser) {
    throw new Error("An account with this email already exists.");
  }

  const user = {
    id: crypto.randomUUID(),
    fullName,
    email,
    password,
    school: "Rural Community School",
  };

  users.push(user);
  setStorageItem(USERS_KEY, users);
  const safeUser = { ...user, password: undefined };
  setStorageItem(USER_KEY, safeUser);
  return safeUser;
}

export function loginLocalUser({ email, password }) {
  const users = getStorageItem(USERS_KEY, []);
  const user = users.find(
    (entry) => entry.email.toLowerCase() === email.toLowerCase() && entry.password === password,
  );

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const safeUser = { ...user, password: undefined };
  setStorageItem(USER_KEY, safeUser);
  return safeUser;
}

export function logoutLocalUser() {
  localStorage.removeItem(USER_KEY);
}

export function saveChatMessage(message) {
  const messages = getStorageItem(CHAT_KEY, []);
  messages.push(message);
  setStorageItem(CHAT_KEY, messages);
}

export function getChatMessages() {
  return getStorageItem(CHAT_KEY, [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Hello! I am your AI tutor. Ask me any topic and I will explain it in very simple language.",
      createdAt: new Date().toISOString(),
    },
  ]);
}

export function generateMockChatReply(question, difficulty) {
  const normalizedQuestion = question.trim().toLowerCase();
  const matchedTopic =
    Object.keys(topicInsights).find((topic) => normalizedQuestion.includes(topic)) || "algebra";
  const topic = topicInsights[matchedTopic];

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: `${topic.overview} Example: ${topic.example} Tip: ${topic.tip} Difficulty now: ${difficulty.toLowerCase()}.`,
    createdAt: new Date().toISOString(),
  };
}

export function generateMockQuiz(topic, difficulty) {
  const resolvedTopic = topic || starterTopics[Math.floor(Math.random() * starterTopics.length)];
  const questions = Array.from({ length: 5 }, (_, index) =>
    buildQuestion(resolvedTopic, difficulty, index),
  );

  return {
    id: crypto.randomUUID(),
    topic: resolvedTopic,
    difficulty,
    questions,
  };
}

export function evaluateMockQuiz({ topic, questions, answers }) {
  const scoreCount = questions.reduce((total, question) => {
    return total + (answers[question.id] === question.correctAnswer ? 1 : 0);
  }, 0);

  const score = (scoreCount / questions.length) * 100;
  const result = {
    id: crypto.randomUUID(),
    topic,
    score,
    totalQuestions: questions.length,
    correctAnswers: scoreCount,
    submittedAt: new Date().toISOString(),
    questionReview: questions.map((question) => ({
      question: question.question,
      selectedAnswer: answers[question.id],
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      isCorrect: answers[question.id] === question.correctAnswer,
    })),
    feedback:
      score < 50
        ? "Let us slow down and revise the basics with more examples."
        : score <= 80
          ? "Good progress. Practice a few more questions to become more confident."
          : "Excellent work. You are ready for harder questions on this topic.",
  };

  const results = getStorageItem(QUIZ_KEY, []);
  results.push(result);
  setStorageItem(QUIZ_KEY, results);

  return result;
}

export function getMockProgress() {
  const results = getStorageItem(QUIZ_KEY, []);

  if (!results.length) {
    return {
      accuracy: 0,
      completedQuizzes: 0,
      currentDifficulty: "Easy",
      weakTopics: ["Algebra", "Reading", "Science Basics"],
      weeklyAccuracy: [18, 26, 33, 48, 52, 61, 68],
      topicBreakdown: [
        { topic: "Algebra", accuracy: 42 },
        { topic: "Science", accuracy: 57 },
        { topic: "Grammar", accuracy: 63 },
        { topic: "Fractions", accuracy: 46 },
      ],
      recentResults: [],
    };
  }

  const accuracy = results.reduce((sum, item) => sum + item.score, 0) / results.length;
  const groupedTopics = results.reduce((accumulator, entry) => {
    if (!accumulator[entry.topic]) {
      accumulator[entry.topic] = [];
    }
    accumulator[entry.topic].push(entry.score);
    return accumulator;
  }, {});

  const topicBreakdown = Object.entries(groupedTopics).map(([topic, scores]) => ({
    topic,
    accuracy: scores.reduce((sum, value) => sum + value, 0) / scores.length,
  }));

  const weakTopics = [...topicBreakdown]
    .sort((left, right) => left.accuracy - right.accuracy)
    .slice(0, 3)
    .map((entry) => entry.topic);

  const weeklyAccuracy = results.slice(-7).map((entry) => Math.round(entry.score));
  while (weeklyAccuracy.length < 7) {
    weeklyAccuracy.unshift(0);
  }

  return {
    accuracy,
    completedQuizzes: results.length,
    currentDifficulty: getDifficultyLabel(accuracy),
    weakTopics,
    weeklyAccuracy,
    topicBreakdown,
    recentResults: results.slice(-4).reverse(),
  };
}
