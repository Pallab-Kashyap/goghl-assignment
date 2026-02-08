import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Transaction,
  TransactionType,
  CreateTransactionDto,
} from "@/types/api";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import {
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Pencil,
  Loader2,
  Calendar,
  X,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FilterType = "ALL" | TransactionType;
type DateFilterMode = "all" | "exact" | "month" | "year" | "range";

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<FilterType>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<Transaction | null>(null);

  // Date filter state
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("all");
  const [exactDate, setExactDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));
  const [filterYear, setFilterYear] = useState(format(new Date(), "yyyy"));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Form state
  const [formAmount, setFormAmount] = useState("");
  const [formType, setFormType] = useState<TransactionType>("EXPENSE");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formCategory, setFormCategory] = useState<string>("");

  // Calculate date filter params
  const getDateFilterParams = () => {
    switch (dateFilterMode) {
      case "exact":
        return { date: exactDate };
      case "month": {
        const date = new Date(filterMonth + "-01");
        return {
          startDate: format(startOfMonth(date), "yyyy-MM-dd"),
          endDate: format(endOfMonth(date), "yyyy-MM-dd"),
        };
      }
      case "year": {
        const date = new Date(filterYear + "-01-01");
        return {
          startDate: format(startOfYear(date), "yyyy-MM-dd"),
          endDate: format(endOfYear(date), "yyyy-MM-dd"),
        };
      }
      case "range":
        return {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        };
      default:
        return {};
    }
  };

  const dateFilterParams = getDateFilterParams();

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: [
      "transactions",
      typeFilter,
      categoryFilter,
      dateFilterMode,
      exactDate,
      filterMonth,
      filterYear,
      startDate,
      endDate,
    ],
    queryFn: () =>
      api.getTransactions({
        type: typeFilter === "ALL" ? undefined : typeFilter,
        categoryId: categoryFilter === "ALL" ? undefined : categoryFilter,
        ...dateFilterParams,
        limit: 100,
      }),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTransactionDto }) =>
      api.updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactionSummary"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Transaction updated successfully");
      resetForm();
      setIsDialogOpen(false);
      setEditingTransaction(null);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update transaction",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactionSummary"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Transaction deleted successfully");
      setDeletingTransaction(null);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete transaction",
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

  const openEditDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormAmount(transaction.amount);
    setFormType(transaction.type);
    setFormDescription(transaction.description || "");
    setFormDate(format(new Date(transaction.date), "yyyy-MM-dd"));
    setFormCategory(transaction.categoryId || "");
    setIsDialogOpen(true);
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

    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const filteredTransactions = transactionsData?.data.filter((t) =>
    searchQuery
      ? t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  const filteredCategories = categories?.filter((c) => c.type === formType);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            Transactions
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your income and expenses
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingTransaction(null);
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? "Edit Transaction" : "Add Transaction"}
              </DialogTitle>
              <DialogDescription>
                {editingTransaction
                  ? "Update the transaction details below."
                  : "Enter the details for your new transaction."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
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
                  <Label htmlFor="type">Type</Label>
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
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="What was this for?"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
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
                    setEditingTransaction(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingTransaction ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as FilterType)}
          >
            <SelectTrigger className="w-[120px] sm:w-[130px] shrink-0">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="INCOME">Income</SelectItem>
              <SelectItem value="EXPENSE">Expense</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[130px] sm:w-[150px] shrink-0">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-2">
                    <span>{cat.icon || "📁"}</span>
                    {cat.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="shrink-0 gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {dateFilterMode === "all" && "All Time"}
                  {dateFilterMode === "exact" &&
                    format(new Date(exactDate), "MMM d, yyyy")}
                  {dateFilterMode === "month" &&
                    format(new Date(filterMonth + "-01"), "MMM yyyy")}
                  {dateFilterMode === "year" && filterYear}
                  {dateFilterMode === "range" && "Custom Range"}
                </span>
                <span className="sm:hidden">
                  {dateFilterMode === "all" ? "All" : "Date"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Filter by</Label>
                  <Select
                    value={dateFilterMode}
                    onValueChange={(v) =>
                      setDateFilterMode(v as DateFilterMode)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="exact">Exact Date</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                      <SelectItem value="range">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {dateFilterMode === "exact" && (
                  <div className="space-y-2">
                    <Label>Select Date</Label>
                    <Input
                      type="date"
                      value={exactDate}
                      onChange={(e) => setExactDate(e.target.value)}
                    />
                  </div>
                )}

                {dateFilterMode === "month" && (
                  <div className="space-y-2">
                    <Label>Select Month</Label>
                    <Input
                      type="month"
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                    />
                  </div>
                )}

                {dateFilterMode === "year" && (
                  <div className="space-y-2">
                    <Label>Select Year</Label>
                    <Select value={filterYear} onValueChange={setFilterYear}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {dateFilterMode === "range" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {dateFilterMode !== "all" && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => setDateFilterMode("all")}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <div className="stat-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredTransactions?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No transactions found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTransactions?.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between py-4 group gap-2"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div
                    className={cn(
                      "w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0",
                      transaction.type === "INCOME"
                        ? "bg-income-muted"
                        : "bg-expense-muted",
                    )}
                  >
                    {transaction.type === "INCOME" ? (
                      <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-income" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 text-expense" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-sm sm:text-base">
                      {transaction.description ||
                        transaction.category?.name ||
                        "Transaction"}
                    </p>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                      <span>
                        {format(new Date(transaction.date), "MMM d, yyyy")}
                      </span>
                      {transaction.category && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="flex items-center gap-1">
                            <span>{transaction.category.icon || "📁"}</span>
                            <span className="hidden sm:inline">
                              {transaction.category.name}
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <span
                    className={cn(
                      "font-semibold tabular-nums text-base sm:text-lg",
                      transaction.type === "INCOME"
                        ? "text-income"
                        : "text-expense",
                    )}
                  >
                    {transaction.type === "INCOME" ? "+" : "-"}
                    {formatCurrency(parseFloat(transaction.amount))}
                  </span>
                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(transaction)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeletingTransaction(transaction)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingTransaction}
        onOpenChange={(open) => !open && setDeletingTransaction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingTransaction &&
                deleteMutation.mutate(deletingTransaction.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
