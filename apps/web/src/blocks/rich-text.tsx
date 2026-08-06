import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ZoomableImage } from "@/components/shared/zoomable-image";
import type { BlockProps } from "./renderer";

export function RichTextBlock({ block }: BlockProps) {
  const p = block.payload as { markdown: string };
  return (
    <div className="prose-malkom">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => <ZoomableImage src={src} alt={alt} />,
        }}
      >
        {p.markdown}
      </ReactMarkdown>
    </div>
  );
}
