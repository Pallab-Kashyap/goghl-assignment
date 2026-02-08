# Personal Finance Management API

A NestJS backend with better-auth for Google authentication and CRUD APIs for personal finance management.

## Features

- **Authentication**: Google OAuth with better-auth
- **Transactions**: Track income and expenses
- **Categories**: Organize transactions by categories
- **Budgets**: Set monthly budgets per category
- **Summary**: Get financial summaries

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Update the `.env` file with your credentials:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/personal_finance?schema=public"

# Better Auth
BETTER_AUTH_SECRET="your-super-secret-key-change-in-production"
BETTER_AUTH_URL="http://localhost:3000"

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# CORS
CORS_ORIGIN="http://localhost:3001"
```

### 3. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init
```

### 4. Run the Server

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoints

### Authentication

| Method | Endpoint       | Description                  |
| ------ | -------------- | ---------------------------- |
| ALL    | `/api/auth/*`  | Better-auth endpoints        |
| GET    | `/api/user/me` | Get current user (protected) |

#### Better-auth endpoints:

- `POST /api/auth/sign-up/email` - Email signup
- `POST /api/auth/sign-in/email` - Email signin
- `GET /api/auth/sign-in/social?provider=google` - Google OAuth
- `POST /api/auth/sign-out` - Sign out
- `GET /api/auth/session` - Get session

### Categories (Protected)

| Method | Endpoint              | Description        |
| ------ | --------------------- | ------------------ |
| POST   | `/api/categories`     | Create category    |
| GET    | `/api/categories`     | Get all categories |
| GET    | `/api/categories/:id` | Get category by ID |
| PATCH  | `/api/categories/:id` | Update category    |
| DELETE | `/api/categories/:id` | Delete category    |

**Request Body (Create/Update):**

```json
{
  "name": "Groceries",
  "type": "EXPENSE",
  "icon": "🛒",
  "color": "#FF5733"
}
```

### Transactions (Protected)

| Method | Endpoint                    | Description           |
| ------ | --------------------------- | --------------------- |
| POST   | `/api/transactions`         | Create transaction    |
| GET    | `/api/transactions`         | Get all transactions  |
| GET    | `/api/transactions/summary` | Get financial summary |
| GET    | `/api/transactions/:id`     | Get transaction by ID |
| PATCH  | `/api/transactions/:id`     | Update transaction    |
| DELETE | `/api/transactions/:id`     | Delete transaction    |

**Query Parameters (GET all):**

- `type`: INCOME | EXPENSE
- `categoryId`: Filter by category
- `startDate`: Start date (ISO string)
- `endDate`: End date (ISO string)
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset

**Request Body (Create/Update):**

```json
{
  "amount": 150.5,
  "type": "EXPENSE",
  "description": "Weekly groceries",
  "date": "2026-02-04T10:00:00Z",
  "categoryId": "category-id"
}
```

### Budgets (Protected)

| Method | Endpoint           | Description      |
| ------ | ------------------ | ---------------- |
| POST   | `/api/budgets`     | Create budget    |
| GET    | `/api/budgets`     | Get all budgets  |
| GET    | `/api/budgets/:id` | Get budget by ID |
| PATCH  | `/api/budgets/:id` | Update budget    |
| DELETE | `/api/budgets/:id` | Delete budget    |

**Query Parameters (GET all):**

- `month`: Filter by month (1-12)
- `year`: Filter by year

**Request Body (Create):**

```json
{
  "amount": 500,
  "month": 2,
  "year": 2026,
  "categoryId": "category-id"
}
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth Client ID
5. Set authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env`

## Project Structure

```
src/
├── auth/                 # Authentication module
│   ├── auth.config.ts    # Better-auth configuration
│   ├── auth.controller.ts
│   ├── auth.guard.ts
│   └── auth.module.ts
├── categories/           # Categories CRUD
├── transactions/         # Transactions CRUD
├── budgets/              # Budgets CRUD
├── prisma/               # Database service
├── app.module.ts
└── main.ts
```

## License

MIT
