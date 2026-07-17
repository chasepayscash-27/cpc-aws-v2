import { describe, expect, it } from "vitest";
import { getPrimaryPropertyImageSources, getPrimaryPropertyImageUrl } from "./propertyMainImage";

describe("propertyMainImage", () => {
  it("removes trailing size suffixes from known thumbnail URLs", () => {
    expect(
      getPrimaryPropertyImageUrl("https://tools.flipperforce.com/uploads/projects/110122/streetview-400x400.jpg")
    ).toBe("https://tools.flipperforce.com/uploads/projects/110122/streetview.jpg");
  });

  it("preserves URLs without explicit size suffixes", () => {
    expect(
      getPrimaryPropertyImageUrl("https://tools.flipperforce.com/uploads/projects/110122/streetview.jpg")
    ).toBe("https://tools.flipperforce.com/uploads/projects/110122/streetview.jpg");
  });

  it("returns preferred and fallback sources when a sized URL is provided", () => {
    expect(
      getPrimaryPropertyImageSources("https://tools.flipperforce.com/uploads/projects/110122/streetview-400x400.jpg")
    ).toEqual([
      "https://tools.flipperforce.com/uploads/projects/110122/streetview.jpg",
      "https://tools.flipperforce.com/uploads/projects/110122/streetview-400x400.jpg",
    ]);
  });

  it("handles empty values safely", () => {
    expect(getPrimaryPropertyImageUrl("")).toBeNull();
    expect(getPrimaryPropertyImageSources()).toEqual([]);
  });
});
