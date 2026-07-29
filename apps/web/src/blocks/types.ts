export interface BlockNode {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  order: number;
  status: string;
  createdById: string;
  children: BlockNode[];
}

export interface PageSection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order: number;
  blocks: BlockNode[];
}

export interface ApproachOptionData {
  id: string;
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  effort: number | null;
  risk: number | null;
  scores: { id: string; criterionId: string; optionId: string; score: number | null; note: string | null }[];
}

export interface ApproachData {
  id: string;
  title: string;
  context: string;
  rationale: string | null;
  recommendedOptionId: string | null;
  options: ApproachOptionData[];
  criteria: { id: string; label: string; weight: number }[];
  considerations: { id: string; kind: string; text: string; optionId: string | null }[];
}

export interface TimelinePhaseData {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: string;
  milestones: {
    id: string;
    title: string;
    description: string | null;
    dueDate: string;
    status: string;
  }[];
}

export interface LibraryDiagramData {
  id: string;
  title: string;
  diagramType: string;
  definition: unknown;
}

export interface PageEmbeds {
  approaches: Record<string, ApproachData>;
  timeline: TimelinePhaseData[];
  kpis: Record<string, string>;
  diagrams: Record<string, LibraryDiagramData>;
}

export interface PageData {
  id: string;
  slug: string;
  title: string;
  summary: string;
  sections: PageSection[];
  embeds: PageEmbeds;
}
