# Personal Finance Management API Documentation

## Base URL

```
http://localhost:3000
```

## Authentication

This API uses **JWT (JSON Web Tokens)** for authentication with support for:

- Email/Password authentication
- Google OAuth 2.0

### Token Types

| Token         | Expiry     | Usage                         |
| ------------- | ---------- | ----------------------------- |
| Access Token  | 15 minutes | Used for API requests         |
| Refresh Token | 7 days     | Used to get new access tokens |

### How to Authenticate

Tokens can be sent via:

1. **Cookies** (automatically set by the API)
2. **Authorization Header**: `Authorization: Bearer <access_token>`

---

## Authentication Endpoints

### Register

```http
POST /api/auth/register
```

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

| Field    | Type   | Required | Description                         |
| -------- | ------ | -------- | ----------------------------------- |
| name     | string | No       | User's display name                 |
| email    | string | Yes      | User's email address                |
| password | string | Yes      | User's password (min 6 recommended) |

**Response (201 Created):**

```json
{
  "user": {
    "id": "clx1234567890",
    "name": "John Doe",
    "email": "john@example.com",
    "image": null
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Cookies Set:**

- `accessToken` (HttpOnly, 15 min expiry)
- `refreshToken` (HttpOnly, 7 day expiry)

**Error Response (409 Conflict):**

```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```

---

### Login

```http
POST /api/auth/login
```

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**

```json
{
  "user": {
    "id": "clx1234567890",
    "name": "John Doe",
    "email": "john@example.com",
    "image": null
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized"
}
```

---

### Refresh Tokens

```http
POST /api/auth/refresh
```

Use this endpoint to get new tokens when the access token expires.

**Request Body (if not using cookies):**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Or send via cookie (automatically included if `credentials: 'include'`).

**Response (200 OK):**

```json
{
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Invalid refresh token",
  "error": "Unauthorized"
}
```

---

### Logout

```http
POST /api/auth/logout
```

Revokes the current refresh token and clears cookies.

**Response (200 OK):**

```json
{
  "message": "Logged out successfully"
}
```

---

### Logout from All Devices (Protected)

```http
POST /api/auth/logout-all
```

Revokes all refresh tokens for the user, logging them out from all devices.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "message": "Logged out from all devices successfully"
}
```

---

### Demo User Login

```http
GET /api/auth/demo
```

A simple GET endpoint that returns a pre-configured demo user with dummy data. No request body required. Perfect for testing the API without registration.

**Demo User Credentials:**

- Email: `demo@user.in`
- Password: `demo123456` (if needed for reference)

**What gets created on first call:**

- 4 expense categories (Groceries, Transport, Entertainment, Utilities)
- 2 income categories (Salary, Freelance)
- 3 budgets for current month
- 11 sample transactions (2 income, 9 expenses)

**Response (200 OK):**

```json
{
  "user": {
    "id": "clx_demo_123",
    "name": "Demo User",
    "email": "demo@user.in",
    "image": null
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Cookies Set:**

- `accessToken` (HttpOnly, 15 min expiry)
- `refreshToken` (HttpOnly, 7 day expiry)

**Usage from Frontend:**

```javascript
// Simply call the endpoint
const response = await fetch('http://localhost:3000/api/auth/demo', {
  credentials: 'include',
});
const data = await response.json();
// User is now authenticated with demo account
```

---

### Google OAuth - Initiate

```http
GET /api/auth/google
```

Redirects the user to Google OAuth consent screen for authentication.

**Usage from Frontend:**

```javascript
// Redirect user to Google OAuth
window.location.href = 'http://localhost:3000/api/auth/google';
```

**Flow:**

1. User clicks "Sign in with Google" button on frontend
2. Frontend redirects to `GET /api/auth/google`
3. Server redirects to Google OAuth consent screen
4. User authenticates with their Google account
5. Google redirects back to callback URL with authorization code

---

### Google OAuth - Callback

```http
GET /api/auth/google/callback?code=<authorization_code>
```

Handles the OAuth callback from Google. This endpoint is called automatically by Google after the user authenticates.

**What happens:**

1. Server exchanges the authorization code for Google access token
2. Server fetches user info (email, name, picture) from Google
3. Server creates a new user or finds existing user by email
4. Server generates JWT access and refresh tokens
5. Tokens are set as HttpOnly cookies
6. Server redirects to frontend

**On Success - Redirects to:**

```
{FRONTEND_URL}/auth/callback?success=true
```

**On Error - Redirects to:**

```
{FRONTEND_URL}/auth/callback?error=<error_message>
```

**Cookies Set on Success:**

- `accessToken` (HttpOnly, 15 min expiry)
- `refreshToken` (HttpOnly, 7 day expiry)

**Frontend Callback Handler Example:**

```javascript
// pages/auth/callback.js or similar
useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  if (params.get('success') === 'true') {
    // User is authenticated, tokens are in cookies
    // Redirect to dashboard or fetch user data
    router.push('/dashboard');
  } else if (params.get('error')) {
    // Handle error
    console.error('OAuth error:', params.get('error'));
    router.push('/login?error=oauth_failed');
  }
}, []);
```

**Note:** The tokens are automatically included in subsequent requests if you use `credentials: 'include'` in fetch or `withCredentials: true` in axios.

---

### Get Current User (Protected)

```http
GET /api/user/me
```

**Headers:**

```
Authorization: Bearer <access_token>
```

Or via cookie (automatically sent if `credentials: 'include'`).

**Response (200 OK):**

```json
{
  "user": {
    "id": "clx1234567890",
    "name": "John Doe",
    "email": "john@example.com",
    "image": null,
    "createdAt": "2026-02-04T10:00:00.000Z",
    "updatedAt": "2026-02-04T10:00:00.000Z"
  }
}
```

**Error Response (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Access token not provided",
  "error": "Unauthorized"
}
```

---

## Categories Endpoints

All category endpoints require authentication.

### Create Category

```http
POST /api/categories
```

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "name": "Groceries",
  "type": "EXPENSE",
  "icon": "🛒",
  "color": "#FF5733"
}
```

| Field | Type   | Required | Description                     |
| ----- | ------ | -------- | ------------------------------- |
| name  | string | Yes      | Category name (unique per user) |
| type  | enum   | Yes      | `INCOME` or `EXPENSE`           |
| icon  | string | No       | Emoji or icon identifier        |
| color | string | No       | Hex color code                  |

**Response (201 Created):**

```json
{
  "id": "clx_cat_123",
  "name": "Groceries",
  "type": "EXPENSE",
  "icon": "🛒",
  "color": "#FF5733",
  "userId": "clx1234567890",
  "createdAt": "2026-02-04T10:00:00.000Z",
  "updatedAt": "2026-02-04T10:00:00.000Z"
}
```

**Error Response (409 Conflict):**

```json
{
  "statusCode": 409,
  "message": "Category with this name already exists",
  "error": "Conflict"
}
```

---

### Get All Categories

```http
GET /api/categories
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
[
  {
    "id": "clx_cat_123",
    "name": "Groceries",
    "type": "EXPENSE",
    "icon": "🛒",
    "color": "#FF5733",
    "userId": "clx1234567890",
    "createdAt": "2026-02-04T10:00:00.000Z",
    "updatedAt": "2026-02-04T10:00:00.000Z"
  },
  {
    "id": "clx_cat_124",
    "name": "Salary",
    "type": "INCOME",
    "icon": "💰",
    "color": "#28A745",
    "userId": "clx1234567890",
    "createdAt": "2026-02-04T10:00:00.000Z",
    "updatedAt": "2026-02-04T10:00:00.000Z"
  }
]
```

---

### Get Category by ID

```http
GET /api/categories/:id
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| id        | string | Category ID |

**Response (200 OK):**

```json
{
  "id": "clx_cat_123",
  "name": "Groceries",
  "type": "EXPENSE",
  "icon": "🛒",
  "color": "#FF5733",
  "userId": "clx1234567890",
  "createdAt": "2026-02-04T10:00:00.000Z",
  "updatedAt": "2026-02-04T10:00:00.000Z"
}
```

**Error Response (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Category not found",
  "error": "Not Found"
}
```

---

### Update Category

```http
PATCH /api/categories/:id
```

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| id        | string | Category ID |

**Request Body:**

```json
{
  "name": "Food & Groceries",
  "icon": "🍕",
  "color": "#FFC107"
}
```

All fields are optional.

**Response (200 OK):**

```json
{
  "id": "clx_cat_123",
  "name": "Food & Groceries",
  "type": "EXPENSE",
  "icon": "🍕",
  "color": "#FFC107",
  "userId": "clx1234567890",
  "createdAt": "2026-02-04T10:00:00.000Z",
  "updatedAt": "2026-02-04T11:00:00.000Z"
}
```

---

### Delete Category

```http
DELETE /api/categories/:id
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| id        | string | Category ID |

**Response (200 OK):**

```json
{
  "id": "clx_cat_123",
  "name": "Groceries",
  "type": "EXPENSE",
  "icon": "🛒",
  "color": "#FF5733",
  "userId": "clx1234567890",
  "createdAt": "2026-02-04T10:00:00.000Z",
  "updatedAt": "2026-02-04T10:00:00.000Z"
}
```

---

## Transactions Endpoints

All transaction endpoints require authentication.

### Create Transaction

```http
POST /api/transactions
```

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "amount": 150.5,
  "type": "EXPENSE",
  "description": "Weekly grocery shopping",
  "date": "2026-02-04T10:00:00.000Z",
  "categoryId": "clx_cat_123"
}
```

| Field       | Type   | Required | Description                     |
| ----------- | ------ | -------- | ------------------------------- |
| amount      | number | Yes      | Transaction amount (decimal)    |
| type        | enum   | Yes      | `INCOME` or `EXPENSE`           |
| description | string | No       | Transaction description         |
| date        | string | No       | ISO 8601 date (defaults to now) |
| categoryId  | string | No       | Associated category ID          |

**Response (201 Created):**

```json
{
  "id": "clx_txn_123",
  "amount": "150.50",
  "type": "EXPENSE",
  "description": "Weekly grocery shopping",
  "date": "2026-02-04T10:00:00.000Z",
  "categoryId": "clx_cat_123",
  "userId": "clx1234567890",
  "createdAt": "2026-02-04T10:00:00.000Z",
  "updatedAt": "2026-02-04T10:00:00.000Z",
  "category": {
    "id": "clx_cat_123",
    "name": "Groceries",
    "type": "EXPENSE",
    "icon": "🛒",
    "color": "#FF5733"
  }
}
```

---

### Get All Transactions

```http
GET /api/transactions
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

| Parameter  | Type   | Required | Description                     |
| ---------- | ------ | -------- | ------------------------------- |
| type       | enum   | No       | Filter by `INCOME` or `EXPENSE` |
| categoryId | string | No       | Filter by category ID           |
| startDate  | string | No       | Filter from date (ISO 8601)     |
| endDate    | string | No       | Filter to date (ISO 8601)       |
| limit      | number | No       | Number of results (default: 50) |
| offset     | number | No       | Pagination offset (default: 0)  |

**Example Request:**

```http
GET /api/transactions?type=EXPENSE&startDate=2026-02-01&endDate=2026-02-28&limit=10&offset=0
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "clx_txn_123",
      "amount": "150.50",
      "type": "EXPENSE",
      "description": "Weekly grocery shopping",
      "date": "2026-02-04T10:00:00.000Z",
      "categoryId": "clx_cat_123",
      "userId": "clx1234567890",
      "createdAt": "2026-02-04T10:00:00.000Z",
      "updatedAt": "2026-02-04T10:00:00.000Z",
      "category": {
        "id": "clx_cat_123",
        "name": "Groceries",
        "type": "EXPENSE",
        "icon": "🛒",
        "color": "#FF5733"
      }
    }
  ],
  "total": 25,
  "limit": 10,
  "offset": 0
}
```

---

### Get Transaction Summary

```http
GET /api/transactions/summary
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

| Parameter | Type   | Required | Description                 |
| --------- | ------ | -------- | --------------------------- |
| startDate | string | No       | Filter from date (ISO 8601) |
| endDate   | string | No       | Filter to date (ISO 8601)   |

**Example Request:**

```http
GET /api/transactions/summary?startDate=2026-02-01&endDate=2026-02-28
```

**Response (200 OK):**

```json
{
  "totalIncome": 5000.0,
  "totalExpense": 2350.75,
  "balance": 2649.25
}
```

---

### Get Transaction by ID

```http
GET /api/transactions/:id
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type   | Description    |
| --------- | ------ | -------------- |
| id        | string | Transaction ID |

**Response (200 OK):**

```json
{
  "id": "clx_txn_123",
  "amount": "150.50",
  "type": "EXPENSE",
  "description": "Weekly grocery shopping",
  "date": "2026-02-04T10:00:00.000Z",
  "categoryId": "clx_cat_123",
  "userId": "clx1234567890",
  "createdAt": "2026-02-04T10:00:00.000Z",
  "updatedAt": "2026-02-04T10:00:00.000Z",
  "category": {
    "id": "clx_cat_123",
    "name": "Groceries",
    "type": "EXPENSE",
    "icon": "🛒",
    "color": "#FF5733"
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Transaction not found",
  "error": "Not Found"
}
```

---

### Update Transaction

```http
PATCH /api/transactions/:id
```

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type   | Description    |
| --------- | ------ | -------------- |
| id        | string | Transaction ID |

**Request Body:**

```json
{
  "amount": 175.0,
  "description": "Weekly grocery shopping + snacks"
}
```

All fields are optional.

**Response (200 OK):**

```json
{
  "id": "clx_txn_123",
  "amount": "175.00",
  "type": "EXPENSE",
  "description": "Weekly grocery shopping + snacks",
  "date": "2026-02-04T10:00:00.000Z",
  "categoryId": "clx_cat_123",
  "userId": "clx1234567890",
  "createdAt": "2026-02-04T10:00:00.000Z",
  "updatedAt": "2026-02-04T11:00:00.000Z",
  "category": {
    "id": "clx_cat_123",
    "name": "Groceries",
    "type": "EXPENSE",
    "icon": "🛒",
    "color": "#FF5733"
  }
}
```

---

### Delete Transaction

```http
DELETE /api/transactions/:id
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type   | Description    |
| --------- | ------ | -------------- |
| id        | string | Transaction ID |

**Response (200 OK):**

```json
{
  "id": "clx_txn_123",
  "amount": "150.50",
  "type": "EXPENSE",
  "description": "Weekly grocery shopping",
  "date": "2026-02-04T10:00:00.000Z",
  "categoryId": "clx_cat_123",
  "userId": "clx1234567890",
  "createdAt": "2026-02-04T10:00:00.000Z",
  "updatedAt": "2026-02-04T10:00:00.000Z"
}
```

---

## Budgets Endpoints

All budget endpoints require authentication.

### Create Budget

```http
POST /api/budgets
```

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "amount": 500.0,
  "month": 2,
  "year": 2026,
  "categoryId": "clx_cat_123"
}
```

| Field      | Type   | Required | Description             |
| ---------- | ------ | -------- | ----------------------- |
| amount     | number | Yes      | Budget amount (decimal) |
| month      | number | Yes      | Month (1-12)            |
| year       | number | Yes      | Year (e.g., 2026)       |
| categoryId | string | Yes      | Associated category ID  |

**Response (201 Created):**

```json
{
  "id": "clx_bdg_123",
  "amount": "500.00",
  "spent": "0.00",
  "month": 2,
  "year": 2026,
  "categoryId": "clx_cat_123",
  "userId": "clx1234567890",
  "createdAt": "2026-02-04T10:00:00.000Z",
  "updatedAt": "2026-02-04T10:00:00.000Z",
  "category": {
    "id": "clx_cat_123",
    "name": "Groceries",
    "type": "EXPENSE",
    "icon": "🛒",
    "color": "#FF5733"
  }
}
```

**Error Response (409 Conflict):**

```json
{
  "statusCode": 409,
  "message": "Budget for this category and period already exists",
  "error": "Conflict"
}
```

---

### Get All Budgets

```http
GET /api/budgets
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| month     | number | No       | Filter by month (1-12) |
| year      | number | No       | Filter by year         |

**Example Request:**

```http
GET /api/budgets?month=2&year=2026
```

**Response (200 OK):**

```json
[
  {
    "id": "clx_bdg_123",
    "amount": "500.00",
    "spent": "150.50",
    "remaining": 349.5,
    "month": 2,
    "year": 2026,
    "categoryId": "clx_cat_123",
    "userId": "clx1234567890",
    "createdAt": "2026-02-04T10:00:00.000Z",
    "updatedAt": "2026-02-04T10:00:00.000Z",
    "category": {
      "id": "clx_cat_123",
      "name": "Groceries",
      "type": "EXPENSE",
      "icon": "🛒",
      "color": "#FF5733"
    }
  }
]
```

> **Note:** The `spent` and `remaining` fields are calculated dynamically based on transactions in the budget period.

---

### Get Budget by ID

```http
GET /api/budgets/:id
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| id        | string | Budget ID   |

**Response (200 OK):**

```json
{
  "id": "clx_bdg_123",
  "amount": "500.00",
  "spent": 150.5,
  "remaining": 349.5,
  "month": 2,
  "year": 2026,
  "categoryId": "clx_cat_123",
  "userId": "clx1234567890",
  "createdAt": "2026-02-04T10:00:00.000Z",
  "updatedAt": "2026-02-04T10:00:00.000Z",
  "category": {
    "id": "clx_cat_123",
    "name": "Groceries",
    "type": "EXPENSE",
    "icon": "🛒",
    "color": "#FF5733"
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Budget not found",
  "error": "Not Found"
}
```

---

### Update Budget

```http
PATCH /api/budgets/:id
```

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| id        | string | Budget ID   |

**Request Body:**

```json
{
  "amount": 600.0
}
```

| Field  | Type   | Required | Description       |
| ------ | ------ | -------- | ----------------- |
| amount | number | No       | New budget amount |

**Response (200 OK):**

```json
{
  "id": "clx_bdg_123",
  "amount": "600.00",
  "spent": "0.00",
  "month": 2,
  "year": 2026,
  "categoryId": "clx_cat_123",
  "userId": "clx1234567890",
  "createdAt": "2026-02-04T10:00:00.000Z",
  "updatedAt": "2026-02-04T11:00:00.000Z",
  "category": {
    "id": "clx_cat_123",
    "name": "Groceries",
    "type": "EXPENSE",
    "icon": "🛒",
    "color": "#FF5733"
  }
}
```

---

### Delete Budget

```http
DELETE /api/budgets/:id
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| id        | string | Budget ID   |

**Response (200 OK):**

```json
{
  "id": "clx_bdg_123",
  "amount": "500.00",
  "spent": "0.00",
  "month": 2,
  "year": 2026,
  "categoryId": "clx_cat_123",
  "userId": "clx1234567890",
  "createdAt": "2026-02-04T10:00:00.000Z",
  "updatedAt": "2026-02-04T10:00:00.000Z"
}
```

---

## Error Responses

### Common Error Codes

| Status Code | Description                                      |
| ----------- | ------------------------------------------------ |
| 400         | Bad Request - Invalid input data                 |
| 401         | Unauthorized - Invalid or missing authentication |
| 403         | Forbidden - Access denied                        |
| 404         | Not Found - Resource not found                   |
| 409         | Conflict - Resource already exists               |
| 500         | Internal Server Error                            |

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Validation Error Response

```json
{
  "statusCode": 400,
  "message": [
    "amount must be a number",
    "type must be one of the following values: INCOME, EXPENSE"
  ],
  "error": "Bad Request"
}
```

---

## Data Types

### Enums

#### TransactionType

```typescript
enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}
```

#### CategoryType

```typescript
enum CategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}
```

---

## Rate Limiting

Currently, there is no rate limiting implemented. Consider adding rate limiting for production use.

---

## CORS

CORS is enabled for the following origin by default:

- `http://localhost:3001`

Configure `CORS_ORIGIN` environment variable to change this.

---

## Environment Variables

| Variable               | Description                                       | Default                                        |
| ---------------------- | ------------------------------------------------- | ---------------------------------------------- |
| `PORT`                 | Server port                                       | 3000                                           |
| `DATABASE_URL`         | PostgreSQL connection string                      | -                                              |
| `JWT_SECRET`           | Secret for access tokens                          | -                                              |
| `JWT_REFRESH_SECRET`   | Secret for refresh tokens                         | -                                              |
| `FRONTEND_URL`         | Frontend URL for OAuth redirect after success     | http://localhost:3001                          |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                            | -                                              |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                        | -                                              |
| `GOOGLE_CALLBACK_URL`  | Google OAuth callback URL (must match GCP config) | http://localhost:3000/api/auth/google/callback |
| `CORS_ORIGIN`          | Allowed CORS origin                               | http://localhost:3001                          |
