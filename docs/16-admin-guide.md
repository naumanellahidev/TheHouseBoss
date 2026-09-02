# 16 — Using the Dashboard

Written for Krisi, not for a developer. Everything here is something you will
actually do.

**Sign in:** `thehousebossfl.com/admin` → enter your email → click the link we
send you. There is no password. If the link expires, ask for another; they only
work once.

---

## Adding a listing

This is the thing you will do most, so it is worth doing once with me watching.

1. **Listings → Add listing.**
2. Fill in the **Basics**: address, city, price. That is enough.
3. **Save draft.** Nothing is public yet.
4. Now the **Media** tab works. Drag photos in, or click Choose photos.

**Why you have to save first:** photos are filed under the listing, so the
listing has to exist before there is anywhere to put them.

### The photo rules, and why

- **Fifteen photos maximum.** Not an arbitrary limit — the whole site shares
  1 GB of storage, and fifteen good photos sell a house better than thirty
  mediocre ones. The uploader stops you at fifteen and says so.
- **Every photo needs alt text.** A short description of what is in the picture:
  *"Kitchen with quartz island and gas range"*. This is read aloud to anyone
  using a screen reader, and it is the law. **You cannot publish without it** —
  the Publish button stays greyed out and tells you how many are missing.
- **The first photo is the cover.** Use the arrows to reorder, or "Make cover".
- Photos upload as soon as you drop them, so you can keep typing while they
  finish. If one fails, only that one shows a Retry.

### Before you can publish

The **Publish** tab shows a checklist. Publish stays disabled until all five
pass, and each unfinished item is a link to the tab that fixes it:

- at least one photo
- every photo has alt text
- description at least 100 characters
- meta description written
- price, city and status set

The **meta description** is the sentence that appears under your link in Google,
and it is often the sentence an AI assistant quotes. Write it as a sentence, not
keywords.

### The Contractor's Take

On the **Content** tab. Your construction read on the property — roof age, what
the panel looks like, what a kitchen would realistically cost to redo.

**No other agent's listing in this market has this.** It is the single most
valuable field on the page. Two or three honest sentences beat a paragraph of
marketing.

### When a home sells

Change **Status** to Sold, then fill in the sold date and sold price.

What happens next, so nothing surprises you:

- The page **stays live forever**. It keeps its address, its ranking and its
  place in your sold record.
- **Seven days after the sold date**, the large photos are deleted automatically
  and a small version of each is kept. The page then says "Photos archived".
- That frees roughly 3 MB per listing, which is what keeps you inside the
  storage budget without ever deleting anything that matters.
- If you want to keep the full-size photos on a particular home — a showpiece
  for your portfolio — turn on **Keep photos permanently** before the seven days
  are up.

---

## Writing an article

**Articles → Write an article.**

Three kinds:

- **Blog post** — attach it to Lake Mary and it appears on the Lake Mary blog.
- **Market update** — appears under Market Updates.
- **Guide** — long-form.

Write in the editor. It works like any text editor; the toolbar has headings,
bold, lists, quotes, links, images and tables. **There is no Heading 1 button**
on purpose: the article title is the page's only heading 1, and having two
breaks the structure that search engines read.

Save the draft first, then you can add images. Every image asks for a
description, for the same reason listing photos do.

**Preview** opens the real page in a new tab, exactly as it will look. You can
send that link to someone for review without publishing.

**The excerpt** is the summary shown on every card that links to the article,
and it is usually what gets quoted. There is a button to draft one from your
first paragraph if you would rather edit than write.

---

## City pages

**Cities → Edit.** You cannot add or delete a city; the eight are fixed.

- **Introduction** — why someone would want to live there, in your voice. The
  first two paragraphs also appear on that city's homes-for-sale page.
- **Living here** — schools, commute, parks, dining, events. Markdown works:
  `## Heading`, `**bold**`, `- bullet`.
- **Statistics** — median price, days on market and so on. **Every figure needs
  the date it was true**, and the form will not save without it. A market number
  with no date looks current forever, long after it stops being; this is the one
  place on the site where being wrong is genuinely damaging, because it is the
  section an AI assistant is most likely to quote back to someone.
  Leave anything blank that you do not have a real figure for.
- **Questions** — three or four real questions people ask. These appear as an
  accordion on the page **and** as structured data, which is how a search engine
  or an assistant can quote the answer directly. Write the question the way
  someone would actually ask it, and answer it in the first sentence.

The city pages currently carry first-draft copy written during the build. It is
factually safe but it is not in your voice — replacing it is one of the highest
-value hours you can spend on this site.

---

## Communities

**Communities → Add a community.** Heathrow is already there.

People search for neighbourhoods far more than for cities. A community page can
rank for something a city page never will.

You cannot delete a community while listings are still filed under it — you will
be told how many. Move them first.

---

## Reviews

**Reviews → Add a review.** Paste what they actually wrote, set the source
(Google, Zillow, Realtor.com, Direct) and link to the original where there is
one.

Three rules, and they are not stylistic:

- **Only reviews you actually received.** Fabricated or incentivised reviews
  without disclosure are treated as a deceptive practice, and people check.
- **Do not change what a review says.** Trimming for length is fine.
- **Get permission before publishing a full name.**

The site publishes individual reviews with their sources and deliberately does
**not** publish an average star rating. An aggregate is easy to inflate, and
review markup is something Google actively polices.

---

## Enquiries

**Leads.** Every form on the site lands here, and you get an email the moment one
arrives. Replying to that email answers the person directly.

On the lead itself you can tap to call, email with the subject already filled
in, set a status, and add a note. **Notes save when you click away** — you do not
need to press anything.

Marking a lead **Spam** keeps the record and hides it. Deleting removes it
permanently.

This screen is built to work properly on your phone, because that is where you
will read most of them.

---

## Settings

**Settings.** Six tabs. The two worth your attention:

**Profiles** — your Google Business Profile, Realtor.com, Zillow, Facebook,
Instagram, LinkedIn. These do two jobs: they appear in the footer, and they are
published as the machine-readable statement that all those profiles are the same
person. That is a large part of how a search engine or an assistant decides your
site is trustworthy. Adding one takes effect immediately.

**Compliance** — your licence numbers and the brokerage name. These are on every
page because Florida advertising rules require them, and the brokerage name is
rendered at least as prominently as your own for the same reason. They are
editable so a licence renewal can be handled without a developer, not so they
can be shortened. **Check with your broker before changing anything here.**

---

## The storage meter

Always visible in the sidebar. The site has 1 GB, which is roughly 270 listings
at fifteen photos each.

- **Green** — nothing to think about.
- **Amber, above 70%** — worth a look at Media, sorted by size.
- **Red, above 90%** — uploads will start being refused, with an explanation.

Sold listings give most of their space back automatically. **Media → Unused
files** finds anything left behind by a deleted listing and tells you how much
it would free.

---

## Needs attention

The panel on the dashboard. It is computed from your actual data, and it is the
closest thing to having someone check the site for you:

- sold listings whose photos should have purged and have not
- photos missing alt text
- published listings with fewer than five photos
- published listings with no meta description
- articles sitting in draft for over a month
- published city pages with no content

If it is empty, there is genuinely nothing to do.

---

## Things that are safe, and things that are not

**Safe:**

- Unpublishing anything. It hides the page and keeps everything.
- Renaming a listing's web address. A permanent redirect is created
  automatically, so no existing link ever breaks.
- Editing anything at all. Every change is saved and the site updates within
  seconds.

**Not safe, and each asks you to type the name to confirm:**

- **Deleting a listing.** Removes the page and its photos. If it was ever
  published, its address starts returning "not found" — which is exactly what
  you spent months getting Google to index. **Unpublish instead.**
- **Deleting an article.** Same.
- **Deleting a review.** Unpublishing hides it and keeps the record.

---

## If something goes wrong

- **A photo will not upload.** Check the storage meter first. If it is not full,
  the file may not be a photo — the uploader accepts JPEG, PNG, WebP and AVIF.
- **Publish is greyed out.** The checklist on the Publish tab says why, and each
  item links to where you fix it.
- **The sign-in link does not work.** They work once and expire after an hour.
  Ask for another.
- **Something looks wrong on the live site.** Changes appear within seconds. If
  one has not after a minute, sign out and back in before assuming it failed.
