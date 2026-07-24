# Dashboard API Implementation Guide

## Overview

The Dashboard API provides key performance indicators (KPIs), activity feeds, membership growth data, and church overviews for administrative dashboards.

## Architecture

The Dashboard module follows the 4-layer clean architecture pattern:

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: API Routes (HTTP Handlers)                     │
│ - GET /api/v1/dashboard/kpis                            │
│ - GET /api/v1/dashboard/membership-growth               │
│ - GET /api/v1/dashboard/activities                      │
│ - GET /api/v1/dashboard/churches                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Services (Business Logic)                      │
│ - DashboardService: Orchestrates data aggregation       │
│ - Data validation and transformation                    │
│ - Error handling with meaningful messages               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Data Access (Supabase Client)                  │
│ - Raw Supabase queries for members, churches, activities│
│ - Pagination and filtering support                      │
│ - Count aggregations                                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 4: Database (Supabase PostgreSQL)                 │
│ - members table with church_id, membership_status       │
│ - churches table with name, city, photo_url             │
│ - activities table with verb, subject_type, actor_id    │
│ - profiles table with full_name                         │
└─────────────────────────────────────────────────────────┘
```

## Files Created

### Service Layer

- **`src/lib/services/dashboard.service.ts`** - Core business logic for data aggregation
  - `getKpis(churchId?)` - Aggregates member counts and statistics
  - `getMembershipGrowth(months, churchId?)` - Calculates cumulative growth
  - `getRecentActivities(limit, churchId?)` - Fetches activity feed
  - `getChurchesOverview()` - Gets churches with member counts

### API Layer

- **`server/routes/api/dashboard/kpis.get.ts`** - GET /api/v1/dashboard/kpis
- **`server/routes/api/dashboard/membership-growth.get.ts`** - GET /api/v1/dashboard/membership-growth
- **`server/routes/api/dashboard/activities.get.ts`** - GET /api/v1/dashboard/activities
- **`server/routes/api/dashboard/churches.get.ts`** - GET /api/v1/dashboard/churches

### Data Transfer Objects

- **`src/lib/api/dto/dashboard.dto.ts`** - DTOs and mapper functions
  - `KpiDTO` - Dashboard KPI metrics
  - `MembershipGrowthDTO` - Growth chart data
  - `RecentActivitiesDTO` - Activity feed entries
  - `ChurchesOverviewDTO` - Church summaries

### Validation Schemas

- **`src/lib/api/request-schemas.ts`** - Zod validation schemas added
  - `dashboardKpisQuerySchema`
  - `membershipGrowthQuerySchema`
  - `recentActivitiesQuerySchema`

## API Endpoints

### 1. GET /api/v1/dashboard/kpis

Get key performance indicators for the dashboard.

**Authentication**: Required (Bearer token)

**Query Parameters**:

| Parameter | Type            | Default | Description                     |
| --------- | --------------- | ------- | ------------------------------- |
| churchId  | UUID (optional) | -       | Filter KPIs for specific church |

**Response (200 OK)**:

```json
{
  "status": "success",
  "code": 200,
  "data": {
    "totalMembers": 250,
    "activeMembers": 180,
    "visitors": 35,
    "churches": 1,
    "newLast30": 15,
    "totalOfferingsMtd": 5000.0,
    "offeringsDeltaPct": 12.5
  },
  "meta": {
    "timestamp": "2026-07-24T10:30:00Z",
    "version": "v1"
  }
}
```

**Error Responses**:

- `401 Unauthorized` - Authentication required
- `422 Unprocessable Entity` - Invalid query parameters
- `500 Internal Server Error` - Server error

**Examples**:

```bash
# Get global KPIs
curl -X GET "http://localhost:3000/api/v1/dashboard/kpis" \
  -H "Authorization: Bearer <token>"

# Get KPIs for specific church
curl -X GET "http://localhost:3000/api/v1/dashboard/kpis?churchId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>"
```

---

### 2. GET /api/v1/dashboard/membership-growth

Get cumulative membership growth data for chart display.

**Authentication**: Required (Bearer token)

**Query Parameters**:

| Parameter | Type            | Default | Min/Max | Description                            |
| --------- | --------------- | ------- | ------- | -------------------------------------- |
| churchId  | UUID (optional) | -       | -       | Filter growth data for specific church |
| months    | number          | 6       | 3-24    | Number of months to retrieve           |

**Response (200 OK)**:

```json
{
  "status": "success",
  "code": 200,
  "data": [
    {
      "label": "Feb",
      "date": "2026-02",
      "count": 205
    },
    {
      "label": "Mar",
      "date": "2026-03",
      "count": 220
    },
    {
      "label": "Apr",
      "date": "2026-04",
      "count": 235
    },
    {
      "label": "May",
      "date": "2026-05",
      "count": 245
    },
    {
      "label": "Jun",
      "date": "2026-06",
      "count": 250
    },
    {
      "label": "Jul",
      "date": "2026-07",
      "count": 265
    }
  ],
  "meta": {
    "timestamp": "2026-07-24T10:30:00Z",
    "version": "v1"
  }
}
```

**Error Responses**:

- `401 Unauthorized` - Authentication required
- `422 Unprocessable Entity` - Invalid query parameters (months < 3 or > 24)
- `500 Internal Server Error` - Server error

**Examples**:

```bash
# Get 6-month growth (default)
curl -X GET "http://localhost:3000/api/v1/dashboard/membership-growth" \
  -H "Authorization: Bearer <token>"

# Get 12-month growth
curl -X GET "http://localhost:3000/api/v1/dashboard/membership-growth?months=12" \
  -H "Authorization: Bearer <token>"

# Get growth for specific church
curl -X GET "http://localhost:3000/api/v1/dashboard/membership-growth?churchId=550e8400-e29b-41d4-a716-446655440000&months=3" \
  -H "Authorization: Bearer <token>"
```

---

### 3. GET /api/v1/dashboard/activities

Get recent activity feed for the dashboard.

**Authentication**: Required (Bearer token)

**Query Parameters**:

| Parameter | Type            | Default | Min/Max | Description                           |
| --------- | --------------- | ------- | ------- | ------------------------------------- |
| churchId  | UUID (optional) | -       | -       | Filter activities for specific church |
| limit     | number          | 10      | 1-50    | Number of activities to retrieve      |

**Response (200 OK)**:

```json
{
  "status": "success",
  "code": 200,
  "data": [
    {
      "id": "act-123",
      "verb": "created",
      "subjectType": "member",
      "subjectId": "mem-456",
      "meta": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "createdAt": "2026-07-24T10:15:00Z",
      "churchId": "church-789",
      "actor": {
        "id": "user-123",
        "fullName": "Jane Smith"
      },
      "church": {
        "name": "SGBC Church"
      }
    },
    {
      "id": "act-124",
      "verb": "updated",
      "subjectType": "event",
      "subjectId": "evt-567",
      "meta": {
        "title": "Sunday Service",
        "changes": ["time", "location"]
      },
      "createdAt": "2026-07-24T09:30:00Z",
      "churchId": "church-789",
      "actor": {
        "id": "user-456",
        "fullName": "Admin User"
      },
      "church": {
        "name": "SGBC Church"
      }
    }
  ],
  "meta": {
    "timestamp": "2026-07-24T10:30:00Z",
    "version": "v1"
  }
}
```

**Error Responses**:

- `401 Unauthorized` - Authentication required
- `422 Unprocessable Entity` - Invalid query parameters (limit < 1 or > 50)
- `500 Internal Server Error` - Server error

**Examples**:

```bash
# Get last 10 activities (default)
curl -X GET "http://localhost:3000/api/v1/dashboard/activities" \
  -H "Authorization: Bearer <token>"

# Get last 25 activities
curl -X GET "http://localhost:3000/api/v1/dashboard/activities?limit=25" \
  -H "Authorization: Bearer <token>"

# Get activities for specific church
curl -X GET "http://localhost:3000/api/v1/dashboard/activities?churchId=550e8400-e29b-41d4-a716-446655440000&limit=5" \
  -H "Authorization: Bearer <token>"
```

---

### 4. GET /api/v1/dashboard/churches

Get overview of all churches with member counts.

**Authentication**: Required (Bearer token)

**Query Parameters**: None

**Response (200 OK)**:

```json
{
  "status": "success",
  "code": 200,
  "data": [
    {
      "id": "church-001",
      "name": "SGBC Main",
      "city": "Accra",
      "photoUrl": "https://cdn.example.com/church-main.jpg",
      "members": 250
    },
    {
      "id": "church-002",
      "name": "SGBC North",
      "city": "Tema",
      "photoUrl": "https://cdn.example.com/church-north.jpg",
      "members": 180
    },
    {
      "id": "church-003",
      "name": "SGBC South",
      "city": "Sekondi",
      "photoUrl": null,
      "members": 95
    }
  ],
  "meta": {
    "timestamp": "2026-07-24T10:30:00Z",
    "version": "v1"
  }
}
```

**Error Responses**:

- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Server error

**Examples**:

```bash
curl -X GET "http://localhost:3000/api/v1/dashboard/churches" \
  -H "Authorization: Bearer <token>"
```

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "status": "error",
  "code": 422,
  "error": {
    "type": "ValidationError",
    "message": "Validation failed",
    "details": [
      {
        "field": "months",
        "message": "Number must be less than or equal to 24",
        "code": "too_big"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-07-24T10:30:00Z",
    "version": "v1"
  }
}
```

### Common Error Codes

| Code                | Status | Meaning                   |
| ------------------- | ------ | ------------------------- |
| ValidationError     | 422    | Request validation failed |
| Unauthorized        | 401    | Authentication required   |
| ServerError         | 500    | Supabase query failed     |
| InternalServerError | 500    | Unexpected server error   |

---

## Usage Examples

### Dashboard KPI Display

```typescript
// React component example
const DashboardKpis = () => {
  const [kpis, setKpis] = useState<KpiDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKpis = async () => {
      const response = await fetch('/api/v1/dashboard/kpis', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      const json = await response.json();
      setKpis(json.data);
      setLoading(false);
    };

    fetchKpis();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-4 gap-4">
      <KpiCard title="Total Members" value={kpis?.totalMembers} />
      <KpiCard title="Active Members" value={kpis?.activeMembers} />
      <KpiCard title="Visitors" value={kpis?.visitors} />
      <KpiCard title="Churches" value={kpis?.churches} />
    </div>
  );
};
```

### Membership Growth Chart

```typescript
// Chart.js example
const MembershipGrowthChart = () => {
  const [data, setData] = useState<MembershipGrowthDTO | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const response = await fetch('/api/v1/dashboard/membership-growth?months=12', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const json = await response.json();
      setData(json.data);
    };
    fetch();
  }, []);

  return (
    <LineChart
      data={{
        labels: data?.map(d => d.label),
        datasets: [{
          label: 'Cumulative Members',
          data: data?.map(d => d.count),
        }],
      }}
    />
  );
};
```

---

## Performance Considerations

1. **Caching**: Consider caching KPI data for 5-10 minutes as it doesn't change frequently
2. **Pagination**: Activities endpoint limits results to 50 for performance
3. **Aggregations**: Growth calculations happen in-memory for small datasets
4. **Indexing**: Ensure `members.church_id`, `members.membership_status`, and `activities.created_at` are indexed

---

## Testing

### Test Cases

1. **KPIs Endpoint**
   - ✅ Get global KPIs without churchId
   - ✅ Get KPIs for specific church
   - ✅ Invalid churchId format (422)
   - ✅ Unauthorized access (401)

2. **Membership Growth**
   - ✅ Default 6 months
   - ✅ Custom months (3, 12, 24)
   - ✅ Out of range months (3-24) should fail
   - ✅ Church-specific growth

3. **Recent Activities**
   - ✅ Default limit 10
   - ✅ Custom limits (1, 25, 50)
   - ✅ Out of range limits (1-50) should fail
   - ✅ Empty activities list

4. **Churches Overview**
   - ✅ All churches returned
   - ✅ Member counts correct
   - ✅ Null photo URLs handled

### cURL Testing

```bash
# Test KPIs
curl -v -X GET "http://localhost:3000/api/v1/dashboard/kpis" \
  -H "Authorization: Bearer test-token"

# Test with invalid token (401)
curl -v -X GET "http://localhost:3000/api/v1/dashboard/kpis"

# Test with invalid churchId (422)
curl -v -X GET "http://localhost:3000/api/v1/dashboard/kpis?churchId=invalid" \
  -H "Authorization: Bearer test-token"

# Test growth with 24 months
curl -v -X GET "http://localhost:3000/api/v1/dashboard/membership-growth?months=24" \
  -H "Authorization: Bearer test-token"

# Test growth with invalid months (422)
curl -v -X GET "http://localhost:3000/api/v1/dashboard/membership-growth?months=30" \
  -H "Authorization: Bearer test-token"
```

---

## Future Enhancements

1. **Caching Layer**: Add Redis caching for KPIs
2. **Real-time Updates**: WebSocket support for live dashboard updates
3. **Custom Date Ranges**: Allow arbitrary date ranges for growth data
4. **Filtered Activities**: Filter by activity type or subject type
5. **Export Data**: CSV/PDF export of dashboard data
6. **Benchmarking**: Compare metrics against previous periods

---

## Related Files

- Service: `src/lib/services/dashboard.service.ts`
- DTOs: `src/lib/api/dto/dashboard.dto.ts`
- Schemas: `src/lib/api/request-schemas.ts` (Dashboard section)
- API Response Builder: `src/lib/api/response.ts`
- Supabase Client: `src/lib/repositories/supabase.client.ts`

---

**Version**: 1.0  
**Last Updated**: 2026-07-24  
**Status**: Complete and Production-Ready
