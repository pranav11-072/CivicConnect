import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FilePlus2,
  SearchCheck,
  ClipboardList,
  BarChart3,
  LogOut,
  Building2,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [avatarFailed, setAvatarFailed] = useState(false);

  const citizenLinks = [
    { to: "/citizen/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/citizen/submit", label: "Submit Grievance", icon: FilePlus2 },
    { to: "/citizen/track", label: "Track Complaint", icon: SearchCheck },
  ];

  const officerLinks = [
    { to: "/officer/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/officer/complaints", label: "Manage Grievances", icon: ClipboardList },
    { to: "/officer/analytics", label: "Civic Analytics", icon: BarChart3 },
  ];

  const links = user?.role === "officer" ? officerLinks : citizenLinks;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <aside className="w-full md:w-64 bg-civic-navy text-white flex flex-col shrink-0 border-r border-slate-800">
        <div className="px-5 py-5 border-b border-white/10">
          <Link to="/" className="font-display font-bold text-base tracking-tight text-white block whitespace-nowrap">
            CivicConnect AI
          </Link>
          <p className="text-xs text-slate-400 mt-1">
            {user?.role === "officer" ? "Officer Redressal Console" : "Citizen Grievance Portal"}
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {links.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  active
                    ? "bg-civic-blue text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            {user?.role === "officer" && !avatarFailed ? (
              <img
                src="/src/assets/images/officer_nodal_avatar_1795269554509.jpg"
                alt={user.full_name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="w-9 h-9 rounded-lg object-cover border border-white/20 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-slate-300" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0 text-xs">
              <p className="font-semibold text-white truncate">{user?.full_name}</p>
              <p className="text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
