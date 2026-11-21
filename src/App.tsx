import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";

import LandingPage from "./pages/LandingPage";
import CitizenRegisterPage from "./pages/CitizenRegisterPage";
import CitizenLoginPage from "./pages/CitizenLoginPage";
import CitizenDashboard from "./pages/CitizenDashboard";
import SubmitGrievancePage from "./pages/SubmitGrievancePage";
import ComplaintTrackingPage from "./pages/ComplaintTrackingPage";
import OfficerLoginPage from "./pages/OfficerLoginPage";
import OfficerDashboard from "./pages/OfficerDashboard";
import ComplaintManagementPage from "./pages/ComplaintManagementPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ComplaintDetailsPage from "./pages/ComplaintDetailsPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/citizen/register" element={<CitizenRegisterPage />} />
          <Route path="/citizen/login" element={<CitizenLoginPage />} />
          <Route path="/officer/login" element={<OfficerLoginPage />} />

          <Route
            path="/citizen/dashboard"
            element={
              <ProtectedRoute allowedRoles={["citizen"]}>
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/submit"
            element={
              <ProtectedRoute allowedRoles={["citizen"]}>
                <SubmitGrievancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/track"
            element={
              <ProtectedRoute allowedRoles={["citizen"]}>
                <ComplaintTrackingPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/officer/dashboard"
            element={
              <ProtectedRoute allowedRoles={["officer"]}>
                <OfficerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/complaints"
            element={
              <ProtectedRoute allowedRoles={["officer"]}>
                <ComplaintManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/analytics"
            element={
              <ProtectedRoute allowedRoles={["officer"]}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/complaints/:id"
            element={
              <ProtectedRoute allowedRoles={["citizen", "officer"]}>
                <ComplaintDetailsPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
