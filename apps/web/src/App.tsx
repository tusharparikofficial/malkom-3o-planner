import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/app/layout";
import { EditModeProvider } from "@/features/authoring/edit-mode";
import { PageView } from "@/app/page-view";
import { LoginPage } from "@/features/auth/login-page";
import { SsoCallback } from "@/features/auth/sso-callback";
import { AddVoiceButton } from "@/features/voc/add-voice";
import { SolutionsPage } from "@/features/solutions/solutions-page";
import { ArchitecturePage } from "@/features/architecture/architecture-page";
import { AssemblerPage } from "@/features/assembler/assembler-page";
import { AdminLayout } from "@/features/admin/admin-layout";
import { FeedbackDashboard } from "@/features/admin/feedback-dashboard";
import { AnalyticsDashboard } from "@/features/admin/analytics-dashboard";
import { ApproachesManager } from "@/features/admin/approaches-manager";
import { TimelineManager } from "@/features/admin/timeline-manager";
import { DiagramsManager } from "@/features/admin/diagrams-manager";
import { UsersPage } from "@/features/admin/users-page";
import { SettingsPage } from "@/features/admin/settings-page";

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <EditModeProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sso/callback" element={<SsoCallback />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<PageView slug="home" />} />
          <Route path="/approach" element={<PageView slug="approach" />} />
          <Route path="/business-problem" element={<PageView slug="business-problem" />} />
          <Route path="/solutions" element={<Navigate to="/solutions/blueprint" replace />} />
          <Route path="/solutions/:tab" element={<SolutionsPage />} />
          <Route path="/architecture" element={<Navigate to="/architecture/flow-diagram" replace />} />
          <Route path="/architecture/:tab" element={<ArchitecturePage />} />
          <Route path="/deployment-model" element={<Navigate to="/architecture/deployment-model" replace />} />
          <Route path="/assembler" element={<AssemblerPage />} />
          <Route
            path="/voice-of-customer"
            element={
              <div className="space-y-6">
                <AddVoiceButton />
                <PageView slug="voice-of-customer" />
              </div>
            }
          />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/feedback" replace />} />
            <Route path="feedback" element={<FeedbackDashboard />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="approaches" element={<ApproachesManager />} />
            <Route path="timeline" element={<TimelineManager />} />
            <Route path="diagrams" element={<DiagramsManager />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </EditModeProvider>
    </BrowserRouter>
  );
}
