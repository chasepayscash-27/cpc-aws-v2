import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  HOME_VIEW_MODE_STORAGE_KEY,
  loadHomeViewMode,
  saveHomeViewMode,
} from "./homeViewMode";

describe("homeViewMode helpers", () => {
  const localStorageMock = {
    store: new Map<string, string>(),
    getItem(key: string) {
      return this.store.has(key) ? this.store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      this.store.set(key, value);
    },
    removeItem(key: string) {
      this.store.delete(key);
    },
    clear() {
      this.store.clear();
    },
  };

  beforeEach(() => {
    vi.stubGlobal("localStorage", localStorageMock);
    localStorage.clear();
  });

  it("defaults to 'current' when nothing is persisted", () => {
    expect(loadHomeViewMode()).toBe("current");
  });

  it("defaults to 'current' when the persisted value is invalid", () => {
    localStorage.setItem(HOME_VIEW_MODE_STORAGE_KEY, "bogus");
    expect(loadHomeViewMode()).toBe("current");
  });

  it("round-trips 'table' through save/load", () => {
    saveHomeViewMode("table");
    expect(localStorage.getItem(HOME_VIEW_MODE_STORAGE_KEY)).toBe("table");
    expect(loadHomeViewMode()).toBe("table");
  });

  it("round-trips 'current' through save/load", () => {
    saveHomeViewMode("table");
    saveHomeViewMode("current");
    expect(loadHomeViewMode()).toBe("current");
  });

  it("loadHomeViewMode does not throw when localStorage access fails", () => {
    vi.stubGlobal("localStorage", {
      getItem() {
        throw new Error("blocked");
      },
    });
    expect(loadHomeViewMode()).toBe("current");
  });

  it("saveHomeViewMode does not throw when localStorage access fails", () => {
    vi.stubGlobal("localStorage", {
      setItem() {
        throw new Error("blocked");
      },
    });
    expect(() => saveHomeViewMode("table")).not.toThrow();
  });
});
