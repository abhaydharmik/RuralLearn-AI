import {
  evaluateMockQuiz,
  generateMockChatReply,
  generateMockQuiz,
  getChatMessages,
  getMockProgress,
  saveChatMessage,
} from "@/data/mockData";
import { normalizeDifficultyLabel } from "@/lib/utils";
import { request, shouldUseMockFallback } from "@/services/apiClient";

function normalizeQuizPayload(payload) {
  return {
    ...payload,
    difficulty: normalizeDifficultyLabel(payload.difficulty),
  };
}

function normalizeSubmissionPayload(payload) {
  return {
    ...payload,
    difficulty: normalizeDifficultyLabel(payload.difficulty),
  };
}

function normalizeProgressPayload(payload) {
  return {
    ...payload,
    accuracy: Number(payload.accuracy || 0),
    completedQuizzes: Number(payload.completedQuizzes || 0),
    currentDifficulty: normalizeDifficultyLabel(payload.currentDifficulty),
    weeklyAccuracy: (payload.weeklyAccuracy || []).map((value) => Number(value || 0)),
    topicBreakdown: payload.topicBreakdown || [],
    weakTopics: payload.weakTopics || [],
    recentResults: (payload.recentResults || []).map((entry) => ({
      ...entry,
      score: Number(entry.score || 0),
      correctAnswers: Number(entry.correctAnswers || 0),
      totalQuestions: Number(entry.totalQuestions || 0),
      difficulty: normalizeDifficultyLabel(entry.difficulty),
    })),
  };
}

export async function fetchChatHistory() {
  if (shouldUseMockFallback()) {
    return getChatMessages();
  }

  return request("/api/chat/history");
}

export async function sendChatMessage({ question, difficulty, userId }) {
  const userMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: question,
    createdAt: new Date().toISOString(),
  };

  if (shouldUseMockFallback()) {
    saveChatMessage(userMessage);
    const mockReply = generateMockChatReply(question, difficulty);
    saveChatMessage(mockReply);
    return mockReply;
  }

  const response = await request("/api/chat", {
    method: "POST",
    body: JSON.stringify({ question, difficulty: difficulty?.toLowerCase(), userId }),
  });

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: response.answer,
    createdAt: new Date().toISOString(),
    source: response.source,
  };
}

export async function createQuiz({ topic, difficulty, userId }) {
  if (shouldUseMockFallback()) {
    return generateMockQuiz(topic, difficulty);
  }

  const response = await request("/api/quiz", {
    method: "POST",
    body: JSON.stringify({ topic, difficulty: difficulty?.toLowerCase(), userId }),
  });
  return normalizeQuizPayload(response);
}

export async function submitQuiz({ topic, questions, answers, userId }) {
  if (shouldUseMockFallback()) {
    return evaluateMockQuiz({ topic, questions, answers });
  }

  const response = await request("/api/submit", {
    method: "POST",
    body: JSON.stringify({ topic, questions, answers, userId }),
  });
  return normalizeSubmissionPayload(response);
}

export async function fetchProgress() {
  if (shouldUseMockFallback()) {
    return getMockProgress();
  }

  const response = await request("/api/progress");
  return normalizeProgressPayload(response);
}

export async function fetchRevision(topic) {
  if (shouldUseMockFallback()) {
    const progress = getMockProgress();
    const selectedTopic = topic || progress.weakTopics?.[0] || "Fractions";
    return {
      topic: selectedTopic,
      difficulty: progress.currentDifficulty,
      summary: `Review ${selectedTopic} with one simple definition, two examples, and a short practice set.`,
      examples: [
        `Explain ${selectedTopic} using an everyday example.`,
        `Solve one small ${selectedTopic} question step by step.`,
      ],
      practiceQuestions: [
        {
          question: `What is the main idea of ${selectedTopic}?`,
          answer: `The main idea is the simple meaning of ${selectedTopic}.`,
        },
        {
          question: `How should you practice ${selectedTopic}?`,
          answer: "Start with small examples, then try a short quiz.",
        },
        {
          question: `What helps when ${selectedTopic} feels hard?`,
          answer: "Break the topic into small steps and revise slowly.",
        },
      ],
      source: "mock",
    };
  }

  const response = await request("/api/revision", {
    method: "POST",
    body: JSON.stringify({ topic: topic || null }),
  });

  return {
    ...response,
    difficulty: normalizeDifficultyLabel(response.difficulty),
  };
}

export async function fetchQuizHistory() {
  if (shouldUseMockFallback()) {
    return { results: getMockProgress().recentResults || [] };
  }

  const response = await request("/api/history");
  return {
    results: (response.results || []).map((entry) => ({
      ...entry,
      score: Number(entry.score || 0),
      correctAnswers: Number(entry.correctAnswers || 0),
      totalQuestions: Number(entry.totalQuestions || 0),
      difficulty: normalizeDifficultyLabel(entry.difficulty),
      questionReview: entry.questionReview || [],
    })),
  };
}

export async function fetchAdminDashboard() {
  if (shouldUseMockFallback()) {
    const progress = getMockProgress();
    return {
      totalStudents: 1,
      totalQuizzes: progress.completedQuizzes,
      averageAccuracy: progress.accuracy,
      weakTopicCounts: (progress.weakTopics || []).map((topic) => ({ topic, count: 1 })),
      students: [
        {
          id: "demo-student",
          email: "demo@student.local",
          accuracy: progress.accuracy,
          completedQuizzes: progress.completedQuizzes,
          currentDifficulty: progress.currentDifficulty,
          weakTopics: progress.weakTopics,
          lastActive: progress.recentResults?.[0]?.submittedAt,
        },
      ],
      recentResults: progress.recentResults || [],
    };
  }

  const response = await request("/api/admin/dashboard");
  return {
    ...response,
    averageAccuracy: Number(response.averageAccuracy || 0),
    students: (response.students || []).map((student) => ({
      ...student,
      accuracy: Number(student.accuracy || 0),
      completedQuizzes: Number(student.completedQuizzes || 0),
      currentDifficulty: normalizeDifficultyLabel(student.currentDifficulty),
      weakTopics: student.weakTopics || [],
    })),
    recentResults: (response.recentResults || []).map((entry) => ({
      ...entry,
      score: Number(entry.score || 0),
      correctAnswers: Number(entry.correctAnswers || 0),
      totalQuestions: Number(entry.totalQuestions || 0),
      difficulty: normalizeDifficultyLabel(entry.difficulty),
    })),
  };
}
