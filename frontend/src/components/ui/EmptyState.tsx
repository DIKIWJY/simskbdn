import { FileText, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({
  icon: Icon = FileText,
  title = "Tidak ada data",
  description = "",
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center
                      justify-center mb-4"
      >
        <Icon size={24} className="text-gray-400" />
      </div>
      <p className="text-sm font-semibold text-gray-700 mb-1">{title}</p>
      {description && (
        <p className="text-xs text-gray-400 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
