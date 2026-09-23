import type { PressEntry } from "@/types/content";
export function PressItem({ item }: { item: PressEntry }) { return <article className="press-item"><div className="press-item__meta"><span>{item.category}</span><time>{item.date}</time></div><h3>{item.title}</h3><p>{item.excerpt}</p><span className="press-item__arrow" aria-hidden="true">↗</span></article>; }
