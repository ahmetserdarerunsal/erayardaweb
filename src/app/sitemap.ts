import type { MetadataRoute } from "next";
import { getPublishedActivities, getSiteProfile } from "@/lib/public-content";

const routes = [
  "",
  "/hakkinda",
  "/faaliyetler",
  "/fotograflar",
  "/videolar",
  "/iletisim",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [profile, activities] = await Promise.all([getSiteProfile(), getPublishedActivities()]);
  const pages: MetadataRoute.Sitemap = routes.map((route, index) => ({
    url: `${profile.siteUrl}${route}`,
    changeFrequency: index === 0 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : 0.7,
  }));

  const activityPages: MetadataRoute.Sitemap = activities.map((activity) => ({
    url: `${profile.siteUrl}/faaliyetler/${activity.slug}`,
    lastModified: activity.sortDate,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...pages, ...activityPages];
}
