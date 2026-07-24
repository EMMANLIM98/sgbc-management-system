/**
 * POST /api/v1/organizations
 * 
 * Create a new organization
 * @body CreateOrganizationRequest { name, description? }
 * @returns 201 Created with OrganizationDTO and Location header
 */

import { defineEventHandler, readBody, setResponseHeader, setResponseStatus } from "h3";
import { ApiResponse, extractValidationErrors, createOrganizationSchema } from "@/lib/api";

export default defineEventHandler(async (event) => {
  try {
    // Read and validate request body
    const body = await readBody(event);
    const validation = createOrganizationSchema.safeParse(body);

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid organization data");
    }

    const { name, description } = validation.data;

    // TODO: Check authorization (user must be admin or have create-org permission)
    // TODO: Check if organization name already exists
    // TODO: Create organization in database
    // TODO: Create initial org_admin relationship for creator
    // TODO: Convert to DTO
    // TODO: Set Location header
    // TODO: Return 201 Created

    const newOrganizationId = "org-new-uuid";

    setResponseHeader(
      event,
      "Location",
      `/api/v1/organizations/${newOrganizationId}`
    );
    setResponseStatus(event, 201);

    return ApiResponse.created(
      {
        id: newOrganizationId,
        name,
        description,
        isActive: true,
        memberCount: 1,
        admins: ["current-user"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      201
    );
  } catch (error) {
    console.error("Error creating organization:", error);
    return ApiResponse.serverError(
      "Failed to create organization",
      "CREATE_ORGANIZATION_FAILED"
    );
  }
});
