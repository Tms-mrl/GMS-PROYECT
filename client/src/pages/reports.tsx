import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  DollarSign,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay, isSameMonth, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Payment, Expense, RepairOrderWithDetails } from "@shared/schema";

type Transaction = {
  id: string;
  date: Date;
  type: "income" | "expense";
  category: string;
  description: string;
  method: string;
  amount: number;
};

export default function Reports() {
  const [filterPeriod, setFilterPeriod] = useState<"all" | "month" | "today">("all");

  // --- QUERIES ---
  const { data: payments = [], isLoading: loadingPayments } = useQuery<(Payment & { order?: RepairOrderWithDetails })[]>({
    queryKey: ["/api/payments"],
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  // --- DERIVED DATA ---
  const transactions: Transaction[] = useMemo(() => {
    const income: Transaction[] = payments.map(p => ({
      id: p.id,
      date: new Date(p.date),
      type: "income",
      category: p.orderId ? "Reparación" : "Venta",
      description: p.notes || (p.orderId ? `Cobro Orden #${p.orderId.slice(0, 4)}` : "Venta General"),
      method: p.method,
      amount: Number(p.amount)
    }));

    const outflow: Transaction[] = expenses.map(e => ({
      id: e.id,
      date: new Date(e.date),
      type: "expense",
      category: e.category,
      description: e.description,
      method: "Efectivo", // Por defecto, gastos suelen ser efectivo caja, o podríamos agregar campo metodo a gastos futuro
      amount: Number(e.amount)
    }));

    return [...income, ...outflow].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [payments, expenses]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      if (filterPeriod === "today") return isSameDay(t.date, now);
      if (filterPeriod === "month") return isSameMonth(t.date, now);
      return true;
    });
  }, [transactions, filterPeriod]);

  // --- STATS ---
  const totalIncome = filteredTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpenses;

  // --- HELPERS ---
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExportCSV = () => {
    const headers = ["Fecha", "Tipo", "Categoría", "Descripción", "Método", "Monto"];
    const rows = filteredTransactions.map(t => [
      format(t.date, "dd/MM/yyyy HH:mm"),
      t.type === "income" ? "Ingreso" : "Gasto",
      t.category,
      `"${t.description.replace(/"/g, '""')}"`, // Escape quotes
      t.method,
      t.type === "income" ? t.amount : -t.amount
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_financiero_${filterPeriod}_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = loadingPayments || loadingExpenses;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes Financieros</h1>
          <p className="text-muted-foreground">Control centralizado de ingresos y egresos</p>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <Select value={filterPeriod} onValueChange={(v: "all" | "month" | "today") => setFilterPeriod(v)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="month">Este Mes</SelectItem>
              <SelectItem value="all">Todo el Historial</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExportCSV} disabled={transactions.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Total Ingresos</span>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                  {formatMoney(totalIncome)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">Total Gastos</span>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
                <div className="text-3xl font-bold text-red-700 dark:text-red-400">
                  {formatMoney(totalExpenses)}
                </div>
              </CardContent>
            </Card>

            <Card className={netBalance >= 0 ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500"}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Balance Neto</span>
                  <DollarSign className="h-4 w-4 text-foreground" />
                </div>
                <div className={`text-3xl font-bold ${netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatMoney(netBalance)}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* TRANSACTIONS TABLE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Movimientos Detallados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="w-[300px]">Descripción</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Cargando datos...
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No hay movimientos en este periodo.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {format(t.date, "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.type === "income" ? "default" : "destructive"} className={t.type === "income" ? "bg-green-600 hover:bg-green-700" : ""}>
                          {t.type === "income" ? "Ingreso" : "Gasto"}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.category}</TableCell>
                      <TableCell className="max-w-[300px] truncate" title={t.description}>
                        {t.description}
                      </TableCell>
                      <TableCell className="capitalize">{t.method}</TableCell>
                      <TableCell className={`text-right font-bold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                        {t.type === "income" ? "+" : "-"} {formatMoney(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
