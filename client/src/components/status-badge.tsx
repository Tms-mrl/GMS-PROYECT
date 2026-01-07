import { Badge } from "@/components/ui/badge";
import { 
  Inbox, 
  Search, 
  Wrench, 
  CheckCircle2, 
  PackageCheck 
} from "lucide-react";
import type { OrderStatus } from "@shared/schema";

const statusConfig: Record<OrderStatus, { 
  label: string; 
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: typeof Inbox;
  className: string;
}> = {
  recibido: {
    label: "Recibido",
    variant: "secondary",
    icon: Inbox,
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  diagnostico: {
    label: "Diagnóstico",
    variant: "default",
    icon: Search,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  en_curso: {
    label: "En Curso",
    variant: "default",
    icon: Wrench,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  listo: {
    label: "Listo",
    variant: "default",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  entregado: {
    label: "Entregado",
    variant: "secondary",
    icon: PackageCheck,
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

interface StatusBadgeProps {
  status: OrderStatus;
  showIcon?: boolean;
}

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
const config = statusConfig[status as keyof typeof statusConfig] ?? statusConfig["recibido"];
const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`${config.className} border-0 gap-1.5`}
      data-testid={`badge-status-${status}`}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
