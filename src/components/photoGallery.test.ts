import { describe, expect, it } from "vitest";
import type { PhotoLogRow } from "../types/photoLog";

// ---------------------------------------------------------------------------
// Helpers mirroring the logic used inside the gallery overlay in
// ProjectDetailsModal.tsx.  Keeping them as pure functions makes the behavior
// easy to verify without a full React render.
// ---------------------------------------------------------------------------

/** Returns the alt/label text for a photo at a given grid index. */
function buildPhotoAltText(photo: PhotoLogRow, index: number): string {
  return (
    photo.photo_description ??
    photo.description ??
    photo.category ??
    `Photo ${index + 1}`
  );
}

/** Returns the src URL for a thumbnail, preferring preview_thumbnail_url. */
function getThumbnailSrc(photo: PhotoLogRow): string | undefined {
  return photo.preview_thumbnail_url ?? photo.source_view_url;
}

/** Returns photos that are suitable for the gallery (must have a source URL). */
function filterGalleryPhotos(photos: PhotoLogRow[]): PhotoLogRow[] {
  return photos.filter((p) => Boolean(p.source_view_url));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildPhotoAltText", () => {
  it("uses photo_description when available", () => {
    const photo: PhotoLogRow = {
      photo_description: "Front exterior",
      description: "should not be used",
      category: "exterior",
    };
    expect(buildPhotoAltText(photo, 0)).toBe("Front exterior");
  });

  it("falls back to description when photo_description is absent", () => {
    const photo: PhotoLogRow = { description: "Kitchen remodel", category: "interior" };
    expect(buildPhotoAltText(photo, 0)).toBe("Kitchen remodel");
  });

  it("falls back to category when description is also absent", () => {
    const photo: PhotoLogRow = { category: "exterior" };
    expect(buildPhotoAltText(photo, 0)).toBe("exterior");
  });

  it("falls back to indexed placeholder when all text fields are absent", () => {
    const photo: PhotoLogRow = {};
    expect(buildPhotoAltText(photo, 0)).toBe("Photo 1");
    expect(buildPhotoAltText(photo, 4)).toBe("Photo 5");
  });
});

describe("getThumbnailSrc", () => {
  it("prefers preview_thumbnail_url over source_view_url", () => {
    const photo: PhotoLogRow = {
      preview_thumbnail_url: "https://example.com/thumb.jpg",
      source_view_url: "https://example.com/full.jpg",
    };
    expect(getThumbnailSrc(photo)).toBe("https://example.com/thumb.jpg");
  });

  it("falls back to source_view_url when preview_thumbnail_url is absent", () => {
    const photo: PhotoLogRow = { source_view_url: "https://example.com/full.jpg" };
    expect(getThumbnailSrc(photo)).toBe("https://example.com/full.jpg");
  });

  it("returns undefined when neither URL is present", () => {
    const photo: PhotoLogRow = {};
    expect(getThumbnailSrc(photo)).toBeUndefined();
  });
});

describe("filterGalleryPhotos", () => {
  it("returns an empty array for 0 photos — no crash", () => {
    expect(filterGalleryPhotos([])).toEqual([]);
  });

  it("returns the single photo for a property with 1 photo", () => {
    const photos: PhotoLogRow[] = [{ source_view_url: "https://example.com/a.jpg" }];
    expect(filterGalleryPhotos(photos)).toHaveLength(1);
  });

  it("excludes photos that have no source_view_url", () => {
    const photos: PhotoLogRow[] = [
      { source_view_url: "https://example.com/a.jpg" },
      { source_view_url: undefined },
      { source_view_url: "https://example.com/b.jpg" },
    ];
    expect(filterGalleryPhotos(photos)).toHaveLength(2);
  });

  it("returns all photos when every entry has a source URL", () => {
    const photos: PhotoLogRow[] = Array.from({ length: 5 }, (_, i) => ({
      source_view_url: `https://example.com/photo-${i}.jpg`,
    }));
    expect(filterGalleryPhotos(photos)).toHaveLength(5);
  });
});
