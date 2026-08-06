/**
 * Assembler Demo — serves the self-contained Process Assembler HTML
 * (public/malkom-assembler.html) unchanged inside the portal shell.
 */
export function AssemblerPage() {
  return (
    <div className="-mx-4 -my-8 lg:-mx-8">
      <iframe
        src={`${import.meta.env.BASE_URL}malkom-assembler.html`}
        title="MALKOM 3.0 — Process Assembler demo"
        className="h-[calc(100vh-1px)] w-full border-0"
      />
    </div>
  );
}
