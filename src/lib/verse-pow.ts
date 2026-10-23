/** Browser half of the sign-up proof of work. The server checks the same hash. */

function leadingZeroBits(digest: Uint8Array) {
  let bits = 0;
  for (const byte of digest) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    for (let i = 7; i >= 0; i -= 1) {
      if (byte & (1 << i)) return bits;
      bits += 1;
    }
    return bits;
  }
  return bits;
}

export async function solveVersePowInBrowser(challenge: string, bits: number) {
  const encoder = new TextEncoder();
  const prefix = encoder.encode(`${challenge}\n`);
  for (let n = 0; n < 8_000_000; n += 1) {
    const nonce = String(n);
    const tail = encoder.encode(nonce);
    const data = new Uint8Array(prefix.length + tail.length);
    data.set(prefix);
    data.set(tail, prefix.length);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
    if (leadingZeroBits(digest) >= bits) return nonce;
  }
  return "";
}
