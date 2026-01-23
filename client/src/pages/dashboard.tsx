import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ClipboardList,
  Search,
  CheckCircle2,
  DollarSign,
  Plus,
  ArrowRight,
  Wallet,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InsertExpense } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);

  // Form State
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Insumos");

  const { data: stats, isLoading: statsLoading } = useQuery<{
    activeOrders: number;
    pendingDiagnosis: number;
    readyForPickup: number;
    cashInBox: number;
    dailyIncome: number;
    dailyExpenses: number;
    netBalance: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (newExpense: InsertExpense) => {
      const res = await apiRequest("POST", "/api/expenses", newExpense);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Gasto registrado correctamente" });
      setIsExpenseOpen(false);
      setAmount("");
      setDescription("");
      setCategory("Insumos");
    },
    onError: (error: Error) => {
      toast({
        title: "Error al registrar gasto",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const handleCreateExpense = () => {
    if (!amount || !description || !category) {
      toast({ title: "Complete todos los campos", variant: "destructive" });
      return;
    }

    createExpenseMutation.mutate({
      amount: parseFloat(amount),
      description,
      category,
      date: new Date()// Optional, but good to be explicit
    });
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel de Control</h1>
          <p className="text-muted-foreground">Resumen financiero y operativo</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <TrendingDown className="h-4 w-4 mr-2" />
                Registrar Gasto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      className="pl-8"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Insumos">Insumos (Repuestos)</SelectItem>
                      <SelectItem value="Servicios">Servicios (Luz, Internet)</SelectItem>
                      <SelectItem value="Alquiler">Alquiler</SelectItem>
                      <SelectItem value="Comida">Comida / Viáticos</SelectItem>
                      <SelectItem value="Sueldos">Sueldos</SelectItem>
                      <SelectItem value="Otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    placeholder="Detalle del gasto..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateExpense} disabled={createExpenseMutation.isPending}>
                  {createExpenseMutation.isPending ? "Guardando..." : "Guardar Gasto"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button asChild>
            <Link href="/ordenes/nueva">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Orden
            </Link>
          </Button>
        </div>
      </div>

      {/* TOP SECTION: FINANCIALS (4 LARGE CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          [1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-32">
              <CardContent className="p-6 flex flex-col justify-center h-full">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-background border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Caja Actual (Efectivo)</p>
                  <Wallet className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {formatMoney(stats?.cashInBox ?? 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950 dark:to-background border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Ingresos (Hoy)</p>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {formatMoney(stats?.dailyIncome ?? 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-white dark:from-red-950 dark:to-background border-red-200 dark:border-red-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Gastos (Hoy)</p>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {formatMoney(stats?.dailyExpenses ?? 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Balance Neto (Hoy)</p>
                  <DollarSign className="h-4 w-4 text-gray-500" />
                </div>
                <div className={`text-2xl font-bold ${(stats?.netBalance ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatMoney(stats?.netBalance ?? 0)}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* BOTTOM SECTION: OPERATIONS (3 COMPACT CARDS) */}
      <h2 className="text-lg font-semibold mt-8 mb-4">Estado Operativo</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statsLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i} className="h-24">
              <CardContent className="p-6 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Órdenes Activas</p>
                  <h3 className="text-2xl font-bold">{stats?.activeOrders ?? 0}</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-full">
                  <Search className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">En Diagnóstico</p>
                  <h3 className="text-2xl font-bold">{stats?.pendingDiagnosis ?? 0}</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Para Entregar</p>
                  <h3 className="text-2xl font-bold">{stats?.readyForPickup ?? 0}</h3>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
