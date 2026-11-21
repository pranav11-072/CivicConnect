import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, UploadCloud } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../services/api";
import type { Complaint, NlpAnalysisResult } from "../types";

const LOCATIONS = [
  "Indiranagar",
  "Koramangala",
  "Jayanagar",
  "Whitefield",
  "Malleshwaram",
  "Yelahanka",
  "Rajajinagar",
  "HSR Layout",
  "Electronic City",
  "Bengaluru Central",
];

const SAMPLE_PROMPTS = [
  {
    label: "English (Roads)",
    title: "Deep potholes causing accidents on 100ft road",
    location: "Indiranagar",
    description: "Deep potholes on the main road near metro station are causing bike accidents and traffic congestion daily.",
  },
  {
    label: "ಕನ್ನಡ (Water)",
    title: "ಕುಡಿಯುವ ನೀರಿನ ಪೈಪ್ ಒಡೆದಿದೆ",
    location: "Jayanagar",
    description: "ಮುಖ್ಯ ರಸ್ತೆಯಲ್ಲಿ ನೀರಿನ ಪೈಪ್ ಒಡೆದು ಕುಡಿಯುವ ನೀರು ವ್ಯರ್ಥವಾಗುತ್ತಿದೆ, ತಕ್ಷಣ ಸರಿಪಡಿಸಿ.",
  },
  {
    label: "Kanglish (Electricity)",
    title: "Transformer spark agthide school hatra",
    location: "Malleshwaram",
    description: "Namma street alli transformer spark agthide school hatra tumbha danger ide urgent help madi.",
  },
];

export default function SubmitGrievancePage() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("Indiranagar");
  const [customLocation, setCustomLocation] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ complaint: Complaint; nlp_analysis: NlpAnalysisResult } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("location", location === "Other" ? customLocation : location);
      formData.append("description", description);
      if (image) {
        formData.append("image", image);
      }

      const res = await api.submitComplaint(formData);
      setResult({ complaint: res.complaint, nlp_analysis: res.nlp_analysis });
      setTitle("");
      setDescription("");
      setImage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit grievance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-civic-navy">Submit a Civic Grievance</h1>
          <p className="text-sm text-slate-600 mt-1">
            Describe your issue in Kannada (ಕನ್ನಡ), English, or Kanglish. The Python NLP classifier will route it to the right department.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Quick fill example:</span>
          {SAMPLE_PROMPTS.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => {
                setTitle(sample.title);
                setLocation(sample.location);
                setDescription(sample.description);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 transition"
            >
              {sample.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-sm">{error}</div>
        )}

        {result && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-civic-green shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1.5">
                <h2 className="font-display font-bold text-emerald-950">
                  Registered: <span className="font-mono">{result.complaint.complaint_code}</span>
                </h2>
                <p className="text-sm text-emerald-900">{result.complaint.auto_response_en}</p>
                <p className="text-sm text-emerald-900">{result.complaint.auto_response_kn}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-emerald-200 text-xs">
              <div>
                <span className="text-emerald-700 block">Category</span>
                <strong className="text-emerald-950">{result.nlp_analysis.predicted_category}</strong>
              </div>
              <div>
                <span className="text-emerald-700 block">Language</span>
                <strong className="text-emerald-950">{result.nlp_analysis.detected_language}</strong>
              </div>
              <div>
                <span className="text-emerald-700 block">Urgency · Sentiment</span>
                <strong className="text-emerald-950">
                  {result.nlp_analysis.urgency} · {result.nlp_analysis.sentiment}
                </strong>
              </div>
              <div>
                <span className="text-emerald-700 block">NLP Confidence</span>
                <strong className="font-mono tabular-nums text-emerald-950">
                  {Math.round(result.nlp_analysis.confidence * 100)}%
                </strong>
              </div>
            </div>

            {result.nlp_analysis.needs_human_review && (
              <div className="flex items-center gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                Confidence is below 55%. An officer will manually verify the department classification.
              </div>
            )}

            <Link
              to={`/complaints/${result.complaint.id}`}
              className="inline-block text-sm font-semibold text-civic-blue hover:underline"
            >
              View full complaint details →
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Complaint Title</label>
            <input
              type="text"
              required
              minLength={4}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Water pipeline burst near 12th Main / ಮುಖ್ಯ ರಸ್ತೆಯಲ್ಲಿ ನೀರಿನ ಪೈಪ್ ಒಡೆದಿದೆ"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-civic-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ward / Location</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-civic-blue"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
              <option value="Other">Other Locality</option>
            </select>
            {location === "Other" && (
              <input
                type="text"
                required
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="Enter exact street, ward, or landmark"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Detailed Description (Kannada / English / Kanglish)
            </label>
            <textarea
              required
              minLength={10}
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-civic-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Supporting Image (Optional · PNG, JPG, WEBP up to 5 MB)
            </label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-5 cursor-pointer hover:bg-slate-50 transition">
              <UploadCloud className="w-6 h-6 text-slate-400 mb-1.5" aria-hidden="true" />
              <span className="text-xs text-slate-600">{image ? image.name : "Click to select an image file"}</span>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-civic-navy hover:bg-civic-blue text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-60"
          >
            {loading ? "Classifying & Submitting..." : "Submit Grievance"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
