export interface MapViewport {
  width: number;
  height: number;
}

export function measureMapViewport(host: HTMLElement): MapViewport {
  const rect = host.getBoundingClientRect();

  return {
    width: Math.max(Math.floor(rect.width), 1),
    height: Math.max(Math.floor(rect.height), 1)
  };
}

export function observeMapViewport(host: HTMLElement, onResize: (viewport: MapViewport) => void): () => void {
  const observer = new ResizeObserver(() => {
    onResize(measureMapViewport(host));
  });

  observer.observe(host);
  onResize(measureMapViewport(host));

  return () => {
    observer.disconnect();
  };
}
