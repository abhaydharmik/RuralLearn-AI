import {
  createLocalUser,
  getCurrentMockUser,
  loginLocalUser,
  logoutLocalUser,
} from "@/data/mockData";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

function mapSupabaseUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.user_metadata?.full_name || "Student",
    school: user.user_metadata?.school || "Connected via Supabase",
  };
}

export async function getSessionUser() {
  if (hasSupabaseConfig) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    return mapSupabaseUser(session.user);
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
    callback(session?.user ? mapSupabaseUser(session.user) : null);
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

    return mapSupabaseUser(data.user);
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

    return mapSupabaseUser(data.user);
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
