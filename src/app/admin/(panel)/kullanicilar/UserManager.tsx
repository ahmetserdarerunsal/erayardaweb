"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "../fotograflar/actions";
import { updateUser } from "./actions";

type User = {
  id: string;
  full_name: string;
  role: string;
  can_publish: boolean;
  is_active: boolean;
  created_at: string;
};

const formatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function UserManager({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => setFeedback(await action()));

  return (
    <>
      <section className="admin-card admin-manage-head">
        <div>
          <p className="admin-eyebrow">Erişim</p>
          <h2>Kullanıcılar</h2>
          <p>
            Panele girebilen hesaplar. Dışarıdan kayıt kapalıdır; yeni hesap
            yalnızca Supabase panelinden açılır, sonra buradan yetkilendirilir.
          </p>
        </div>

        <div className="admin-note">
          <p>
            <strong>Yeni kullanıcı eklemek için:</strong> Supabase → Authentication
            → Add user ile hesabı oluşturun, ardından Table Editor →{" "}
            <code>admin_profiles</code> tablosuna aynı kullanıcı kimliğiyle bir
            satır ekleyin. Kayıt eklendiği anda bu listede görünür.
          </p>
        </div>
      </section>

      {feedback ? (
        <p className="admin-feedback" data-ok={feedback.ok} role="status">
          {feedback.message}
        </p>
      ) : null}

      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Tanımlı hesaplar</h2>
          <span>{users.length} kullanıcı</span>
        </div>

        {users.length === 0 ? (
          <p className="admin-empty">Hiç kullanıcı kaydı yok.</p>
        ) : (
          <div className="admin-record-list">
            {users.map((user) => {
              const isEditing = editing === user.id;
              const isSelf = user.id === currentUserId;

              return (
                <article className="admin-card admin-record admin-record--plain" key={user.id}>
                  <div>
                    <p className="admin-eyebrow">
                      {user.role === "yonetici" ? "Yönetici" : "Editör"}
                      {isSelf ? " · bu hesap sizsiniz" : ""}
                    </p>

                    {isEditing ? (
                      <form
                        className="admin-form"
                        action={(formData) => {
                          setEditing(null);
                          run(() =>
                            updateUser(user.id, {
                              fullName: String(formData.get("fullName") ?? ""),
                              role: String(formData.get("role") ?? ""),
                              canPublish: formData.get("canPublish") === "on",
                              isActive: formData.get("isActive") === "on",
                            }),
                          );
                        }}
                      >
                        <div className="admin-field">
                          <label htmlFor={`name-${user.id}`}>Ad soyad</label>
                          <input
                            id={`name-${user.id}`}
                            name="fullName"
                            defaultValue={user.full_name}
                            maxLength={120}
                            required
                          />
                        </div>

                        <div className="admin-field">
                          <label htmlFor={`role-${user.id}`}>Rol</label>
                          <select id={`role-${user.id}`} name="role" defaultValue={user.role}>
                            <option value="editor">Editör</option>
                            <option value="yonetici">Yönetici</option>
                          </select>
                          <p className="admin-field__hint">
                            Yönetici her bölüme girer ve kullanıcıları yönetir.
                            Editör içerik ekler.
                          </p>
                        </div>

                        <fieldset className="admin-field admin-checks">
                          <legend>Yetkiler</legend>
                          <label>
                            <input
                              type="checkbox"
                              name="canPublish"
                              defaultChecked={user.can_publish || user.role === "yonetici"}
                            />
                            Yayımlayabilir
                          </label>
                          <label>
                            <input type="checkbox" name="isActive" defaultChecked={user.is_active} />
                            Hesap aktif
                          </label>
                        </fieldset>

                        <div className="admin-actions">
                          <button className="admin-btn" disabled={pending}>
                            Kaydet
                          </button>
                          <button
                            className="admin-btn admin-btn--ghost"
                            type="button"
                            onClick={() => setEditing(null)}
                          >
                            Vazgeç
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <h3>{user.full_name}</h3>
                        <p>
                          {user.is_active ? "Aktif" : "Pasif — panele giremez"}
                          {" · "}
                          {user.can_publish || user.role === "yonetici"
                            ? "yayımlayabilir"
                            : "yayımlayamaz"}
                          {" · "}
                          {formatter.format(new Date(user.created_at))} tarihinde eklendi
                        </p>
                      </>
                    )}
                  </div>

                  <div className="admin-record__action">
                    <span>{user.is_active ? "Aktif" : "Pasif"}</span>
                    {!isEditing ? (
                      <button
                        className="admin-btn admin-btn--ghost"
                        type="button"
                        disabled={pending}
                        onClick={() => setEditing(user.id)}
                      >
                        Düzenle
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
