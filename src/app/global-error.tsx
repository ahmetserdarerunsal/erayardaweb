"use client";

import { useEffect } from "react";

/**
 * Kök yerleşimin kendisi çökerse burası devreye girer; bu yüzden kendi
 * <html> ve <body> etiketlerini kurmak zorunda. globals.css bu noktada
 * yüklenmemiş olabileceğinden stiller satır içi yazılmıştır.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#102a43",
          color: "#f8f6f1",
          fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "34rem" }}>
          <p
            style={{
              margin: "0 0 1rem",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              opacity: 0.7,
            }}
          >
            Ekrem Eray Arda
          </p>
          <h1 style={{ margin: "0 0 1rem", fontSize: "clamp(2rem, 6vw, 3rem)", letterSpacing: "-0.04em" }}>
            Site şu anda açılamıyor
          </h1>
          <p style={{ margin: "0 0 2rem", lineHeight: 1.7, opacity: 0.8 }}>
            Beklenmeyen bir hata oluştu. Kısa bir süre sonra tekrar deneyin.
            {error.digest ? ` Hata kodu: ${error.digest}` : null}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.85rem 1.6rem",
              border: "1px solid #f8f6f1",
              borderRadius: "999px",
              background: "transparent",
              color: "#f8f6f1",
              font: "inherit",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
