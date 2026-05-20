import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { get } from '@/lib/api';
import { FolderKanban, FileText, Briefcase, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function StatCard({ icon: Icon, label, value, to }: { icon: any; label: string; value: number | string; to: string }) {
  return (
    <Link to={to} className="bg-white border border-border rounded-xl p-6 hover:border-primary/30 transition-colors group">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Icon size={18} className="text-primary" />
        </div>
        <ArrowRight size={16} className="text-text-muted group-hover:text-primary transition-colors" />
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="text-sm text-text-muted mt-1">{label}</div>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => get('/api/admin/projects') });
  const { data: blogData } = useQuery({ queryKey: ['blog-posts'], queryFn: () => get('/api/admin/blog/posts') });
  const { data: services } = useQuery({ queryKey: ['services'], queryFn: () => get('/api/admin/services/categories') });

  const total = projects?.length ?? '—';
  const published = projects?.filter((p: any) => p.isPublished).length ?? '—';
  const drafts = projects?.filter((p: any) => !p.isPublished).length ?? '—';
  const posts = blogData?.total ?? '—';
  const cats = services?.length ?? '—';

  return (
    <PageShell title="Dashboard" description="Overview of your portfolio content">
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard icon={FolderKanban} label="Total Projects" value={total} to="/admin/projects" />
        <StatCard icon={FolderKanban} label="Published" value={published} to="/admin/projects?status=published" />
        <StatCard icon={FolderKanban} label="Drafts" value={drafts} to="/admin/projects?status=draft" />
        <StatCard icon={FileText} label="Blog Posts" value={posts} to="/admin/blog" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border border-border rounded-xl p-6">
          <h2 className="font-semibold text-[15px] mb-4">Quick Links</h2>
          <div className="space-y-2">
            {[
              { label: 'Add new project', to: '/admin/projects/new' },
              { label: 'Write a blog post', to: '/admin/blog/new' },
              { label: 'Update hero text', to: '/admin/site' },
              { label: 'Manage gallery strip', to: '/admin/site' },
              { label: 'Upload media', to: '/admin/media' },
            ].map((link) => (
              <Link key={link.to + link.label} to={link.to} className="flex items-center justify-between p-3 rounded-lg hover:bg-bg transition-colors text-sm">
                {link.label}
                <ArrowRight size={14} className="text-text-muted" />
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-6">
          <h2 className="font-semibold text-[15px] mb-4">Service Categories</h2>
          <div className="text-3xl font-bold tracking-tight text-primary mb-1">{cats}</div>
          <p className="text-sm text-text-muted mb-4">categories configured</p>
          <Link to="/admin/services" className="text-sm text-primary font-medium hover:underline">Manage services →</Link>
        </div>
      </div>
    </PageShell>
  );
}
