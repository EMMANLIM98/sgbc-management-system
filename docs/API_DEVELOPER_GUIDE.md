# REST API Developer Guide - SGBC Management System

**Quick Reference for Creating RESTful Endpoints**

---

## 1. Quick Start: Creating a New Endpoint

### Step 1: Define Request Schema

```typescript
// src/lib/api/request-schemas.ts
export const createResourceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});
```

### Step 2: Create DTOs

```typescript
// src/lib/api/dto/module.dto.ts
export interface ResourceDTO {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function toResourceDTO(resource: Resource): ResourceDTO {
  return {
    id: resource.id,
    name: resource.name.value,
    description: resource.description?.value,
    status: resource.status.value,
    createdAt: resource.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: resource.updatedAt?.toISOString() || new Date().toISOString(),
  };
}
```

### Step 3: Implement Endpoint

```typescript
// server/routes/api/resources/index.post.ts
import { ApiResponse } from "@/lib/api/response";
import { createResourceSchema, extractValidationErrors } from "@/lib/api/request-schemas";
import { toResourceDTO } from "@/lib/api/dto/module.dto";
import { ResourceService } from "@/modules/module/application/resource.service";

export default defineEventHandler(async (event) => {
  try {
    // 1. Validate request
    const body = await readBody(event);
    const validation = createResourceSchema.safeParse(body);

    if (!validation.success) {
      setResponseStatus(event, 422);
      return ApiResponse.validationError(
        extractValidationErrors(validation.error),
        "Invalid resource data",
      );
    }

    // 2. Business logic via service
    const service = new ResourceService(supabase);
    const resource = await service.create(validation.data);

    // 3. Convert to DTO
    const dto = toResourceDTO(resource);

    // 4. Return response
    setResponseStatus(event, 201);
    setResponseHeader(event, "Location", `/api/v1/resources/${resource.id}`);
    return ApiResponse.created(dto);
  } catch (error) {
    console.error("Resource creation error:", error);
    setResponseStatus(event, 500);
    return ApiResponse.serverError();
  }
});
```

---

## 2. Response Format Reference

### Success Response (GET, PATCH, etc.)

```typescript
// Status: 200
ApiResponse.success(data, 200)

// Response:
{
  "status": "success",
  "code": 200,
  "data": { /* entity */ },
  "meta": {
    "timestamp": "2026-07-24T10:30:00Z",
    "version": "v1"
  }
}
```

### Created Response (POST)

```typescript
// Status: 201
setResponseHeader(event, "Location", "/api/v1/resource/id");
ApiResponse.created(data)

// Response:
{
  "status": "success",
  "code": 201,
  "data": { /* new entity */ },
  "meta": { /* ... */ }
}
```

### Paginated Response (GET lists)

```typescript
// Status: 200
const pagination = calculatePagination(total, page, pageSize);
ApiResponse.paginated(items, pagination, 200)

// Response:
{
  "status": "success",
  "code": 200,
  "data": [ /* items */ ],
  "pagination": {
    "total": 100,
    "count": 10,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": { /* ... */ }
}
```

### Error Response (Validation)

```typescript
// Status: 422
ApiResponse.validationError(details, "Invalid data")

// Response:
{
  "status": "error",
  "code": 422,
  "error": {
    "type": "ValidationError",
    "message": "Invalid data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_EMAIL"
      }
    ]
  },
  "meta": { /* ... */ }
}
```

### Error Response (Not Found)

```typescript
// Status: 404
ApiResponse.notFound("Resource not found")

// Response:
{
  "status": "error",
  "code": 404,
  "error": {
    "type": "NotFoundError",
    "message": "Resource not found",
    "code": "NOT_FOUND"
  },
  "meta": { /* ... */ }
}
```

### Error Response (Conflict)

```typescript
// Status: 409
ApiResponse.conflict("Already exists", "DUPLICATE", { field: "email" })

// Response:
{
  "status": "error",
  "code": 409,
  "error": {
    "type": "ConflictError",
    "message": "Already exists",
    "code": "DUPLICATE",
    "details": { "field": "email" }
  },
  "meta": { /* ... */ }
}
```

### Error Response (Rate Limited)

```typescript
// Status: 429
ApiResponse.rateLimited("Too many requests", 60);

// Response includes retryAfter in meta
```

---

## 3. Common Patterns

### Pattern: List with Pagination

```typescript
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const validation = listQuerySchema.safeParse(query);

    if (!validation.success) {
      setResponseStatus(event, 422);
      return ApiResponse.validationError(extractValidationErrors(validation.error));
    }

    const params = validation.data;
    const offset = (params.page - 1) * params.pageSize;

    // Fetch with count
    const {
      data: items,
      error,
      count: total,
    } = await supabase
      .from("resources")
      .select("*", { count: "exact" })
      .range(offset, offset + params.pageSize - 1)
      .order(params.sortBy, { ascending: params.order === "asc" });

    if (error) throw error;

    const pagination = calculatePagination(total || 0, params.page, params.pageSize);
    const dtos = items.map(toResourceDTO);

    setResponseStatus(event, 200);
    return ApiResponse.paginated(dtos, pagination);
  } catch (error) {
    return ApiResponse.serverError();
  }
});
```

### Pattern: Create with Validation

```typescript
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const validation = createSchema.safeParse(body);

    if (!validation.success) {
      setResponseStatus(event, 422);
      return ApiResponse.validationError(extractValidationErrors(validation.error));
    }

    // Check for duplicates
    const existing = await checkDuplicate(validation.data);
    if (existing) {
      setResponseStatus(event, 409);
      return ApiResponse.conflict("Already exists", "DUPLICATE_KEY");
    }

    // Create via service
    const service = new ResourceService(supabase);
    const resource = await service.create(validation.data);

    setResponseStatus(event, 201);
    setResponseHeader(event, "Location", `/api/v1/resources/${resource.id}`);
    return ApiResponse.created(toResourceDTO(resource));
  } catch (error) {
    return ApiResponse.serverError();
  }
});
```

### Pattern: Update with Validation

```typescript
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    const body = await readBody(event);

    // Validate
    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      setResponseStatus(event, 422);
      return ApiResponse.validationError(extractValidationErrors(validation.error));
    }

    // Update via service
    const service = new ResourceService(supabase);
    const resource = await service.update(id, validation.data);

    if (!resource) {
      setResponseStatus(event, 404);
      return ApiResponse.notFound();
    }

    setResponseStatus(event, 200);
    return ApiResponse.success(toResourceDTO(resource));
  } catch (error) {
    return ApiResponse.serverError();
  }
});
```

### Pattern: Delete

```typescript
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");

    const service = new ResourceService(supabase);
    const success = await service.delete(id);

    if (!success) {
      setResponseStatus(event, 404);
      return ApiResponse.notFound();
    }

    setResponseStatus(event, 204);
    return null; // 204 No Content
  } catch (error) {
    return ApiResponse.serverError();
  }
});
```

---

## 4. Error Handling Patterns

### Handle Validation Errors

```typescript
const validation = schema.safeParse(data);
if (!validation.success) {
  return ApiResponse.validationError(extractValidationErrors(validation.error), "Invalid input");
}
```

### Handle Business Rule Violations

```typescript
try {
  await service.transfer(id, targetOrgId);
} catch (error) {
  if (error instanceof BusinessRuleViolation) {
    return ApiResponse.conflict(error.message, error.code);
  }
  throw error;
}
```

### Handle Not Found

```typescript
const resource = await service.findById(id);
if (!resource) {
  return ApiResponse.notFound("Resource not found");
}
```

### Handle Duplicates

```typescript
const exists = await checkIfExists(name);
if (exists) {
  return ApiResponse.conflict("Name already exists", "DUPLICATE_NAME", { field: "name" });
}
```

### Handle Rate Limiting

```typescript
const recentRequests = await countRecentRequests(clientId, 60 * 1000);
if (recentRequests > LIMIT) {
  return ApiResponse.rateLimited("Too many requests", 60);
}
```

---

## 5. DTO Mapping Best Practices

### 1:1 Mapping

```typescript
export function toResourceDTO(resource: Resource): ResourceDTO {
  return {
    id: resource.id,
    name: resource.name.value, // unwrap ValueObject
    status: resource.status.value,
    createdAt: resource.createdAt?.toISOString(),
  };
}
```

### With Computed Fields

```typescript
export function toResourceDetailDTO(resource: Resource, stats?: any): ResourceDetailDTO {
  return {
    ...toResourceDTO(resource),
    totalItems: stats?.count || 0,
    lastActivityDate: stats?.lastActivity,
    percentageComplete: stats?.percentage || 0,
  };
}
```

### Batch Mapping

```typescript
export function toResourceDTOs(resources: Resource[]): ResourceDTO[] {
  return resources.map(toResourceDTO);
}
```

### Conditional Fields

```typescript
export function toResourceDTO(resource: Resource, includeStats = false) {
  const dto: any = {
    id: resource.id,
    name: resource.name.value,
  };

  if (includeStats && resource.stats) {
    dto.stats = resource.stats;
  }

  return dto;
}
```

---

## 6. Testing Your Endpoint

### Using curl

```bash
# Create
curl -X POST http://localhost:5173/api/v1/resources \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","status":"active"}'

# List with pagination
curl "http://localhost:5173/api/v1/resources?page=1&pageSize=10&sortBy=name&order=asc"

# Get one
curl http://localhost:5173/api/v1/resources/123

# Update
curl -X PATCH http://localhost:5173/api/v1/resources/123 \
  -H "Content-Type: application/json" \
  -d '{"status":"inactive"}'

# Delete
curl -X DELETE http://localhost:5173/api/v1/resources/123
```

### Using TypeScript/Fetch

```typescript
// List
const response = await fetch("/api/v1/resources?page=1&pageSize=10");
const { data, pagination, meta } = await response.json();

// Create
const response = await fetch("/api/v1/resources", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Test" }),
});

// Check response
if (response.status === 201) {
  const { data } = await response.json();
  const resourceId = data.id;
} else if (response.status === 422) {
  const { error } = await response.json();
  // Handle validation errors
}
```

---

## 7. Checklist for New Endpoints

- [ ] Define request schema in `request-schemas.ts`
- [ ] Create DTOs in appropriate `dto/*.dto.ts`
- [ ] Create mapper function(s)
- [ ] Implement endpoint handler
- [ ] Use `ApiResponse` for all responses
- [ ] Handle validation errors (422)
- [ ] Handle business errors (409, 400)
- [ ] Handle not found (404)
- [ ] Add proper TypeScript types
- [ ] Add JSDoc comments
- [ ] Test with curl/Postman
- [ ] Verify response format
- [ ] Check error messages

---

## 8. API Response Builder Cheat Sheet

```typescript
// Success
ApiResponse.success(data, 200); // GET, PATCH
ApiResponse.created(data); // POST → 201
ApiResponse.paginated(items, pagination, 200); // GET lists

// Errors
ApiResponse.validationError(details, "message"); // 422
ApiResponse.notFound("message"); // 404
ApiResponse.conflict("msg", "CODE", details); // 409
ApiResponse.rateLimited("Too many", 60); // 429
ApiResponse.unauthorized("message"); // 401
ApiResponse.forbidden("message"); // 403
ApiResponse.error(error, 400); // Generic 4xx
ApiResponse.serverError("message"); // 500
```

---

**Last Updated**: 2026-07-24  
**For Questions**: See `docs/RESTFUL_API_DESIGN_GUIDE.md`
