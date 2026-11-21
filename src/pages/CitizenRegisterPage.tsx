import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";

export default function CitizenRegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    preferred_language: "en" as "en" | "kn",
    ward_location: "Bengaluru Central",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.registerCitizen(form);
      login(res.token, res.user);
      navigate("/citizen/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto my-12 px-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <h1 className="font-display text-2xl font-bold text-civic-navy">Citizen Registration</h1>
          <p className="text-sm text-slate-600 mt-1">
            Create an account to submit grievances and receive bilingual updates.
          </p>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-rose-50 text-rose-800 text-sm border border-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                minLength={2}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-civic-blue"
                placeholder="e.g., Asha Kulkarni"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-civic-blue"
                placeholder="asha@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-civic-blue"
                  placeholder="9876543210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Language</label>
                <select
                  value={form.preferred_language}
                  onChange={(e) => setForm({ ...form, preferred_language: e.target.value as "en" | "kn" })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-civic-blue"
                >
                  <option value="en">English</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ward / Locality</label>
              <input
                type="text"
                required
                value={form.ward_location}
                onChange={(e) => setForm({ ...form, ward_location: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-civic-blue"
                placeholder="Indiranagar, Ward 80"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-civic-blue"
                placeholder="Minimum 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-civic-navy hover:bg-civic-blue text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-60"
            >
              {loading ? "Creating Account..." : "Create Citizen Account"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-5">
            Already registered?{" "}
            <Link to="/citizen/login" className="text-civic-blue font-semibold hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
