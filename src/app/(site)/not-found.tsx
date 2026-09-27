import type { Metadata } from "next";
import { ErrorNotice } from "@/components/layout/ErrorNotice";

export const metadata: Metadata = { title: "Sayfa bulunamadı" };

/**
 * Grup içinden çağrılan `notFound()` için — örneğin yayımdan kaldırılmış bir
 * faaliyet adresi. Başlık ve alt bilgi zaten `(site)/layout.tsx` içinde.
 */
export default function SiteNotFound() {
  return (
    <ErrorNotice
      code="404"
      title="Sayfa bulunamadı"
      description="Bu içerik yayımdan kaldırılmış ya da adresi değişmiş olabilir. Faaliyet arşivinden güncel içeriklere ulaşabilirsiniz."
    />
  );
}
