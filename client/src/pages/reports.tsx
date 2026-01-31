import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  DollarSign,
  Calendar,
  BarChart3,
  Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isSameDay, isSameMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import type { Payment, Expense, RepairOrderWithDetails } from "@shared/schema";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

type Transaction = {
  id: string;
  date: Date;
  type: "income" | "expense";
  category: string;
  description: string;
  method: string;
  amount: number;
};

type MonthlySummary = {
  id: string;
  label: string;
  income: number;
  expense: number;
  balance: number;
  ordersCount: number;
};

export default function Reports() {
  const [filterPeriod, setFilterPeriod] = useState<"all" | "month" | "today">("today");

  // --- QUERIES ---
  const { data: payments = [], isLoading: loadingPayments } = useQuery<(Payment & { order?: RepairOrderWithDetails })[]>({
    queryKey: ["/api/payments"],
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery<RepairOrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  // --- DATOS TRANSACCIONALES ---
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
      method: "Efectivo",
      amount: Number(e.amount)
    }));

    return [...income, ...outflow].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [payments, expenses]);

  // --- FILTRADO PARA TABLA ---
  const filteredData = useMemo(() => {
    const now = new Date();
    if (filterPeriod === "all") return transactions;

    return transactions.filter(t => {
      if (filterPeriod === "today") return isSameDay(t.date, now);
      if (filterPeriod === "month") return isSameMonth(t.date, now);
      return true;
    });
  }, [transactions, filterPeriod]);

  // --- DATOS PARA GRÁFICOS (ÚLTIMOS 6 MESES) ---
  const chartsData = useMemo(() => {
    const data: MonthlySummary[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = subMonths(now, i);
      const monthKey = format(date, "yyyy-MM");
      const monthLabel = format(date, "MMM", { locale: es }).toUpperCase();

      const monthTransactions = transactions.filter(t => format(t.date, "yyyy-MM") === monthKey);
      const income = monthTransactions.filter(t => t.type === "income").reduce((acc, curr) => acc + curr.amount, 0);
      const expense = monthTransactions.filter(t => t.type === "expense").reduce((acc, curr) => acc + curr.amount, 0);
      const ordersCount = orders.filter(o => format(new Date(o.createdAt), "yyyy-MM") === monthKey).length;

      data.push({
        id: monthKey,
        label: monthLabel,
        income,
        expense,
        balance: income - expense,
        ordersCount
      });
    }
    return data;
  }, [transactions, orders]);

  // --- DATOS MENSUALES TABLA (MODO HISTORIAL) ---
  const monthlyTableData = useMemo(() => {
    if (filterPeriod !== "all") return [];
    const groups: Record<string, MonthlySummary> = {};
    transactions.forEach(t => {
      const key = format(t.date, "yyyy-MM");
      if (!groups[key]) {
        groups[key] = {
          id: key,
          label: format(t.date, "MMMM yyyy", { locale: es }),
          income: 0,
          expense: 0,
          balance: 0,
          ordersCount: 0
        };
      }
      if (t.type === "income") groups[key].income += t.amount;
      else groups[key].expense += t.amount;
      groups[key].balance = groups[key].income - groups[key].expense;
    });
    return Object.values(groups).sort((a, b) => b.id.localeCompare(a.id));
  }, [transactions, filterPeriod]);


  // --- TOTALES (Cards) ---
  const totalIncome = filteredData.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = filteredData.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExportCSV = () => {
    const headers = ["Fecha", "Tipo", "Categoría", "Descripción", "Método", "Monto"];
    const rows = filteredData.map(t => [
      format(t.date, "dd/MM/yyyy HH:mm"),
      t.type === "income" ? "Ingreso" : "Gasto",
      t.category,
      `"${t.description.replace(/"/g, '""')}"`,
      t.method,
      t.type === "income" ? t.amount : -t.amount
    ]);
    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_${filterPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = loadingPayments || loadingExpenses || loadingOrders;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes Financieros</h1>
          <p className="text-muted-foreground">Control centralizado de ingresos y egresos</p>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <Select value={filterPeriod} onValueChange={(v: any) => setFilterPeriod(v)}>
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

      {/* TABS PRINCIPALES */}
      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="financial">Resumen Financiero</TabsTrigger>
          <TabsTrigger value="metrics">Métricas y Gráficos</TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA 1: FINANCIERO (TABLAS Y CARDS) --- */}
        <TabsContent value="financial" className="space-y-6 mt-4">
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)
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

          {/* TABLA DE MOVIMIENTOS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {filterPeriod === "all" ? "Resumen Mensual" : "Movimientos Detallados"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      {filterPeriod === "all" ? (
                        <>
                          <TableHead>Periodo</TableHead>
                          <TableHead className="text-right text-green-600">Ingresos</TableHead>
                          <TableHead className="text-right text-red-600">Egresos</TableHead>
                          <TableHead className="text-right font-bold">Balance</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead className="w-[300px]">Descripción</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center h-24">Cargando...</TableCell></TableRow>
                    ) : (
                      <>
                        {filterPeriod === "all" ? (
                          monthlyTableData.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center h-24">Sin datos.</TableCell></TableRow>
                          ) : (
                            monthlyTableData.map((month) => (
                              <TableRow key={month.id}>
                                <TableCell className="font-bold capitalize text-base">{month.label}</TableCell>
                                <TableCell className="text-right text-green-600 font-medium">+ {formatMoney(month.income)}</TableCell>
                                <TableCell className="text-right text-red-600 font-medium">- {formatMoney(month.expense)}</TableCell>
                                <TableCell className={`text-right font-bold text-base ${month.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                                  {formatMoney(month.balance)}
                                </TableCell>
                              </TableRow>
                            ))
                          )
                        ) : (
                          filteredData.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24">Sin movimientos.</TableCell></TableRow>
                          ) : (
                            filteredData.map((t) => (
                              <TableRow key={t.id}>
                                <TableCell className="font-medium">{format(t.date, "dd/MM/yyyy HH:mm")}</TableCell>
                                <TableCell>
                                  <Badge variant={t.type === "income" ? "default" : "destructive"} className={t.type === "income" ? "bg-green-600 hover:bg-green-700" : ""}>
                                    {t.type === "income" ? "Ingreso" : "Gasto"}
                                  </Badge>
                                </TableCell>
                                <TableCell>{t.category}</TableCell>
                                <TableCell className="max-w-[300px] truncate" title={t.description}>{t.description}</TableCell>
                                <TableCell className="capitalize">{t.method}</TableCell>
                                <TableCell className={`text-right font-bold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                                  {t.type === "income" ? "+" : "-"} {formatMoney(t.amount)}
                                </TableCell>
                              </TableRow>
                            ))
                          )
                        )}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA 2: MÉTRICAS Y GRÁFICOS --- */}
        <TabsContent value="metrics" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* GRÁFICO 1: EVOLUCIÓN FINANCIERA (BARRAS SIN CURSOR) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Evolución Financiera (6 Meses)
                </CardTitle>
                <CardDescription>Comparativa de Ingresos vs Gastos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="label" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip
                        cursor={false}
                        formatter={(value: number) => formatMoney(value)}
                        contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                      />
                      <Legend />
                      <Bar dataKey="income" name="Ingresos" fill="#16a34a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name="Gastos" fill="#dc2626" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* GRÁFICO 2: EQUIPOS INGRESADOS (LÍNEA) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Equipos Ingresados
                </CardTitle>
                <CardDescription>Volumen de trabajo mensual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartsData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="label" fontSize={12} />
                      <YAxis fontSize={12} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="ordersCount" name="Equipos Recibidos" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}