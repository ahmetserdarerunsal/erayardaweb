"use client";

import { useMemo, useState, useTransition } from "react";
import type { ActionResult } from "../fotograflar/actions";
import { updateMessage } from "./actions";

type Message = { id: string; sender_name: string; sender_email: string | null; message: string; status: string; admin_note: string | null; created_at: string; read_at: string | null };
const labels: Record<string, string> = { new: "Yeni", read: "Okundu", in_progress: "İşlemde", done: "Tamamlandı", archived: "Arşiv" };

export function MessageManager({ messages, loadError }: { messages: Message[]; loadError: string | null }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const filtered = useMemo(() => {
    const needle = query.toLocaleLowerCase("tr-TR").trim();
    return messages.filter((item) => (status === "all" || item.status === status) && (!needle || `${item.sender_name} ${item.sender_email ?? ""} ${item.message}`.toLocaleLowerCase("tr-TR").includes(needle)));
  }, [messages, query, status]);

  return (
    <>
      <section className="admin-card admin-toolbar"><div className="admin-field"><label htmlFor="message-search">Mesajlarda ara</label><input id="message-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ad, e-posta veya mesaj" /></div><div className="admin-field"><label htmlFor="message-status">Durum</label><select id="message-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tümü</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></section>
      {loadError ? <p className="admin-feedback" data-ok="false">{loadError}</p> : null}
      {feedback ? <p className="admin-feedback" data-ok={feedback.ok}>{feedback.message}</p> : null}
      <section className="admin-section"><div className="admin-section__head"><h2>Gelen kutusu</h2><span>{filtered.length} mesaj</span></div>{filtered.length === 0 ? <p className="admin-empty">Bu ölçütlere uyan mesaj yok.</p> : <div className="admin-message-list">{filtered.map((item) => <article className="admin-card admin-message" key={item.id} data-new={item.status === "new"}><header><div><h3>{item.sender_name}</h3>{item.sender_email ? <a href={`mailto:${item.sender_email}`}>{item.sender_email}</a> : <span>Yanıt adresi yok</span>}</div><div><span className="admin-status">{labels[item.status]}</span><time dateTime={item.created_at}>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</time></div></header><p className="admin-message__body">{item.message}</p><form action={(formData) => startTransition(async () => setFeedback(await updateMessage(item.id, String(formData.get("status")), String(formData.get("note") ?? ""))))}><div className="admin-field"><label htmlFor={`status-${item.id}`}>Durum</label><select id={`status-${item.id}`} name="status" defaultValue={item.status}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="admin-field"><label htmlFor={`note-${item.id}`}>Yönetici notu</label><textarea id={`note-${item.id}`} name="note" rows={2} maxLength={2000} defaultValue={item.admin_note ?? ""} /></div><button className="admin-btn admin-btn--ghost" disabled={pending}>Kaydet</button></form></article>)}</div>}</section>
    </>
  );
}
