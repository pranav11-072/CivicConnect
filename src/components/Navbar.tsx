import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate("/");
  };

  return (
    <header className="bg-civic-navy text-white border-b border-white/10 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <Link
          to="/"
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          CivicConnect AI
        </Link>

        {/* Zone 2: Concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-200">
          {!isAuthenticated ? (
            <>
              <a href="/#departments" className="hover:text-white hover:underline underline-offset-4 transition whitespace-nowrap shrink-0">
                Departments
              </a>
              <a href="/#workflow" className="hover:text-white hover:underline underline-offset-4 transition whitespace-nowrap shrink-0">
                How It Works
              </a>
              <Link to="/citizen/login" className="hover:text-white hover:underline underline-offset-4 transition whitespace-nowrap shrink-0">
                Citizen Login
              </Link>
              <Link to="/officer/login" className="hover:text-white hover:underline underline-offset-4 transition whitespace-nowrap shrink-0">
                Officer Portal
              </Link>
            </>
          ) : (
            <>
              <Link
                to={user?.role === "officer" ? "/officer/dashboard" : "/citizen/dashboard"}
                className="hover:text-white hover:underline underline-offset-4 transition whitespace-nowrap shrink-0"
              >
                Dashboard
              </Link>
              {user?.role === "citizen" ? (
                <>
                  <Link to="/citizen/submit" className="hover:text-white hover:underline underline-offset-4 transition whitespace-nowrap shrink-0">
                    Submit Grievance
                  </Link>
                  <Link to="/citizen/track" className="hover:text-white hover:underline underline-offset-4 transition whitespace-nowrap shrink-0">
                    Track Status
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/officer/complaints" className="hover:text-white hover:underline underline-offset-4 transition whitespace-nowrap shrink-0">
                    Grievances
                  </Link>
                  <Link to="/officer/analytics" className="hover:text-white hover:underline underline-offset-4 transition whitespace-nowrap shrink-0">
                    Analytics
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="hidden md:flex items-center shrink-0">
          {!isAuthenticated ? (
            <Link
              to="/citizen/register"
              className="px-4 py-2 text-xs font-semibold bg-civic-saffron hover:bg-amber-700 text-white rounded-lg transition whitespace-nowrap shrink-0"
            >
              Register Grievance
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg transition whitespace-nowrap shrink-0"
            >
              Sign Out
            </button>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle navigation menu"
          className="md:hidden p-2 rounded-lg hover:bg-white/10"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-civic-blue px-4 py-3 space-y-2 border-t border-white/10 text-sm">
          {!isAuthenticated ? (
            <>
              <Link to="/" onClick={() => setMobileOpen(false)} className="block py-2">Home</Link>
              <Link to="/citizen/login" onClick={() => setMobileOpen(false)} className="block py-2">Citizen Login</Link>
              <Link to="/citizen/register" onClick={() => setMobileOpen(false)} className="block py-2 text-amber-300 font-semibold">
                Register Grievance
              </Link>
              <Link to="/officer/login" onClick={() => setMobileOpen(false)} className="block py-2">Officer Portal</Link>
            </>
          ) : (
            <>
              <Link
                to={user?.role === "officer" ? "/officer/dashboard" : "/citizen/dashboard"}
                onClick={() => setMobileOpen(false)}
                className="block py-2"
              >
                Dashboard
              </Link>
              <button type="button" onClick={handleLogout} className="block py-2 text-rose-200 font-medium">
                Sign Out
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
