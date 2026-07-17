import { ImgHTMLAttributes, ReactNode, useMemo, useState } from "react";
import { getPrimaryPropertyImageSources } from "../utils/propertyMainImage";

interface PropertyMainImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  imageUrl?: string | null;
  alt: string;
  placeholder?: ReactNode;
}

export default function PropertyMainImage({
  imageUrl,
  alt,
  placeholder = null,
  onError,
  loading = "lazy",
  decoding = "async",
  ...imgProps
}: PropertyMainImageProps) {
  const sources = useMemo(() => getPrimaryPropertyImageSources(imageUrl), [imageUrl]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  if (sources.length === 0 || showPlaceholder) {
    return <>{placeholder}</>;
  }

  return (
    <img
      {...imgProps}
      src={sources[sourceIndex]}
      alt={alt}
      loading={loading}
      decoding={decoding}
      onError={(event) => {
        onError?.(event);
        if (sourceIndex < sources.length - 1) {
          setSourceIndex((current) => Math.min(current + 1, sources.length - 1));
          return;
        }
        setShowPlaceholder(true);
      }}
    />
  );
}
