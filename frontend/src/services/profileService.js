const PROFILE_EXTRAS_KEY = "rurallearn_profile_extras_v1";

export const avatarThemes = {
  emerald: "from-primary/70 to-cyan-400/80 text-slate-950",
  ocean: "from-sky-400/80 to-blue-500/80 text-white",
  sunrise: "from-amber-400/85 to-orange-500/85 text-slate-950",
  rose: "from-rose-400/85 to-pink-500/85 text-white",
  violet: "from-violet-500/80 to-indigo-500/80 text-white",
};

export const languageOptions = ["English", "Hindi", "Marathi"];
export const explanationStyleOptions = ["Very simple", "Normal", "Detailed"];
export const quizModeOptions = ["Auto", "Easy", "Medium", "Hard"];
export const ageGroupOptions = ["8-10", "11-13", "14-16", "17+"];

function readExtrasStore() {
  try {
    const raw = localStorage.getItem(PROFILE_EXTRAS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeExtrasStore(store) {
  localStorage.setItem(PROFILE_EXTRAS_KEY, JSON.stringify(store));
}

function createDefaultExtras() {
  return {
    avatarImage: "",
    savedTopics: [],
  };
}

export function normalizeProfileFields(input = {}) {
  return {
    fullName: input.fullName || "Student",
    school: input.school || "Rural Community School",
    classGrade: input.classGrade || "",
    preferredSubject: input.preferredSubject || "",
    learningGoal: input.learningGoal || "",
    language: input.language || "English",
    explanationStyle: input.explanationStyle || "Very simple",
    quizMode: input.quizMode || "Auto",
    reminderTime: input.reminderTime || "18:00",
    ageGroup: input.ageGroup || "",
    targetExam: input.targetExam || "",
    guardianName: input.guardianName || "",
    teacherName: input.teacherName || "",
    schoolContact: input.schoolContact || "",
    emergencyContact: input.emergencyContact || "",
    avatarTheme: input.avatarTheme || "emerald",
    loginMethod: input.loginMethod || "Email + Password",
    avatarImage: input.avatarImage || "",
    savedTopics: Array.isArray(input.savedTopics) ? input.savedTopics : [],
  };
}

export function getStoredProfileExtras(userId) {
  if (!userId) {
    return createDefaultExtras();
  }

  const store = readExtrasStore();
  return {
    ...createDefaultExtras(),
    ...(store[userId] || {}),
    savedTopics: Array.isArray(store[userId]?.savedTopics) ? store[userId].savedTopics : [],
  };
}

export function saveStoredProfileExtras(userId, updates = {}) {
  if (!userId) {
    return createDefaultExtras();
  }

  const store = readExtrasStore();
  const nextValue = {
    ...createDefaultExtras(),
    ...(store[userId] || {}),
    ...updates,
  };
  nextValue.savedTopics = Array.isArray(nextValue.savedTopics) ? nextValue.savedTopics : [];
  store[userId] = nextValue;
  writeExtrasStore(store);
  return nextValue;
}

export function mergeUserWithProfileExtras(user) {
  if (!user) {
    return user;
  }

  return {
    ...normalizeProfileFields(user),
    ...getStoredProfileExtras(user.id),
    id: user.id,
    email: user.email,
    role: user.role,
    isAdmin: user.isAdmin,
  };
}

function toDateKey(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function keyToDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function buildStudyMetrics(history = [], chatMessages = []) {
  const activityKeys = new Set();

  history.forEach((entry) => {
    const key = toDateKey(entry.submittedAt);
    if (key) {
      activityKeys.add(key);
    }
  });

  chatMessages
    .filter((message) => message.role === "user")
    .forEach((message) => {
      const key = toDateKey(message.createdAt);
      if (key) {
        activityKeys.add(key);
      }
    });

  const sortedKeys = [...activityKeys].sort();
  const tutorQuestions = chatMessages.filter((message) => message.role === "user").length;

  let longestStreak = 0;
  let currentRun = 0;
  let previousKey = null;

  sortedKeys.forEach((key) => {
    if (!previousKey) {
      currentRun = 1;
    } else {
      const previousDate = keyToDate(previousKey);
      const currentDate = keyToDate(key);
      const difference = Math.round((currentDate - previousDate) / 86400000);
      currentRun = difference === 1 ? currentRun + 1 : 1;
    }

    longestStreak = Math.max(longestStreak, currentRun);
    previousKey = key;
  });

  let currentStreak = 0;
  if (sortedKeys.length) {
    let pointer = sortedKeys.length - 1;
    let expectedDate = new Date();

    while (pointer >= 0) {
      const expectedKey = toDateKey(expectedDate);
      if (sortedKeys[pointer] !== expectedKey) {
        if (currentStreak === 0) {
          expectedDate.setDate(expectedDate.getDate() - 1);
          if (sortedKeys[pointer] !== toDateKey(expectedDate)) {
            break;
          }
        }
      }

      if (sortedKeys[pointer] === toDateKey(expectedDate)) {
        currentStreak += 1;
        pointer -= 1;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalSessions: sortedKeys.length,
    lastActive: sortedKeys.length ? keyToDate(sortedKeys[sortedKeys.length - 1]).toISOString() : null,
    tutorQuestions,
  };
}

export function buildAchievements({
  profile,
  progress,
  history,
  chatMessages,
  studyMetrics,
  strongestTopic,
}) {
  const achievements = [];

  if ((progress?.completedQuizzes || 0) >= 1) {
    achievements.push({
      title: "First Quiz Completed",
      description: "Started building a real learning profile with the first submission.",
    });
  }

  if ((progress?.completedQuizzes || 0) >= 5) {
    achievements.push({
      title: "Quiz Explorer",
      description: "Completed five or more practice sets.",
    });
  }

  if ((progress?.accuracy || 0) >= 80) {
    achievements.push({
      title: "High Accuracy",
      description: "Reached an average score of 80% or more.",
    });
  }

  if ((studyMetrics?.currentStreak || 0) >= 3) {
    achievements.push({
      title: "Study Streak",
      description: "Stayed active for three or more days in a row.",
    });
  }

  if ((studyMetrics?.tutorQuestions || 0) >= 10) {
    achievements.push({
      title: "Curious Learner",
      description: "Asked the AI tutor at least ten questions.",
    });
  }

  if ((progress?.weakTopics || []).length === 0 && (progress?.completedQuizzes || 0) > 0) {
    achievements.push({
      title: "Balanced Progress",
      description: "No weak topics are currently flagged in the learning profile.",
    });
  }

  if (strongestTopic && strongestTopic.accuracy >= 85) {
    achievements.push({
      title: "Topic Master",
      description: `${strongestTopic.topic} is becoming a strong subject area.`,
    });
  }

  if (profile?.learningGoal) {
    achievements.push({
      title: "Goal Setter",
      description: "Set a personal learning goal inside the profile.",
    });
  }

  if (profile?.guardianName || profile?.teacherName) {
    achievements.push({
      title: "Support Network",
      description: "Guardian or teacher contact details are connected to the profile.",
    });
  }

  if ((profile?.savedTopics || []).length >= 3) {
    achievements.push({
      title: "Revision Planner",
      description: "Saved multiple topics to revisit later.",
    });
  }

  if (profile?.language && profile.language !== "English") {
    achievements.push({
      title: "Language Ready",
      description: `Profile is configured for ${profile.language} support.`,
    });
  }

  if ((history || []).length >= 8) {
    achievements.push({
      title: "Consistent Practitioner",
      description: "Built a strong submission history across many quizzes.",
    });
  }

  return achievements;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function downloadProfileReport({
  profile,
  progress,
  studyMetrics,
  strongestTopic,
  weakestTopic,
  achievements,
}) {
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(profile.fullName)} - Learning Profile Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; color: #0f172a; }
      h1, h2 { margin-bottom: 8px; }
      p, li { line-height: 1.6; }
      .section { margin-top: 28px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
      .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(profile.fullName)} - Learning Profile Report</h1>
    <p>Email: ${escapeHtml(profile.email || "Not available")}</p>
    <p>School: ${escapeHtml(profile.school || "Rural Community School")}</p>
    <p>Role: ${escapeHtml(profile.isAdmin ? "Admin" : "Student")}</p>

    <div class="section">
      <h2>Progress Summary</h2>
      <div class="grid">
        <div class="card">Accuracy: ${Math.round(progress?.accuracy || 0)}%</div>
        <div class="card">Completed Quizzes: ${progress?.completedQuizzes || 0}</div>
        <div class="card">Current Difficulty: ${escapeHtml(progress?.currentDifficulty || "Easy")}</div>
        <div class="card">Tutor Questions Asked: ${studyMetrics?.tutorQuestions || 0}</div>
      </div>
    </div>

    <div class="section">
      <h2>Academic Profile</h2>
      <p>Class / Grade: ${escapeHtml(profile.classGrade || "-")}</p>
      <p>Preferred Subject: ${escapeHtml(profile.preferredSubject || "-")}</p>
      <p>Learning Goal: ${escapeHtml(profile.learningGoal || "-")}</p>
      <p>Target Exam / Focus: ${escapeHtml(profile.targetExam || "-")}</p>
      <p>Strongest Topic: ${escapeHtml(strongestTopic?.topic || "-")}</p>
      <p>Weakest Topic: ${escapeHtml(weakestTopic?.topic || "-")}</p>
    </div>

    <div class="section">
      <h2>Study Streak</h2>
      <p>Current Streak: ${studyMetrics?.currentStreak || 0} days</p>
      <p>Longest Streak: ${studyMetrics?.longestStreak || 0} days</p>
      <p>Total Sessions: ${studyMetrics?.totalSessions || 0}</p>
      <p>Last Active: ${escapeHtml(studyMetrics?.lastActive ? new Date(studyMetrics.lastActive).toLocaleString() : "-")}</p>
    </div>

    <div class="section">
      <h2>Achievements</h2>
      <ul>
        ${achievements.length
          ? achievements.map((item) => `<li><strong>${escapeHtml(item.title)}:</strong> ${escapeHtml(item.description)}</li>`).join("")
          : "<li>No achievements unlocked yet.</li>"}
      </ul>
    </div>

    <div class="section">
      <h2>Saved Topics</h2>
      <p>${escapeHtml((profile.savedTopics || []).join(", ") || "No topics saved yet.")}</p>
    </div>
  </body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${(profile.fullName || "student").replace(/\s+/g, "-").toLowerCase()}-learning-report.html`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
