import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import PublicLayout from "../layouts/PublicLayout";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";

export default function OfficerLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [employeeId, setEmployeeId] = useState("GOV-KA-1001");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getOfficerStatus()
      .then((res) => setNeedsSetup(res.needsSetup))
      .catch(() => setNeedsSetup(false))
      .finally(() => setCheckingStatus(false));
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.loginOfficer({ email, password });
      login(res.token, res.user);
      navigate("/officer/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleFirstRunSetup = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.setupOfficer({
        full_name: fullName,
        email,
        employee_id: employeeId,
        password,
      });
      login(res.token, res.user);
      navigate("/officer/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize officer account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto my-14 px-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="w-10 h-10 rounded-lg bg-civic-navy text-amber-300 flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </div>

          {checkingStatus ? (
            <p className="text-sm text-slate-600">Checking officer portal configuration...</p>
          ) : needsSetup ? (
            <>
              <h1 className="font-display text-2xl font-bold text-civic-navy">Initial Officer Setup</h1>
              <p className="text-sm text-slate-600 mt-1">
                No officer account has been claimed yet. Configure the primary Nodal Grievance Officer account to lock setup.
              </p>

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-rose-50 text-rose-800 text-sm border border-rose-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleFirstRunSetup} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Officer Full Name</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Kavitha Deshpande"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@civicconnect.gov.in"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Create Officer Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-civic-saffron hover:bg-amber-700 text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-60"
                >
                  {loading ? "Configuring Account..." : "Claim Nodal Officer Account"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-civic-navy">Government Officer Login</h1>
              <p className="text-sm text-slate-600 mt-1">
                Authorized municipal and grievance redressal personnel.
              </p>

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-rose-50 text-rose-800 text-sm border border-rose-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@civicconnect.gov.in"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-civic-navy hover:bg-civic-blue text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Sign In to Officer Portal"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
