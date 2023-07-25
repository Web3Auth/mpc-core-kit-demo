import crypto from "crypto";
import base32 from "hi-base32";

export const generateToken = (secretKey: string, window = 0): string => {
  const decodedSecretKey = base32.decode.asBytes(secretKey);
  // Default step size for a TOTP token is 30 seconds.
  const timestamp = Math.floor(Date.now() / 30000);

  // Calculate the counter value based on the current timestamp and time step
  // This will allow us to calculate the token for the past and future 30 seconds.
  let counter = timestamp + window;

  // Convert the timestamp to an 8-byte buffer (big-endian)
  const buffer = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    buffer[7 - i] = counter & 0xff;
    counter = counter >> 8;
  }

  // Create an HMAC-SHA1 hash using the secret key and timestamp buffer
  const hmac = crypto.createHmac("SHA1", Buffer.from(decodedSecretKey));
  hmac.update(buffer);
  const hmacResult = hmac.digest();

  // Get the offset from the last 4 bits of the hash value
  const offset = hmacResult[hmacResult.length - 1] & 0xf;

  // Get the 4-byte code from the selected offset (big-endian)
  const hmacValue =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  // 0 is padded to make sure the code is 6 digits always.
  return String(hmacValue % 1000000).padStart(6, "0");
};

// We are considering a window of 3 here which gives us a total window of 90s.
// This is to make sure that we dont miss any token in case of a clock skew or latency.
export const validateToken = (secretKey: string, token: string) => {
  // Check if the token is valid for the current time window
  // If not, check the previous and next time windows
  for (let errorWindow = -1; errorWindow <= +1; errorWindow++) {
    const totp = generateToken(secretKey, errorWindow);
    if (typeof totp === "string" && token === totp) {
      return true;
    }
  }

  return false;
};
