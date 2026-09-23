import { Container } from "@/components/ui/Container";
import { MediaItem } from "@/components/ui/MediaItem";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { mediaEntries } from "@/data/media";
export function MediaPreview() { return <section className="media" aria-labelledby="media-heading"><Container><div id="media-heading"><SectionHeading eyebrow="07 / Seçkiler" title="MEDYA" /></div><div className="media__grid">{mediaEntries.map((item, index) => <MediaItem key={item.id} item={item} index={index} />)}</div></Container></section>; }
