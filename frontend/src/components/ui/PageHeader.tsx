import type { ReactNode } from "react";

interface PageHeaderProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

// Header atas konten halaman (judul + breadcrumb + action button)
export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          {title}
        </h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  );
}
