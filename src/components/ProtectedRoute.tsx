import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types";

export default function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to={allowedRoles?.includes("officer") ? "/officer/login" : "/citizen/login"}
        replace
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to={user.role === "officer" ? "/officer/dashboard" : "/citizen/dashboard"}
        replace
      />
    );
  }

  return <>{children}</>;
}
