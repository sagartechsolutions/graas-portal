/** Renders policy text. "## " starts a section, "- " a list item, anything else is a paragraph. */
export default function PolicyBody({ body }: { body: string }) {
  const blocks: { h?: string; items: { li: boolean; text: string }[] }[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("## ")) blocks.push({ h: line.slice(3), items: [] });
    else {
      if (!blocks.length) blocks.push({ items: [] });
      blocks[blocks.length - 1].items.push(line.startsWith("- ") ? { li: true, text: line.slice(2) } : { li: false, text: line });
    }
  }
  return (
    <div className="grid gap-9">
      {blocks.map((b, i) => (
        <section key={i}>
          {b.h && <h2 className="h-card !text-2xl">{b.h}</h2>}
          <div className="mt-3 grid gap-2.5 text-[1.05rem] leading-relaxed text-ink2">
            {b.items.map((it, k) =>
              it.li ? (
                <p key={k} className="flex gap-3">
                  <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-go" />
                  <span>{it.text}</span>
                </p>
              ) : (
                <p key={k}>{it.text}</p>
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
