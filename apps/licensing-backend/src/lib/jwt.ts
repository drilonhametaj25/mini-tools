import { SignJWT, jwtVerify, importPKCS8, importSPKI, type KeyLike } from "jose";

const ALG = "RS256";

let signKey: KeyLike | null = null;
let verifyKey: KeyLike | null = null;

async function getSignKey(): Promise<KeyLike> {
  if (signKey) return signKey;
  const pem = process.env.LICENSING_JWT_PRIVATE_KEY;
  if (!pem) throw new Error("LICENSING_JWT_PRIVATE_KEY mancante");
  signKey = await importPKCS8(pem.replace(/\\n/g, "\n"), ALG);
  return signKey;
}

async function getVerifyKey(): Promise<KeyLike> {
  if (verifyKey) return verifyKey;
  const pem = process.env.LICENSING_JWT_PUBLIC_KEY;
  if (!pem) throw new Error("LICENSING_JWT_PUBLIC_KEY mancante");
  verifyKey = await importSPKI(pem.replace(/\\n/g, "\n"), ALG);
  return verifyKey;
}

export interface LicenseClaims {
  sub: string;          // license id
  code: string;
  product: string;
  tier: "standard" | "pro" | "lifetime";
  machine: string;
  lic_exp: number;      // unix seconds — riferimento UX
}

export async function signLicenseToken(claims: LicenseClaims): Promise<string> {
  const ttlDays = Number(process.env.LICENSING_JWT_TTL_DAYS ?? "14");
  const key = await getSignKey();
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: ALG, typ: "JWT" })
    .setIssuedAt()
    .setSubject(claims.sub)
    .setExpirationTime(`${ttlDays}d`)
    .setIssuer("drilonhametaj.it")
    .sign(key);
}

export async function verifyLicenseToken(token: string): Promise<LicenseClaims> {
  const key = await getVerifyKey();
  const { payload } = await jwtVerify(token, key, {
    issuer: "drilonhametaj.it",
    algorithms: [ALG],
  });
  return payload as unknown as LicenseClaims;
}
