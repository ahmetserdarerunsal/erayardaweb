import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { CONTENT_TAGS } from "@/lib/public-content";

const allowedTags: Set<string> = new Set(Object.values(CONTENT_TAGS));

const allowedPaths = new Set([
  "/",
  "/ekrem-eray-arda",
  "/faaliyetler",
  "/fotograflar",
  "/videolar",
  "/iletisim",
]);

function validSecret(received: string | null) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function isAllowedPath(path: string) {
  // Faaliyet detay sayfaları dinamik; slug'ı serbest ama önek sabit.
  return allowedPaths.has(path) || /^\/faaliyetler\/[a-z0-9-]+$/.test(path);
}

export async function POST(request: NextRequest) {
  if (!validSecret(request.headers.get("x-revalidate-secret"))) {
    return Response.json({ ok: false, error: "Yetkisiz." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    tag?: string;
    path?: string;
  };

  if (!body.tag && !body.path) {
    return Response.json(
      { ok: false, error: "Geçerli tag veya path gerekli." },
      { status: 400 },
    );
  }

  // Tanınmayan değer sessizce başarılı sayılmaz: panel yanlış etiket
  // gönderirse hata görünür olmalı, yoksa "neden güncellenmedi" sorusu
  // teşhis edilemez hâle gelir.
  if (body.tag && !allowedTags.has(body.tag)) {
    return Response.json(
      {
        ok: false,
        error: `Bilinmeyen tag: ${body.tag}`,
        gecerliTagler: [...allowedTags],
      },
      { status: 400 },
    );
  }

  if (body.path && !isAllowedPath(body.path)) {
    return Response.json(
      { ok: false, error: `İzin verilmeyen path: ${body.path}` },
      { status: 400 },
    );
  }

  const yenilenen: string[] = [];

  if (body.tag) {
    revalidateTag(body.tag, { expire: 0 });
    yenilenen.push(`tag:${body.tag}`);
  }

  if (body.path) {
    revalidatePath(body.path);
    yenilenen.push(`path:${body.path}`);
  }

  return Response.json({ ok: true, yenilenen });
}
