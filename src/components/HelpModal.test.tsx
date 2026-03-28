import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HelpModal from "./HelpModal";

vi.mock("@/components/ShareReplyToField", () => ({
  default: () => <div data-testid="share-reply-mock" />,
}));

describe("HelpModal", () => {
  it("shows counter help when open on /counter", () => {
    render(
      <HelpModal isOpen onClose={() => {}} currentPath="/counter" isLightMode={false} />,
    );
    expect(screen.getByRole("heading", { name: /Counter モード/ })).toBeTruthy();
  });

});
