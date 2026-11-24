import { photoSrc, photoSrcSet } from "@/lib/photos";

/** A photograph with responsive sources for site-hosted images. `sizes` should describe the rendered width. */
export default function Photo({
  src,
  alt,
  className = "",
  sizes = "(min-width: 1024px) 50vw, 100vw",
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  eager?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoSrc(src)}
      srcSet={photoSrcSet(src)}
      sizes={sizes}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
      className={`bg-mist object-cover ${className}`}
    />
  );
}
