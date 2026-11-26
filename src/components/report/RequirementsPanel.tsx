import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import type { ReportRequirement } from "@/lib/report/report-view-model";

interface RequirementsPanelProps {
  requirements: ReportRequirement[];
}

/** The report's "Network requirements" list in a collapsible panel. Open by default. */
export default function RequirementsPanel({
  requirements,
}: RequirementsPanelProps) {
  return (
    <section>
      <Collapsible.Root defaultOpen className="rounded-xl border bg-card">
        <h2 className="text-xl font-semibold">
          <Collapsible.Trigger className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Network requirements
            <ChevronDown
              aria-hidden="true"
              className="size-5 shrink-0 transition-transform group-data-[panel-open]:rotate-180"
            />
          </Collapsible.Trigger>
        </h2>

        <Collapsible.Panel className="border-t px-4 pb-2">
          <dl className="sm:columns-2 sm:gap-x-10 lg:columns-3">
            {requirements.map((requirement, index) => (
              <div
                key={`${requirement.label}-${index}`}
                className="grid break-inside-avoid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-4 border-b py-2 text-sm"
              >
                <dt className="text-muted-foreground">{requirement.label}</dt>
                <dd className="break-words text-left font-medium">
                  {requirement.value}
                </dd>
              </div>
            ))}
          </dl>
        </Collapsible.Panel>
      </Collapsible.Root>
    </section>
  );
}
