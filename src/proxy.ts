import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16'da `middleware` konvansiyonu `proxy` olarak yeniden adlandırıldı.
 *
 * Görevi iki tane:
 *   1. Supabase oturum çerezini tazelemek (aksi hâlde oturum sessizce düşer).
 *   2. /admin altını oturum açmamış ziyaretçilere kapatmak.
 *
 * Buradaki kontrol tek başına güvenlik katmanı DEĞİLDİR; asıl yetki
 * veritabanındaki RLS politikalarıyla ve admin layout'undaki sunucu
 * kontrolüyle sağlanır. Bu yalnızca ilk savunma hattıdır.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

  // Anahtarlar girilmeden önce site normal çalışmaya devam etsin.
  if (!supabaseUrl || !supabaseKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getSession() değil getUser(): çerezdeki jetonu Supabase'e doğrulatır.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/giris";

  if (!user && !isLoginPage) {
    const target = request.nextUrl.clone();
    target.pathname = "/admin/giris";
    target.search = "";
    target.searchParams.set("devam", pathname);
    return NextResponse.redirect(target);
  }

  if (user && isLoginPage) {
    const target = request.nextUrl.clone();
    target.pathname = "/admin";
    target.search = "";
    return NextResponse.redirect(target);
  }

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
