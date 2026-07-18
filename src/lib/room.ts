// Room-id validation. Rooms are the only access control: whoever knows the id
// can watch. Every id the app creates comes from crypto.randomUUID(), which
// always yields UUID v4 — so anything else ("0", "baby", a truncated id, the
// nil/max UUID) is either a hand-made guessable room or a broken link, and both
// are rejected. The version nibble must be 4 and the variant nibble 8/9/a/b,
// which is what rules out all-zeros and all-ones.
//
// The distinct-digit check additionally rejects ids that pass the format but
// were obviously typed by hand (11111111-1111-4111-8111-…). 32 random hex
// digits land under 5 distinct values with probability ≈ 10^-18, so no
// generated id is ever affected.
//
// Mirrored in server/signaling.js (isValidRoom) — keep the two in sync.

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isValidRoom(id: unknown): id is string {
  if (typeof id !== "string") return false;
  const s = id.toLowerCase();
  return V4.test(s) && new Set(s.replace(/-/g, "")).size >= 5;
}
