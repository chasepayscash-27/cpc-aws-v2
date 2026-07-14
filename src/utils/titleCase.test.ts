import { describe, expect, it } from "vitest";
import { toTitleCase } from "./titleCase";

describe("toTitleCase", () => {
  it("capitalizes the first letter of each word for all-lowercase input", () => {
    expect(toTitleCase("all flooring out")).toBe("All Flooring Out");
    expect(toTitleCase("bathrooms demo")).toBe("Bathrooms Demo");
    expect(toTitleCase("interior painted")).toBe("Interior Painted");
    expect(toTitleCase("glass shower door")).toBe("Glass Shower Door");
  });

  it("does not alter already-correct title case", () => {
    expect(toTitleCase("All Windows Open & Close")).toBe("All Windows Open & Close");
    expect(toTitleCase("Final Walkthrough")).toBe("Final Walkthrough");
    expect(toTitleCase("Gutters Installed")).toBe("Gutters Installed");
  });

  it("preserves acronyms that are already uppercase", () => {
    expect(toTitleCase("HVAC Rough")).toBe("HVAC Rough");
    expect(toTitleCase("HVAC Working")).toBe("HVAC Working");
  });

  it("handles mixed-case legacy stage names from the database", () => {
    expect(toTitleCase("ROUGH IN")).toBe("ROUGH IN");
    expect(toTitleCase("hvac rough")).toBe("Hvac Rough");
  });

  it("handles empty string without throwing", () => {
    expect(toTitleCase("")).toBe("");
  });

  it("handles single-word input", () => {
    expect(toTitleCase("construction")).toBe("Construction");
    expect(toTitleCase("Staging")).toBe("Staging");
  });
});
