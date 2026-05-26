import { useCallback, useEffect, useRef, useState } from 'react';
import type { CropRect } from '../lib/types';

type Props = {
  dataUrl: string;
  onCropChange: (rect: CropRect | null) => void;
};

type Point = { x: number; y: number };

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export default function CropCanvas({ dataUrl, onCropChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState<Point | null>(null);
  const [current, setCurrent] = useState<Point | null>(null);

  useEffect(() => {
    onCropChange(null);
    setStart(null);
    setCurrent(null);
  }, [dataUrl, onCropChange]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const maxW = 420;
      const scale = Math.min(1, maxW / img.naturalWidth);
      setDisplaySize({
        w: Math.round(img.naturalWidth * scale),
        h: Math.round(img.naturalHeight * scale),
      });
    };
    img.src = dataUrl;
  }, [dataUrl]);

  const toRelative = useCallback(
    (px: number, py: number): Point => ({
      x: clamp01(px / displaySize.w),
      y: clamp01(py / displaySize.h),
    }),
    [displaySize]
  );

  const finishDrag = useCallback(
    (a: Point, b: Point) => {
      const x1 = Math.min(a.x, b.x);
      const y1 = Math.min(a.y, b.y);
      const x2 = Math.max(a.x, b.x);
      const y2 = Math.max(a.y, b.y);
      const w = x2 - x1;
      const h = y2 - y1;
      if (w * displaySize.w < 12 || h * displaySize.h < 12) {
        onCropChange(null);
        return;
      }
      onCropChange({ x: x1, y: y1, w, h });
    },
    [displaySize, onCropChange]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (!displaySize.w) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const p = toRelative(px, py);
    setStart(p);
    setCurrent(p);
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !start) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setCurrent(toRelative(px, py));
  };

  const onPointerUp = () => {
    if (start && current) finishDrag(start, current);
    setDragging(false);
    setStart(null);
    setCurrent(null);
  };

  let overlay: { left: number; top: number; width: number; height: number } | null = null;
  if (start && current && displaySize.w) {
    const x1 = Math.min(start.x, current.x) * displaySize.w;
    const y1 = Math.min(start.y, current.y) * displaySize.h;
    const x2 = Math.max(start.x, current.x) * displaySize.w;
    const y2 = Math.max(start.y, current.y) * displaySize.h;
    overlay = { left: x1, top: y1, width: x2 - x1, height: y2 - y1 };
  }

  return (
    <div
      ref={containerRef}
      className="crop-wrap"
      style={{ width: displaySize.w || '100%', height: displaySize.h || 120 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <img src={dataUrl} alt="" className="crop-img" draggable={false} />
      {overlay && (
        <div
          className="crop-overlay"
          style={{
            left: overlay.left,
            top: overlay.top,
            width: overlay.width,
            height: overlay.height,
          }}
        />
      )}
    </div>
  );
}
