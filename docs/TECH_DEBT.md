# Technical Debt & Security Issues

**Last Updated:** June 18, 2026  
**Review Scope:** Production Readiness Analysis (Security, Performance, Database, Multi-tenant Architecture)

---

## Summary

Total Issues Identified: **23**
- **Critical:** 3 (1 fixed, 2 pending)
- **High:** 4 (1 verified safe, 2 in progress, 1 future-proofing)
- **Medium:** 8
- **Low:** 8

---

## CRITICAL ISSUES

### ✅ [FIXED] #1: Webhook Authentication - Unauthorized Payload Injection

**Status:** FIXED (Commit: feat(security): Add HMAC signature verification)

**Description:**  
Payment gateways (Asaas, Stripe, Mercado Pago) and WhatsApp Evolution API webhooks accepted unsigned payloads. An attacker could inject arbitrary webhook events (payment confirmation, message events, etc.) without authorization.

**Fixed By:**
- Created `/src/lib/webhooks/verify-signature.server.ts` - provider-agnostic HMAC verification utility
- Updated `/src/routes/api/public/billing-webhook.ts` - signature verification for Asaas, Stripe, Mercado Pago
- Updated `/src/routes/api/public/wa-webhook.ts` - signature verification for Evolution API
- Returns HTTP 401 "Invalid webhook signature" for unauthorized requests
- Uses timing-safe comparison (`crypto.timingSafeEqual`) to prevent timing attacks
- Safely logs failures without exposing secrets

**Environment Variables Required:**
```
WEBHOOK_SECRET_ASAAS=<from Asaas dashboard>
WEBHOOK_SECRET_STRIPE=whsec_<from Stripe dashboard>
WEBHOOK_SECRET_MERCADO_PAGO=<from Mercado Pago dashboard>
WEBHOOK_SECRET_EVOLUTION_API=<from Evolution API dashboard>
```

**Testing:**
```bash
# Valid HMAC-signed requests should return 200
# Invalid signatures should return 401
# Missing headers should return 401
```

**Supported Gateways:**
- Asaas (header: `x-asaas-signature`, algorithm: sha256)
- Stripe (header: `x-stripe-signature`, algorithm: sha256)
- Mercado Pago (header: `x-signature`, algorithm: sha256)
- Evolution API / WhatsApp (header: `x-signature`, algorithm: sha256)

**Notes:**
- Implementation is modular and reusable for adding more webhook providers
- Backward compatible - graceful degradation if secret not configured (logs warning)

---

### ❌ [PENDING] #2: RLS Policy - Overly Permissive Companies INSERT

**Status:** PENDING FIX  
**Priority:** CRITICAL  
**Complexity:** LOW (Policy change + RPC enhancement)

**Description:**  
RLS policy on `public.companies` table allows any authenticated user to INSERT unlimited companies:

```sql
CREATE POLICY "companies_insert_authenticated" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (true);  -- ⚠️ VULNERABILITY: No validation
```

**Attack Vector:**
```typescript
// Attacker can bypass onboarding and create thousands of companies:
const { data } = await supabase
  .from('companies')
  .insert([
    { name: 'Spam Company 1' },
    { name: 'Spam Company 2' },
    // ... repeat thousands of times
  ]);
```

**Impact:**
- Database storage exhaustion
- Denial of Service (disk space, query performance)
- Unaccountable company creation with no audit trail
- No rate limiting or quota enforcement

**Existing Protections:**
- ✅ Normal onboarding uses RPC function `create_company_with_owner()` (SECURITY DEFINER)
- ✅ UI doesn't support creating multiple companies
- ✅ RPC function atomically creates company + user membership

**Recommended Fix:**
1. Restrict INSERT to service role only (not authenticated users)
2. Authenticated users must use RPC function for company creation
3. Add rate-limit to RPC function - prevent one admin from creating unlimited trial companies

```sql
-- Replace overly permissive policy:
CREATE POLICY "companies_insert_service_role" ON public.companies FOR INSERT TO service_role
  WITH CHECK (true);

-- Enhanced RPC function with rate-limiting:
CREATE OR REPLACE FUNCTION public.create_company_with_owner(...)
  RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_admin_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Prevent user from creating multiple trial companies
  SELECT COUNT(*) INTO v_admin_count
  FROM public.company_members
  WHERE user_id = v_user_id AND role = 'admin';
  
  IF v_admin_count > 0 THEN
    RAISE EXCEPTION 'User already owns a company. Contact support for additional companies.';
  END IF;
  
  -- ... rest of existing function
END;
$$;
```

**Onboarding Compatibility:**
- ✅ No breaking changes - onboarding already uses RPC function
- ✅ Future multi-company feature requires explicit endpoint, not permissive RLS

**Files to Modify:**
- `/supabase/migrations/` - Add new migration with policy changes and enhanced RPC

---

### ❌ [PENDING] #3: Multi-tenant Data Isolation Risk

**Status:** PENDING FIX  
**Priority:** CRITICAL  
**Complexity:** HIGH (Middleware + Validation across routes)

**Description:**  
Data isolation relies on `profile.current_company_id` being correct. No middleware validates that the authenticated user is actually a member of the selected company. An attacker could:

1. Modify local state or cookies to change `current_company_id`
2. Directly query Supabase for another company's data if they guess/know the UUID
3. Access protected routes without proper company membership validation

**Current Architecture:**
- `profiles.current_company_id` - User's "active" company
- `company_members` table - Source of truth for access control
- RLS policies on CRM tables use `is_company_member()` function for validation
- BUT: No validation that the selected company in the request is the same as the user's membership

**Example Vulnerability:**
```typescript
// User A's session:
const companyId = profile?.current_company_id; // User sets this locally
const { data } = await supabase
  .from('crm_leads')
  .select('*')
  .eq('company_id', companyId);  // ⚠️ No validation - could be another company!
```

**Recommended Fix:**
1. Create middleware function `validateCompanyAccess(userId, companyId)` - checks `company_members` table
2. Call middleware on every company-specific request (routes, API endpoints)
3. Add context provider `CompanyContext` - validates and caches company membership
4. Validate on both client (early exit) and server (security guarantee)

```typescript
// Middleware example:
async function validateCompanyAccess(userId: string, companyId: string) {
  const { data, error } = await supabase.rpc('is_company_member', {
    _user_id: userId,
    _company_id: companyId
  });
  if (!data) throw new Error('Unauthorized: Not a member of this company');
  return data;
}

// Usage in routes:
export const Route = createFileRoute('/_authenticated/app/crm/$companyId/leads')({
  beforeLoad: async ({ params, context }) => {
    await validateCompanyAccess(context.user.id, params.companyId);
  }
});
```

**Files to Create/Modify:**
- Create: `/src/lib/crm/validate-company-access.ts`
- Create: `/src/hooks/use-company-validation.ts`
- Modify: All `/src/routes/_authenticated/app/**` routes
- Modify: `/src/routes/api/public/**` endpoints

**Backward Compatibility:**
- ⚠️ May require refactoring routes to pass `companyId` as route parameter (not from context alone)
- RLS policies already validate on database level, so this adds client-level defense

---

## HIGH PRIORITY ISSUES

### ✅ [VERIFIED SAFE] #1: Service Role Key Exposure

**Status:** NO FIX NEEDED (Verified)  
**Priority:** HIGH (Initial concern, now cleared)

**Description:**  
Initial concern: Service role keys might be exposed in frontend code or environment variables accessible to clients.

**Verification:**
- ✅ TanStack Start's `server: { handlers: {...} }` block **guarantees server-side execution**
- ✅ Supabase client initialized with `anon` role in frontend, service role kept server-side only
- ✅ All database operations using service role are in `.server.ts` files (inaccessible to client)
- ✅ No environment variable exposure in bundled code

**Conclusion:** Architecture is sound. No changes required.

---

### ⚠️ [FUTURE-PROOFING] #2: Chart Component XSS Vulnerability

**Status:** NOT EXPLOITABLE (Low Priority)  
**Priority:** HIGH (Future-proofing, currently non-exploitable)

**Description:**  
`ChartContainer` component uses `dangerouslySetInnerHTML` with dynamic color values:

```typescript
// Line 73-88 in /src/components/ui/chart.tsx
const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, config]) => config.theme || config.color);
  return (
    <style dangerouslySetInnerHTML={{
      __html: Object.entries(THEMES)
        .map(([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme] || itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;  // ⚠️ Dynamic color injection
  })
}
`).join("\n"),
    }}
  />
);
};
```

**Current Status:**
- ❌ Theoretical XSS: If colors contain `</style><script>` payloads, they could break out
- ✅ **NOT EXPLOITABLE IN PRACTICE** - ChartContainer is **never imported or used** in the codebase
- ✅ All actual chart components use hardcoded Recharts with hardcoded CHART_COLORS array
- ✅ User-configurable colors (tags, queues) are only used in inline `style` attributes (safe)

**Data Flow Analysis:**
- User edits tag color via color picker input (HTML5 `<input type="color">`)
- Color value stored as hex string (e.g., `#6366f1`)
- Color used in inline `style={{backgroundColor: t.color}}` - **NOT in dangerouslySetInnerHTML**
- ChartContainer is only an exported library component, never instantiated

**Recommendation:**
- **SKIP for now** - Not currently exploitable
- **DOCUMENT for future** - If someone uses ChartContainer with user config in the future, refactor to:
  - Use CSS-in-JS library (styled-components, emotion)
  - Or validate colors: `/^#[0-9a-fA-F]{6}$|^hsl\(/` regex
  - Or use CSS custom properties set via `style` attribute instead of `dangerouslySetInnerHTML`

**Priority:** LOW - Future-proofing, not current vulnerability

---

### ❌ [IN PROGRESS] #3: Input Validation on Webhooks

**Status:** PARTIALLY ADDRESSED  
**Priority:** HIGH  
**Complexity:** MEDIUM

**Description:**  
Webhook payloads are stored as JSONB without schema validation or size limits. An attacker could:
- Send malformed JSON (stored as garbage)
- Inject massive payloads (>10MB) causing storage bloat
- Store arbitrary nested structures with unknown fields

**Current Implementation:**
- ✅ HMAC signature verification implemented
- ❌ No schema validation (Zod, JSON Schema)
- ❌ No size limits on payloads
- ❌ No sanitization of nested structures

**Recommended Fix:**
```typescript
// Create /src/lib/webhooks/schemas.server.ts
import { z } from 'zod';

export const AsaasWebhookSchema = z.object({
  event: z.enum(['PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'PAYMENT_OVERDUE']),
  payment: z.object({
    id: z.string(),
    status: z.string(),
    value: z.number().positive(),
    dueDate: z.string().datetime(),
  }).strict(),
}).strict();

export const StripeWebhookSchema = z.object({
  type: z.enum(['charge.succeeded', 'charge.failed']),
  data: z.object({
    object: z.object({
      id: z.string(),
      amount: z.number().positive(),
      status: z.string(),
    }).strict(),
  }).strict(),
}).strict();

// Usage in webhook handlers:
const payload = await request.json();
const validated = AsaasWebhookSchema.parse(payload);
// Throws ZodError if invalid structure
```

**Size Limits:**
```typescript
// Add to webhook endpoints
const MAX_PAYLOAD_SIZE = 1024 * 100; // 100KB
const contentLength = request.headers.get('content-length');
if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
  return new Response('Payload too large', { status: 413 });
}
```

**Files to Modify:**
- Create: `/src/lib/webhooks/schemas.server.ts`
- Modify: `/src/routes/api/public/billing-webhook.ts`
- Modify: `/src/routes/api/public/wa-webhook.ts`

---

### ❌ [PENDING] #4: Missing Rate Limiting on Public Endpoints

**Status:** PENDING FIX  
**Priority:** HIGH  
**Complexity:** MEDIUM

**Description:**  
Public API endpoints (webhooks, auth callbacks) have no rate limiting. An attacker could:
- Spam webhook endpoints causing repeated payload processing
- Attempt brute force attacks on password reset tokens
- DOS public endpoints with high request volume

**Current Implementation:**
- ❌ No rate limiting middleware
- ❌ No request throttling
- ❌ No IP-based or API key-based limits

**Recommended Fix:**
- Implement rate limiting middleware using Redis or in-memory store
- Different limits for different endpoints:
  - Webhooks: 1000 requests/minute (provider validated via HMAC)
  - Auth: 5 attempts/minute (password reset, login)
  - Public API: 100 requests/minute (anonymous)

**Files to Create:**
- Create: `/src/lib/rate-limiter.server.ts`
- Create: `/src/middleware/rate-limit.server.ts`

---

## MEDIUM PRIORITY ISSUES

### ❌ #1: Database Transaction Atomicity

**Status:** PENDING FIX  
**Priority:** MEDIUM  
**Complexity:** MEDIUM

**Description:**  
Multi-step operations (create company + add user + update profile) rely on PostgreSQL transaction safety. If one step fails, others may have succeeded, leaving data in inconsistent state.

**Current Implementation:**
- ✅ `create_company_with_owner()` RPC function uses `BEGIN...END` implicitly (atomic within function)
- ❌ Multi-query operations on client don't wrap in transactions
- ❌ No retry logic for transient failures

**Recommended Fix:**
- Wrap multi-step client operations in `supabase.rpc('begin_transaction')` + `commit_transaction()` calls
- Add explicit error handling and rollback logic
- Document transaction boundaries for CRM bulk operations

---

### ❌ #2: Audit Trail for Sensitive Operations

**Status:** PENDING DESIGN  
**Priority:** MEDIUM  
**Complexity:** HIGH

**Description:**  
No audit log for sensitive operations (company creation, member role changes, webhook processing). Compliance and debugging are difficult.

**Recommended Implementation:**
- Create `audit_logs` table
- Log all mutations to: companies, company_members, webhook_payloads
- Include: timestamp, user_id, operation, old_values, new_values
- Add trigger functions to populate audit logs on mutations

---

### ❌ #3: Error Handling and Logging

**Status:** PENDING IMPROVEMENT  
**Priority:** MEDIUM  
**Complexity:** MEDIUM

**Description:**  
Inconsistent error handling across routes. Some endpoints return structured errors, others return plain text. No structured logging.

**Current State:**
- ✅ Lovable error reporting configured
- ❌ No consistent error schema across endpoints
- ❌ No request/response logging
- ❌ No correlation IDs for tracing

**Recommended Fix:**
- Create `/src/lib/error-handler.server.ts` with standardized error responses
- Add structured logging with correlation IDs
- Implement request/response logging middleware

---

### ❌ #4: CORS Configuration

**Status:** PENDING VERIFICATION  
**Priority:** MEDIUM  
**Complexity:** LOW

**Description:**  
CORS headers not explicitly configured. Webhooks from external services must have proper CORS setup.

**Recommended Fix:**
- Review `vite.config.ts` for CORS settings
- Ensure webhook endpoints allow POST from external gateways
- Restrict to known gateway IP ranges if possible

---

### ❌ #5: Database Connection Pooling

**Status:** PENDING CONFIGURATION  
**Priority:** MEDIUM  
**Complexity:** MEDIUM

**Description:**  
No explicit connection pooling configuration. Supabase uses pgBouncer internally, but app-level pooling not tuned.

**Recommended Fix:**
- Review connection pool settings in Supabase dashboard
- Set appropriate pool size for TanStack Start (default: too small)
- Add connection retry logic for transient failures

---

### ❌ #6: Secrets Management

**Status:** PENDING HARDENING  
**Priority:** MEDIUM  
**Complexity:** MEDIUM

**Description:**  
Webhook secrets stored in environment variables. No rotation mechanism or backup.

**Recommended Fix:**
- Implement secret rotation policy (quarterly)
- Add secret versioning to support rolling updates
- Document secret backup/recovery procedure
- Use AWS Secrets Manager or similar for production

---

### ❌ #7: Database Query Performance

**Status:** PENDING ANALYSIS  
**Priority:** MEDIUM  
**Complexity:** HIGH

**Description:**  
No query performance monitoring. Potential N+1 queries and missing indexes.

**Recommended Fix:**
- Enable Supabase query profiler
- Analyze slow queries
- Add missing indexes on foreign keys and commonly filtered fields
- Implement query result caching where appropriate

---

### ❌ #8: Email Verification for New Signups

**Status:** PENDING IMPLEMENTATION  
**Priority:** MEDIUM  
**Complexity:** MEDIUM

**Description:**  
No email verification during signup. Accounts can be created with unverified emails.

**Recommended Fix:**
- Configure Supabase email templates
- Require email verification before trial start
- Add email verification check in onboarding flow

---

## LOW PRIORITY ISSUES

### ❌ #1: Code Documentation

**Status:** PENDING  
**Priority:** LOW  
**Complexity:** LOW

**Description:**  
Limited inline code documentation. Complex business logic (CRM automations, webhook processing) could use JSDoc comments.

---

### ❌ #2: Type Safety for API Responses

**Status:** PENDING  
**Priority:** LOW  
**Complexity:** MEDIUM

**Description:**  
API responses not fully typed. Some endpoints return `any` types.

**Recommended Fix:**
- Generate TypeScript types from Supabase schema
- Create response DTOs for all endpoints
- Validate responses with Zod

---

### ❌ #3: Component Story Documentation (Storybook)

**Status:** PENDING  
**Priority:** LOW  
**Complexity:** MEDIUM

**Description:**  
No Storybook setup. Reusable UI components not documented with examples.

---

### ❌ #4: Accessibility (A11y) Audit

**Status:** PENDING  
**Priority:** LOW  
**Complexity:** MEDIUM

**Description:**  
No accessibility audit. WCAG 2.1 AA compliance not verified.

---

### ❌ #5: Performance Monitoring

**Status:** PENDING  
**Priority:** LOW  
**Complexity:** MEDIUM

**Description:**  
No real user monitoring (RUM). Page load times, Core Web Vitals not tracked.

---

### ❌ #6: Feature Flags

**Status:** PENDING  
**Priority:** LOW  
**Complexity:** MEDIUM

**Description:**  
No feature flag system. Rolling out new features requires full deployment.

---

### ❌ #7: Database Backup Strategy

**Status:** PENDING VERIFICATION  
**Priority:** LOW  
**Complexity:** LOW

**Description:**  
Supabase handles backups automatically, but retention policy and recovery procedures not documented.

---

### ❌ #8: Load Testing

**Status:** PENDING  
**Priority:** LOW  
**Complexity:** MEDIUM

**Description:**  
No load testing performed. Scalability limits unknown.

---

## Summary by Priority

| Priority | Count | Fixed | Pending |
|----------|-------|-------|---------|
| 🔴 **CRITICAL** | 3 | 1 | **2** |
| 🟠 **HIGH** | 4 | 1 | **3** |
| 🟡 **MEDIUM** | 8 | 0 | **8** |
| 🟢 **LOW** | 8 | 0 | **8** |
| **TOTAL** | **23** | **2** | **21** |

---

## Recommended Next Steps

### Phase 1 (Immediate - Week 1)
1. ✅ Fix webhook authentication (DONE)
2. Fix RLS policy on companies INSERT
3. Add input validation and size limits to webhooks
4. Add rate limiting to public endpoints

### Phase 2 (Soon - Week 2-3)
1. Implement multi-tenant validation middleware
2. Add email verification for signups
3. Implement audit logging

### Phase 3 (Later - Month 2)
1. Performance monitoring and optimization
2. A11y audit and fixes
3. Feature flags implementation

---

## Notes

- **TanStack Start Security:** Verified that server-side code in `server: { handlers: {...} }` blocks is guaranteed to execute only on the server. No service role key exposure risk.
- **Chart XSS:** Theoretical vulnerability exists but is not currently exploitable (component unused). Documented for future reference.
- **Onboarding Flow:** Current architecture supports multi-company, but UI is single-company focused. Future multi-company feature requires explicit endpoint design, not permissive RLS.
- **Webhook Architecture:** Provider-agnostic pattern is scalable. New gateways can be added by extending the `WebhookVerifierConfig` interface.

