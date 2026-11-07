/** Only the explicitly configured, loopback-bound test server may simulate a delivered quote. */
export function isLocalQuoteTestMode(env: Record<string, string | undefined>): boolean {
  return env.FULLMUSCLE_QUOTE_TEST_MODE === 'true' && env.NODE_ENV === 'test' && env.HOST === '127.0.0.1';
}
