import { Fragment } from "react";
import { parseInlineMarkdown } from "@/lib/dm/inline-markdown";
import { formatMeasurementText, type MeasurementSystem } from "@/lib/measurement-system";

// Narration with its emphasis rendered: the model's **bold** and *italic*
// as type, not as asterisks. Spans only, so it sits inside any <p>.
export function Prose({ text, measurementSystem = "imperial", tableLanguage = "english" }: {
  text: string;
  measurementSystem?: MeasurementSystem;
  tableLanguage?: string;
}) {
  const displayText = formatMeasurementText(text, measurementSystem, tableLanguage);
  return (
    <>
      {parseInlineMarkdown(displayText).map((span, index) =>
        span.bold ? (
          <strong key={index} className={span.italic ? "font-semibold italic" : "font-semibold"}>
            {span.text}
          </strong>
        ) : span.italic ? (
          <em key={index}>{span.text}</em>
        ) : (
          <Fragment key={index}>{span.text}</Fragment>
        ),
      )}
    </>
  );
}
