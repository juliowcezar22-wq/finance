/**
 * Validação de upload de importação (MIME/extensão + tamanho), separada das
 * server actions porque um módulo "use server" só pode exportar funções async.
 */

/** Limite alinhado ao `serverActions.bodySizeLimit` do next.config. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_UPLOAD_EXT = /\.(pdf|csv|xlsx|xls|ofx|txt)$/i;
const ALLOWED_UPLOAD_MIME = new Set([
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/octet-stream", // alguns navegadores usam genérico p/ csv/ofx
  "",
]);

/**
 * Valida tipo (MIME + extensão) e tamanho de um upload ANTES de processar
 * (FR-011). Retorna a mensagem de erro, ou null se válido.
 */
export function validateUpload(file: File): string | null {
  if (!file || file.size <= 0) return "Arquivo vazio ou ausente.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Arquivo muito grande (máximo ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB).`;
  }
  const okMime = ALLOWED_UPLOAD_MIME.has(file.type);
  const okExt = ALLOWED_UPLOAD_EXT.test(file.name);
  if (!okMime && !okExt) {
    return "Tipo de arquivo não suportado. Envie PDF, CSV, planilha ou OFX.";
  }
  return null;
}
