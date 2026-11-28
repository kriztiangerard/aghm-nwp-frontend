import { ChevronDown, TriangleAlert } from "lucide-react";
import type { PlanningNote, PlanningNotes as Notes } from "@/lib/report/planning-notes";
import { cn } from "@/lib/utils";

/** The engine's own wording, closed until the reader asks for it. */
function ExactWording({ lines, label }: { lines: string[]; label: string }) {
  if (lines.length === 0) return null;

  return (
    <details className="group mt-3 text-xs text-muted-foreground">
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 transition-transform group-open:rotate-180"
        />
      </summary>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {lines.map((line) => (
          <li key={line} className="break-words">
            {line}
          </li>
        ))}
      </ul>
    </details>
  );
}

const allDetails = (notes: PlanningNote[]) => [
  ...new Set(notes.flatMap((note) => note.details)),
];

function NoteList({ notes }: { notes: PlanningNote[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
      {notes.map((note) => (
        <li key={`${note.key}-${note.text}`} className="break-words">
          {note.text}
        </li>
      ))}
    </ul>
  );
}

function Card({
  title,
  notes,
  details,
  className,
}: {
  title: string;
  notes: PlanningNote[];
  details: string[];
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      <NoteList notes={notes} />
      <ExactWording lines={details} label="Exact wording" />
    </div>
  );
}

export default function PlanningNotes({ notes }: { notes: Notes }) {
  const { actions, assumptions, goodToKnow, notCovered, regulations } = notes;
  const groups = assumptions.filter(
    (group) => group.notes.length > 0 || group.details.length > 0,
  );

  if (
    actions.length + groups.length + goodToKnow.length + notCovered.length + regulations.length ===
    0
  ) {
    return null;
  }

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold">Assumptions and planning notes</h2>

      {actions.length > 0 && (
        // Same amber treatment as the planning warning at the top of the report.
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
            <TriangleAlert aria-hidden="true" className="size-4" />
            Check before you buy ({actions.length})
          </h3>
          <NoteList notes={actions} />
          <ExactWording lines={allDetails(actions)} label="Exact wording" />
        </div>
      )}

      {groups.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">What we assumed</h3>
          <div className="grid items-start gap-3 md:grid-cols-2">
            {groups.map((group) => (
              <Card
                key={group.title}
                title={group.title}
                notes={group.notes}
                details={group.details}
              />
            ))}
          </div>
        </div>
      )}

      {notCovered.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">What this plan does not cover</h3>
          <div className="rounded-lg border bg-card p-4">
            <NoteList notes={notCovered} />
            <ExactWording lines={allDetails(notCovered)} label="Exact wording" />
          </div>
        </div>
      )}

      {regulations.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">Laws and standards to check</h3>
          <div className="rounded-lg border bg-card p-4">
            <NoteList notes={regulations} />
            <ExactWording lines={allDetails(regulations)} label="Exact wording" />
          </div>
        </div>
      )}

      {goodToKnow.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">Good to know</h3>
          <div className="rounded-lg border bg-card p-4">
            <NoteList notes={goodToKnow} />
            <ExactWording lines={allDetails(goodToKnow)} label="Exact wording" />
          </div>
        </div>
      )}
    </section>
  );
}
