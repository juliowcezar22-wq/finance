"use client";

/**
 * Captura global de erros de renderização (feature 011). Tela amigável sem
 * stack; o digest permite correlacionar com os logs do servidor.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0E13",
          color: "#E6E8EC",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>😵</p>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Algo deu errado</h1>
          <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 20 }}>
            Um erro inesperado aconteceu. Seus dados estão seguros — tente novamente.
            {error.digest && (
              <>
                <br />
                <span style={{ fontSize: 12, opacity: 0.5 }}>Código: {error.digest}</span>
              </>
            )}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid #2A2F3A",
              background: "#151A23",
              color: "#E6E8EC",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
