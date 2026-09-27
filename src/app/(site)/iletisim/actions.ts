"use server";

import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";
import type { ContactFieldErrors, ContactFormState } from "./types";

/**
 * Mesajların iletileceği hedef. Tanımlı değilse form canlı gönderime
 * AÇILMAZ ve kullanıcıya sahte bir başarı mesajı gösterilmez.
 *
 * Beklenen değer: gelen mesajı e-postaya/CRM'e ileten bir uç nokta
 * (kendi API'niz, Formspree, Make, Zapier, Slack webhook vb.).
 */
const LIMITS = {
  nameMin: 2,
  nameMax: 80,
  emailMax: 160,
  messageMin: 10,
  messageMax: 2000,
} as const;

/** Basit e-posta biçim kontrolü — doğrulama değil, yalnızca yazım hatası yakalar. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Sunucu örneği başına çalışan basit hız sınırı.
 * Birden fazla örnekte (serverless) paylaşılmaz; kalıcı koruma gerekirse
 * Upstash/Redis gibi bir sayaç ile değiştirilmelidir.
 */
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 3;
const rateLog = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (rateLog.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);

  if (recent.length >= RATE_MAX) {
    rateLog.set(key, recent);
    return true;
  }

  recent.push(now);
  rateLog.set(key, recent);

  // Belleğin sınırsız büyümesini engelle.
  if (rateLog.size > 5000) {
    for (const [k, v] of rateLog) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) rateLog.delete(k);
    }
  }

  return false;
}

async function clientKey(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerList.get("x-real-ip") || "bilinmeyen";
}

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function validate(name: string, email: string, message: string): ContactFieldErrors {
  const errors: ContactFieldErrors = {};

  if (name.length < LIMITS.nameMin) {
    errors.name = "Adınızı ve soyadınızı yazın.";
  } else if (name.length > LIMITS.nameMax) {
    errors.name = `Ad soyad en fazla ${LIMITS.nameMax} karakter olabilir.`;
  }

  if (email.length > 0) {
    if (email.length > LIMITS.emailMax) {
      errors.email = "E-posta adresi çok uzun.";
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.email = "Geçerli bir e-posta adresi yazın veya bu alanı boş bırakın.";
    }
  }

  if (message.length < LIMITS.messageMin) {
    errors.message = `Mesajınız en az ${LIMITS.messageMin} karakter olmalı.`;
  } else if (message.length > LIMITS.messageMax) {
    errors.message = `Mesajınız en fazla ${LIMITS.messageMax} karakter olabilir.`;
  }

  return errors;
}

export async function submitContactMessage(
  _previousState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  // Hedef tanımlı değilse hiçbir koşulda "gönderildi" denmez.
  if (!isSupabaseConfigured) {
    return {
      status: "unavailable",
      message:
        "Form henüz canlı gönderime açık değil. Mesaj altyapısı yapılandırıldığında bu bölüm etkinleşecektir.",
      errors: {},
    };
  }

  // Bal küpü: gerçek kullanıcılar bu alanı göremez, botlar doldurur.
  if (readField(formData, "sirket").length > 0) {
    return {
      status: "error",
      message: "Mesajınız gönderilemedi. Lütfen tekrar deneyin.",
      errors: {},
    };
  }

  if (isRateLimited(await clientKey())) {
    return {
      status: "error",
      message: "Çok fazla mesaj gönderdiniz. Lütfen bir süre sonra tekrar deneyin.",
      errors: {},
    };
  }

  const name = readField(formData, "ad");
  const email = readField(formData, "eposta");
  const message = readField(formData, "mesaj");

  const errors = validate(name, email, message);
  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Lütfen işaretlenen alanları düzeltin.",
      errors,
    };
  }

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip");
  const salt = process.env.REVALIDATE_SECRET ?? "";
  const ipHash = ip && salt ? createHash("sha256").update(`${salt}:${ip}`).digest("hex") : null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.from("contact_messages").insert({
    sender_name: name,
    sender_email: email || null,
    message,
    ip_hash: ipHash,
    user_agent: headerList.get("user-agent")?.slice(0, 500) ?? null,
  });

  if (error) {
    console.error("İletişim mesajı kaydedilemedi:", error.message);
    return {
      status: "error",
      message: "Mesajınız şu anda iletilemedi. Lütfen daha sonra tekrar deneyin.",
      errors: {},
    };
  }

  return {
    status: "success",
    message: "Mesajınız iletildi. İlginiz için teşekkürler.",
    errors: {},
  };
}
