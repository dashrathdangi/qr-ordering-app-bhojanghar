import jwt from "jsonwebtoken";

// Fetch the secret key from environment variables
const SECRET_KEY = process.env.SECRET_KEY || "8426"; // Fallback to a default key if not set in .env.local
if (!SECRET_KEY) throw new Error("❌ SECRET_KEY is missing in environment variables!");

// Log the secret key to ensure it's correctly loaded (remove in production)
console.log("Using SECRET_KEY:", SECRET_KEY);

/**
 * Generates a JWT token for the given payload.
 * @param {Object} payload - The data to embed in the token (e.g., adminId).
 * @returns {string} Signed JWT token.
 */
export function generateToken(payload) {
  try {
    // Signing the payload with the secret key and setting an expiration of 7 days
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "7d" }); // Valid for 7 days
    console.log("Generated Token:", token); // Log the generated token for debugging
    return token;
  } catch (err) {
    console.error("❌ Error generating token:", err.message);
    return null;
  }
}

/**
 * Verifies and decodes a JWT token.
 * @param {string} token - The token to verify.
 * @returns {Object|null} Decoded token if valid, or null if invalid/expired.
 */
export function verifyToken(token) {
  try {
    // Verifying the token using the secret key
    const decoded = jwt.verify(token, SECRET_KEY);
    console.log("Decoded Token:", decoded); // Log the decoded token for debugging
    return decoded;
  } catch (err) {
    console.error("❌ Invalid or expired token:", err.message);
    return null;
  }
}
