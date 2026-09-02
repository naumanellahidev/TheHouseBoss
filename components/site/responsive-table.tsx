import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * One implementation of the table-to-card transformation described in
 * docs/04-responsive-spec.md § 6. Below 768px every row becomes a card.
 * Do not re-solve this per screen.
 *
 *   <ResponsiveTable
 *     caption="Listings"
 *     columns={[{ key: 'address', header: 'Address', primary: true }, ...]}
 *     rows={listings}
 *     getRowKey={(r) => r.id}
 *     renderCell={(r, col) => ...}
 *     renderActions={(r) => <RowActions listing={r} />}
 *   />
 */

export type Column = {
  key: string;
  header: string;
  /** The one column that becomes the card heading below 768px. */
  primary?: boolean;
  /** Hidden below 768px entirely — use for low-value columns. */
  hideOnCard?: boolean;
  align?: "start" | "end";
  className?: string;
};

export function ResponsiveTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  renderCell,
  renderActions,
  empty,
  className,
}: {
  caption: string;
  columns: Column[];
  rows: T[];
  getRowKey: (row: T) => string;
  renderCell: (row: T, column: Column) => React.ReactNode;
  renderActions?: (row: T) => React.ReactNode;
  empty?: React.ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  const primary = columns.find((c) => c.primary) ?? columns[0];
  const secondary = columns.filter((c) => c !== primary && !c.hideOnCard);

  return (
    <div className={className}>
      {/* ── Card list: below 768px ─────────────────────────────────── */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li
            key={getRowKey(row)}
            className="rounded-lg border border-border bg-surface p-4 shadow-sm"
          >
            <div className="text-h4 font-semibold text-foreground">
              {renderCell(row, primary)}
            </div>

            <dl className="mt-3 flex flex-col gap-1.5">
              {secondary.map((col) => (
                <div
                  key={col.key}
                  className="flex items-baseline justify-between gap-4"
                >
                  <dt className="text-xs text-foreground-subtle">
                    {col.header}
                  </dt>
                  <dd className="text-sm text-foreground">
                    {renderCell(row, col)}
                  </dd>
                </div>
              ))}
            </dl>

            {renderActions ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                {renderActions(row)}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {/* ── Table: 768px and up ────────────────────────────────────── */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "px-3 py-3 text-xs font-semibold tracking-[0.08em] whitespace-nowrap text-foreground-subtle uppercase",
                    col.align === "end" && "text-right",
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
              {renderActions ? (
                <th scope="col" className="px-3 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className="border-b border-border transition-colors last:border-b-0 hover:bg-surface-sunken"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3 py-3 align-middle",
                      col.align === "end" && "text-right",
                      col.className,
                    )}
                  >
                    {renderCell(row, col)}
                  </td>
                ))}
                {renderActions ? (
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {renderActions(row)}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
