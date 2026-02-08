import type {
  AuthResponse,
  User,
  Category,
  CreateCategoryDto,
  UpdateCategoryDto,
  Transaction,
  TransactionsResponse,
  TransactionSummary,
  ChartDataPoint,
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionsQueryParams,
  Budget,
  CreateBudgetDto,
  UpdateBudgetDto,
  BudgetsQueryParams,
  RegisterDto,
  LoginDto,
  ApiError,
} from "@/types/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include", // Always include cookies
    });

    if (response.status === 401) {
      // Try to refresh token via cookies
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry the request - cookies are automatically included
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
          credentials: "include",
        });
        if (!retryResponse.ok) {
          const error: ApiError = await retryResponse.json();
          throw new Error(
            Array.isArray(error.message)
              ? error.message.join(", ")
              : error.message,
          );
        }
        return retryResponse.json();
      }
      throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(
        Array.isArray(error.message) ? error.message.join(", ") : error.message,
      );
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include", // Cookies are sent automatically
      });

      if (!response.ok) {
        return false;
      }

      // Server sets new cookies automatically
      return true;
    } catch {
      return false;
    }
  }

  // Auth endpoints
  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    // Server sets cookies, no need to store tokens
    return response;
  }

  async login(data: LoginDto): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    // Server sets cookies, no need to store tokens
    return response;
  }

  async logout(): Promise<void> {
    await this.request("/auth/logout", { method: "POST" });
    // Server clears cookies
  }

  async logoutAll(): Promise<void> {
    await this.request("/auth/logout-all", { method: "POST" });
    // Server clears cookies
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request("/user/me");
  }

  getGoogleAuthUrl(): string {
    return `${API_BASE_URL}/auth/google`;
  }

  async demoLogin(): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/demo");
    return response;
  }

  // Categories endpoints
  async getCategories(): Promise<Category[]> {
    return this.request("/categories");
  }

  async getCategory(id: string): Promise<Category> {
    return this.request(`/categories/${id}`);
  }

  async createCategory(data: CreateCategoryDto): Promise<Category> {
    return this.request("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: UpdateCategoryDto): Promise<Category> {
    return this.request(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string): Promise<Category> {
    return this.request(`/categories/${id}`, { method: "DELETE" });
  }

  // Transactions endpoints
  async getTransactions(
    params?: TransactionsQueryParams,
  ): Promise<TransactionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set("type", params.type);
    if (params?.categoryId) searchParams.set("categoryId", params.categoryId);
    if (params?.date) searchParams.set("date", params.date);
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());

    const queryString = searchParams.toString();
    return this.request(`/transactions${queryString ? `?${queryString}` : ""}`);
  }

  async getTransactionSummary(
    startDate?: string,
    endDate?: string,
  ): Promise<TransactionSummary> {
    const searchParams = new URLSearchParams();
    if (startDate) searchParams.set("startDate", startDate);
    if (endDate) searchParams.set("endDate", endDate);

    const queryString = searchParams.toString();
    return this.request(
      `/transactions/summary${queryString ? `?${queryString}` : ""}`,
    );
  }

  async getChartData(
    startDate: string,
    endDate: string,
  ): Promise<ChartDataPoint[]> {
    const searchParams = new URLSearchParams();
    searchParams.set("startDate", startDate);
    searchParams.set("endDate", endDate);
    return this.request(`/transactions/chart-data?${searchParams.toString()}`);
  }

  async getTransaction(id: string): Promise<Transaction> {
    return this.request(`/transactions/${id}`);
  }

  async createTransaction(data: CreateTransactionDto): Promise<Transaction> {
    return this.request("/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTransaction(
    id: string,
    data: UpdateTransactionDto,
  ): Promise<Transaction> {
    return this.request(`/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteTransaction(id: string): Promise<Transaction> {
    return this.request(`/transactions/${id}`, { method: "DELETE" });
  }

  // Budgets endpoints
  async getBudgets(params?: BudgetsQueryParams): Promise<Budget[]> {
    const searchParams = new URLSearchParams();
    if (params?.month) searchParams.set("month", params.month.toString());
    if (params?.year) searchParams.set("year", params.year.toString());

    const queryString = searchParams.toString();
    return this.request(`/budgets${queryString ? `?${queryString}` : ""}`);
  }

  async getBudget(id: string): Promise<Budget> {
    return this.request(`/budgets/${id}`);
  }

  async createBudget(data: CreateBudgetDto): Promise<Budget> {
    return this.request("/budgets", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateBudget(id: string, data: UpdateBudgetDto): Promise<Budget> {
    return this.request(`/budgets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteBudget(id: string): Promise<Budget> {
    return this.request(`/budgets/${id}`, { method: "DELETE" });
  }
}

export const api = new ApiClient();
