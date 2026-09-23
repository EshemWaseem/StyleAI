/**
 * Override undici's default 5-minute headers/body timeout.
 * Node 18+'s fetch() has hard-coded 300s limits that AbortController
 * cannot override. This fixes it globally.
 */

const { Agent, setGlobalDispatcher } = require('undici');

const FIVE_MIN = 5 * 60 * 1000;
const THIRTY_MIN = 30 * 60 * 1000;

setGlobalDispatcher(
  new Agent({
    headersTimeout: THIRTY_MIN,   // 30 min for headers
    bodyTimeout: THIRTY_MIN,      // 30 min for body
    connectTimeout: 60_000,       // 60s to connect
    keepAliveTimeout: 60_000,
  })
);

console.log('[fetch] undici dispatcher set: headersTimeout=30m bodyTimeout=30m');