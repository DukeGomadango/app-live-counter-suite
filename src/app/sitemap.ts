import { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_CONFIG.url;
  const lastModified = new Date();

  const toolEntries: MetadataRoute.Sitemap = TOOLS.map((t) => ({
    url: `${baseUrl}${t.path}`,
    lastModified,
    changeFrequency: t.id === "counter" ? ("weekly" as const) : ("monthly" as const),
    priority: t.id === "counter" ? 0.9 : 0.5,
  }));

  return [
    { url: baseUrl, lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/sync`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    ...toolEntries,
  ];
}
