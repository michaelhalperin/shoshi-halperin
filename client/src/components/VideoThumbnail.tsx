import { useEffect, useRef } from "react";

function withTimeFragment(url: string, time = 0.01) {
  const base = url.split("#")[0];
  return `${base}#t=${time}`;
}

type VideoThumbnailProps = {
  src: string;
  className?: string;
  draggable?: boolean;
};

export function VideoThumbnail({ src, className = "", draggable }: VideoThumbnailProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const seekToPreview = () => {
      if (video.currentTime < 0.01) {
        video.currentTime = 0.01;
      }
    };

    video.addEventListener("loadedmetadata", seekToPreview);
    video.addEventListener("loadeddata", seekToPreview);
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      seekToPreview();
    }

    return () => {
      video.removeEventListener("loadedmetadata", seekToPreview);
      video.removeEventListener("loadeddata", seekToPreview);
    };
  }, [src]);

  return (
    <video
      ref={ref}
      src={withTimeFragment(src)}
      muted
      playsInline
      preload="auto"
      aria-hidden
      draggable={draggable}
      onPlay={(event) => {
        event.currentTarget.pause();
      }}
      className={className}
    />
  );
}
