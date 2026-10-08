/** Turns a thrown value into copy that is safe to show a user. */
export function errorMessage(e: unknown, fallback: string): string {
  const msg = e instanceof Error ? e.message : ''
  // AbortController surfaces as a raw DOMException — never show that to a user.
  if (/abort/i.test(msg)) return 'Request timed out — please try again.'
  if (/fetch|network/i.test(msg)) return "Couldn't reach the server. Check your connection and try again."
  return msg || fallback
}
