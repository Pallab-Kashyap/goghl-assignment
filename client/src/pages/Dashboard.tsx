import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type {
  TransactionType,
  CreateTransactionDto,
  ChartDataPoint,
} from "@/types/api";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state for adding transaction
  const [formAmount, setFormAmount] = useState("");
  const [formType, setFormType] = useState<TransactionType>("EXPENSE");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formCategory, setFormCategory] = useState<string>("");

  const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["transactionSummary", startDate, endDate],
    queryFn: () => api.getTransactionSummary(startDate, endDate),
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions", startDate, endDate],
    queryFn: () => api.getTransactions({ startDate, endDate, limit: 10 }),
  });

  const { data: budgets } = useQuery({
    queryKey: [
      "budgets",
      currentMonth.getMonth() + 1,
      currentMonth.getFullYear(),
    ],
    queryFn: () =>
      api.getBudgets({
        month: currentMonth.getMonth() + 1,
        year: currentMonth.getFullYear(),
      }),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["chartData", startDate, endDate],
    queryFn: () => api.getChartData(startDate, endDate),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTransactionDto) => api.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactionSummary"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Transaction created successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create transaction",
      );
    },
  });

  const resetForm = () => {
    setFormAmount("");
    setFormType("EXPENSE");
    setFormDescription("");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setFormCategory("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: CreateTransactionDto = {
      amount: parseFloat(formAmount),
      type: formType,
      description: formDescription || undefined,
      date: new Date(formDate).toISOString(),
      categoryId: formCategory || undefined,
    };
    createMutation.mutate(data);
  };

  const filteredCategories = categories?.filter((c) => c.type === formType);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
      return newDate;
    });
  };

  // Prepare chart data for expenses by category
  const expensesByCategory = transactions?.data
    .filter((t) => t.type === "EXPENSE")
    .reduce(
      (acc, t) => {
        const categoryName = t.category?.name || "Uncategorized";
        const color = t.category?.color || "#94a3b8";
        acc[categoryName] = {
          value: (acc[categoryName]?.value || 0) + parseFloat(t.amount),
          color,
        };
        return acc;
      },
      {} as Record<string, { value: number; color: string }>,
    );

  const pieChartData = Object.entries(expensesByCategory || {}).map(
    ([name, data]) => ({
      name,
      value: data.value,
      color: data.color,
    }),
  );

  // Use real chart data from API
  const areaChartData: ChartDataPoint[] = chartData || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              Welcome back, {user?.name?.split(" ")[0] || "there"}!
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Here's your financial overview for{" "}
              {format(currentMonth, "MMMM yyyy")}
            </p>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="self-start sm:self-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
                <DialogDescription>
                  Enter the details for your new transaction.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dashboard-amount">Amount</Label>
                    <Input
                      id="dashboard-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dashboard-type">Type</Label>
                    <Select
                      value={formType}
                      onValueChange={(v) => setFormType(v as TransactionType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INCOME">Income</SelectItem>
                        <SelectItem value="EXPENSE">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dashboard-description">Description</Label>
                  <Input
                    id="dashboard-description"
                    placeholder="What was this for?"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dashboard-date">Date</Label>
                  <Input
                    id="dashboard-date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dashboard-category">Category</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon || "📁"}</span>
                            {cat.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-end">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={() => navigateMonth("prev")}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-muted rounded-lg">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm sm:text-base">
              {format(currentMonth, "MMM yyyy")}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={() => navigateMonth("next")}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        {/* Balance Card */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Total Balance
                </p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight tabular-nums mt-0.5 sm:mt-1">
                  {summaryLoading
                    ? "..."
                    : formatCurrency(summary?.balance || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Income Card */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-income-muted flex items-center justify-center">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-income" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Income
                </p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight tabular-nums mt-0.5 sm:mt-1 text-income">
                  {summaryLoading
                    ? "..."
                    : formatCurrency(summary?.totalIncome || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-income text-sm font-medium">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-expense-muted flex items-center justify-center">
                <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-expense" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Expenses
                </p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight tabular-nums mt-0.5 sm:mt-1 text-expense">
                  {summaryLoading
                    ? "..."
                    : formatCurrency(summary?.totalExpense || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-expense text-sm font-medium">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Area Chart */}
        <div className="stat-card">
          <h3 className="font-semibold mb-4 text-sm sm:text-base">
            Income vs Expenses
          </h3>
          <div className="h-48 sm:h-64">
            {chartLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : areaChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No transactions this month
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData}>
                  <defs>
                    <linearGradient
                      id="incomeGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(152 60% 40%)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(152 60% 40%)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="expenseGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(4 80% 60%)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(4 80% 60%)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="hsl(152 60% 40%)"
                    strokeWidth={2}
                    fill="url(#incomeGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="hsl(4 80% 60%)"
                    strokeWidth={2}
                    fill="url(#expenseGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="stat-card">
          <h3 className="font-semibold mb-4 text-sm sm:text-base">
            Spending by Category
          </h3>
          <div className="h-48 sm:h-64">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No expenses this month
              </div>
            )}
          </div>
          {pieChartData.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4">
              {pieChartData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 text-sm"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Recent Transactions */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm sm:text-base">
              Recent Transactions
            </h3>
            <Button variant="ghost" size="sm" asChild>
              <a href="/transactions">View all</a>
            </Button>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {transactions?.data.slice(0, 5).map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-2"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-sm sm:text-lg shrink-0"
                    style={{
                      backgroundColor: transaction.category?.color
                        ? `${transaction.category.color}20`
                        : "hsl(var(--muted))",
                    }}
                  >
                    {transaction.category?.icon || "💰"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">
                      {transaction.description ||
                        transaction.category?.name ||
                        "Transaction"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transaction.date), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "font-semibold tabular-nums text-sm sm:text-base shrink-0",
                    transaction.type === "INCOME"
                      ? "text-income"
                      : "text-expense",
                  )}
                >
                  {transaction.type === "INCOME" ? "+" : "-"}
                  {formatCurrency(parseFloat(transaction.amount))}
                </span>
              </div>
            ))}
            {(!transactions?.data || transactions.data.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No transactions yet
              </p>
            )}
          </div>
        </div>

        {/* Budget Progress */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Budget Progress</h3>
            <Button variant="ghost" size="sm" asChild>
              <a href="/budgets">View all</a>
            </Button>
          </div>
          <div className="space-y-4">
            {budgets?.slice(0, 4).map((budget) => {
              const spent =
                typeof budget.spent === "string"
                  ? parseFloat(budget.spent)
                  : budget.spent;
              const amount = parseFloat(budget.amount);
              const percentage = Math.min((spent / amount) * 100, 100);
              const isOverBudget = spent > amount;

              return (
                <div key={budget.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {budget.category?.icon || "📁"}
                      </span>
                      <span className="font-medium">
                        {budget.category?.name}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "font-medium",
                        isOverBudget && "text-expense",
                      )}
                    >
                      {formatCurrency(spent)} / {formatCurrency(amount)}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={cn(
                        "progress-bar-fill",
                        isOverBudget ? "bg-expense" : "bg-income",
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(!budgets || budgets.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No budgets set
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
