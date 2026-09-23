import type { HTMLAttributes } from "react";
type Props = HTMLAttributes<HTMLDivElement> & { as?: "div" | "section" };
export function Container({ as: Tag = "div", className = "", ...props }: Props) { return <Tag className={`container ${className}`} {...props} />; }
