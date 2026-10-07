// services/payments/core/errors.js
// ======================================================
// Payment error types + factory helpers.
// ======================================================

class PaymentError extends Error {
  constructor(message, status = 400, code = 'PAYMENT_ERROR', meta = null) {
    super(message);
    this.name = 'PaymentError';
    this.status = status;
    this.code = code;
    this.meta = meta;
  }
}

class GatewayError extends PaymentError {
  constructor(message, gateway, status = 502, code = 'GATEWAY_ERROR', meta = null) {
    super(message, status, code, meta);
    this.name = 'GatewayError';
    this.gateway = gateway;
  }
}

class WebhookError extends PaymentError {
  constructor(message, provider, code = 'WEBHOOK_ERROR', meta = null) {
    super(message, 400, code, meta);
    this.name = 'WebhookError';
    this.provider = provider;
  }
}

class IdempotencyError extends PaymentError {
  constructor(message, reference, code = 'IDEMPOTENCY_VIOLATION') {
    super(message, 409, code);
    this.name = 'IdempotencyError';
    this.reference = reference;
  }
}

/**
 * Factory function — alternatively callable as `paymentError(...)`.
 */
function paymentError(message, status, code, meta) {
  return new PaymentError(message, status, code, meta);
}

module.exports = {
  PaymentError,
  GatewayError,
  WebhookError,
  IdempotencyError,
  paymentError,
};