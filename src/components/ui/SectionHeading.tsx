type Props = { eyebrow: string; title: string; light?: boolean };
export function SectionHeading({ eyebrow, title, light = false }: Props) {
  return <header className={`section-heading ${light ? "section-heading--light" : ""}`}><span>{eyebrow}</span><h2>{title}</h2></header>;
}
