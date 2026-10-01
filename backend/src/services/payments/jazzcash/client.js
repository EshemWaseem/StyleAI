// services/payments/jazzcash/client.js
// Reserved for direct HTTP calls to JazzCash (status inquiry, refunds later)
module.exports = {
  postForm: async () => {
    throw new Error('JazzCash direct HTTP client not implemented yet');
  },
};