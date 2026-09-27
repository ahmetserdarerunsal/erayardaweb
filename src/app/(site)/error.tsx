"use client";

import { useEffect } from "react";
import { ErrorNotice } from "@/components/layout/ErrorNotice";

/**
 * Ziyaretçiye açık sayfalarda beklenmeyen bir hata olursa.
 *
 * Hatanın ayrıntısı ekrana YAZILMAZ: veritabanı mesajları tablo ve sütun
 * adlarını sızdırabilir. Ziyaretçiye yalnızca izlenebilirlik kimliği
 * gösterilir, ayrıntı sunucu günlüğünde kalır.
 */
export default function SiteError({
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
    <ErrorNotice
      code="Hata"
      title="Bir sorun oluştu"
      description={
        error.digest
          ? `Sayfa yüklenirken beklenmeyen bir hata oluştu. Sorun sürerse bu kodu iletebilirsiniz: ${error.digest}`
          : "Sayfa yüklenirken beklenmeyen bir hata oluştu. Tekrar denemek sorunu çözebilir."
      }
      action={
        <button className="arrow-link" type="button" onClick={reset}>
          Tekrar dene
          <span aria-hidden="true">↻</span>
        </button>
      }
    />
  );
}
