/**
 * Webhook Service Interface
 *
 * Defines the contract for triggering external webhooks (n8n, Zapier, etc.)
 * Architecture Layer: Infrastructure (Boundary)
 */

export type WebhookEventType =
  | "event.registration.created"
  | "event.checkin.created"
  | "event.cancelled"
  | "membership.created"
  | "raffle.winner";

export interface WebhookPayload {
  event: {
    type: WebhookEventType;
    timestamp: string;
    source: string;
  };
  data: Record<string, any>;
}

export interface WebhookTriggerResult {
  success: boolean;
  webhookUrl: string;
  statusCode?: number;
  error?: string;
  retries?: number;
}

export interface IWebhookService {
  /**
   * Trigger a webhook asynchronously (fire-and-forget)
   * Does not block the main request
   * Includes built-in retry logic and error handling
   */
  trigger(eventType: WebhookEventType, data: Record<string, any>): Promise<WebhookTriggerResult>;

  /**
   * Verify webhook authenticity (HMAC signature)
   */
  verifySignature(payload: string, signature: string): boolean;
}
