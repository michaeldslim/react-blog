import * as React from "react";

interface IMarkdownContentProps {
  content: string;
}

type TBlock =
  | { type: "text"; lines: string[] }
  | { type: "code"; language: string | null; lines: string[] };

export function MarkdownContent({ content }: IMarkdownContentProps) {
  const blocks = React.useMemo<TBlock[]>(() => {
    const result: TBlock[] = [];
    const lines = content.split(/\r?\n/);
    let currentTextLines: string[] = [];
    let currentCodeBlock: { language: string | null; lines: string[] } | null = null;

    for (const line of lines) {
      const fenceMatch = line.match(/^```(\w+)?\s*$/);
      if (fenceMatch) {
        if (currentCodeBlock) {
          result.push({
            type: "code",
            language: currentCodeBlock.language,
            lines: currentCodeBlock.lines,
          });
          currentCodeBlock = null;
        } else {
          if (currentTextLines.length > 0) {
            result.push({ type: "text", lines: currentTextLines });
            currentTextLines = [];
          }
          const language = fenceMatch[1] ?? null;
          currentCodeBlock = { language, lines: [] };
        }
        continue;
      }

      if (currentCodeBlock) {
        currentCodeBlock.lines.push(line);
      } else {
        currentTextLines.push(line);
      }
    }

    if (currentCodeBlock) {
      result.push({
        type: "code",
        language: currentCodeBlock.language,
        lines: currentCodeBlock.lines,
      });
    } else if (currentTextLines.length > 0) {
      result.push({ type: "text", lines: currentTextLines });
    }

    return result;
  }, [content]);

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs"
            >
              <code>{block.lines.join("\n")}</code>
            </pre>
          );
        }

        return (
          <p key={index} className="whitespace-pre-wrap">
            {block.lines.join("\n")}
          </p>
        );
      })}
    </div>
  );
}
