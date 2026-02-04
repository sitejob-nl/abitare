import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  authInitError: string | null;
  retryAuthInit: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isAdminOrManager: boolean;
  isInstaller: boolean;
  activeDivisionId: string | null;
  setActiveDivisionId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitError, setAuthInitError] = useState<string | null>(null);
  const [activeDivisionId, setActiveDivisionId] = useState<string | null>(null);

  const initStartedRef = useRef(false);
  const initTimeoutRef = useRef<number | null>(null);

  const clearInitTimeout = () => {
    if (initTimeoutRef.current) {
      window.clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
  };

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    let timeoutId: number | null = null;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  };

  // Fetch profile and roles for a user
  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else {
        setProfile(profileData);
        // Set active division from profile if not already set
        if (!activeDivisionId && profileData?.division_id) {
          setActiveDivisionId(profileData.division_id);
        }
      }

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      } else {
        setRoles(rolesData?.map((r) => r.role) || []);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const startInitTimeout = () => {
      clearInitTimeout();
      initTimeoutRef.current = window.setTimeout(() => {
        if (!isMounted) return;
        console.error("Auth init timeout: forcing isLoading=false");
        setAuthInitError(
          "Authenticatie duurt te lang of is vastgelopen. Probeer opnieuw of log uit."
        );
        setIsLoading(false);
      }, 8000);
    };

    const resetAuthState = () => {
      setProfile(null);
      setRoles([]);
      setActiveDivisionId(null);
    };

    // Listener voor ONGOING auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Bij SIGN_IN altijd wachten op rollen
          if (event === 'SIGNED_IN') {
            try {
              await withTimeout(fetchUserData(currentSession.user.id), 6000, "fetchUserData(SIGNED_IN)");
            } catch (e) {
              console.error("Auth state change fetchUserData timeout/error:", e);
              setAuthInitError(
                "Gebruikersgegevens ophalen duurt te lang. Probeer opnieuw of log uit."
              );
            }
          } else {
            // Voor andere events (TOKEN_REFRESH) fire and forget
            fetchUserData(currentSession.user.id);
          }
        } else {
          resetAuthState();
        }
      }
    );

    // INITIËLE load - wacht op alles voordat isLoading false wordt
    const initializeAuth = async () => {
      try {
        if (initStartedRef.current) return;
        initStartedRef.current = true;
        setAuthInitError(null);
        startInitTimeout();

        const { data: { session: existingSession } } = await withTimeout(
          supabase.auth.getSession(),
          6000,
          "supabase.auth.getSession"
        );
        
        if (!isMounted) return;

        setSession(existingSession);
        setUser(existingSession?.user ?? null);

        if (existingSession?.user) {
          await withTimeout(fetchUserData(existingSession.user.id), 6000, "fetchUserData(init)");
        }
      } catch (err) {
        console.error("Auth initialize error:", err);
        if (isMounted) {
          setAuthInitError(
            "Kon authenticatie niet initialiseren. Probeer opnieuw of log uit."
          );
          resetAuthState();
        }
      } finally {
        if (isMounted) {
          clearInitTimeout();
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      clearInitTimeout();
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setActiveDivisionId(null);
    setAuthInitError(null);
  };

  const retryAuthInit = () => {
    window.location.reload();
  };

  const isAdmin = roles.includes("admin");
  const isAdminOrManager = roles.includes("admin") || roles.includes("manager");
  const isInstaller = roles.includes("monteur");

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading,
        authInitError,
        retryAuthInit,
        signIn,
        signUp,
        signOut,
        isAdmin,
        isAdminOrManager,
        isInstaller,
        activeDivisionId,
        setActiveDivisionId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
