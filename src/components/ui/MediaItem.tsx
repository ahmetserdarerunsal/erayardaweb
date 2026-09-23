import Image from "next/image";
import type { MediaEntry } from "@/types/content";
import { ImageReveal } from "@/components/motion/ImageReveal";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
export function MediaItem({ item, index }: { item: MediaEntry; index: number }) { return <article className="media-item"><ImageReveal className="media-item__image">{item.image ? <Image src={item.image} alt={item.imageAlt} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" /> : <PhotoPlaceholder />}</ImageReveal><div className="media-item__meta"><span>{item.type}</span><span>0{index + 1}</span></div><h3>{item.title}</h3><p>{item.date}</p></article>; }
