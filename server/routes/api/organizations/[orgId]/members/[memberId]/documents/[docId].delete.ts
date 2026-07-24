/**
 * DELETE /api/v1/organizations/:orgId/members/:memberId/documents/:docId
 * 
 * Delete a member document
 * @param memberId - Member ID (UUID)
 * @param docId - Document ID (UUID)
 * @returns 204 No Content
 */

import { defineEventHandler, setResponseStatus } from "h3";
import { ApiResponse } from "@/lib/api";
import { getMemberService } from "@/lib/infrastructure";
import { NotFoundError } from "@/lib/domain-errors";

export default defineEventHandler(async (event) => {
  try {
    const orgId = event.context.params?.orgId;
    const memberId = event.context.params?.memberId;
    const docId = event.context.params?.docId;

    // Validate IDs
    if (!orgId || typeof orgId !== "string") {
      return ApiResponse.badRequest("Organization ID is required");
    }

    if (!memberId || typeof memberId !== "string") {
      return ApiResponse.badRequest("Member ID is required");
    }

    if (!docId || typeof docId !== "string") {
      return ApiResponse.badRequest("Document ID is required");
    }

    if (!isValidUUID(memberId) || !isValidUUID(docId)) {
      return ApiResponse.badRequest("Invalid ID format");
    }

    // Get member service
    const memberService = getMemberService();

    try {
      // Verify member exists and belongs to organization
      const member = await memberService.getMember(memberId);
      if (member.organizationId && member.organizationId !== orgId) {
        return ApiResponse.notFound("Member not found in this organization");
      }

      // Verify document exists
      const documents = await memberService.getMemberDocuments(memberId);
      const documentExists = documents.some(doc => doc.id === docId);
      
      if (!documentExists) {
        return ApiResponse.notFound("Document not found");
      }

      // Delete the document
      await memberService.deleteDocument(docId);

      // Return 204 No Content
      setResponseStatus(event, 204);
      return null;
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ApiResponse.notFound(error.message);
      }
      throw error;
    }
  } catch (error) {
    console.error("Error deleting document:", error);
    return ApiResponse.serverError(
      "Failed to delete document",
      "DELETE_DOCUMENT_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
