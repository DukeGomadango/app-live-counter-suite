import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import JsonLd from "./JsonLd";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/script", () => ({
  default: ({ id, type, dangerouslySetInnerHTML }: { id?: string; type?: string; dangerouslySetInnerHTML?: { __html: string } }) =>
    type === "application/ld+json" && dangerouslySetInnerHTML
      ? <script id={id} type={type} dangerouslySetInnerHTML={dangerouslySetInnerHTML} />
      : null,
}));

describe("JsonLd", () => {
  it("renders script with application/ld+json", () => {
    render(<JsonLd />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();
  });

  it("outputs valid JSON-LD with SoftwareApplication and BreadcrumbList", () => {
    render(<JsonLd />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script?.textContent).toBeTruthy();
    const data = JSON.parse(script!.textContent!);
    expect(data["@context"]).toBe("https://schema.org");
    expect(Array.isArray(data["@graph"])).toBe(true);
    const app = data["@graph"].find((o: { "@type"?: string }) => o["@type"] === "SoftwareApplication");
    expect(app).toBeDefined();
    expect(app.name).toBeDefined();
    expect(app.offers?.price).toBe("0");
    const breadcrumb = data["@graph"].find((o: { "@type"?: string }) => o["@type"] === "BreadcrumbList");
    expect(breadcrumb).toBeDefined();
    expect(breadcrumb.itemListElement?.length).toBeGreaterThanOrEqual(1);
  });
});
