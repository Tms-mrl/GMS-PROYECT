import { listClients } from "@/lib/gsmApi";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Search, Users, Phone, Mail, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: clients, isLoading, error } = useQuery({
    queryKey: ["clients"],
    queryFn: () => listClients(200),
  });

  const filteredClients = clients?.filter((client) => {
    return searchQuery === "" ||
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.phone ?? "").includes(searchQuery) ||
      (client.email ?? "").toLowerCase().includes(searchQuery.toLowerCase())

  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-muted-foreground">Gestiona tu base de clientes</p>
        </div>
        <Button asChild data-testid="button-new-client">
          <Link href="/clientes/nuevo">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Link>
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, teléfono o email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-clients"
        />
      </div>
      {error && (
        <div className="text-sm text-red-500">
          Error cargando clientes: {(error as any).message}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-5 w-32 mb-3" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredClients && filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Link key={client.id} href={`/clientes/${client.id}`}>
              <Card
                className="hover-elevate cursor-pointer transition-shadow"
                data-testid={`card-client-${client.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate mb-3">{client.name}</h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 shrink-0" />
                          <span className="truncate">{client.phone}</span>
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={searchQuery ? "Sin resultados" : "No hay clientes"}
          description={
            searchQuery
              ? "No se encontraron clientes con la búsqueda realizada"
              : "Agrega tu primer cliente para comenzar"
          }
          actionLabel={!searchQuery ? "Nuevo Cliente" : undefined}
          actionHref={!searchQuery ? "/clientes/nuevo" : undefined}
        />
      )}
    </div>
  );
}
