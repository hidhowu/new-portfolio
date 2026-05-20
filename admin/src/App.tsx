import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { useAuth } from './lib/auth';
import { useEffect, useState } from 'react';
import { get } from './lib/api';
import { Sidebar } from './components/layout/Sidebar';

// Route pages
import LoginPage from './routes/login';
import DashboardPage from './routes/dashboard';
import ServicesPage from './routes/services';
import ProjectsPage from './routes/projects';
import ProjectEditorPage from './routes/projects/editor';
import BlogPage from './routes/blog';
import BlogPostEditorPage from './routes/blog/editor';
import ExperiencePage from './routes/experience';
import SkillsPage from './routes/skills';
import SitePage from './routes/site';
import MediaPage from './routes/media';
import AccountPage from './routes/account';

function AuthGuard() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/api/admin/auth/me')
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [setUser]);

  if (loading) return <div className="flex h-screen items-center justify-center text-sm text-text-muted">Loading…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  return (
    <div className="flex">
      <Sidebar />
      <Outlet />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/admin/login" element={<LoginPage />} />
        <Route element={<AuthGuard />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/services" element={<ServicesPage />} />
          <Route path="/admin/projects" element={<ProjectsPage />} />
          <Route path="/admin/projects/new" element={<ProjectEditorPage />} />
          <Route path="/admin/projects/:id" element={<ProjectEditorPage />} />
          <Route path="/admin/blog" element={<BlogPage />} />
          <Route path="/admin/blog/new" element={<BlogPostEditorPage />} />
          <Route path="/admin/blog/:id" element={<BlogPostEditorPage />} />
          <Route path="/admin/experience" element={<ExperiencePage />} />
          <Route path="/admin/skills" element={<SkillsPage />} />
          <Route path="/admin/site" element={<SitePage />} />
          <Route path="/admin/media" element={<MediaPage />} />
          <Route path="/admin/account" element={<AccountPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </QueryClientProvider>
  );
}
