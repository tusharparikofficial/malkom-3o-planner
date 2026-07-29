import { Suspense, lazy } from "react";
import type { DiagramDefinition } from "diagram-engine";

// The engine (React Flow + renderers) is heavy — load it only when a diagram
// is actually on screen.
const DiagramCanvas = lazy(() =>
  import("@diagram-engine-canvas").then((m) => ({ default: m.DiagramCanvas })),
);

interface DiagramViewerProps {
  definition: DiagramDefinition;
  /** Bump to force the canvas to re-read a changed definition. */
  revision?: number;
  className?: string;
  onDefinitionChange?: (definition: DiagramDefinition) => void;
}

const heights: Record<string, string> = {
  small: "320px",
  medium: "460px",
  large: "620px",
};

export function DiagramViewer({
  definition,
  revision = 0,
  className,
  onDefinitionChange,
}: DiagramViewerProps) {
  const height =
    "height" in definition && definition.height
      ? `${definition.height}px`
      : (heights[definition.size] ?? "460px");

  return (
    <div className={className} style={{ height }}>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Loading diagram…
          </div>
        }
      >
        <DiagramCanvas
          definition={definition}
          revision={revision}
          viewportToken={`v-${revision}`}
          onDefinitionChange={onDefinitionChange}
        />
      </Suspense>
    </div>
  );
}
