/**
 * POST /api/v1/organizations/:orgId/members/:memberId/documents
 * 
 * Upload a document for a member
 * @param memberId - Member ID (UUID)
 * @body { fileName: string, fileType: string, fileUrl: string, documentType?: string }
 * @returns 201 Created with MemberDocumentDTO
 */

import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { ApiResponse, extractValidationErrors, toMemberDocumentDTO } from "@/lib/api";
import { getMemberService } from "@/lib/infrastructure";
import { NotFoundError, ValidationError } from "@/lib/domain-errors";
import { z } from "zod";

const uploadDocumentSchema = z.object({
  fileName: z.string().min(1, "File name is required").max(255),
  fileType: z.string().min(1, "File type is required"),
  fileUrl: z.string().url("File URL must be valid"),
  documentType: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  try {
    const orgId = event.context.params?.orgId;
    const memberId = event.context.params?.memberId;

    // Validate IDs
    if (!orgId || typeof orgId !== "string") {
      return ApiResponse.badRequest("Organization ID is required");
    }

    if (!memberId || typeof memberId !== "string") {
      return ApiResponse.badRequest("Member ID is required");
    }

    if (!isValidUUID(memberId)) {
      return ApiResponse.badRequest("Invalid member ID format");
    }

    // Read and validate request body
    const body = await readBody(event);
    const validation = uploadDocumentSchema.safeParse(body);

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid document data");
    }

    const documentData = validation.data;

    // Get member service
    const memberService = getMemberService();

    try {
      // Verify member exists and belongs to organization
      const member = await memberService.getMember(memberId);
      if (member.organizationId && member.organizationId !== orgId) {
        return ApiResponse.notFound("Member not found in this organization");
      }

      // Upload the document
      const document = await memberService.uploadDocument(memberId, {
        fileName: documentData.fileName,
        fileType: documentData.fileType,
        fileUrl: documentData.fileUrl,
        documentType: documentData.documentType || "general",
      });

      // Convert to DTO
      const dto = toMemberDocumentDTO(document);

      // Set response status to 201 Created
      setResponseStatus(event, 201);

      // Set Location header
      setHeader(
        event,
        "Location",
        `/api/v1/organizations/${orgId}/members/${memberId}/documents/${document.id}`
      );

      return ApiResponse.created(dto);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ApiResponse.notFound(error.message);
      }

      if (error instanceof ValidationError) {
        return ApiResponse.validationError(
          [{ field: "document", message: error.message, code: error.code }],
          "Document validation failed"
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("Error uploading document:", error);
    return ApiResponse.serverError(
      "Failed to upload document",
      "UPLOAD_DOCUMENT_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function setHeader(event: any, name: string, value: string) {
  event.node.res.setHeader(name, value);
}
