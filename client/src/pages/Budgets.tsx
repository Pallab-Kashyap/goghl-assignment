import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Budget, CreateBudgetDto } from "@/types/api";
import { format } from "date-fns";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Target,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);

  // Form state
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("");

  const month = currentMonth.getMonth() + 1;
  const year = currentMonth.getFullYear();

  const { data: budgets, isLoading } = useQuery({
    queryKey: ["budgets", month, year],
    queryFn: () => api.getBudgets({ month, year }),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
  });

  const expenseCategories =
    categories?.filter((c) => c.type === "EXPENSE") || [];
  const usedCategoryIds = budgets?.map((b) => b.categoryId) || [];
  const availableCategories = expenseCategories.filter(
    (c) =>
      !usedCategoryIds.includes(c.id) || editingBudget?.categoryId === c.id,
  );

  const createMutation = useMutation({
    mutationFn: (data: CreateBudgetDto) => api.createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget created successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create budget",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { amount: number } }) =>
      api.updateBudget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget updated successfully");
      resetForm();
      setIsDialogOpen(false);
      setEditingBudget(null);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update budget",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget deleted successfully");
      setDeletingBudget(null);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete budget",
      );
    },
  });

  const resetForm = () => {
    setFormAmount("");
    setFormCategory("");
  };

  const openEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setFormAmount(budget.amount);
    setFormCategory(budget.categoryId);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingBudget) {
      updateMutation.mutate({
        id: editingBudget.id,
        data: { amount: parseFloat(formAmount) },
      });
    } else {
      const data: CreateBudgetDto = {
        amount: parseFloat(formAmount),
        month,
        year,
        categoryId: formCategory,
      };
      createMutation.mutate(data);
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
      return newDate;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const totalBudget =
    budgets?.reduce((sum, b) => sum + parseFloat(b.amount), 0) || 0;
  const totalSpent =
    budgets?.reduce((sum, b) => {
      const spent = typeof b.spent === "string" ? parseFloat(b.spent) : b.spent;
      return sum + spent;
    }, 0) || 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            Budgets
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Set spending limits for your expense categories
          </p>
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

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="stat-card">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                Total Budget
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight tabular-nums mt-0.5 sm:mt-1">
                {formatCurrency(totalBudget)}
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-expense-muted flex items-center justify-center">
              <span className="text-expense text-lg sm:text-xl">↓</span>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                Total Spent
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight tabular-nums mt-0.5 sm:mt-1 text-expense">
                {formatCurrency(totalSpent)}
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center",
                totalBudget - totalSpent >= 0
                  ? "bg-income-muted"
                  : "bg-expense-muted",
              )}
            >
              <span
                className={cn(
                  "text-lg sm:text-xl",
                  totalBudget - totalSpent >= 0
                    ? "text-income"
                    : "text-expense",
                )}
              >
                {totalBudget - totalSpent >= 0 ? "✓" : "!"}
              </span>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                Remaining
              </p>
              <p
                className={cn(
                  "text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight tabular-nums mt-0.5 sm:mt-1",
                  totalBudget - totalSpent >= 0
                    ? "text-income"
                    : "text-expense",
                )}
              >
                {formatCurrency(totalBudget - totalSpent)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Budget Button */}
      <div className="flex justify-end">
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingBudget(null);
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              disabled={availableCategories.length === 0 && !editingBudget}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBudget ? "Edit Budget" : "Add Budget"}
              </DialogTitle>
              <DialogDescription>
                {editingBudget
                  ? "Update the budget amount."
                  : `Set a budget for ${format(currentMonth, "MMMM yyyy")}.`}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingBudget && (
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formCategory}
                    onValueChange={setFormCategory}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((cat) => (
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
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Budget Amount</Label>
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

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingBudget(null);
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
                  {editingBudget ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Budgets Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : budgets?.length === 0 ? (
        <div className="stat-card text-center py-12">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No budgets set</h3>
          <p className="text-muted-foreground mb-4">
            Create budgets to track your spending by category
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {budgets?.map((budget) => {
            const spent =
              typeof budget.spent === "string"
                ? parseFloat(budget.spent)
                : budget.spent;
            const amount = parseFloat(budget.amount);
            const percentage = Math.min((spent / amount) * 100, 100);
            const isOverBudget = spent > amount;
            const isNearLimit = percentage >= 80 && !isOverBudget;

            return (
              <div key={budget.id} className="stat-card group">
                <div className="flex items-start justify-between mb-4 gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg sm:text-xl shrink-0"
                      style={{ backgroundColor: `${budget.category?.color}20` }}
                    >
                      {budget.category?.icon || "📁"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate text-sm sm:text-base">
                        {budget.category?.name}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {format(currentMonth, "MMMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(budget)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeletingBudget(budget)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Spent</span>
                    <div className="flex items-center gap-2">
                      {(isOverBudget || isNearLimit) && (
                        <AlertTriangle
                          className={cn(
                            "w-4 h-4",
                            isOverBudget ? "text-expense" : "text-warning",
                          )}
                        />
                      )}
                      <span
                        className={cn(
                          "font-semibold",
                          isOverBudget && "text-expense",
                        )}
                      >
                        {formatCurrency(spent)} / {formatCurrency(amount)}
                      </span>
                    </div>
                  </div>
                  <div className="progress-bar h-3">
                    <div
                      className={cn(
                        "progress-bar-fill",
                        isOverBudget
                          ? "bg-expense"
                          : isNearLimit
                            ? "bg-warning"
                            : "bg-income",
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {percentage.toFixed(0)}% used
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        isOverBudget ? "text-expense" : "text-income",
                      )}
                    >
                      {isOverBudget
                        ? `${formatCurrency(spent - amount)} over`
                        : `${formatCurrency(amount - spent)} left`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingBudget}
        onOpenChange={(open) => !open && setDeletingBudget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the budget for "
              {deletingBudget?.category?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingBudget && deleteMutation.mutate(deletingBudget.id)
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
