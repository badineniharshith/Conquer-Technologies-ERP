import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "erp-v3-orange-secret-key-2026-very-secure"
);

export async function signJwt(payload: any): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyJwt(token: string): Promise<any | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (err) {
    return null;
  }
}

// ── SSO Token Functions ────────────────────────────────────────
// Short-lived, single-use signed tokens for cross-app SSO handoff.
// Never includes passwords or sensitive credentials in payload.

export interface SsoPayload {
  sub: string;       // User ID
  email: string;
  name: string;
  role: string;
  branch: string;
  target: "crm" | "portal" | "erp";
  jti: string;       // Unique nonce for single-use enforcement
}

// In-memory set of consumed JTI nonces (prevents replay attacks).
// In production, replace with Redis or DB-backed store.
const usedSsoTokens = new Set<string>();

// Periodically clean up expired JTI entries (every 5 min, remove all since they're short-lived)
setInterval(() => {
  usedSsoTokens.clear();
}, 5 * 60 * 1000);

function generateJti(): string {
  return `sso-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Sign a short-lived SSO token for cross-application handoff.
 * Default expiry: 60 seconds. Never includes passwords.
 */
export async function signSsoToken(
  payload: Omit<SsoPayload, "jti">,
  expiresIn: string = "60s"
): Promise<{ token: string; jti: string }> {
  const jti = generateJti();
  const token = await new SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(jti)
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
  return { token, jti };
}

/**
 * Verify an SSO token and enforce single-use via JTI nonce.
 * Returns the payload if valid and unused, null otherwise.
 */
export async function verifySsoToken(token: string): Promise<SsoPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const jti = payload.jti as string;
    if (!jti) return null;

    // Single-use enforcement: reject if JTI was already consumed
    if (usedSsoTokens.has(jti)) {
      console.warn("SSO token replay detected:", jti);
      return null;
    }

    // Mark as consumed
    usedSsoTokens.add(jti);

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
      branch: payload.branch as string,
      target: payload.target as "crm" | "portal" | "erp",
      jti,
    };
  } catch (err) {
    return null;
  }
}
