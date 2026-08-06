import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";

const MIN_SCALE = 0.4;
const MAX_SCALE = 8;

/**
 * Image with a full-screen zoom viewer: click to open, scroll or +/- to zoom,
 * drag to pan, double-click to toggle, Esc / × to close. Used for every image
 * rendered inside rich-text blocks (architecture & deployment posters).
 */
export function ZoomableImage({ src, alt }: { src?: string; alt?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        src={src}
        alt={alt ?? ""}
        className="max-w-full cursor-zoom-in rounded-lg"
        onClick={() => setOpen(true)}
        title="Click to zoom"
      />
      {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}

function Lightbox({ src, alt, onClose }: { src?: string; alt?: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const clamp = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    setScale((prev) => {
      const next = clamp(prev * factor);
      if (cx != null && cy != null && wrapRef.current) {
        const rect = wrapRef.current.getBoundingClientRect();
        const ox = cx - rect.left - rect.width / 2;
        const oy = cy - rect.top - rect.height / 2;
        const ratio = next / prev;
        setPos((p) => ({ x: ox - (ox - p.x) * ratio, y: oy - (oy - p.y) * ratio }));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") zoomAt(1.25);
      if (e.key === "-") zoomAt(0.8);
      if (e.key === "0") {
        setScale(1);
        setPos({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, zoomAt]);

  const btn =
    "flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/25 transition-colors";

  return createPortal(
    <div
      ref={wrapRef}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/90 backdrop-blur-sm"
      onWheel={(e) => zoomAt(e.deltaY < 0 ? 1.15 : 0.87, e.clientX, e.clientY)}
      onMouseDown={(e) => {
        drag.current = { startX: e.clientX, startY: e.clientY, baseX: pos.x, baseY: pos.y };
      }}
      onMouseMove={(e) => {
        if (!drag.current) return;
        setPos({
          x: drag.current.baseX + e.clientX - drag.current.startX,
          y: drag.current.baseY + e.clientY - drag.current.startY,
        });
      }}
      onMouseUp={() => (drag.current = null)}
      onMouseLeave={() => (drag.current = null)}
      onDoubleClick={(e) => zoomAt(scale < 2 ? 2 : 0.25, e.clientX, e.clientY)}
    >
      <img
        src={src}
        alt={alt ?? ""}
        draggable={false}
        className="max-h-[92vh] max-w-[94vw] select-none"
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          cursor: drag.current ? "grabbing" : "grab",
          transition: drag.current ? "none" : "transform 120ms ease-out",
        }}
      />
      <div
        className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900/80 p-2 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={btn} onClick={() => zoomAt(0.8)} aria-label="Zoom out">
          <Icon name="zoom_out" className="text-xl" />
        </button>
        <span className="min-w-[52px] text-center text-xs font-semibold text-white/80">
          {Math.round(scale * 100)}%
        </span>
        <button type="button" className={btn} onClick={() => zoomAt(1.25)} aria-label="Zoom in">
          <Icon name="zoom_in" className="text-xl" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => {
            setScale(1);
            setPos({ x: 0, y: 0 });
          }}
          aria-label="Reset view"
        >
          <Icon name="fit_screen" className="text-xl" />
        </button>
        <button type="button" className={btn} onClick={onClose} aria-label="Close">
          <Icon name="close" className="text-xl" />
        </button>
      </div>
      <p className="pointer-events-none absolute top-5 left-1/2 -translate-x-1/2 text-xs text-white/50">
        Scroll to zoom • drag to move • double-click to toggle • Esc to close
      </p>
    </div>,
    document.body,
  );
}
