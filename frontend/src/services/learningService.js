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
    currentDifficulty: normalizeDifficultyLabel(payload.currentDifficulty),
    recentResults: (payload.recentResults || []).map((entry) => ({
      ...entry,
      difficulty: normalizeDifficultyLabel(entry.difficulty),
    })),
  };
}

export async function fetchChatHistory(userId) {
  if (!shouldUseMockFallback()) {
    try {
      return await request("/api/chat/history");
    } catch {
      // Fall through to the mock layer so the UI remains usable.
    }
  }

  return getChatMessages();
}

export async function sendChatMessage({ question, difficulty, userId }) {
  const userMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: question,
    createdAt: new Date().toISOString(),
  };
  saveChatMessage(userMessage);

  if (!shouldUseMockFallback()) {
    try {
      const response = await request("/api/chat", {
        method: "POST",
        body: JSON.stringify({ question, difficulty: difficulty?.toLowerCase(), userId }),
      });

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.answer,
        createdAt: new Date().toISOString(),
      };

      saveChatMessage(assistantMessage);
      return assistantMessage;
    } catch {
      // Fall through to the mock layer so the UI remains usable.
    }
  }

  const mockReply = generateMockChatReply(question, difficulty);
  saveChatMessage(mockReply);
  return mockReply;
}

export async function createQuiz({ topic, difficulty, userId }) {
  if (!shouldUseMockFallback()) {
    try {
      const response = await request("/api/quiz", {
        method: "POST",
        body: JSON.stringify({ topic, difficulty: difficulty?.toLowerCase(), userId }),
      });
      return normalizeQuizPayload(response);
    } catch {
      // Fall through to the mock layer so the UI remains usable.
    }
  }

  return generateMockQuiz(topic, difficulty);
}

export async function submitQuiz({ topic, questions, answers, userId }) {
  if (!shouldUseMockFallback()) {
    try {
      const response = await request("/api/submit", {
        method: "POST",
        body: JSON.stringify({ topic, questions, answers, userId }),
      });
      return normalizeSubmissionPayload(response);
    } catch {
      // Fall through to the mock layer so the UI remains usable.
    }
  }

  return evaluateMockQuiz({ topic, questions, answers });
}

export async function fetchProgress(userId) {
  if (!shouldUseMockFallback()) {
    try {
      const response = await request("/api/progress");
      return normalizeProgressPayload(response);
    } catch {
      // Fall through to the mock layer so the UI remains usable.
    }
  }

  return getMockProgress();
}
