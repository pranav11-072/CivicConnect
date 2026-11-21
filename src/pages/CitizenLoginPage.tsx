import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";

export default function CitizenLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.loginCitizen({ email, password });
      login(res.token, res.user);
      navigate("/citizen/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto my-14 px-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <h1 className="font-display text-2xl font-bold text-civic-navy">Citizen Login</h1>
          <p className="text-sm text-slate-600 mt-1">Sign in to submit complaints and track updates.</p>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-rose-50 text-rose-800 text-sm border border-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-civic-blue"
                placeholder="citizen@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-civic-blue"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-civic-navy hover:bg-civic-blue text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-60"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-5">
            New to CivicConnect AI?{" "}
            <Link to="/citizen/register" className="text-civic-blue font-semibold hover:underline">
              Register as a citizen
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
