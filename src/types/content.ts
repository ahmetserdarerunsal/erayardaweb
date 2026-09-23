export type Project = { id: number; slug: string; title: string; category: string; date: string; summary: string; image: string | null; imageAlt: string; featured: boolean };
export type PressEntry = { id: number; category: string; date: string; title: string; excerpt: string; featured?: boolean };
export type MediaEntry = { id: number; type: string; title: string; date: string; image: string | null; imageAlt: string };
