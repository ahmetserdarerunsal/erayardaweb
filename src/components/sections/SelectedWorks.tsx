import { Container } from "@/components/ui/Container";
import { ProjectPreview } from "@/components/ui/ProjectPreview";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { projects } from "@/data/projects";

export function SelectedWorks() {
  const [featured, ...secondary] = projects;
  return (
    <section className="works" aria-labelledby="works-heading">
      <Container><div id="works-heading"><SectionHeading eyebrow="03 / Seçki" title="ÇALIŞMALAR" /></div>
        <div className="works__layout"><ProjectPreview project={featured} featured number="01" /><div className="works__secondary">{secondary.map((project, index) => <ProjectPreview key={project.id} project={project} number={`0${index + 2}`} />)}</div></div>
      </Container>
    </section>
  );
}
