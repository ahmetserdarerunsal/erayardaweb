import { socialLinks } from "@/data/social";
export function SocialLinks() { return <div className="social-links">{socialLinks.map((item, index) => <a key={item.label} href={item.href} target="_blank" rel="noreferrer" aria-label={`${item.label} — ${item.note}`}><span className="social-links__index">0{index + 1}</span><span>{item.label}</span><span aria-hidden="true">↗</span></a>)}</div>; }
