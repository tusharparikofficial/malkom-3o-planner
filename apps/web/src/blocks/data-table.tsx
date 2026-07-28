import { Card } from "@/components/ui/card";
import type { BlockProps } from "./renderer";

export function DataTableBlock({ block }: BlockProps) {
  const p = block.payload as { columns: string[]; rows: string[][]; caption?: string };
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {p.columns.map((c) => (
              <th key={c} className="px-4 py-2.5 text-left font-semibold text-slate-700">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {p.rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-slate-600">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {p.caption && <p className="px-4 py-2 text-xs text-slate-500">{p.caption}</p>}
    </Card>
  );
}
