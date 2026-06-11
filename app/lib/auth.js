import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key-change-in-env";

/**
 * Hash a password using PBKDF2 (Password-Based Key Derivation Function 2)
 * @param {string} password - Plaintext password
 * @returns {string} - Combined salt and hash
 */
export function hashPassword(password) {
  if (!password) return "";
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 * @param {string} password - Plaintext password to check
 * @param {string} storedHash - Stored salt:hash combination
 * @returns {boolean} - True if matches, false otherwise
 */
export function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const checkHash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return hash === checkHash;
}

/**
 * Generate a signed JWT-like token using HMAC-SHA256
 * @param {object} payload - Key-value pairs to store in the token
 * @returns {string} - Signed token (header.payload.signature)
 */
export function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  
  // Add issue time and expiration (7 days)
  const fullPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };
  
  const base64Payload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${base64Payload}`)
    .digest("base64url");
    
  return `${header}.${base64Payload}.${signature}`;
}

/**
 * Verify and decode an HMAC-SHA256 token
 * @param {string} token - Signed token string
 * @returns {object|null} - Decoded payload or null if invalid/expired
 */
export function verifyToken(token) {
  if (!token) return null;
  
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [header, base64Payload, signature] = parts;
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${base64Payload}`)
      .digest("base64url");
      
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Decode and verify expiration
    const payload = JSON.parse(Buffer.from(base64Payload, "base64url").toString("utf8"));
    
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null; // Expired
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}
