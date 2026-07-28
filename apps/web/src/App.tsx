import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/app/layout";
import { PageView } from "@/app/page-view";
import { LoginPage } from "@/features/auth/login-page";
import { SolutionsPage } from "@/features/solutions/solutions-page";
import { AdminLayout } from "@/features/admin/admin-layout";
import { FeedbackDashboard } from "@/features/admin/feedback-dashboard";
import { AnalyticsDashboard } from "@/features/admin/analytics-dashboard";
import { UsersPage } from "@/features/admin/users-page";
import { SettingsPage } from "@/features/admin/settings-page";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<PageView slug="home" />} />
          <Route path="/approach" element={<PageView slug="approach" />} />
          <Route path="/business-problem" element={<PageView slug="business-problem" />} />
          <Route path="/solutions" element={<Navigate to="/solutions/blueprint" replace />} />
          <Route path="/solutions/:tab" element={<SolutionsPage />} />
          <Route path="/voice-of-customer" element={<PageView slug="voice-of-customer" />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/feedback" replace />} />
            <Route path="feedback" element={<FeedbackDashboard />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
