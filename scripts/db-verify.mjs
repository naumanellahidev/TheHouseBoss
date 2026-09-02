/** Post-migration verification: counts, constraints, triggers, RLS, views. */
import { connect } from "./db-connect.mjs";

const client = await connect();
const q = async (sql) => (await client.query(sql)).rows;
let fails = 0;
const check = (ok, label, detail = "") => {
  if (!ok) fails++;
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
};

console.log("\nTABLES");
const tables = await q(
  "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1",
);
console.log("  " + tables.map((t) => t.table_name).join(", "));
check(tables.length === 11, `11 tables`, `found ${tables.length}`);

console.log("\nVIEWS");
const views = await q(
  "select table_name from information_schema.views where table_schema='public' order by 1",
);
console.log("  " + views.map((v) => v.table_name).join(", "));

console.log("\nROW LEVEL SECURITY");
const rls = await q(
  "select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relkind='r' order by 1",
);
const noRls = rls.filter((r) => !r.relrowsecurity).map((r) => r.relname);
check(noRls.length === 0, "RLS enabled on every table", noRls.join(", "));

const policies = await q(
  "select schemaname, tablename, count(*)::int n from pg_policies where schemaname in ('public','storage') group by 1,2 order by 1,2",
);
for (const p of policies) console.log(`  ${p.schemaname}.${p.tablename}: ${p.n} policies`);

console.log("\nTRIGGERS");
const triggers = await q(
  "select event_object_table t, trigger_name n from information_schema.triggers where trigger_schema='public' group by 1,2 order by 1,2",
);
for (const t of triggers) console.log(`  ${t.t} → ${t.n}`);

console.log("\nFUNCTIONS");
const fns = await q(
  "select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 1",
);
console.log("  " + fns.map((f) => f.proname).join(", "));

console.log("\nSEED DATA");
for (const [t, expect] of [["cities", 8], ["communities", 1], ["listings", 6]]) {
  const [{ n }] = await q(`select count(*)::int n from ${t}`);
  check(n === expect, `${t}: ${n}`, n === expect ? "" : `expected ${expect}`);
}

const [{ n: searchCities }] = await q("select count(*)::int n from cities where in_search");
check(searchCities === 5, `cities.in_search: ${searchCities}`, searchCities === 5 ? "" : "expected 5");

console.log("\nTRIGGER BEHAVIOUR");
const sold = await q(
  "select slug, status, sold_at, sold_price, purge_after, purge_after < now() as due from listings where status='sold'",
);
for (const s of sold) {
  console.log(`  ${s.slug}: sold ${s.sold_at?.toISOString().slice(0,10)} @ $${s.sold_price}`);
  check(s.purge_after !== null, "purge_after set by trigger");
  check(s.due === true, "purge_after is in the past (ready for the Phase 2 cron test)");
}

const [{ n: pubdated }] = await q("select count(*)::int n from listings where published and published_at is not null");
check(pubdated === 6, `published_at stamped on all published listings: ${pubdated}`);

const arts = await q("select reading_min from articles");
console.log(`  articles: ${arts.length}`);

console.log("\nCONSTRAINTS (negative tests)");
const mustFail = [
  ["photo limit > 15", `insert into listings (slug,price,address,city_id,photos) select 'x-photo-limit',1,'x',(select id from cities limit 1), (select jsonb_agg(jsonb_build_object('kind','external','url','/p.svg','w',1,'h',1,'alt','a')) from generate_series(1,16))`],
  ["publish with no photo", `insert into listings (slug,price,address,city_id,published) select 'x-nophoto',1,'x',(select id from cities limit 1), true`],
  ["sold without sold fields", `insert into listings (slug,price,address,city_id,status,photos) select 'x-sold',1,'x',(select id from cities limit 1),'sold','[{"kind":"external","url":"/p.svg","w":1,"h":1,"alt":"a"}]'::jsonb`],
  ["bad slug format", `insert into listings (slug,price,address,city_id) select 'Bad Slug!',1,'x',(select id from cities limit 1)`],
  ["uppercase lead email", `insert into leads (name,email) values ('x','UPPER@Example.com')`],
];
for (const [label, sql] of mustFail) {
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("rollback");
    check(false, `rejects ${label}`, "IT WAS ACCEPTED");
  } catch {
    await client.query("rollback");
    check(true, `rejects ${label}`);
  }
}

console.log("\nVIEWS RETURN DATA");
const facets = await q("select * from listing_facets");
check(facets.length > 0, `listing_facets: ${facets.length} rows`);
const cards = await q("select count(*)::int n from listing_card");
check(cards[0].n === 6, `listing_card: ${cards[0].n} rows`);

console.log(`\n${fails === 0 ? "✓ all checks passed" : `✗ ${fails} check(s) failed`}\n`);
await client.end();
process.exit(fails === 0 ? 0 : 1);
