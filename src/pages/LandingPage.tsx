import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Construction, Droplets, Trash2, Zap } from "lucide-react";
import PublicLayout from "../layouts/PublicLayout";

export default function LandingPage() {
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const departments = [
    {
      icon: Droplets,
      name: "Water Supply",
      kn: "ನೀರು ಸರಬರಾಜು",
      scope: "Pipeline leaks, borewells, contamination, and low pressure",
    },
    {
      icon: Zap,
      name: "Electricity",
      kn: "ವಿದ್ಯುತ್ ಸರಬರಾಜು",
      scope: "Outages, street lighting, transformer sparks, and hanging wires",
    },
    {
      icon: Construction,
      name: "Roads & Infrastructure",
      kn: "ರಸ್ತೆ ಮತ್ತು ಮೂಲಸೌಕರ್ಯ",
      scope: "Potholes, broken footpaths, missing manhole covers, and resurfacing",
    },
    {
      icon: Trash2,
      name: "Sanitation & Waste",
      kn: "ನೈರ್ಮಲ್ಯ ಮತ್ತು ತ್ಯಾಜ್ಯ",
      scope: "Garbage collection delays, blocked drains, and sewage overflow",
    },
  ];

  return (
    <PublicLayout>
      {/* Hero Split */}
      <section className="bg-civic-navy text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-xs font-medium tracking-wide text-amber-300">
                Multilingual Public Grievance Redressal · ಕನ್ನಡ · English · Kanglish
              </p>
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-tight text-balance">
                Report civic issues in your own language, routed with precision.
              </h1>
              <p className="text-slate-200 text-base sm:text-lg leading-relaxed max-w-xl">
                CivicConnect AI processes citizen complaints written in Kannada script, English, or
                Kanglish—classifying the municipal department, assessing urgency, and generating
                bilingual status updates automatically.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/citizen/register"
                  className="inline-flex items-center gap-2 bg-civic-saffron hover:bg-amber-700 text-white font-semibold px-6 py-3 rounded-lg transition whitespace-nowrap shrink-0"
                >
                  Register & Submit Grievance
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/citizen/login"
                  className="inline-flex items-center bg-white text-civic-navy hover:bg-slate-100 font-semibold px-5 py-3 rounded-lg transition whitespace-nowrap shrink-0"
                >
                  Citizen Login
                </Link>
                <Link
                  to="/officer/login"
                  className="inline-flex items-center border border-white/30 hover:bg-white/10 text-white font-semibold px-5 py-3 rounded-lg transition whitespace-nowrap shrink-0"
                >
                  Officer Portal
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] rounded-xl overflow-hidden border border-white/15 bg-civic-blue relative">
                {!heroImgFailed ? (
                  <img
                    src="/src/assets/images/hero_civic_portal_1795269555345.jpg"
                    alt="Municipal Water and Civic Infrastructure Command Center"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-civic-blue to-civic-navy">
                    <Building2 className="w-12 h-12 text-amber-300 mb-3" aria-hidden="true" />
                    <p className="font-display font-semibold text-white">Municipal Command & Redressal Portal</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-width 4-Column Department Strip */}
      <section id="departments" className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-civic-navy">
              Four Integrated Municipal Departments
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Every grievance is automatically assigned to the responsible department and tracked until closure.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {departments.map((dept) => {
              const Icon = dept.icon;
              return (
                <div key={dept.name} className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                  <Icon className="w-5 h-5 text-civic-blue" aria-hidden="true" />
                  <div>
                    <h3 className="font-display font-bold text-slate-900">{dept.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{dept.kn}</p>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{dept.scope}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Editorial Asymmetric Workflow Section */}
      <section id="workflow" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-civic-navy text-balance">
            How multilingual grievance classification works in practice
          </h2>
          <p className="text-slate-600 mt-2 text-base">
            From natural citizen input to officer verification, every step persists in SQLite with a complete audit trail.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <h3 className="font-display text-lg font-bold text-civic-navy">01. Natural Multilingual Submission</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Citizens submit grievances in Kannada Unicode, English, or transliterated Kanglish alongside
                ward location and optional photo evidence, receiving a unique tracking code immediately.
              </p>
            </div>
            <div className="border-t border-slate-100 pt-5 space-y-2">
              <h3 className="font-display text-lg font-bold text-civic-navy">02. Regex Normalization & TF-IDF Classification</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Our Python NLP pipeline normalizes Kanglish and Kannada stems, extracts n-gram TF-IDF features,
                scores urgency and sentiment, and flags predictions below 55% confidence for manual officer review.
              </p>
            </div>
            <div className="border-t border-slate-100 pt-5 space-y-2">
              <h3 className="font-display text-lg font-bold text-civic-navy">03. Bilingual Officer Redressal & Analytics</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Government officers filter active complaints, verify low-confidence predictions, post bilingual
                resolutions, export CSV reports, and monitor real-time department analytics.
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 bg-civic-navy text-white rounded-xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-medium text-amber-300">Illustrative Input & Bilingual Output Format</p>
              <div className="bg-white/10 rounded-lg p-4 space-y-1.5">
                <p className="text-xs text-slate-300">Citizen Complaint · Kanglish</p>
                <p className="text-sm font-medium text-white">
                  "Main road pipe odedu neeru waste agthide urgent repair madi"
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-white/10 rounded-lg p-3">
                  <span className="text-slate-300 block">Category</span>
                  <strong className="text-white mt-0.5 block">Water Supply</strong>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <span className="text-slate-300 block">Urgency</span>
                  <strong className="text-amber-300 mt-0.5 block">High</strong>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <span className="text-slate-300 block">Sentiment</span>
                  <strong className="text-white mt-0.5 block">Negative</strong>
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 space-y-2 text-xs text-slate-100">
                <p>
                  <strong className="text-amber-300">English:</strong> Your water supply complaint has been registered
                  successfully. Our concerned department will review your complaint.
                </p>
                <p>
                  <strong className="text-amber-300">ಕನ್ನಡ:</strong> ನಿಮ್ಮ ನೀರು ಸರಬರಾಜು ದೂರನ್ನು ಯಶಸ್ವಿಯಾಗಿ ನೋಂದಾಯಿಸಲಾಗಿದೆ.
                  ಸಂಬಂಧಪಟ್ಟ ಇಲಾಖೆಯು ನಿಮ್ಮ ದೂರನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ.
                </p>
              </div>
            </div>

            <Link
              to="/citizen/register"
              className="inline-flex items-center justify-center gap-2 bg-civic-saffron hover:bg-amber-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition"
            >
              Get Started as Citizen <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
