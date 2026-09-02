/**
 * Generates `types/database.ts` from the live schema.
 *
 * `supabase gen types` runs its generator inside a Docker container, and there
 * is no Docker on this machine. This reads information_schema directly through
 * the same pooler connection the migrations used, so the output is derived from
 * the real database rather than from a guess — which was the whole problem with
 * the placeholder it replaces.
 *
 * Run: npm run db:types
 */
import { writeFileSync } from "node:fs";
import { connect } from "./db-connect.mjs";

const TS = {
  uuid: "string",
  text: "string",
  "character varying": "string",
  character: "string",
  citext: "string",
  name: "string",
  smallint: "number",
  integer: "number",
  bigint: "number",
  numeric: "number",
  real: "number",
  "double precision": "number",
  boolean: "boolean",
  json: "Json",
  jsonb: "Json",
  date: "string",
  "timestamp with time zone": "string",
  "timestamp without time zone": "string",
  "time with time zone": "string",
  "time without time zone": "string",
  interval: "string",
  bytea: "string",
};

function tsType(col) {
  if (col.data_type === "ARRAY") {
    const inner = TS[col.element_type] ?? "unknown";
    return `${inner}[]`;
  }
  return TS[col.data_type] ?? "unknown";
}

const client = await connect();

const { rows: objects } = await client.query(`
  select c.relname as name,
         case c.relkind when 'r' then 'table' when 'v' then 'view' when 'm' then 'view' end as kind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind in ('r','v','m')
     and c.relname not like 'pg_%'
   order by c.relkind, c.relname
`);

const { rows: columns } = await client.query(`
  select c.table_name,
         c.column_name,
         c.data_type,
         c.is_nullable,
         c.column_default,
         c.is_identity,
         e.data_type as element_type
    from information_schema.columns c
    left join information_schema.element_types e
      on  e.object_catalog = c.table_catalog
      and e.object_schema  = c.table_schema
      and e.object_name    = c.table_name
      and e.object_type    = 'TABLE'
      and e.collection_type_identifier = c.dtd_identifier
   where c.table_schema = 'public'
   order by c.table_name, c.ordinal_position
`);

const byTable = new Map();
for (const col of columns) {
  if (!byTable.has(col.table_name)) byTable.set(col.table_name, []);
  byTable.get(col.table_name).push(col);
}

/** CHECK constraints of the form `col in ('a','b')` become string unions. */
const { rows: checks } = await client.query(`
  select rel.relname as table_name, pg_get_constraintdef(con.oid) as def
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
   where n.nspname = 'public' and con.contype = 'c'
`);

const unions = new Map();
for (const { table_name, def } of checks) {
  // Postgres renders these as: CHECK ((col = ANY (ARRAY['a'::text, 'b'::text])))
  // The column itself carries no cast, so the ::text on it must be optional.
  const m = def.match(
    /\(?\(?([a-z0-9_]+)\)?(?:::text)?\s*=\s*ANY\s*\(\s*\(?ARRAY\[(.+?)\]/is,
  );
  if (!m) continue;
  const values = [...m[2].matchAll(/'([^']+)'::text/g)].map((v) => v[1]);
  if (values.length > 1) unions.set(`${table_name}.${m[1]}`, values);
}

function columnType(col) {
  const union = unions.get(`${col.table_name}.${col.column_name}`);
  const base = union ? union.map((v) => `"${v}"`).join(" | ") : tsType(col);
  return col.is_nullable === "YES" ? `${base} | null` : base;
}

function renderTable(name, cols, isView) {
  const row = cols
    .map((c) => `          ${c.column_name}: ${columnType(c)};`)
    .join("\n");

  if (isView) {
    return `      ${name}: {\n        Row: {\n${row}\n        };\n        Relationships: [];\n      };`;
  }

  const insert = cols
    .map((c) => {
      const optional =
        c.column_default !== null || c.is_nullable === "YES" || c.is_identity === "YES";
      return `          ${c.column_name}${optional ? "?" : ""}: ${columnType(c)};`;
    })
    .join("\n");

  const update = cols
    .map((c) => `          ${c.column_name}?: ${columnType(c)};`)
    .join("\n");

  return `      ${name}: {
        Row: {
${row}
        };
        Insert: {
${insert}
        };
        Update: {
${update}
        };
        Relationships: [];
      };`;
}

const tables = objects.filter((o) => o.kind === "table");
const views = objects.filter((o) => o.kind === "view");

const header = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Produced by \`npm run db:types\` (scripts/gen-types.mjs) directly from the
 * live schema through information_schema. Regenerate after every migration and
 * commit the result.
 *
 * Generated: ${new Date().toISOString()}
 * Tables: ${tables.length} · Views: ${views.length}
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
${tables.map((t) => renderTable(t.name, byTable.get(t.name) ?? [], false)).join("\n")}
    };
    Views: {
${views.map((v) => renderTable(v.name, byTable.get(v.name) ?? [], true)).join("\n")}
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      storage_usage: {
        Args: Record<string, never>;
        Returns: {
          total_bytes: number;
          listing_bytes: number;
          article_bytes: number;
          other_bytes: number;
          object_count: number;
        }[];
      };
      tiptap_to_text: { Args: { doc: Json }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** Convenience aliases. */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];
export type Inserts<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Updates<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
`;

writeFileSync("types/database.ts", header);
console.log(
  `✓ types/database.ts — ${tables.length} tables, ${views.length} views, ` +
    `${unions.size} check-constraint unions`,
);
await client.end();
