/**
 * POST /api/v1/organizations/:orgId/expenses
 * 
 * Create a new expense record
 * @body ExpenseCreateRequest with amount, category, description, date, attachment
 * @returns 201 Created with ExpenseDTO
 */

import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { ApiResponse, extractValidationErrors } from "@/lib/api";
import { z } from "zod";

const createExpenseSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3).default("USD"),
  category: z.string().uuid("Category ID is required"),
  description: z.string().min(1).max(500),
  date: z.string().datetime(),
  attachment: z.string().url().optional(),
});

export default defineEventHandler(async (event) => {
  try {
    const orgId = event.context.params?.orgId;

    // Validate organization ID
    if (!orgId || typeof orgId !== "string") {
      return ApiResponse.badRequest("Organization ID is required");
    }

    // Read and validate request body
    const body = await readBody(event);
    const validation = createExpenseSchema.safeParse(body);

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid expense data");
    }

    const expenseData = validation.data;

    // TODO: Get finance service
    // Validate category exists
    // Create expense with pending status
    // Convert to DTO
    // Return 201 with Location header

    const expenseId = "expense-uuid";
    setResponseStatus(event, 201);
    setHeader(event, "Location", `/api/v1/organizations/${orgId}/expenses/${expenseId}`);

    return ApiResponse.created({
      id: expenseId,
      amount: expenseData.amount,
      currency: expenseData.currency,
      category: "Category Name",
      description: expenseData.description,
      date: expenseData.date,
      approvedBy: undefined,
      status: "pending",
      attachment: expenseData.attachment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error creating expense:", error);
    return ApiResponse.serverError(
      "Failed to create expense",
      "CREATE_EXPENSE_FAILED"
    );
  }
});

function setHeader(event: any, name: string, value: string) {
  event.node.res.setHeader(name, value);
}
