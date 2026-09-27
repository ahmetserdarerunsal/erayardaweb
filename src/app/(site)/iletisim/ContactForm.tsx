"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { contactCopy } from "@/lib/site-constants";
import { submitContactMessage } from "./actions";
import { initialContactFormState } from "./types";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="contact-form__submit" type="submit" disabled={disabled || pending}>
      {pending ? "Gönderiliyor" : contactCopy.submitLabel}
      <span aria-hidden="true">↗</span>
    </button>
  );
}

export function ContactForm({ enabled }: { enabled: boolean }) {
  const [state, formAction] = useActionState(submitContactMessage, initialContactFormState);

  const describedBy = (field: "name" | "email" | "message") =>
    state.errors[field] ? `${field}-error` : undefined;

  return (
    <form className="contact-form" action={formAction} noValidate>
      {!enabled ? (
        <p className="contact-form__notice" role="status">
          Bu form henüz canlı gönderime açık değil. Mesajların iletileceği adres
          tanımlandığında etkinleşecektir.
        </p>
      ) : null}

      {state.message ? (
        <p
          className="contact-form__feedback"
          data-status={state.status}
          role={state.status === "success" ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}

      {/* Bal küpü — ekran okuyucudan ve görünümden gizli, yalnızca botlar doldurur. */}
      <div className="contact-form__trap" aria-hidden="true">
        <label htmlFor="sirket">Şirket</label>
        <input id="sirket" name="sirket" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="contact-form__field">
        <label htmlFor="ad">Ad Soyad</label>
        <input
          id="ad"
          name="ad"
          type="text"
          autoComplete="name"
          maxLength={80}
          required
          disabled={!enabled}
          aria-invalid={state.errors.name ? true : undefined}
          aria-describedby={describedBy("name")}
        />
        {state.errors.name ? (
          <p className="contact-form__error" id="name-error">
            {state.errors.name}
          </p>
        ) : null}
      </div>

      <div className="contact-form__field">
        <label htmlFor="eposta">
          E-posta <span>(isteğe bağlı)</span>
        </label>
        <input
          id="eposta"
          name="eposta"
          type="email"
          autoComplete="email"
          maxLength={160}
          disabled={!enabled}
          aria-invalid={state.errors.email ? true : undefined}
          aria-describedby={describedBy("email")}
        />
        {state.errors.email ? (
          <p className="contact-form__error" id="email-error">
            {state.errors.email}
          </p>
        ) : null}
      </div>

      <div className="contact-form__field">
        <label htmlFor="mesaj">Mesajın</label>
        <textarea
          id="mesaj"
          name="mesaj"
          rows={6}
          maxLength={2000}
          required
          disabled={!enabled}
          aria-invalid={state.errors.message ? true : undefined}
          aria-describedby={describedBy("message")}
        />
        {state.errors.message ? (
          <p className="contact-form__error" id="message-error">
            {state.errors.message}
          </p>
        ) : null}
      </div>

      <SubmitButton disabled={!enabled} />

      <p className="contact-form__privacy">
        Gönderdiğiniz ad, e-posta ve mesaj yalnızca talebinizin değerlendirilmesi
        amacıyla işlenir; üçüncü kişilerle paylaşılmaz ve reklam amacıyla
        kullanılmaz. Kişisel verilerinizin silinmesini her zaman talep edebilirsiniz.
      </p>
    </form>
  );
}
