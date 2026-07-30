/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STATIC_SNAPSHOT?: string;
  readonly VITE_BASE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ENABLE_MS_LOGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv & { BASE_URL: string; DEV: boolean; PROD: boolean };
}

// Typed shim for the vite alias into diagram-engine's source (its exports map
// only exposes the schema module, so tsc can't resolve the deep path itself).
declare module "@diagram-engine-canvas" {
  import type { ComponentType } from "react";
  import type { DiagramDefinition } from "diagram-engine";

  export const DiagramCanvas: ComponentType<{
    definition: DiagramDefinition;
    revision: number;
    gridColor?: string;
    inspectorPortalTarget?: HTMLElement | null;
    onDefinitionChange?: (definition: DiagramDefinition) => void;
    statusNotice?: string;
    viewportToken?: string;
  }>;
}
