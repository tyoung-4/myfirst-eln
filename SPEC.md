# ELN — Product Specification

> A lightweight, vibe-coded Electronic Lab Notebook for a small academic research team.

---

## 1. Overview

This is the product specification for a custom Electronic Lab Notebook (ELN) web application built for a ~15-person structural biology and cancer therapeutics research lab. The design philosophy is **functional-first**: ship a usable core, collect feedback, iterate.

This ELN is **not** a LIMS, not a cryo-EM processing pipeline, and not an enterprise compliance platform. It replaces paper notebooks and scattered Google Docs with a single, searchable, linkable system for documenting bench work.

### Lab Profile

| Detail | Description |
|--------|-------------|
| **Size** | ~15 members (PI, postdocs, grad students, technicians) |
| **Setting** | Cancer research institute, academic |
| **Core techniques** | Proximity labeling (TurboID), cryo-EM sample prep, X-ray crystallography, antibody engineering, protein purification (SEC, affinity), cell-based assays |
| **Typical data captured in ELN** | Gel images (SDS-PAGE, Western blots), SEC/FPLC chromatography traces, plate reader outputs, crystallization drop images, cloning/mutagenesis records, buffer recipes, transfection conditions |
| **Data NOT captured in ELN** | Raw cryo-EM data (.mrc, .star, .cs files), reconstruction volumes, synchrotron diffraction data — these are managed in dedicated pipelines (cryoSPARC, RELION, HKL-3000, etc.) |

### Scope Boundaries

- **In scope:** Experiment documentation, protocol management, basic inventory, search, file attachments (images, PDFs, small data files), user management.
- **Out of scope (Phase 1):** Cryo-EM/synchrotron raw data storage, mobile-responsive design, 21 CFR Part 11 compliance, LIMS workflows, instrument integration, barcoding.
- **Explicit exclusion:** `.mrc`, `.star`, `.cs`, `.mtz`, `.sca` and other large-format structural data files. These live in cryoSPARC, RELION, or institutional storage. The ELN may store *references* (links, session IDs, processing notes) to these datasets but never the files themselves.

---

## 2. Reference Platform Analysis

Four commercial ELNs were evaluated to inform the feature set. The goal was to identify proven UX patterns worth adopting and common pitfalls to avoid.

### Labguru
- **What works:** Project → Folder → Experiment hierarchy. Linked Resources connecting experiments to inventory items, protocols, and equipment. Customizable inventory categories. API for integrations.
- **What doesn't:** Complex onboarding. Limited table editing (no multi-cell paste). Image annotation tools lack alignment and color options.
- **Adopted pattern:** Hierarchical project organization. Bidirectional linking between entries and inventory.

### Benchling
- **What works:** Entity registration — unique, searchable records for plasmids, cell lines, antibodies, constructs, all linked to experiments. @-mention cross-referencing between entries. Excellent search. Free academic tier for Notebook + Molecular Biology tools.
- **What doesn't:** Enterprise pricing for full platform. Registry/Inventory/Workflows are overkill for a small academic lab.
- **Adopted pattern:** Entity registration concept (simplified). @-mention linking between entries.

### SciNote
- **What works:** Open-source core (Mozilla Public License 2.0). Interactive protocol checklists with completable steps. Visual experiment workflow view. RESTful API. Project/experiment/task structure.
- **What doesn't:** Tables are clunky. Limited calendar integration. Customization feels rigid. Premium features gated.
- **Adopted pattern:** Interactive protocol steps with checkboxes, timestamps, and per-step notes. Open-source reference architecture.

### Revvity Signals Notebook
- **What works:** Drag-and-drop file attachment with inline preview. Locked worksheets for SOP enforcement. Image upload with annotation. Intuitive, modern UI. MS Office inline editing.
- **What doesn't:** Enterprise-priced. Workflow engine relies on Spotfire plugins. Slow support. Built for pharma, not academia.
- **Adopted pattern:** Drag-and-drop attachments with inline image preview. Lockable protocol templates.

---

## 3. MVP Feature Set — Phase 1

### 3.1 Experiment Notebook

The core of the application. Every other feature connects back to this.

- **Rich text editor** (TipTap or similar ProseMirror-based editor) supporting headings, bold/italic, code blocks, and inline LaTeX for equations
- **Hierarchy:** Project → Experiment → Entry
- **Entry metadata:** title, auto-timestamped creation/modification dates, author, tags
- **File attachments:** drag-and-drop upload for images (PNG, JPEG, TIFF), PDFs, spreadsheets (.xlsx, .csv), and small data files. **Max file size: 50 MB per attachment.** Large structural datasets are out of scope — store a link or reference instead.
- **Inline image display:** uploaded images render within the entry body, not as download-only attachments. Basic annotation (arrows, text labels, crop) is a stretch goal for Phase 1.
- **Editable tables** within entries for sample conditions, buffer compositions, transfection matrices, etc.
- **Auto-save** with version history. Every save creates a recoverable snapshot. Minimum save interval: 30 seconds.
- **Quick-entry mode:** a lightweight input (title + freeform text + drag-drop files) for rapid logging without navigating through the full hierarchy. Entries created this way can be filed into projects later.

### 3.2 Protocol Templates

- Reusable protocol templates with **numbered, checkable steps**
- Each step supports: text instructions, expected duration, linked reagents/equipment from inventory
- **Protocol runs:** clone a template into an experiment entry to create a run instance. Steps can be checked off, and per-step notes (deviations, observations) can be recorded.
- **Version control:** updating a protocol creates a new version. Previous experiments retain the version they were run with. Version diff view is a Phase 2 feature.
- **Lockable templates:** admins can lock a protocol to prevent edits (SOP enforcement). Members can still create run instances.

### 3.3 Search

- **Full-text search** across entry bodies, titles, protocol text, inventory item names, and attachment filenames
- **Filters:** project, author, date range, tags, entry type (notebook entry vs. protocol run)
- **Results:** preview snippets with keyword highlighting, sorted by relevance with recency boost
- **Implementation:** Postgres full-text search (via `tsvector`/`tsquery`) is sufficient for MVP. Upgrade path to Typesense or Meilisearch if performance degrades beyond ~10K entries.

### 3.4 User Management

| Role | Permissions |
|------|------------|
| **Admin** (PI, lab manager) | Create/edit/delete all entries. Manage users. Lock protocols. View all projects. Access dashboard. |
| **Member** (postdoc, grad student, technician) | Create/edit own entries. View entries in projects they belong to. Create protocol runs. Add/edit inventory items. |

- **Authentication:** email/password for MVP. Institutional SSO (SAML/OAuth) is a Phase 2 integration.
- **Project membership:** users are assigned to projects. Entries within a project are visible to all project members.

### 3.5 Basic Inventory

A lightweight, table-based inventory system. This is not a LIMS — it's a searchable catalog of what's in the lab and where to find it.

**Categories:** antibodies, plasmids, cell lines, reagents, primers, proteins/constructs, buffers, other

**Fields per item:**

| Field | Type | Required |
|-------|------|----------|
| Name | text | ✓ |
| Category | enum | ✓ |
| Catalog/ID number | text | |
| Lot number | text | |
| Vendor | text | |
| Location | text (freezer → shelf → box → position) | ✓ |
| Quantity | number + unit | |
| Date added | auto-timestamp | ✓ |
| Added by | auto (current user) | ✓ |
| Notes | text | |
| Linked entries | relation[] | |

- **Linking:** inventory items can be linked to experiment entries (e.g., "Used anti-FLAG M2, Cat# F1804, Lot# SLCD4637"). Links are bidirectional — from the entry you can see which items were used; from the item you can see which experiments used it.
- **Import:** CSV upload for bulk inventory population.
- **Low-stock alerts** are a stretch goal for Phase 1.

---

## 4. Data Model

```
User
├── id: uuid (PK)
├── name: text
├── email: text (unique)
├── role: enum [admin, member]
├── avatar_url: text (nullable)
├── created_at: timestamp

Project
├── id: uuid (PK)
├── name: text
├── description: text (nullable)
├── created_by: uuid → User
├── created_at: timestamp
├── members: uuid[] → User (join table: project_members)

Experiment
├── id: uuid (PK)
├── project_id: uuid → Project
├── title: text
├── description: text (nullable)
├── created_by: uuid → User
├── created_at: timestamp
├── tags: text[]

Entry
├── id: uuid (PK)
├── experiment_id: uuid → Experiment (nullable, for quick-entry mode)
├── title: text
├── body: jsonb (rich text document, TipTap JSON format)
├── author_id: uuid → User
├── created_at: timestamp
├── updated_at: timestamp
├── version: integer (auto-incremented on save)
├── tags: text[]
├── is_quick_entry: boolean (default false)
├── search_vector: tsvector (generated column for full-text search)

EntryVersion (version history)
├── id: uuid (PK)
├── entry_id: uuid → Entry
├── version: integer
├── body: jsonb
├── saved_at: timestamp
├── saved_by: uuid → User

Attachment
├── id: uuid (PK)
├── entry_id: uuid → Entry
├── filename: text
├── file_url: text (storage path)
├── file_type: text (MIME type)
├── file_size: integer (bytes)
├── uploaded_at: timestamp
├── uploaded_by: uuid → User

Protocol
├── id: uuid (PK)
├── title: text
├── description: text (nullable)
├── version: integer
├── is_locked: boolean (default false)
├── created_by: uuid → User
├── created_at: timestamp
├── updated_at: timestamp

ProtocolStep
├── id: uuid (PK)
├── protocol_id: uuid → Protocol
├── order: integer
├── instruction: text (rich text)
├── duration_minutes: integer (nullable)
├── linked_inventory_items: uuid[] → InventoryItem

ProtocolRun
├── id: uuid (PK)
├── protocol_id: uuid → Protocol
├── protocol_version: integer
├── entry_id: uuid → Entry
├── started_at: timestamp
├── completed_at: timestamp (nullable)

StepCompletion
├── id: uuid (PK)
├── protocol_run_id: uuid → ProtocolRun
├── step_id: uuid → ProtocolStep
├── completed: boolean
├── completed_at: timestamp (nullable)
├── notes: text (nullable, for deviations/observations)

InventoryItem
├── id: uuid (PK)
├── category: enum [antibody, plasmid, cell_line, reagent, primer, protein, buffer, other]
├── name: text
├── catalog_number: text (nullable)
├── lot_number: text (nullable)
├── vendor: text (nullable)
├── location: text (formatted as "Freezer > Shelf > Box > Position")
├── quantity: decimal (nullable)
├── unit: text (nullable)
├── low_stock_threshold: decimal (nullable)
├── added_by: uuid → User
├── added_at: timestamp
├── notes: text (nullable)
├── search_vector: tsvector

EntryInventoryLink (join table)
├── entry_id: uuid → Entry
├── inventory_item_id: uuid → InventoryItem
├── usage_note: text (nullable, e.g., "1:1000 dilution", "5 µg")
```

---

## 5. Tech Stack

Optimized for AI-assisted development (vibe coding) and minimal ops overhead for a small team.

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js (App Router) | Full-stack React. Server components for fast loads. API routes for backend logic. Excellent AI coding tool support. |
| **Styling** | Tailwind CSS + shadcn/ui | Utility-first CSS. shadcn provides accessible, customizable components without lock-in. |
| **Rich Text Editor** | TipTap (ProseMirror) | Extensible editor with first-class support for tables, images, checklists, @-mentions, and collaborative editing. JSON document format stores cleanly in Postgres. |
| **Database** | Supabase (PostgreSQL) | Managed Postgres with built-in auth, row-level security, real-time subscriptions, and storage. Free tier covers a 15-person lab. |
| **Auth** | Supabase Auth | Email/password for MVP. Supports SSO (SAML, OAuth) for Phase 2 institutional login. |
| **File Storage** | Supabase Storage | S3-compatible. Handles image uploads, PDFs, spreadsheets. Set bucket policies for max file size (50 MB). |
| **Search** | PostgreSQL full-text search | Built into Supabase. `tsvector` columns on Entry and InventoryItem tables. No additional infrastructure. |
| **Deployment** | Vercel | Zero-config Next.js hosting. Preview deployments for PRs. Free tier is sufficient. |
| **Monorepo / Package** | pnpm | Fast, disk-efficient. Good monorepo support if the project grows. |

### Alternative Stack (More Control)

If Supabase's abstractions become limiting:

| Layer | Alternative |
|-------|------------|
| Database | Self-hosted PostgreSQL (e.g., Railway, Neon) |
| ORM | Prisma or Drizzle |
| Auth | NextAuth.js / Auth.js |
| Storage | AWS S3 or Cloudflare R2 |

---

## 6. UI/UX Principles

These are derived from user feedback on the four reference platforms and tailored for how bench scientists actually work.

**1. Minimize friction to log data.** The path from "I just finished an experiment" to "it's documented" should be ≤3 clicks. The quick-entry mode supports this — type a title, paste notes, drag-drop a gel image, done. File it into a project later.

**2. Search is the primary navigation.** Most users won't browse the hierarchy — they'll search. The search bar should be globally accessible (⌘+K / Ctrl+K), fast, and return results across entries, protocols, and inventory. Filter chips for project, author, date, and tags.

**3. Images display inline.** This lab generates images constantly — gels, blots, chromatograms, crystal drops. Uploaded images must render within the entry body, not as download links. Click to expand. Basic annotation (Phase 1 stretch) or full annotation tools (Phase 2).

**4. Protocols are interactive checklists.** When running a protocol, each step should be individually checkable with a timestamp. Deviations and observations are noted per-step. A protocol run should read as a complete record of what was done and what was different from the template.

**5. Link everything with @-mentions.** Type `@` to reference other entries, inventory items, protocols, or team members. This creates the web of connections that makes a digital notebook more useful than paper. Every link is bidirectional.

**6. Skip compliance theater.** Auto-timestamps and version history are sufficient auditability for an academic lab. No e-signatures, no formal witnessing, no 21 CFR Part 11. If compliance needs arise later, the version history and audit log provide a foundation.

**7. Desktop-first design.** The primary use case is documentation at a desk workstation after completing bench work, or at a computer terminal near instruments. Mobile-responsive layout is a Phase 2 enhancement, not a core requirement.

---

## 7. Phase 2 Roadmap

Features to build after the MVP is stable and adopted. Prioritize based on team feedback.

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Mobile-responsive UI** | Responsive layout for phone/tablet use at the bench. Simplified entry creation on small screens. | Medium |
| **Equipment scheduling** | Calendar-based booking for shared instruments (FPLC, plate reader, centrifuges). Maintenance log and calibration tracking. | Medium |
| **Sample barcoding** | Generate and print QR codes for tubes/boxes/plates. Scan to look up sample info and linked experiments. | Medium |
| **Data visualization** | Inline plotting for SEC traces, binding curves, dose-response. Embed Plotly/Chart.js charts in entries. | Medium |
| **AI features** | Auto-summarize experiments. Suggest related entries. Extract structured data from gel images. Natural language search. | High |
| **Export & reporting** | Generate PDF lab reports from entries. Export data for grant applications, publications, or progress reports. | Low |
| **Instrument integration** | Connect to ÄKTA UNICORN, plate reader software, or other instrument outputs. Auto-import data files. | High |
| **Advanced inventory** | Purchase order tracking. Vendor catalog integration. Auto-decrement stock when items are consumed in experiments. | Medium |
| **Collaboration** | Threaded comments on entries. @-mention notifications (email or Slack). Shared protocol libraries across lab groups. | Medium |
| **Institutional SSO** | SAML/OAuth integration with university identity providers. | Low |
| **Protocol version diffing** | Side-by-side comparison of protocol versions showing what changed. | Low |
| **External references** | Structured links to external datasets — cryoSPARC session IDs, PDB accession codes, synchrotron beamline logs. Not file storage, just metadata and links. | Low |

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Low adoption** — team sticks with paper/Google Docs | High | Critical | Make entry creation faster than paper. Quick-entry mode. Don't enforce rigid structure upfront — let people be messy, then organize later. PI buy-in via dashboard showing lab activity. |
| **Data loss** | Low | Critical | Auto-save every 30 seconds. Supabase provides automated daily backups. Version history enables point-in-time recovery of any entry. |
| **Feature creep** | High | Medium | Strict Phase 1 / Phase 2 boundary. Ship the notebook first. Collect feedback for 4–6 weeks before building Phase 2 features. |
| **Storage growth** | Medium | Low | 50 MB per-file limit. Client-side image compression on upload. Explicit exclusion of large structural data files (.mrc, .star, etc.). Monitor storage usage via Supabase dashboard. |
| **Search performance degrades** | Low | Medium | Postgres FTS is performant to ~100K rows. If the lab generates more, migrate to Typesense or Meilisearch. Index `tsvector` columns. |
| **Editor complexity** | Medium | Medium | TipTap is well-documented but has a learning curve for custom extensions. Start with default extensions (text, image, table, checklist). Add custom features incrementally. |

---

## 9. File & Attachment Policy

Since this ELN serves a structural biology lab, it's important to be explicit about what belongs in the app and what doesn't.

### Stored in the ELN
- Gel images (SDS-PAGE, Western blot, Coomassie) — PNG, JPEG, TIFF
- Chromatography traces (SEC, ion exchange) — exported as PNG/PDF/CSV from UNICORN or similar
- Plate reader data — exported CSV or Excel files
- Crystallization drop images — JPEG/PNG from imaging systems
- Cloning maps and sequence files — small files (.gb, .fasta, .ab1), ≤50 MB
- PDFs (papers, vendor spec sheets, protocols)
- Spreadsheets (.xlsx, .csv) for experimental conditions, quantifications
- Presentation slides or figures relevant to an experiment

### NOT stored in the ELN
- Raw cryo-EM data (micrographs, movies, .mrc, .mrcs files) — managed in **cryoSPARC**
- Particle stacks, reconstructed volumes, half-maps
- RELION job directories
- Synchrotron diffraction data (.img, .cbf, .h5 files) — managed in beamline pipelines
- Processed structure files (.mtz, .pdb refinement intermediates) — stored in institutional servers
- Any single file >50 MB

For structural data, the ELN entry should contain **processing notes, parameters, and links** (e.g., "cryoSPARC job J42, 3.2 Å resolution, C1 symmetry") rather than the data itself. This keeps the app lightweight and avoids duplicating data that already lives in purpose-built systems.

---

## 10. Getting Started

```bash
# Clone the repo
git clone https://github.com/<your-org>/eln.git
cd eln

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Fill in Supabase project URL, anon key, and service role key

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 11. Contributing

This project is maintained by the Williams Lab. Contributions from lab members are welcome.

1. Create a feature branch from `main`
2. Make changes and test locally
3. Open a pull request with a description of what changed and why
4. Request review from the project maintainer

---

## License

MIT — see [LICENSE](./LICENSE) for details.
