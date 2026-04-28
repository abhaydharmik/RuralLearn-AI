import {
  changeLocalPassword,
  createLocalUser,
  getCurrentMockUser,
  loginLocalUser,
  logoutLocalUser,
  updateLocalUser,
} from "@/data/mockData";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import {
  mergeUserWithProfileExtras,
  normalizeProfileFields,
  saveStoredProfileExtras,
} from "@/services/profileService";

const frontendAdminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function mapSupabaseUser(user) {
  const profile = normalizeProfileFields({
    fullName: user.user_metadata?.full_name,
    school: user.user_metadata?.school,
    classGrade: user.user_metadata?.class_grade,
    preferredSubject: user.user_metadata?.preferred_subject,
    learningGoal: user.user_metadata?.learning_goal,
    language: user.user_metadata?.language_mode,
    explanationStyle: user.user_metadata?.explanation_style,
    quizMode: user.user_metadata?.quiz_mode,
    reminderTime: user.user_metadata?.reminder_time,
    ageGroup: user.user_metadata?.age_group,
    targetExam: user.user_metadata?.target_exam,
    guardianName: user.user_metadata?.guardian_name,
    teacherName: user.user_metadata?.teacher_name,
    schoolContact: user.user_metadata?.school_contact,
    emergencyContact: user.user_metadata?.emergency_contact,
    avatarTheme: user.user_metadata?.avatar_theme,
  });
  const role = String(
    user.app_metadata?.role ||
      user.user_metadata?.role ||
      user.user_metadata?.user_role ||
      "student",
  ).toLowerCase();
  const isAdmin =
    role === "admin" ||
    role === "teacher" ||
    frontendAdminEmails.includes(String(user.email || "").toLowerCase());

  return {
    id: user.id,
    email: user.email,
    fullName: profile.fullName,
    school: profile.school || "Connected via Supabase",
    classGrade: profile.classGrade,
    preferredSubject: profile.preferredSubject,
    learningGoal: profile.learningGoal,
    language: profile.language,
    explanationStyle: profile.explanationStyle,
    quizMode: profile.quizMode,
    reminderTime: profile.reminderTime,
    ageGroup: profile.ageGroup,
    targetExam: profile.targetExam,
    guardianName: profile.guardianName,
    teacherName: profile.teacherName,
    schoolContact: profile.schoolContact,
    emergencyContact: profile.emergencyContact,
    avatarTheme: profile.avatarTheme,
    loginMethod: "Email + Password",
    role: isAdmin ? "admin" : role,
    isAdmin,
  };
}

async function applyServerProfile(user, token) {
  if (!token) {
    return user;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return user;
    }

    const profile = await response.json();
    return {
      ...user,
      fullName: profile.fullName || user.fullName,
      school: profile.school || user.school,
      role: profile.role || user.role,
      isAdmin: Boolean(profile.isAdmin),
    };
  } catch {
    return user;
  }
}

export async function getSessionUser() {
  if (hasSupabaseConfig) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    const mappedUser = await applyServerProfile(mapSupabaseUser(session.user), session.access_token);
    return mergeUserWithProfileExtras(mappedUser);
  }

  return mergeUserWithProfileExtras(getCurrentMockUser());
}

export async function getAccessToken() {
  if (!hasSupabaseConfig) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token || null;
}

export function subscribeToAuthChanges(callback) {
  if (!hasSupabaseConfig) {
    return () => {};
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      callback(null);
      return;
    }

    applyServerProfile(mapSupabaseUser(session.user), session.access_token).then((user) => {
      callback(mergeUserWithProfileExtras(user));
    });
  });

  return () => subscription.unsubscribe();
}

export async function login(credentials) {
  if (hasSupabaseConfig) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user || !data.session) {
      throw new Error("Login did not return a valid session. Please try again.");
    }

    const mappedUser = await applyServerProfile(mapSupabaseUser(data.user), data.session.access_token);
    return mergeUserWithProfileExtras(mappedUser);
  }

  return mergeUserWithProfileExtras(loginLocalUser(credentials));
}

export async function signup(payload) {
  if (hasSupabaseConfig) {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName,
          school: payload.school || "Rural Community School",
          class_grade: payload.classGrade || "",
          preferred_subject: payload.preferredSubject || "",
          learning_goal: payload.learningGoal || "",
          language_mode: payload.language || "English",
          explanation_style: payload.explanationStyle || "Very simple",
          quiz_mode: payload.quizMode || "Auto",
          reminder_time: payload.reminderTime || "18:00",
          age_group: payload.ageGroup || "",
          target_exam: payload.targetExam || "",
          guardian_name: payload.guardianName || "",
          teacher_name: payload.teacherName || "",
          school_contact: payload.schoolContact || "",
          emergency_contact: payload.emergencyContact || "",
          avatar_theme: payload.avatarTheme || "emerald",
          role: "student",
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session) {
      throw new Error(
        "Signup successful. Please confirm your email in Supabase/Auth email, then sign in.",
      );
    }

    const mappedUser = await applyServerProfile(mapSupabaseUser(data.user), data.session.access_token);
    return mergeUserWithProfileExtras(mappedUser);
  }

  return mergeUserWithProfileExtras(createLocalUser(payload));
}

export async function updateProfile(payload) {
  const normalized = normalizeProfileFields(payload);
  const { avatarImage, savedTopics, ...profileFields } = normalized;

  if (hasSupabaseConfig) {
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: profileFields.fullName,
        school: profileFields.school,
        class_grade: profileFields.classGrade,
        preferred_subject: profileFields.preferredSubject,
        learning_goal: profileFields.learningGoal,
        language_mode: profileFields.language,
        explanation_style: profileFields.explanationStyle,
        quiz_mode: profileFields.quizMode,
        reminder_time: profileFields.reminderTime,
        age_group: profileFields.ageGroup,
        target_exam: profileFields.targetExam,
        guardian_name: profileFields.guardianName,
        teacher_name: profileFields.teacherName,
        school_contact: profileFields.schoolContact,
        emergency_contact: profileFields.emergencyContact,
        avatar_theme: profileFields.avatarTheme,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    const sessionUser = await getSessionUser();
    const mergedUser = {
      ...sessionUser,
      ...profileFields,
    };
    saveStoredProfileExtras(mergedUser.id, { avatarImage, savedTopics });
    return mergeUserWithProfileExtras(mergedUser);
  }

  const updatedUser = updateLocalUser(profileFields);
  saveStoredProfileExtras(updatedUser.id, { avatarImage, savedTopics });
  return mergeUserWithProfileExtras(updatedUser);
}

export async function changePassword({ currentPassword, nextPassword }) {
  if (hasSupabaseConfig) {
    const { error } = await supabase.auth.updateUser({ password: nextPassword });
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  changeLocalPassword({ currentPassword, nextPassword });
}

export async function logoutEverywhere() {
  if (hasSupabaseConfig) {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  logoutLocalUser();
}

export async function logout() {
  if (hasSupabaseConfig) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  logoutLocalUser();
}
