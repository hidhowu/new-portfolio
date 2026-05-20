import { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, description, action, children }: PageShellProps) {
  return (
    <div className="flex-1 min-h-screen bg-bg">
      <div className="px-8 py-6 border-b border-border bg-white flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-text-muted mt-0.5">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-8">{children}</div>
    </div>
  );
}
