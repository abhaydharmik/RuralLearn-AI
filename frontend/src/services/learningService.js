import {
  evaluateMockQuiz,
  generateMockChatReply,
  generateMockQuiz,
  getChatMessages,
  getCurrentMockUser,
  getMockProgress,
  saveChatMessage,
} from "@/data/mockData";
import { normalizeDifficultyLabel } from "@/lib/utils";
import { request, shouldUseMockFallback } from "@/services/apiClient";

const mockAdminState = {
  users: null,
  settings: [
    {
      key: "maintenance_mode",
      label: "Maintenance mode",
      description: "Temporarily pause learner activity while admins review the system.",
      value: false,
      inputType: "boolean",
    },
    {
      key: "default_quiz_difficulty",
      label: "Default quiz difficulty",
      description: "Starting difficulty for new learners.",
      value: "easy",
      inputType: "select",
    },
    {
      key: "quiz_question_count",
      label: "Quiz question count",
      description: "Default number of questions in each quiz.",
      value: 5,
      inputType: "number",
    },
    {
      key: "ai_response_style",
      label: "AI response style",
      description: "How concise the tutor answers should be.",
      value: "short",
      inputType: "select",
    },
    {
      key: "supported_languages",
      label: "Supported languages",
      description: "Languages available to learners.",
      value: "English,Hindi,Marathi",
      inputType: "text",
    },
    {
      key: "allow_teacher_exports",
      label: "Allow teacher exports",
      description: "Allow teacher-role accounts to export class reports.",
      value: true,
      inputType: "boolean",
    },
  ],
  logs: [],
};

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

function ensureMockAdminUsers() {
  if (mockAdminState.users) {
    return mockAdminState.users;
  }

  const progress = getMockProgress();
  const currentUser = getCurrentMockUser();
  mockAdminState.users = [
    {
      id: currentUser?.id || "demo-admin",
      email: currentUser?.email || "admin@rurallearn.local",
      fullName: currentUser?.fullName || "Admin User",
      school: currentUser?.school || "Rural Community School",
      classGrade: currentUser?.classGrade || "8-A",
      role: currentUser?.isAdmin ? "admin" : "student",
      status: "active",
      isAdmin: Boolean(currentUser?.isAdmin),
      accuracy: Number(progress.accuracy || 0),
      completedQuizzes: Number(progress.completedQuizzes || 0),
      weakTopics: progress.weakTopics || [],
      lastActive: progress.recentResults?.[0]?.submittedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    },
    {
      id: "teacher-1",
      email: "teacher@rurallearn.local",
      fullName: "Teacher Guide",
      school: "Rural Community School",
      classGrade: "8-A",
      role: "teacher",
      status: "active",
      isAdmin: false,
      accuracy: 71,
      completedQuizzes: 12,
      weakTopics: ["Fractions", "Grammar"],
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    },
    {
      id: "student-2",
      email: "learner@rurallearn.local",
      fullName: "Village Learner",
      school: "Rural Community School",
      classGrade: "7-B",
      role: "student",
      status: "active",
      isAdmin: false,
      accuracy: 54,
      completedQuizzes: 5,
      weakTopics: ["Algebra", "Science"],
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    },
  ];
  return mockAdminState.users;
}

function createMockLog(action, summary, metadata = {}) {
  const currentUser = getCurrentMockUser();
  const entry = {
    id: crypto.randomUUID(),
    actorUserId: currentUser?.id || "demo-admin",
    actorEmail: currentUser?.email || "admin@rurallearn.local",
    action,
    targetType: "system",
    targetId: null,
    summary,
    metadata,
    createdAt: new Date().toISOString(),
  };
  mockAdminState.logs.unshift(entry);
  return entry;
}

function normalizeAdminUser(user) {
  return {
    ...user,
    accuracy: Number(user.accuracy || 0),
    completedQuizzes: Number(user.completedQuizzes || 0),
    weakTopics: user.weakTopics || [],
  };
}

export async function fetchChatHistory() {
  if (shouldUseMockFallback()) {
    return getChatMessages();
  }

  return request("/api/chat/history");
}

export async function sendChatMessage({ question, difficulty, userId, language }) {
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
    body: JSON.stringify({
      question,
      difficulty: difficulty?.toLowerCase(),
      userId,
      language,
    }),
  });

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: response.answer,
    createdAt: new Date().toISOString(),
    source: response.source,
  };
}

export async function createQuiz({ topic, difficulty, userId, language }) {
  if (shouldUseMockFallback()) {
    return generateMockQuiz(topic, difficulty);
  }

  const response = await request("/api/quiz", {
    method: "POST",
    body: JSON.stringify({
      topic,
      difficulty: difficulty?.toLowerCase(),
      userId,
      language,
    }),
  });
  return normalizeQuizPayload(response);
}

export async function submitQuiz({ topic, questions, answers, userId, language }) {
  if (shouldUseMockFallback()) {
    return evaluateMockQuiz({ topic, questions, answers });
  }

  const response = await request("/api/submit", {
    method: "POST",
    body: JSON.stringify({ topic, questions, answers, userId, language }),
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

export async function fetchRevision(topic, language) {
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
    body: JSON.stringify({ topic: topic || null, language }),
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
    const users = ensureMockAdminUsers();
    return {
      totalStudents: users.length,
      totalQuizzes: progress.completedQuizzes,
      averageAccuracy: progress.accuracy,
      weakTopicCounts: (progress.weakTopics || []).map((topic) => ({ topic, count: 1 })),
      students: users.map((user) => ({
        id: user.id,
        email: user.email,
        accuracy: user.accuracy,
        completedQuizzes: user.completedQuizzes,
        currentDifficulty: progress.currentDifficulty,
        weakTopics: user.weakTopics,
        lastActive: user.lastActive,
      })),
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

export async function fetchAdminUsers() {
  if (shouldUseMockFallback()) {
    const users = ensureMockAdminUsers().map(normalizeAdminUser);
    return { total: users.length, users };
  }

  const response = await request("/api/admin/users");
  return {
    total: Number(response.total || 0),
    users: (response.users || []).map(normalizeAdminUser),
  };
}

export async function updateAdminUser(userId, updates) {
  if (shouldUseMockFallback()) {
    const users = ensureMockAdminUsers();
    const index = users.findIndex((user) => user.id === userId);
    if (index < 0) {
      throw new Error("User could not be found.");
    }
    users[index] = normalizeAdminUser({
      ...users[index],
      ...updates,
      isAdmin: (updates.role || users[index].role) === "admin",
    });
    createMockLog("admin.user_updated", `Updated ${users[index].email}`, updates);
    return users[index];
  }

  const response = await request(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return normalizeAdminUser(response);
}

export async function fetchAdminPermissions() {
  if (shouldUseMockFallback()) {
    return {
      roles: [
        {
          role: "student",
          label: "Student",
          permissions: ["Use AI tutor", "Take quizzes", "See own analytics", "Manage own profile"],
        },
        {
          role: "teacher",
          label: "Teacher",
          permissions: ["Monitor learners", "Export class reports", "Review weak topics", "Track activity"],
        },
        {
          role: "admin",
          label: "Administrator",
          permissions: ["Manage users", "Export all reports", "Edit settings", "Review logs", "Monitor AI usage"],
        },
      ],
    };
  }

  return request("/api/admin/permissions");
}

export async function fetchAdminLogs() {
  if (shouldUseMockFallback()) {
    if (!mockAdminState.logs.length) {
      createMockLog("admin.settings_updated", "Updated system settings", { maintenance_mode: false });
      createMockLog("admin.report_exported", "Exported users report", { reportType: "users" });
    }
    return { total: mockAdminState.logs.length, entries: mockAdminState.logs };
  }

  return request("/api/admin/logs");
}

export async function fetchAdminSettings() {
  if (shouldUseMockFallback()) {
    return { settings: mockAdminState.settings };
  }

  return request("/api/admin/settings");
}

export async function updateAdminSettings(settings) {
  if (shouldUseMockFallback()) {
    mockAdminState.settings = mockAdminState.settings.map((item) =>
      Object.prototype.hasOwnProperty.call(settings, item.key)
        ? { ...item, value: settings[item.key] }
        : item,
    );
    createMockLog("admin.settings_updated", "Updated system settings", settings);
    return { settings: mockAdminState.settings };
  }

  return request("/api/admin/settings", {
    method: "PATCH",
    body: JSON.stringify({ settings }),
  });
}

export async function fetchAdminAIUsage() {
  if (shouldUseMockFallback()) {
    const users = ensureMockAdminUsers();
    return {
      provider: "mock",
      totalRequests: 29,
      metrics: [
        { feature: "chat", totalRequests: 12, successCount: 12, failureCount: 0, lastUsedAt: new Date().toISOString() },
        { feature: "quiz_generation", totalRequests: 8, successCount: 8, failureCount: 0, lastUsedAt: new Date().toISOString() },
        { feature: "revision", totalRequests: 5, successCount: 5, failureCount: 0, lastUsedAt: new Date().toISOString() },
        { feature: "quiz_submission", totalRequests: 4, successCount: 4, failureCount: 0, lastUsedAt: new Date().toISOString() },
      ],
      userActivity: users.map((user, index) => ({
        userId: user.id,
        email: user.email,
        totalRequests: 12 - index * 3,
        lastActivity: user.lastActive,
      })),
    };
  }

  return request("/api/admin/ai-usage");
}

export async function exportAdminReport(reportType) {
  if (shouldUseMockFallback()) {
    createMockLog("admin.report_exported", `Exported ${reportType} report`, { reportType });
    return {
      fileName: `admin-${reportType}.csv`,
      mimeType: "text/csv",
      content: "type,value\nmock,enabled\n",
    };
  }

  return request("/api/admin/reports/export", {
    method: "POST",
    body: JSON.stringify({ reportType }),
  });
}
