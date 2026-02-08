// API Types for Personal Finance Management

export type TransactionType = "INCOME" | "EXPENSE";
export type CategoryType = "INCOME" | "EXPENSE";

// User types
export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface TokenRefreshResponse {
  tokens: AuthTokens;
}

// Category types
export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  icon?: string;
  color?: string;
}

// Transaction types
export interface Transaction {
  id: string;
  amount: string;
  type: TransactionType;
  description: string | null;
  date: string;
  categoryId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  category: Category | null;
}

export interface CreateTransactionDto {
  amount: number;
  type: TransactionType;
  description?: string;
  date?: string;
  categoryId?: string;
}

export interface UpdateTransactionDto {
  amount?: number;
  type?: TransactionType;
  description?: string;
  date?: string;
  categoryId?: string;
}

export interface TransactionsResponse {
  data: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface ChartDataPoint {
  name: string;
  income: number;
  expense: number;
}

export interface TransactionsQueryParams {
  type?: TransactionType;
  categoryId?: string;
  date?: string; // Exact date filter (YYYY-MM-DD)
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// Budget types
export interface Budget {
  id: string;
  amount: string;
  spent: string | number;
  remaining?: number;
  month: number;
  year: number;
  categoryId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  category: Category;
}

export interface CreateBudgetDto {
  amount: number;
  month: number;
  year: number;
  categoryId: string;
}

export interface UpdateBudgetDto {
  amount?: number;
}

export interface BudgetsQueryParams {
  month?: number;
  year?: number;
}

// Error types
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

// Register/Login types
export interface RegisterDto {
  name?: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}
