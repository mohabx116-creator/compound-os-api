import crypto from 'crypto';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { env } from '../../config/env.js';

interface PaymobPaymentIntentInput {
  paymentId: string;
  amount: number;
  currency: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail?: string;
  description: string;
}

interface PaymobPaymentIntentResult {
  providerOrderId: string;
  paymentUrl: string;
  rawProviderPayload: Record<string, any>;
}

export interface NormalizedPaymobWebhook {
  providerOrderId?: string;
  providerTransactionId?: string;
  success: boolean;
  failed: boolean;
  amountCents?: number;
  currency?: string;
  raw: Record<string, any>;
}

const PAYMOB_BASE_URL = 'https://accept.paymob.com';

export class PaymobService {
  static ensureConfigured(): void {
    if (!env.PAYMOB_API_KEY || !env.PAYMOB_INTEGRATION_ID_CARD || !env.PAYMOB_IFRAME_ID) {
      throw new AppError(
        'Payment provider is not configured',
        503,
        ErrorCodes.PAYMENT_PROVIDER_NOT_CONFIGURED,
      );
    }
  }

  static async createPaymentIntent(
    input: PaymobPaymentIntentInput,
  ): Promise<PaymobPaymentIntentResult> {
    this.ensureConfigured();

    const auth = await this.post<{ token: string }>('/api/auth/tokens', {
      api_key: env.PAYMOB_API_KEY,
    });

    const amountCents = Math.round(input.amount * 100);
    const order = await this.post<{ id: number | string }>('/api/ecommerce/orders', {
      auth_token: auth.token,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: input.currency,
      merchant_order_id: input.paymentId,
      items: [],
    });

    const billingData = this.buildBillingData(input);
    const paymentKey = await this.post<{ token: string }>('/api/acceptance/payment_keys', {
      auth_token: auth.token,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: order.id,
      billing_data: billingData,
      currency: input.currency,
      integration_id: Number(env.PAYMOB_INTEGRATION_ID_CARD),
      lock_order_when_paid: true,
    });

    return {
      providerOrderId: String(order.id),
      paymentUrl: `${PAYMOB_BASE_URL}/api/acceptance/iframes/${env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey.token}`,
      rawProviderPayload: {
        order,
        paymentKey: { token: paymentKey.token },
      },
    };
  }

  static verifyWebhookSignature(input: {
    payload: Record<string, any>;
    query?: Record<string, any>;
    rawBody?: string;
  }): boolean {
    const secret = env.PAYMOB_HMAC_SECRET || env.PAYMOB_WEBHOOK_SECRET;

    if (!secret) {
      return true;
    }

    const providedSignature =
      this.readString(input.query?.hmac) ||
      this.readString(input.payload.hmac) ||
      this.readString(input.payload.obj?.hmac);

    if (!providedSignature) {
      return false;
    }

    const candidates = [
      this.createLegacyTransactionHmac(input.payload, secret),
      input.rawBody ? this.createRawBodyHmac(input.rawBody, secret) : undefined,
    ].filter((value): value is string => Boolean(value));

    return candidates.some((candidate) => this.timingSafeEqual(candidate, providedSignature));
  }

  static normalizeWebhookPayload(payload: Record<string, any>): NormalizedPaymobWebhook {
    const obj = payload.obj && typeof payload.obj === 'object' ? payload.obj : payload;
    const order = obj.order && typeof obj.order === 'object' ? obj.order : undefined;

    const success = obj.success === true || obj.success === 'true';
    const pending = obj.pending === true || obj.pending === 'true';
    const errorOccured = obj.error_occured === true || obj.error_occured === 'true';
    const failed =
      errorOccured ||
      obj.success === false ||
      obj.success === 'false' ||
      obj.is_voided === true ||
      obj.is_refunded === true ||
      (!success && !pending);

    return {
      providerOrderId: this.readString(order?.id) || this.readString(obj.order) || undefined,
      providerTransactionId: this.readString(obj.id) || this.readString(obj.transaction_id) || undefined,
      success,
      failed,
      amountCents: this.readNumber(obj.amount_cents),
      currency: this.readString(obj.currency) || undefined,
      raw: payload,
    };
  }

  private static async post<T>(path: string, body: Record<string, any>): Promise<T> {
    const response = await fetch(`${PAYMOB_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = (await response.json().catch(() => null)) as T | null;

    if (!response.ok || !json) {
      throw new AppError(
        'Payment provider request failed',
        503,
        ErrorCodes.SERVICE_UNAVAILABLE,
      );
    }

    return json;
  }

  private static buildBillingData(input: PaymobPaymentIntentInput) {
    const [firstName, ...lastNameParts] = input.tenantName.trim().split(/\s+/);

    return {
      apartment: 'NA',
      email: input.tenantEmail || 'na@compound-os.local',
      floor: 'NA',
      first_name: firstName || input.tenantName,
      street: input.description.slice(0, 120) || 'NA',
      building: 'NA',
      phone_number: input.tenantPhone,
      shipping_method: 'NA',
      postal_code: 'NA',
      city: 'Cairo',
      country: 'EG',
      last_name: lastNameParts.join(' ') || 'Customer',
      state: 'NA',
    };
  }

  private static createLegacyTransactionHmac(
    payload: Record<string, any>,
    secret: string,
  ): string | undefined {
    const obj = payload.obj && typeof payload.obj === 'object' ? payload.obj : payload;
    const order = obj.order && typeof obj.order === 'object' ? obj.order : {};
    const fields = [
      obj.amount_cents,
      obj.created_at,
      obj.currency,
      obj.error_occured,
      obj.has_parent_transaction,
      obj.id,
      obj.integration_id,
      obj.is_3d_secure,
      obj.is_auth,
      obj.is_capture,
      obj.is_refunded,
      obj.is_standalone_payment,
      obj.is_voided,
      order.id ?? obj.order,
      obj.owner,
      obj.pending,
      obj.source_data?.pan,
      obj.source_data?.sub_type,
      obj.source_data?.type,
      obj.success,
    ];

    if (fields.every((value) => value === undefined || value === null)) {
      return undefined;
    }

    return crypto
      .createHmac('sha512', secret)
      .update(fields.map((field) => String(field ?? '')).join(''))
      .digest('hex');
  }

  private static createRawBodyHmac(rawBody: string, secret: string): string {
    return crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  }

  private static timingSafeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
  }

  private static readString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return undefined;
  }

  private static readNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }
}
