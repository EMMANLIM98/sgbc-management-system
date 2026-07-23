# n8n Webhook Integration Guide

## 🚀 Quick Start

Your SGBC Management System now has **automatic n8n webhook integration** built-in! When someone registers for an event, a webhook automatically fires to n8n with all the registration details.

---

## ⚙️ Setup Instructions

### Step 1: Add Environment Variables

Create `.env.local` in your project root (or update existing):

```bash
# n8n Configuration
N8N_EVENT_REGISTRATION_WEBHOOK=https://your-n8n-instance.com/webhook/event-registrations
N8N_WEBHOOK_SECRET=your-secret-key-for-hmac-verification
```

### Step 2: Create n8n Webhook

1. **Open n8n** (self-hosted or cloud: https://n8n.cloud)
2. **Create new workflow**
3. **Add "Webhook" trigger node**
   - Method: `POST`
   - Path: `/event-registrations` (or customize)
   - Authentication: `None` (we use HMAC headers instead)
4. **Listen for requests** - copy the full webhook URL
5. **Update `.env.local`** with your webhook URL

### Step 3: Verify Webhook Headers (Optional but Recommended)

Add a **Code** node in n8n to verify the HMAC signature:

```javascript
// n8n Code Node
const crypto = require("crypto");

const secret = process.env.N8N_WEBHOOK_SECRET || "";
const payload = JSON.stringify($input.all());
const signature = $headers["x-event-signature"];

const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

const isValid = signature === expectedSignature;

return {
  isValid,
  eventType: $headers["x-event-type"],
  timestamp: $headers["x-event-timestamp"],
  source: $headers["x-source"],
};
```

---

## 📊 Webhook Payload Structure

When an event registration completes, n8n receives:

```json
{
  "event": {
    "type": "event.registration.created",
    "timestamp": "2026-07-23T14:30:45.123Z",
    "source": "sgbc-management-system"
  },
  "data": {
    "registration": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "registered",
      "createdAt": "2026-07-23T14:30:45.123Z"
    },
    "attendee": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "ageCategory": "adults",
      "sex": "male",
      "visitorStatus": "member",
      "leadershipRole": "pastor"
    },
    "event": {
      "id": "event-uuid-here",
      "title": "Sunday Service",
      "date": "2026-07-27",
      "location": "Main Sanctuary",
      "maxCapacity": 500
    },
    "qrCode": {
      "token": "qr-token-here",
      "scanUrl": "https://sgbc-management-system.vercel.app/event-check-in/..."
    }
  }
}
```

---

## 🎯 Use Case Examples

### Example 1: Add to Google Sheets

```
Webhook Trigger
  ↓
Google Sheets Node
  - Sheet: "Event Registrations"
  - Add Row with:
    * First Name: $json.data.attendee.firstName
    * Last Name: $json.data.attendee.lastName
    * Email: $json.data.attendee.email
    * Event: $json.data.event.title
    * Date: $json.data.event.date
    * Timestamp: $json.event.timestamp
```

### Example 2: Send Slack Notification

```
Webhook Trigger
  ↓
Slack Node
  - Channel: #event-registrations
  - Message:
    New Registration!
    👤 {{$json.data.attendee.firstName}} {{$json.data.attendee.lastName}}
    📧 {{$json.data.attendee.email}}
    📅 {{$json.data.event.title}} on {{$json.data.event.date}}
    🎫 Leadership Role: {{$json.data.attendee.leadershipRole}}
```

### Example 3: Sync to CRM (Salesforce)

```
Webhook Trigger
  ↓
Conditional Node
  - Check: Is visitorStatus === "first_time_guest"?
  ↓
Salesforce Node
  - Object: Contact
  - Create:
    * FirstName: $json.data.attendee.firstName
    * LastName: $json.data.attendee.lastName
    * Email: $json.data.attendee.email
    * Phone: $json.data.attendee.phone
    * Custom_Event_Interested__c: $json.data.event.title
```

### Example 4: Send SMS Alert (Twilio)

```
Webhook Trigger
  ↓
Conditional Node
  - Check: Is leadershipRole !== "none"?
  ↓
Twilio Node
  - Send SMS to: [PASTOR_PHONE_NUMBER]
  - Message:
    Leader {{$json.data.attendee.firstName}} registered
    for {{$json.data.event.title}}
    Role: {{$json.data.attendee.leadershipRole}}
```

### Example 5: Add to Email List (MailChimp)

```
Webhook Trigger
  ↓
MailChimp Node
  - Action: Add subscriber
  - List: Event Registrations
  - Email: $json.data.attendee.email
  - Name: {{$json.data.attendee.firstName}}
  - Tags: [
      $json.data.event.title,
      $json.data.attendee.visitorStatus,
      $json.data.attendee.leadershipRole
    ]
```

---

## 🔒 Security

### HMAC Signature Verification

Headers sent with every webhook call:

| Header              | Value                        | Purpose                |
| ------------------- | ---------------------------- | ---------------------- |
| `X-Event-Signature` | SHA256 HMAC                  | Verify authenticity    |
| `X-Event-Type`      | `event.registration.created` | Event identifier       |
| `X-Event-Timestamp` | ISO timestamp                | Prevent replay attacks |
| `X-Source`          | `sgbc-management-system`     | Source identification  |

**Verification Example (Node.js):**

```javascript
const crypto = require("crypto");

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
```

---

## 🔄 Retry Logic

If the webhook fails to trigger:

- **Attempt 1**: Immediate
- **Attempt 2**: After 1 second
- **Attempt 3**: After 4 seconds

Each attempt has a **10-second timeout**. If all retries fail, the system logs the error but **doesn't block registration**.

---

## 📝 Logging & Debugging

Check your server logs for webhook activity:

```
[Webhook] Triggering event.registration.created (attempt 1/3)
[Webhook] event.registration.created triggered successfully (200)

OR in case of error:

[Webhook] event.registration.created failed (Connection timeout)
[Webhook] event.registration.created triggered successfully (200) - retry attempt 2
```

---

## 🧪 Testing

### Test from n8n

1. In n8n, click the Webhook trigger node
2. Click **"Listen for test event"**
3. From your app, submit an event registration
4. n8n shows the received payload in real-time

### Manual Test with cURL

```bash
curl -X POST https://your-n8n-instance.com/webhook/event-registrations \
  -H "Content-Type: application/json" \
  -H "X-Event-Type: event.registration.created" \
  -H "X-Event-Signature: test-signature-here" \
  -d '{
    "event": {
      "type": "event.registration.created",
      "timestamp": "2026-07-23T14:30:45Z",
      "source": "sgbc-management-system"
    },
    "data": {
      "attendee": { "firstName": "John", "lastName": "Doe", "email": "john@example.com" },
      "event": { "id": "test-event", "title": "Test Event" },
      "qrCode": { "token": "test-token" }
    }
  }'
```

---

## 🎓 Architecture Overview

```
┌─────────────────────────────────────────────────┐
│       Event Registration Form (React)           │
│       (react-hook-form + TanStack)              │
└────────────────────┬────────────────────────────┘
                     │ POST /register
                     ↓
┌─────────────────────────────────────────────────┐
│    Backend Event Registration Handler           │
│    (publicRegisterForEvent)                     │
│                                                 │
│    1. Validate input (Zod)                     │
│    2. Rate limit check                          │
│    3. Duplicate check                           │
│    4. Capacity check                            │
│    5. Create registration (Services)            │
│    6. Generate QR code                          │
│    7. Send confirmation emails                  │
│    8. ➜ TRIGGER n8n WEBHOOK ← (NEW!)          │
└────────────────────┬────────────────────────────┘
                     │ POST (async, non-blocking)
                     ↓
┌─────────────────────────────────────────────────┐
│           n8n Automation Platform               │
│                                                 │
│    ┌─ Webhook Trigger (receives data)          │
│    ├─ Process/validate                          │
│    ├─ Route to:                                 │
│    │  ├─ Google Sheets                         │
│    │  ├─ Slack                                 │
│    │  ├─ Salesforce CRM                        │
│    │  ├─ Email lists                           │
│    │  └─ Your custom API                       │
│    └─ Log results                               │
└─────────────────────────────────────────────────┘
```

---

## 📚 Code Reference

### Using the Webhook Service

```typescript
import { webhookService } from "@/lib/webhooks";

// In any Application layer service:
await webhookService.trigger("event.registration.created", {
  registration: { id, status, createdAt },
  attendee: { firstName, lastName, email, phone, ageCategory, sex, visitorStatus, leadershipRole },
  event: { id, title, date, location, maxCapacity },
  qrCode: { token, scanUrl },
});
```

### Types Available

```typescript
import type {
  WebhookEventType, // 'event.registration.created' | etc.
  WebhookPayload, // Full payload structure
  WebhookTriggerResult, // { success, webhookUrl, statusCode, error }
} from "@/lib/webhooks";
```

---

## ✅ Checklist

- [ ] Set up n8n instance (self-hosted or n8n Cloud)
- [ ] Created webhook endpoint in n8n
- [ ] Added environment variables to `.env.local`
- [ ] Tested webhook by registering for an event
- [ ] Verified n8n received the webhook payload
- [ ] Created n8n workflow to process registrations
- [ ] Configured destination (Google Sheets, Slack, CRM, etc.)
- [ ] Tested end-to-end workflow
- [ ] Enabled HMAC signature verification (optional but recommended)

---

## 🆘 Troubleshooting

| Issue                        | Solution                                               |
| ---------------------------- | ------------------------------------------------------ |
| Webhook not triggered        | Check `N8N_EVENT_REGISTRATION_WEBHOOK` env var is set  |
| n8n not receiving data       | Check firewall/network allows outbound to n8n          |
| Signature verification fails | Ensure `N8N_WEBHOOK_SECRET` matches in both places     |
| Workflow not executing       | Check n8n logs, test webhook endpoint directly         |
| Data appears malformed       | Webhook payload is JSON - parse in n8n with JSON.parse |

---

**Need help?** Check n8n documentation at https://docs.n8n.io/
