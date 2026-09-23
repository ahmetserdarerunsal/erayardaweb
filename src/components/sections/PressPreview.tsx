import { Container } from "@/components/ui/Container";
import { PressItem } from "@/components/ui/PressItem";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { pressEntries } from "@/data/press";

export function PressPreview() { const [featured, ...list] = pressEntries; return <section className="press" aria-labelledby="press-heading"><Container><div id="press-heading"><SectionHeading eyebrow="06 / Gündem" title="BASIN / AÇIKLAMALAR" light /></div><div className="press__layout"><PressItem item={featured} /><div className="press__list">{list.map((item) => <PressItem key={item.id} item={item} />)}</div></div></Container></section>; }
