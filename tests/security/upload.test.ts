import { describe, it, expect } from "vitest";
import { validateUpload, MAX_UPLOAD_BYTES } from "@/lib/upload/validate";

/**
 * Validação de upload (US4 / FR-011): tipo (MIME/extensão) e tamanho conferidos
 * ANTES de processar. SC-008.
 */

function fakeFile(name: string, type: string, size: number): File {
  // File mínimo para o validador (só usa name/type/size).
  return { name, type, size } as unknown as File;
}

describe("validateUpload", () => {
  it("aceita PDF dentro do tamanho", () => {
    expect(validateUpload(fakeFile("fatura.pdf", "application/pdf", 1024))).toBeNull();
  });

  it("aceita CSV mesmo com MIME genérico (pela extensão)", () => {
    expect(validateUpload(fakeFile("extrato.csv", "application/octet-stream", 2048))).toBeNull();
  });

  it("rejeita executável (.exe)", () => {
    expect(validateUpload(fakeFile("malware.exe", "application/x-msdownload", 1024))).toMatch(
      /não suportado/i
    );
  });

  it("rejeita tipo/extensão não suportados", () => {
    expect(validateUpload(fakeFile("foto.png", "image/png", 1024))).toMatch(/não suportado/i);
  });

  it("rejeita arquivo acima do tamanho máximo", () => {
    expect(validateUpload(fakeFile("grande.pdf", "application/pdf", MAX_UPLOAD_BYTES + 1))).toMatch(
      /muito grande/i
    );
  });

  it("rejeita arquivo vazio", () => {
    expect(validateUpload(fakeFile("vazio.pdf", "application/pdf", 0))).toMatch(/vazio|ausente/i);
  });
});
