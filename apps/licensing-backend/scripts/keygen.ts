// Genera coppia RS256 (PEM) per firmare i JWT licenza.
// Uso: pnpm --filter @mini-tools/licensing-backend keygen
import { generateKeyPairSync } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const outDir = resolve(process.cwd(), ".keys");
import { mkdirSync } from "node:fs";
mkdirSync(outDir, { recursive: true });

writeFileSync(resolve(outDir, "jwt-private.pem"), privateKey);
writeFileSync(resolve(outDir, "jwt-public.pem"), publicKey);

console.log("Keypair generata in .keys/");
console.log("\nMetti queste env nel deploy:\n");
console.log(
  "LICENSING_JWT_PRIVATE_KEY=" +
    JSON.stringify(privateKey).replace(/\\n/g, "\\\\n"),
);
console.log("\nLa chiave pubblica va embedded nel binario Tauri:");
console.log("  crates/license-verify/public-key.pem");
