import {
  createLocalUser,
  getCurrentMockUser,
  loginLocalUser,
  logoutLocalUser,
} from "@/data/mockData";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

const frontendAdminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function mapSupabaseUser(user) {
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
    fullName: user.user_metadata?.full_name || "Student",
    school: user.user_metadata?.school || "Connected via Supabase",
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

    return applyServerProfile(mapSupabaseUser(session.user), session.access_token);
  }

  return getCurrentMockUser();
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

    applyServerProfile(mapSupabaseUser(session.user), session.access_token).then(callback);
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

    return applyServerProfile(mapSupabaseUser(data.user), data.session.access_token);
  }

  return loginLocalUser(credentials);
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

    return applyServerProfile(mapSupabaseUser(data.user), data.session.access_token);
  }

  return createLocalUser(payload);
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
