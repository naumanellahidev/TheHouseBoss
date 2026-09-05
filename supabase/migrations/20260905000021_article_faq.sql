-- 021_article_faq.sql
--
-- FAQs on articles (brief §21).
--
-- WHY ARTICLES NEED THEIR OWN COLUMN
--
-- `cities` and `communities` have carried `faq_json` since migration 003.
-- Articles never did, so the "Article FAQ Engine" §21 asks for had nowhere to
-- put its output — the suggester could find questions in the body and the
-- editor had no field to accept them into.
--
-- Same shape as the existing two, deliberately: an array of {q, a} objects,
-- with a CHECK that it is an array. `FaqRepeater` and `FaqAccordion` then work
-- unchanged, and `faqJsonLd` reads one shape rather than three.
--
-- WHY IT IS NOT A TABLE
--
-- A FAQ belongs to exactly one record, is always read whole, is never queried
-- across records, and is ordered by the author. That is a document, and a
-- `article_faqs` table with a position column would add a join to every article
-- render to model something jsonb already models correctly.
--
-- ROLLBACK
--   alter table articles drop column faq_json;

alter table articles
  add column if not exists faq_json jsonb not null default '[]'::jsonb;

alter table articles
  drop constraint if exists articles_faq_is_array;

alter table articles
  add constraint articles_faq_is_array check (jsonb_typeof(faq_json) = 'array');

comment on column articles.faq_json is
  'Questions this article answers, as [{q, a}]. Brief §21: FAQPage markup is '
  'emitted only when these are also rendered on the page, which is why the '
  'article view reads this same column rather than taking a separate prop.';
