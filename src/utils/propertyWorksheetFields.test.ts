import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearWorksheetFieldsCache,
  fetchWorksheetFields,
  getCachedWorksheetFields,
} from "./propertyWorksheetFields";

describe("propertyWorksheetFields", () => {
  const endpoint = "https://example.com/worksheet";

  beforeEach(() => {
    clearWorksheetFieldsCache();
  });

  it("deduplicates concurrent worksheet fetches for the same property", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ fields: { roof: "yes" } }),
    });

    const [first, second] = await Promise.all([
      fetchWorksheetFields("property-1", fetchMock as typeof fetch, endpoint),
      fetchWorksheetFields("property-1", fetchMock as typeof fetch, endpoint),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ roof: "yes" });
    expect(second).toEqual({ roof: "yes" });
    expect(getCachedWorksheetFields("property-1")).toEqual({ roof: "yes" });
  });

  it("reuses cached worksheet fields on later reads without refetching", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ fields: { fireplace: "no" } }),
    });

    await fetchWorksheetFields("property-2", fetchMock as typeof fetch, endpoint);
    fetchMock.mockClear();

    const cached = await fetchWorksheetFields("property-2", fetchMock as typeof fetch, endpoint);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(cached).toEqual({ fireplace: "no" });
  });
});
