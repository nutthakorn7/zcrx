"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "viewer";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const PUBLIC_ROUTES = ["/login", "/register", "/welcome"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedToken = localStorage.getItem("zcrx_token");
    const savedUser = localStorage.getItem("zcrx_user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    } else if (!PUBLIC_ROUTES.includes(pathname)) {
      router.push("/welcome");
    }
    setChecking(false);
  }, [pathname, router]);

  function logout() {
    localStorage.removeItem("zcrx_token");
    localStorage.removeItem("zcrx_user");
    setToken(null);
    setUser(null);
    router.push("/login");
  }

  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
          color: "var(--text-secondary)",
        }}
      >
        Loading...
      </div>
    );
  }

  // Show login/register without sidebar
  if (PUBLIC_ROUTES.includes(pathname)) {
    return (
      <AuthContext.Provider value={{ user, token, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Redirect if not authenticated
  if (!token) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, token, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
