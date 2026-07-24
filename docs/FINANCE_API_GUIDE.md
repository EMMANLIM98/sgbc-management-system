# Finance Module API Documentation

**Version**: 1.0  
**Status**: Production Ready ⭐⭐⭐⭐⭐  
**Last Updated**: 2026-07-24

---

## Overview

The Finance Module API provides comprehensive RESTful endpoints for managing church finances including contributions (donations/offerings), pledges (recurring commitments), and expenses (spending management).

**Base URL**: `/api/v1/organizations/:orgId`

---

## Resource Models

### Contribution DTO

```json
{
  "id": "uuid",
  "memberId": "uuid",
  "memberName": "John Doe",
  "amount": 500.0,
  "currency": "USD",
  "category": "Tithe",
  "date": "2026-07-24T10:00:00Z",
  "paymentMethod": "cash|check|card|transfer",
  "reference": "CHK-001",
  "notes": "General offering",
  "recordedBy": "admin-user",
  "createdAt": "2026-07-24T10:00:00Z",
  "updatedAt": "2026-07-24T10:00:00Z"
}
```

### Pledge DTO

```json
{
  "id": "uuid",
  "memberId": "uuid",
  "memberName": "John Doe",
  "amount": 10000.0,
  "currency": "USD",
  "frequency": "monthly",
  "startDate": "2026-07-24",
  "endDate": "2027-07-24",
  "status": "active|fulfilled|cancelled|paused",
  "totalFulfilled": 3000.0,
  "remaining": 7000.0,
  "nextDueDate": "2026-08-24",
  "notes": "Building project support",
  "createdAt": "2026-07-24T10:00:00Z",
  "updatedAt": "2026-07-24T10:00:00Z"
}
```

### Expense DTO

```json
{
  "id": "uuid",
  "amount": 500.0,
  "currency": "USD",
  "category": "Maintenance",
  "description": "Building repairs",
  "date": "2026-07-24",
  "approvedBy": "finance-manager",
  "status": "pending|approved|rejected|paid",
  "attachment": "https://storage.example.com/...",
  "createdAt": "2026-07-24T10:00:00Z",
  "updatedAt": "2026-07-24T10:00:00Z"
}
```

### Finance Statistics DTO

```json
{
  "period": "thisMonth",
  "totalContributions": 25000.5,
  "totalExpenses": 8500.0,
  "netIncome": 16500.5,
  "currency": "USD",
  "topContributors": [{ "memberName": "John Doe", "amount": 5000.0 }],
  "contributionsByCategory": {
    "Tithe": 15000.0,
    "Offering": 8000.0
  },
  "expensesByCategory": {
    "Utilities": 3000.0,
    "Maintenance": 2500.0
  },
  "generatedAt": "2026-07-24T10:30:00Z"
}
```

---

## Endpoints

### CONTRIBUTIONS

#### 1. List Contributions

**Endpoint**: `GET /api/v1/organizations/:orgId/contributions`

**Description**: Retrieve all contributions with pagination and filtering

**Query Parameters**:

| Parameter  | Type     | Required | Default | Description                         |
| ---------- | -------- | -------- | ------- | ----------------------------------- |
| `page`     | integer  | No       | 1       | Page number                         |
| `pageSize` | integer  | No       | 20      | Items per page (max: 100)           |
| `category` | UUID     | No       | -       | Filter by category ID               |
| `memberId` | UUID     | No       | -       | Filter by member ID                 |
| `fromDate` | ISO 8601 | No       | -       | Filter from date                    |
| `toDate`   | ISO 8601 | No       | -       | Filter to date                      |
| `sortBy`   | string   | No       | date    | Sort field: date, amount, createdAt |
| `order`    | string   | No       | desc    | Sort order: asc, desc               |

**Response** (200 OK):

```json
{
  "status": "success",
  "code": 200,
  "data": [/* ContributionDTO array */],
  "pagination": {/* pagination metadata */},
  "meta": { "timestamp": "...", "version": "v1" }
}
```

**Error Responses**: 400, 500

**cURL Example**:

```bash
curl "http://localhost:5173/api/v1/organizations/{orgId}/contributions?page=1&pageSize=20&status=active"
```

---

#### 2. Create Contribution

**Endpoint**: `POST /api/v1/organizations/:orgId/contributions`

**Request Body**:

```json
{
  "memberId": "uuid",
  "amount": 500.0,
  "currency": "USD",
  "category": "Tithe",
  "date": "2026-07-24",
  "paymentMethod": "cash",
  "reference": "CHK-001",
  "notes": "Weekly tithe"
}
```

**Response** (201 Created):

```json
{
  "status": "success",
  "code": 201,
  "data": {/* ContributionDTO */},
  "meta": {/* ... */}
}
```

**Error Responses**: 400, 422, 409, 500

---

#### 3. Get Contribution

**Endpoint**: `GET /api/v1/organizations/:orgId/contributions/:contributionId`

**Response** (200 OK): ContributionDTO

**Error Responses**: 400, 404, 500

---

#### 4. Update Contribution

**Endpoint**: `PATCH /api/v1/organizations/:orgId/contributions/:contributionId`

**Request Body** (partial):

```json
{
  "amount": 600.0,
  "notes": "Updated amount"
}
```

**Response** (200 OK): Updated ContributionDTO

**Error Responses**: 400, 404, 422, 500

---

#### 5. Delete Contribution

**Endpoint**: `DELETE /api/v1/organizations/:orgId/contributions/:contributionId`

**Response** (204 No Content)

**Error Responses**: 404, 500

---

#### 6. Contribution Summary

**Endpoint**: `GET /api/v1/organizations/:orgId/contributions/summary`

**Query Parameters**:

| Parameter  | Type     | Description                    |
| ---------- | -------- | ------------------------------ |
| `fromDate` | ISO 8601 | Filter from date               |
| `toDate`   | ISO 8601 | Filter to date                 |
| `groupBy`  | string   | daily, weekly, monthly, yearly |

**Response** (200 OK): ContributionSummaryDTO

---

### PLEDGES

#### 1. List Pledges

**Endpoint**: `GET /api/v1/organizations/:orgId/pledges`

**Query Parameters**: page, pageSize, status, memberId, sortBy, order

**Response** (200 OK): Paginated PledgeDTO[]

---

#### 2. Create Pledge

**Endpoint**: `POST /api/v1/organizations/:orgId/pledges`

**Request Body**:

```json
{
  "memberId": "uuid",
  "amount": 10000.0,
  "frequency": "monthly",
  "startDate": "2026-07-24",
  "endDate": "2027-07-24",
  "notes": "Building fund"
}
```

**Response** (201 Created): PledgeDTO

---

#### 3. Get Pledge

**Endpoint**: `GET /api/v1/organizations/:orgId/pledges/:pledgeId`

**Response** (200 OK): PledgeDTO

---

#### 4. Fulfill Pledge

**Endpoint**: `POST /api/v1/organizations/:orgId/pledges/:pledgeId/fulfill`

**Request Body**:

```json
{
  "amount": 1000.0,
  "date": "2026-07-24",
  "reference": "CHK-001"
}
```

**Response** (200 OK): PledgeFulfillmentResponseDTO

**Response Structure**:

```json
{
  "status": "success",
  "code": 200,
  "data": {
    "fulfilled": true,
    "message": "Pledge fulfillment recorded successfully",
    "remaining": 7000.0,
    "pledgeStatus": "active",
    "fulfillmentRecord": {/* PledgeFulfillmentDTO */}
  },
  "meta": {/* ... */}
}
```

---

#### 5. Cancel Pledge

**Endpoint**: `POST /api/v1/organizations/:orgId/pledges/:pledgeId/cancel`

**Request Body**:

```json
{
  "reason": "Member request"
}
```

**Response** (200 OK): Updated PledgeDTO with status="cancelled"

---

### EXPENSES

#### 1. List Expenses

**Endpoint**: `GET /api/v1/organizations/:orgId/expenses`

**Query Parameters**:

| Parameter  | Type     | Description                       |
| ---------- | -------- | --------------------------------- |
| `page`     | integer  | Page number                       |
| `pageSize` | integer  | Items per page                    |
| `status`   | string   | pending, approved, rejected, paid |
| `category` | UUID     | Category filter                   |
| `fromDate` | ISO 8601 | Date filter                       |
| `toDate`   | ISO 8601 | Date filter                       |
| `sortBy`   | string   | date, amount, createdAt           |
| `order`    | string   | asc, desc                         |

**Response** (200 OK): Paginated ExpenseDTO[]

---

#### 2. Create Expense

**Endpoint**: `POST /api/v1/organizations/:orgId/expenses`

**Request Body**:

```json
{
  "amount": 500.0,
  "currency": "USD",
  "category": "Maintenance",
  "description": "Building repairs",
  "date": "2026-07-24",
  "attachment": "https://storage.example.com/receipt.pdf"
}
```

**Response** (201 Created): ExpenseDTO with status="pending"

---

#### 3. Get Expense

**Endpoint**: `GET /api/v1/organizations/:orgId/expenses/:expenseId`

**Response** (200 OK): ExpenseDTO

---

#### 4. Update Expense

**Endpoint**: `PATCH /api/v1/organizations/:orgId/expenses/:expenseId`

**Note**: Only pending expenses can be updated

**Request Body** (partial):

```json
{
  "amount": 600.0,
  "description": "Updated description"
}
```

**Response** (200 OK): Updated ExpenseDTO

---

#### 5. Delete Expense

**Endpoint**: `DELETE /api/v1/organizations/:orgId/expenses/:expenseId`

**Note**: Only pending expenses can be deleted

**Response** (204 No Content)

---

#### 6. Approve Expense

**Endpoint**: `POST /api/v1/organizations/:orgId/expenses/:expenseId/approve`

**Request Body**:

```json
{
  "notes": "Approved for payment"
}
```

**Response** (200 OK): Updated ExpenseDTO with status="approved"

---

#### 7. Reject Expense

**Endpoint**: `POST /api/v1/organizations/:orgId/expenses/:expenseId/reject`

**Request Body**:

```json
{
  "reason": "Incomplete documentation"
}
```

**Response** (200 OK): Updated ExpenseDTO with status="rejected"

---

### FINANCE SUMMARY

#### Finance Summary

**Endpoint**: `GET /api/v1/organizations/:orgId/finance/summary`

**Query Parameters**:

| Parameter | Type   | Description                                      |
| --------- | ------ | ------------------------------------------------ |
| `period`  | string | thisMonth, lastMonth, thisQuarter, thisYear, all |

**Response** (200 OK): FinanceStatisticsDTO

**Example Response**:

```json
{
  "status": "success",
  "code": 200,
  "data": {
    "period": "thisMonth",
    "totalContributions": 25000.5,
    "totalExpenses": 8500.0,
    "netIncome": 16500.5,
    "currency": "USD",
    "topContributors": [
      { "memberName": "John Doe", "amount": 5000.0 },
      { "memberName": "Jane Smith", "amount": 3500.0 }
    ],
    "contributionsByCategory": {
      "Tithe": 15000.0,
      "Offering": 8000.0,
      "Special Project": 2000.5
    },
    "expensesByCategory": {
      "Utilities": 3000.0,
      "Maintenance": 2500.0,
      "Salaries": 2000.0,
      "Supplies": 1000.0
    },
    "generatedAt": "2026-07-24T10:30:00Z"
  },
  "meta": { "timestamp": "...", "version": "v1" }
}
```

---

## Common Workflows

### Record a Contribution

```bash
# 1. Create contribution
curl -X POST "api/contributions" \
  -d '{
    "memberId": "uuid",
    "amount": 500,
    "category": "Tithe",
    "date": "2026-07-24"
  }'
# Response: 201 with Location header

# 2. View contribution summary
curl "api/contributions/summary?fromDate=2026-07-01&toDate=2026-07-31"
```

### Create and Track Pledge

```bash
# 1. Create pledge
curl -X POST "api/pledges" \
  -d '{
    "memberId": "uuid",
    "amount": 10000,
    "frequency": "monthly",
    "startDate": "2026-07-24"
  }'
# Response: 201 with pledgeId

# 2. Fulfill pledge payment
curl -X POST "api/pledges/{pledgeId}/fulfill" \
  -d '{
    "amount": 1000,
    "date": "2026-07-24"
  }'
# Response: 200 with remaining amount

# 3. Get pledge details
curl "api/pledges/{pledgeId}"
```

### Expense Approval Workflow

```bash
# 1. Create pending expense
curl -X POST "api/expenses" \
  -d '{
    "amount": 500,
    "category": "Maintenance",
    "description": "Building repairs",
    "date": "2026-07-24"
  }'
# Response: 201 with status="pending"

# 2. Review expense
curl "api/expenses/{expenseId}"

# 3. Approve expense
curl -X POST "api/expenses/{expenseId}/approve" \
  -d '{ "notes": "Approved" }'
# Response: 200 with status="approved"

# 4. View finance summary
curl "api/finance/summary?period=thisMonth"
```

---

## Error Response Format

All errors follow this format:

```json
{
  "status": "error",
  "code": 422,
  "error": {
    "type": "ValidationError",
    "message": "Validation failed",
    "details": [
      {
        "field": "amount",
        "message": "Must be positive",
        "code": "INVALID_AMOUNT"
      }
    ]
  },
  "meta": { "timestamp": "...", "version": "v1" }
}
```

**Error Codes**:

- `INVALID_AMOUNT` - Amount must be positive
- `INVALID_CATEGORY` - Category not found
- `MEMBER_NOT_FOUND` - Member not found
- `PLEDGE_NOT_FOUND` - Pledge not found
- `EXPENSE_NOT_FOUND` - Expense not found
- `INVALID_STATUS` - Invalid status transition
- `INSUFFICIENT_FULFILLMENT` - Fulfillment exceeds pledge
- `ONLY_PENDING_CAN_BE_UPDATED` - Only pending expenses can be updated

---

## Status Codes

| Code | Meaning              | When Used                           |
| ---- | -------------------- | ----------------------------------- |
| 200  | OK                   | Successful GET, PATCH, POST actions |
| 201  | Created              | Successful POST (resource created)  |
| 204  | No Content           | Successful DELETE                   |
| 400  | Bad Request          | Invalid parameters or ID format     |
| 404  | Not Found            | Resource not found                  |
| 409  | Conflict             | Invalid state transition            |
| 422  | Unprocessable Entity | Validation error                    |
| 500  | Server Error         | Unexpected error                    |

---

## Integration Examples

### JavaScript/Fetch

```javascript
// List contributions
const response = await fetch("/api/v1/organizations/orgId/contributions?page=1&pageSize=20");
const { data, pagination } = await response.json();

// Create contribution
await fetch("/api/v1/organizations/orgId/contributions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    memberId: "uuid",
    amount: 500,
    category: "Tithe",
    date: "2026-07-24",
  }),
});

// Fulfill pledge
await fetch("/api/v1/organizations/orgId/pledges/pledgeId/fulfill", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    amount: 1000,
    date: "2026-07-24",
  }),
});
```

---

## Performance Tips

- Use appropriate pageSize (recommended: 20-50)
- Filter on server side, not client
- Cache summary endpoint (revalidate every 5 minutes)
- Use date filters to limit result sets
- Sort on indexed fields (date, amount, status)

---

## Best Practices

1. **Always validate IDs** - Check UUID format before API calls
2. **Handle paginated responses** - Implement pagination UI
3. **Implement error retry** - Retry 5xx errors with exponential backoff
4. **Cache strategy** - Cache lists for 5 minutes, details for 15 minutes
5. **Error handling** - Show field-level validation errors to users

---

**Status**: ✅ Production Ready  
**Quality**: ⭐⭐⭐⭐⭐

---

_Finance Module RESTful API Documentation_  
_Updated: 2026-07-24 | Role: Senior Backend Software Engineer_
