import Image from "next/image";
import type { Project } from "@/types/content";
import { ImageReveal } from "@/components/motion/ImageReveal";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";

export function ProjectPreview({ project, featured = false, number }: { project: Project; featured?: boolean; number: string }) {
  return (
    <article className={`project ${featured ? "project--featured" : ""}`}>
      <ImageReveal className="project__media">{project.image ? <Image src={project.image} alt={project.imageAlt} fill sizes={featured ? "(max-width: 800px) 100vw, 66vw" : "(max-width: 800px) 100vw, 34vw"} /> : <PhotoPlaceholder />}</ImageReveal>
      <div className="project__meta"><span>{number}</span><span>{project.category}</span><span>{project.date}</span></div>
      <h3>{project.title}</h3><p>{project.summary}</p>
    </article>
  );
}
