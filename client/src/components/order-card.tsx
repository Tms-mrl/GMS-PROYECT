import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./status-badge";
import { Smartphone, Calendar, User, AlertCircle } from "lucide-react";
import type { RepairOrderWithDetails } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface OrderCardProps {
  order: RepairOrderWithDetails;
}

export function OrderCard({ order }: OrderCardProps) {
  return (
    <Link href={`/ordenes/${order.id}`}>
      <Card 
        className="hover-elevate cursor-pointer transition-shadow"
        data-testid={`card-order-${order.id}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {order.device.brand} {order.device.model}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {order.priority === "urgente" && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Urgente
                </Badge>
              )}
              <StatusBadge status={order.status} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{order.client.name}</span>
          </div>
          
          {order.device.imei && (
            <div className="text-sm">
              <span className="text-muted-foreground">IMEI: </span>
              <span className="font-mono">{order.device.imei}</span>
            </div>
          )}
          
          {order.device.lockType && (
            <div className="text-sm">
              <span className="text-muted-foreground">Bloqueo: </span>
              <span>
                {order.device.lockType === "PIN" && "PIN"}
                {order.device.lockType === "PATRON" && "Patrón"}
                {order.device.lockType === "PASSWORD" && "Contraseña"}
              </span>
            </div>
          )}
          
          <p className="text-sm line-clamp-2">{order.problem}</p>
          
          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(order.createdAt), "d MMM yyyy", { locale: es })}
              </span>
            </div>
            {order.technicianName && (
              <span>Técnico: {order.technicianName}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
