/**
 * Webhook Service Implementation
 *
 * Triggers external webhooks (n8n, Zapier, custom APIs) with retry logic,
 * error handling, and optional HMAC signature verification.
 *
 * Architecture Layer: Infrastructure
 * Usage: Called from Application layer (event registration, check-in, etc.)
 * Never expose to frontend - server-side only
 */

import crypto from "crypto";
import type {
  IWebhookService,
  WebhookEventType,
  WebhookPayload,
  WebhookTriggerResult,
} from "@/lib/webhooks/webhook.interface";

interface WebhookConfig {
  maxRetries?: number;
  timeoutMs?: number;
  backoffMs?: number;
}

export class N8nWebhookService implements IWebhookService {
  private webhookUrl: string;
  private webhookSecret: string;
  private maxRetries: number = 3;
  private timeoutMs: number = 10000;
  private backoffMs: number = 1000;

  constructor(config?: WebhookConfig) {
    this.webhookUrl = process.env.N8N_EVENT_REGISTRATION_WEBHOOK || "";
    this.webhookSecret = process.env.N8N_WEBHOOK_SECRET || "";

    if (config) {
      this.maxRetries = config.maxRetries ?? this.maxRetries;
      this.timeoutMs = config.timeoutMs ?? this.timeoutMs;
      this.backoffMs = config.backoffMs ?? this.backoffMs;
    }
  }

  /**
   * Trigger webhook with retry logic
   * Non-blocking - returns immediately and processes in background
   */
  async trigger(
    eventType: WebhookEventType,
    data: Record<string, any>,
  ): Promise<WebhookTriggerResult> {
    // Return early if webhook not configured
    if (!this.webhookUrl) {
      console.warn("[Webhook] N8N_EVENT_REGISTRATION_WEBHOOK not configured - skipping");
      return {
        success: false,
        webhookUrl: "",
        error: "Webhook URL not configured",
      };
    }

    // Build payload
    const payload: WebhookPayload = {
      event: {
        type: eventType,
        timestamp: new Date().toISOString(),
        source: "sgbc-management-system",
      },
      data,
    };

    // Trigger with retry logic (don't await - fire-and-forget)
    this.triggerWithRetry(payload).catch((err) => {
      console.error(
        `[Webhook] Failed to trigger ${eventType} after ${this.maxRetries} retries:`,
        err,
      );
    });

    // Return success immediately (async processing)
    return {
      success: true,
      webhookUrl: this.webhookUrl,
    };
  }

  /**
   * Internal: Trigger with exponential backoff retry
   * Private method - not exposed to callers
   */
  private async triggerWithRetry(
    payload: WebhookPayload,
    attempt: number = 1,
  ): Promise<WebhookTriggerResult> {
    try {
      // Create HMAC signature for webhook verification
      const signature = this.createSignature(JSON.stringify(payload));

      console.log(
        `[Webhook] Triggering ${payload.event.type} (attempt ${attempt}/${this.maxRetries})`,
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Event-Type": payload.event.type,
          "X-Event-Signature": signature,
          "X-Event-Timestamp": payload.event.timestamp,
          "X-Source": "sgbc-management-system",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Webhook returned ${response.status}: ${response.statusText}`,
        );
      }

      console.log(`[Webhook] ${payload.event.type} triggered successfully (${response.status})`);

      return {
        success: true,
        webhookUrl: this.webhookUrl,
        statusCode: response.status,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Retry logic with exponential backoff
      if (attempt < this.maxRetries) {
        const delay = this.backoffMs * Math.pow(2, attempt - 1);
        console.warn(
          `[Webhook] ${payload.event.type} failed (${errorMsg}). Retrying in ${delay}ms...`,
        );

        await this.sleep(delay);
        return this.triggerWithRetry(payload, attempt + 1);
      }

      // Max retries exceeded
      console.error(`[Webhook] ${payload.event.type} failed after ${this.maxRetries} attempts`);

      return {
        success: false,
        webhookUrl: this.webhookUrl,
        error: errorMsg,
        retries: attempt,
      };
    }
  }

  /**
   * Verify webhook signature (HMAC-SHA256)
   * Call this in your webhook receiver to validate authenticity
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      console.warn("[Webhook] No webhook secret configured - skipping signature verification");
      return true;
    }

    const expectedSignature = this.createSignature(payload);
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );

    if (!isValid) {
      console.warn("[Webhook] Invalid signature - potential security issue");
    }

    return isValid;
  }

  /**
   * Create HMAC-SHA256 signature
   * Private helper method
   */
  private createSignature(data: string): string {
    return crypto
      .createHmac("sha256", this.webhookSecret)
      .update(data)
      .digest("hex");
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance
 * Exported as default webhook service
 */
export const webhookService = new N8nWebhookService({
  maxRetries: 3,
  timeoutMs: 10000,
  backoffMs: 1000,
});
