import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Cifra autenticada de credenciais em repouso (AES-256-GCM). O segredo mestre
 * vem de `SECRETS_KEY` (env, 32 bytes em base64) — obrigatório, SEM fallback:
 * a ausência faz o módulo lançar no load (nunca degrada para texto plano).
 *
 * Formato serializado: `v1:` + base64(iv[12] || tag[16] || ciphertext).
 */

const PREFIX = "v1:";
const IV_LEN = 12;
const TAG_LEN = 16;

function loadKey(): Buffer {
  const raw = process.env.SECRETS_KEY;
  if (!raw) {
    throw new Error(
      "SECRETS_KEY ausente. Defina um segredo mestre de 32 bytes (base64) no ambiente."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `SECRETS_KEY inválida: esperado 32 bytes (base64), obtido ${key.length}.`
    );
  }
  return key;
}

// Carregamento PREGUIÇOSO: a chave só é lida na primeira cifra/decifra (runtime),
// não no import do módulo. Assim o `next build` NÃO precisa de SECRETS_KEY para
// compilar (o build não cifra nada); em runtime continua fail-closed — a
// primeira operação com segredo falha explícito se a chave faltar.
let _key: Buffer | null = null;
function key(): Buffer {
  return (_key ??= loadKey());
}

/** true se o valor já está no formato cifrado (`v1:`). */
export function isEncrypted(v: string | null | undefined): boolean {
  return typeof v === "string" && v.startsWith(PREFIX);
}

/** Cifra um texto plano. Retorna `v1:…`. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

/** Decifra um valor `v1:…`. Lança se o formato/tag for inválido. */
export function decryptSecret(value: string): string {
  if (!isEncrypted(value)) {
    throw new Error("decryptSecret: valor não está no formato cifrado.");
  }
  const buf = Buffer.from(value.slice(PREFIX.length), "base64");
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error("decryptSecret: payload cifrado malformado.");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/**
 * Decifra se estiver cifrado; caso contrário devolve como está (tolera segredo
 * legado em texto plano na janela entre o deploy e a migração de cifragem).
 */
export function decryptMaybe(value: string | null | undefined): string | null {
  if (value == null) return null;
  return isEncrypted(value) ? decryptSecret(value) : value;
}
