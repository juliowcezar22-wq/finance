import { describe, it, expect, vi } from "vitest";
import { encryptSecret, decryptSecret, isEncrypted, decryptMaybe } from "@/lib/crypto/secrets";

/**
 * Cifra de credenciais (US1): round-trip AES-256-GCM, deteção de formato,
 * tolerância a legado, e falha explícita sem o segredo mestre. FR-001..003.
 */

describe("encrypt/decrypt round-trip", () => {
  it("cifra e decifra de volta o mesmo valor", () => {
    const plain = "sk-minha-chave-secreta-123";
    const enc = encryptSecret(plain);
    expect(enc.startsWith("v1:")).toBe(true);
    expect(enc).not.toContain(plain); // não vaza o texto plano
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("cada cifra é diferente (IV aleatório) mas decifra igual", () => {
    const a = encryptSecret("mesmo");
    const b = encryptSecret("mesmo");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("mesmo");
    expect(decryptSecret(b)).toBe("mesmo");
  });

  it("isEncrypted distingue cifrado de texto plano", () => {
    expect(isEncrypted(encryptSecret("x"))).toBe(true);
    expect(isEncrypted("texto-plano")).toBe(false);
    expect(isEncrypted(null)).toBe(false);
  });

  it("decryptMaybe tolera legado (texto plano) e nulo", () => {
    expect(decryptMaybe(null)).toBeNull();
    expect(decryptMaybe("legado-plano")).toBe("legado-plano");
    expect(decryptMaybe(encryptSecret("cifrado"))).toBe("cifrado");
  });
});

describe("integridade", () => {
  it("valor adulterado → decifra lança (tag GCM)", () => {
    const enc = encryptSecret("original");
    // corrompe o último caractere base64
    const tampered = enc.slice(0, -2) + (enc.endsWith("A=") ? "B=" : "A=");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("decryptSecret rejeita valor não-cifrado", () => {
    expect(() => decryptSecret("texto-plano")).toThrow();
  });
});

describe("segredo mestre obrigatório (fail-closed em runtime, não no import)", () => {
  it("cifrar sem SECRETS_KEY lança (o import NÃO lança — chave é preguiçosa)", async () => {
    vi.resetModules();
    vi.stubEnv("SECRETS_KEY", "");
    const mod = await import("@/lib/crypto/secrets"); // import ok (build não precisa)
    expect(() => mod.encryptSecret("x")).toThrow(/SECRETS_KEY/); // uso falha
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("cifrar com chave de tamanho errado lança", async () => {
    vi.resetModules();
    vi.stubEnv("SECRETS_KEY", Buffer.from("curta").toString("base64"));
    const mod = await import("@/lib/crypto/secrets");
    expect(() => mod.encryptSecret("x")).toThrow(/32 bytes/);
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
