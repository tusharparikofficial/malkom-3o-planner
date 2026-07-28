import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BlockProps } from "./renderer";

export function RichTextBlock({ block }: BlockProps) {
  const p = block.payload as { markdown: string };
  return (
    <div className="prose-malkom">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.markdown}</ReactMarkdown>
    </div>
  );
}
