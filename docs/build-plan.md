# Toph Fall 2026 Dev Challenge --- Final "Wow Us" Build Plan

## Mission

Build a production-ready version of the supplied **Toph farmer
dashboard** that demonstrates both visual execution and experienced
full-stack engineering.

The target is:

``` text
Figma-accurate UI
        +
Thoughtful relational database
        +
Real persistent reads/writes
        +
Authentication + farm isolation
        +
One product-relevant "wow" workflow
        +
Production deployment
```

Do **not** interpret "wow" as "use as many technologies as possible."

The goal is a product implementation whose architecture and tradeoffs
can be clearly defended.

------------------------------------------------------------------------

# 1. Stack

``` text
Framework:       Next.js
Language:        TypeScript
Styling:         Tailwind CSS

Backend:         Supabase
Database:        PostgreSQL
Authentication:  Supabase Auth
Authorization:   PostgreSQL Row Level Security (RLS)
Storage:         Supabase Storage if needed for recordings

Deployment:      Vercel
Source Control:  Git + GitHub

Engineering:     GPT-6 Astra via Codex/OpenRouter
Frontend:        Fugu
Escalation:      GPT-6 Astra Pro
```

No separate Express/FastAPI service unless a real requirement emerges.

------------------------------------------------------------------------

# 2. Architecture

``` text
                     USER
                       │
                       ▼
                Supabase Auth
                       │
                       ▼
                    Profile
                       │
                    farm_id
                       │
                       ▼
               ┌──────────────┐
               │   Next.js    │
               │  Dashboard   │
               └──────┬───────┘
                      │
               Server/Data Layer
                      │
                      ▼
               ┌──────────────┐
               │   Supabase   │
               │  PostgreSQL  │
               └──────┬───────┘
                      │
        ┌─────────────┼──────────────┐
        ▼             ▼              ▼
    Employees       Fields      Activity Logs
                                      │
                            ┌─────────┼─────────┐
                            ▼         ▼         ▼
                       Recordings    Tags    Location
```

The farm acts as the tenant boundary.

RLS should prevent an authenticated user from accessing another farm's
data.

------------------------------------------------------------------------

# 3. Model Responsibilities

## GPT-6 Astra

Use Astra for:

-   challenge interpretation
-   architecture
-   project setup
-   database schema
-   Supabase
-   PostgreSQL
-   data layer
-   queries
-   mutations
-   persistence
-   authentication
-   RLS
-   search/filter/sort
-   metrics
-   audio integration
-   map integration
-   debugging
-   functional QA
-   deployment
-   README
-   interview preparation

## Fugu

Use Fugu for:

-   Figma/screenshot → React/Tailwind
-   layout
-   spacing
-   typography
-   dimensions
-   borders/radii
-   icons
-   table/card styling
-   expanded-log styling
-   final visual comparison

## GPT-6 Astra Pro

Use only when:

-   Astra remains stuck on a difficult bug
-   production behavior is difficult to diagnose
-   RLS/security needs a deeper review
-   you want one final engineering audit

------------------------------------------------------------------------

# 4. Model Switching

``` text
ASTRA
Requirements + Architecture
        │
        ▼
ASTRA
Project Setup
        │
        ▼
FUGU
Default Dashboard
        │
        ▼
FUGU
Expanded Log
        │
        ▼
ASTRA
Database + Persistence
        │
        ▼
ASTRA
Core Functionality
        │
        ▼
ASTRA
Authentication + RLS
        │
        ▼
ASTRA
Wow Feature
        │
        ▼
FUGU
Final Visual QA
        │
        ▼
ASTRA
Regression + Deployment QA
        │
        ▼
ASTRA PRO
Optional Deep Review
        │
        ▼
YOU
Final Verification
```

Short version:

``` text
ASTRA → FUGU → ASTRA → FUGU → ASTRA
```

------------------------------------------------------------------------

# 5. Phase 0 --- Architecture First

## Model: GPT-6 Astra

Give Astra:

-   challenge document
-   all Figma screenshots
-   product-context screenshots
-   this Markdown

Use this prompt:

``` text
Read all supplied challenge materials and screenshots before modifying code.

This is a timed full-stack developer challenge.

The challenge explicitly raises expectations for applicants with development
experience. I want a well-thought-out database implementation and, after the
core application is excellent, authentication and one product-relevant
above-and-beyond feature.

Stack:
- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL
- Supabase Auth
- PostgreSQL Row Level Security
- Vercel

Fugu will separately handle the initial high-fidelity frontend implementation.

You own:
- architecture
- project setup
- relational database design
- backend/data layer
- persistence
- authentication
- authorization/RLS
- integration
- functionality
- debugging
- testing
- deployment

Constraints:

1. The supplied Figma is the source of truth for appearance.
2. Do not redesign the interface.
3. Use the simplest production-defensible architecture.
4. Do not introduce infrastructure merely to appear sophisticated.
5. Model the product domain rather than simply mirroring UI fields.
6. At least one visible interaction must perform a real persistent mutation.
7. Authentication and farm-level isolation should be added after the core app is stable.
8. Any above-and-beyond feature must naturally relate to Toph.

Before coding, give me:

1. proposed architecture
2. relational database schema
3. relationship explanation
4. data flow
5. authentication/authorization design
6. implementation phases
7. dependencies
8. one or two product-relevant wow-feature candidates
9. anything in this plan you would change and why
10. what NOT to build because it would be overengineering

Do not start coding until I approve the architecture.
```

------------------------------------------------------------------------

# 6. Phase 1 --- Initialize Project

## Model: GPT-6 Astra

Create:

``` text
Next.js
TypeScript
Tailwind
clean component boundaries
clean data-access boundaries
environment-variable setup
```

Do not spend significant time styling.

Verify:

``` bash
npm run dev
```

Then checkpoint:

``` bash
git status
git add .
git commit -m "Initialize Toph dashboard"
git push
```

------------------------------------------------------------------------

# 7. Phase 2 --- Default Dashboard

## SWITCH: Astra → Fugu

Give Fugu the repository plus the original screenshots.

Prompt:

``` text
Recreate the supplied Toph dashboard in the existing Next.js project.

The screenshots are the source of truth.

Prioritize visual fidelity above everything else.

Do NOT redesign or reinterpret the interface.

Match:
- dimensions
- spacing
- typography
- font weights
- sidebar width
- cards
- table dimensions
- row heights
- buttons
- borders
- border radii
- icons
- alignment
- overall proportions

Create reusable React components where appropriate.

Use temporary mock data.

Do NOT implement or redesign the backend.
GPT-6 Astra will handle backend/data integration separately.

Preserve the existing project architecture unless a frontend-specific change
is clearly necessary.
```

Implement all visible default-dashboard elements.

------------------------------------------------------------------------

# 8. Phase 3 --- Figma Pixel Pass

## Model: Fugu

Compare the browser directly against the source screenshot.

Check:

``` text
Sidebar width
Main-content offset
Heading position
Search position
Metric-card dimensions
Metric-card spacing
Logs-container dimensions
Table width
Row height
Typography
Font weights
Borders
Buttons
Icons
Padding
Alignment
```

Do not settle for merely "similar."

------------------------------------------------------------------------

# 9. Phase 4 --- Expanded Log

## Model: Fugu

Implement generic expansion:

``` text
View
 ↓
expandedLogId
 ↓
Expanded Log
 ↓
Close
```

Implement all supplied expanded-state content, including:

-   employee
-   activity
-   date
-   field
-   time
-   waveform
-   Play Recording
-   Add Tag
-   summary
-   map/location
-   Expand Map

Do not hard-code the component around a single employee.

------------------------------------------------------------------------

# 10. Phase 5 --- Freeze Frontend

Verify:

-   [ ] Default view closely matches Figma
-   [ ] Expanded view closely matches Figma
-   [ ] View works
-   [ ] Close works
-   [ ] Expansion works generically

Checkpoint:

``` bash
git add .
git commit -m "Implement high fidelity Toph dashboard"
git push
```

Do this **before** backend integration.

------------------------------------------------------------------------

# 11. Phase 6 --- Database

## SWITCH: Fugu → GPT-6 Astra

Use a relational product model rather than simply dumping every visible
property into one table.

Recommended starting schema:

``` text
farms
- id
- name
- created_at
- updated_at
```

``` text
profiles
- id
- farm_id
- full_name
- role
- created_at
- updated_at
```

`profiles.id` should correspond to the authenticated user where
appropriate.

``` text
employees
- id
- farm_id
- full_name
- status
- created_at
- updated_at
```

``` text
fields
- id
- farm_id
- name
- latitude
- longitude
- created_at
- updated_at
```

``` text
activity_logs
- id
- employee_id
- field_id
- activity_type
- started_at
- ended_at
- summary
- response_accuracy
- created_at
- updated_at
```

``` text
recordings
- id
- activity_log_id
- storage_path
- duration_seconds
- created_at
- updated_at
```

``` text
tags
- id
- farm_id
- name
- created_at
- updated_at
```

``` text
activity_log_tags
- activity_log_id
- tag_id
- created_at
```

Relationships:

``` text
Farm
 ├── Profiles
 ├── Employees
 ├── Fields
 └── Tags

Employee
 └── Activity Logs

Field
 └── Activity Logs

Activity Log
 ├── Recording
 └── Tags (many-to-many)
```

Astra can refine this schema if the supplied product requirements
justify a cleaner model.

------------------------------------------------------------------------

# 12. Database Quality

Use deliberately where appropriate:

-   UUID primary keys
-   foreign keys
-   `NOT NULL`
-   useful unique constraints
-   timestamps
-   useful indexes
-   sensible delete behavior
-   check constraints
-   migrations
-   reproducible seed data
-   RLS policies

Avoid:

``` text
one giant JSON blob
hard-coded frontend data masquerading as backend data
one enormous table containing unrelated concepts
normalization that adds complexity without product value
```

------------------------------------------------------------------------

# 13. Phase 7 --- Seed the Supplied Data

Seed the employee/activity records shown by the supplied Figma.

Use exact source values where they are available.

If supporting information is needed but is not specified by the
challenge/Figma, use reasonable demo data without pretending that it
came from the supplied design.

------------------------------------------------------------------------

# 14. Phase 8 --- Persistent Integration

Prompt Astra:

``` text
The Figma frontend is complete.

Preserve its appearance.

Replace mock data incrementally with Supabase/PostgreSQL data.

Do not rewrite working frontend components unless a small integration change
is actually required.

Integrate and verify one feature at a time.
```

Integration order:

``` text
1. Employee logs
2. Expanded log details
3. Fields/location
4. Recordings
5. Tags
6. Dashboard metrics
```

Test after every step.

Checkpoint when stable.

------------------------------------------------------------------------

# 15. Phase 9 --- Real Metrics

Avoid hard-coded dashboard numbers where the data model supports
calculation.

Examples:

``` text
Today's Recordings
        ↓
relevant activity/recording count

Active Workers
        ↓
employee/activity state

Response Accuracy
        ↓
aggregate relevant stored accuracy values
```

Use definitions you can explain.

Do not fabricate an AI/ML pipeline.

------------------------------------------------------------------------

# 16. Phase 10 --- Search

Search meaningful attributes:

``` text
Employee
Activity
Field
```

Example:

``` text
Search: Isaac
       ↓
Isaac Wang remains
```

For the challenge's small dataset, filtering already-authorized loaded
data client-side is defensible.

At scale, explain that filtering and pagination would move server-side.

------------------------------------------------------------------------

# 17. Phase 11 --- Sort + Filters

Implement the visible controls.

Possible sorting:

``` text
Newest
Oldest
Employee A-Z
Employee Z-A
```

Useful filters:

``` text
Activity
Employee
Field
Tag
```

Make **This Month** functional rather than decorative.

------------------------------------------------------------------------

# 18. Phase 12 --- Persistent Add Tag

This should be a real database mutation.

Target:

``` text
Open Isaac
    ↓
Add Tag
    ↓
Needs Review
    ↓
Database write
    ↓
UI updates
    ↓
Refresh
    ↓
Open Isaac
    ↓
Needs Review remains
```

If practical, allow the dashboard to filter by tag.

That turns the supplied Add Tag control into an actual management
workflow.

------------------------------------------------------------------------

# 19. Phase 13 --- Audio

Use a clean recording model.

Possible flow:

``` text
Activity Log
     ↓
Recording
     ↓
Supabase Storage / demo audio
     ↓
Play/Pause
```

Implement the supplied waveform/play experience.

Do not build live transcription unless every higher-priority feature is
already excellent.

------------------------------------------------------------------------

# 20. Phase 14 --- Map

Use the activity/field location data.

``` text
Activity Log
     ↓
Field
     ↓
Coordinates
     ↓
Map marker
```

Implement the supplied map and Expand Map interaction where applicable.

Avoid unnecessary GIS complexity.

------------------------------------------------------------------------

# 21. Phase 15 --- Authentication

## Model: GPT-6 Astra

After the core dashboard is stable, add Supabase Auth.

Target:

``` text
User
 ↓
Sign In
 ↓
auth.users
 ↓
Profile
 ↓
farm_id
 ↓
Bays Ranch
```

Keep the authentication experience simple.

Do not let auth work degrade the supplied dashboard.

------------------------------------------------------------------------

# 22. Phase 16 --- Farm-Level Authorization / RLS

This is the main experienced-developer backend enhancement.

Treat farms as tenants:

``` text
Authenticated User
        ↓
Profile
        ↓
farm_id
        ↓
PostgreSQL RLS
        ↓
Authorized farm data only
```

Protect appropriate:

-   employees
-   fields
-   activity logs
-   recordings
-   tags

Do not treat frontend filtering as authorization.

Test unauthorized access behavior.

------------------------------------------------------------------------

# 23. Phase 17 --- ONE Product-Relevant "Wow" Feature

Do not build five half-finished extras.

## Recommended: Review Workflow

Extend the supplied Add Tag behavior into something genuinely useful:

``` text
Worker Activity Log
       ↓
Manager opens log
       ↓
Adds "Needs Review"
       ↓
Persistent DB relationship
       ↓
Dashboard filter:
Needs Review
       ↓
Manager sees logs requiring attention
```

Optional extension:

``` text
Unreviewed
    ↓
Needs Review
    ↓
Reviewed
```

This is the recommended "wow" feature because it naturally demonstrates:

``` text
Product thinking
Database design
Many-to-many relationships
Mutations
Persistence
Filtering
Management workflow
```

without inventing unrelated infrastructure.

### Alternative A --- Accuracy Review

If the supplied product meaningfully supports response-accuracy
information:

``` text
Accuracy data
 ↓
Low-confidence log
 ↓
Highlight for review
 ↓
Manager inspects it
```

Do not claim to run an ML model if you are not actually doing so.

### Alternative B --- Rich Field Activity Map

If map work is straightforward:

``` text
Fields + Activity Logs
       ↓
Interactive Map
       ↓
Activity markers
       ↓
Select marker
       ↓
Relevant log
```

Pick **one** primary wow feature.

------------------------------------------------------------------------

# 24. Phase 18 --- Product States

Add professional states without redesigning the interface:

-   loading
-   empty
-   error
-   mutation pending
-   mutation failure
-   disabled controls when appropriate

Avoid unnecessary animation.

------------------------------------------------------------------------

# 25. Phase 19 --- Functional QA

## Model: GPT-6 Astra

Verify:

-   [ ] Authentication works
-   [ ] Correct farm resolves
-   [ ] Database reads work
-   [ ] Seed logs appear
-   [ ] Every row expands
-   [ ] Expanded data is correct
-   [ ] Search works
-   [ ] Sort works
-   [ ] Filters work
-   [ ] This Month works
-   [ ] Tag creation works
-   [ ] Tag survives refresh
-   [ ] Tag filter works if implemented
-   [ ] Audio works
-   [ ] Map works
-   [ ] Metrics behave correctly
-   [ ] Loading states work
-   [ ] Error states are reasonable
-   [ ] RLS protects farm data
-   [ ] No major console errors
-   [ ] No unexpected failed requests

------------------------------------------------------------------------

# 26. Phase 20 --- Final Visual QA

## SWITCH: Astra → Fugu

Give Fugu:

``` text
TARGET
1. Original default Figma
2. Original expanded Figma

CURRENT
3. Current default screenshot
4. Current expanded screenshot
```

Prompt:

``` text
The application is now functionally complete.

Do NOT change:
- backend behavior
- database logic
- Supabase integration
- authentication
- RLS
- queries
- mutations
- application architecture

The supplied Figma screenshots remain the source of truth.

Perform a visual-fidelity pass only.

Fix:
- dimensions
- spacing
- typography
- font weights
- borders
- colors
- icons
- alignment
- table sizing
- card sizing
- expanded-view layout

Do not redesign anything.
Do not remove or change functionality.
```

------------------------------------------------------------------------

# 27. Phase 21 --- Regression QA

## SWITCH: Fugu → GPT-6 Astra

Prompt:

``` text
Fugu completed the final visual pass.

Do not alter visual styling unless required to repair a functional regression.

Run a focused functional regression review.

Check:
- data fetching
- authentication
- RLS-dependent flows
- expansion
- search
- filtering
- sorting
- persistent mutations
- audio
- map
- production assumptions

Make only targeted fixes.
```

------------------------------------------------------------------------

# 28. Phase 22 --- Deployment

Deploy:

``` text
GitHub
   ↓
Vercel
   ↓
Next.js

Supabase
   ├── Auth
   ├── PostgreSQL
   ├── Storage
   └── RLS
```

Configure production environment variables.

Test in incognito:

``` text
Open production URL
        ↓
Sign in
        ↓
Dashboard loads
        ↓
Search / filter / sort
        ↓
Open activity
        ↓
Play recording
        ↓
Inspect map
        ↓
Add Needs Review
        ↓
Refresh
        ↓
Tag remains
```

Do not rely only on localhost.

------------------------------------------------------------------------

# 29. Phase 23 --- README

Recommended structure:

``` text
# Toph Dashboard

## Overview
## Live Demo
## Screenshots
## Tech Stack
## Architecture
## Database Design
## Authentication & Authorization
## Data Flow
## Key Features
## Running Locally
## Environment Variables
## Design Decisions
## Tradeoffs
## Scaling Considerations
## Future Improvements
```

Explain **why** decisions were made rather than merely listing
technologies.

------------------------------------------------------------------------

# 30. Database Interview Explanation

Understand why the implementation is not:

``` text
activity_logs
- employee_name
- farm_name
- field_name
- tag1
- tag2
- audio
- everything_else
```

Be able to explain:

``` text
Farm owns employees and fields.

Employees generate activity logs.

Activity logs reference fields.

Recordings belong to activity logs.

Tags can be reused across logs.

A join table supports many-to-many log/tag relationships.

Profiles connect authenticated users to farms.
```

Also understand where normalization would become unnecessary complexity.

------------------------------------------------------------------------

# 31. Authentication / RLS Interview Explanation

Understand:

``` text
Authentication:
Who is this user?

Profile:
Which farm/organization do they belong to?

RLS:
Which database rows may they access?
```

Know why client-side filtering alone is not a security boundary.

------------------------------------------------------------------------

# 32. Scaling Explanation

For this challenge:

``` text
Small dataset
 ↓
Simple queries
 ↓
Client-side search/filter can be reasonable
```

At larger scale:

``` text
More farms
More employees
More activity logs
        ↓
Server-side filtering
Pagination
Indexes
Potential caching
Background processing for audio/transcription
```

Do not implement all of this now.

Know how the architecture would evolve.

------------------------------------------------------------------------

# 33. What NOT to Build

Unless all higher-priority work is finished, do not spend time on:

-   custom Express backend just to have one
-   FastAPI just to have another service
-   Redis
-   Kafka
-   microservices
-   Kubernetes
-   elaborate Docker infrastructure
-   custom OAuth system
-   custom authentication cryptography
-   live speech-transcription pipeline
-   custom ML model
-   worker mobile app
-   every sidebar page
-   complete farm-management platform
-   elaborate CI/CD
-   unnecessary global state libraries

"Wow" should come from execution and judgment.

------------------------------------------------------------------------

# 34. Priority Order

## Tier 1 --- Must Be Excellent

``` text
1. Default Figma fidelity
2. Expanded Figma fidelity
3. Expand/collapse
4. Real relational database
5. Persistent reads
6. Persistent mutation
7. Production deployment
```

## Tier 2 --- Strong Full-Stack Product

``` text
8. Search
9. Sorting
10. Filtering
11. Real metrics
12. Audio
13. Map
14. Loading/error states
```

## Tier 3 --- Experienced-Developer Differentiation

``` text
15. Supabase Auth
16. Farm-level data model
17. RLS / tenant isolation
18. One polished product-relevant wow feature
```

Do not destabilize Tier 1 to complete Tier 3.

------------------------------------------------------------------------

# 35. Git Checkpoints

Commit after stable milestones:

``` text
1. Project initialized
2. Static Figma frontend
3. Expanded UI
4. Database/schema
5. Persistent integration
6. Core functionality
7. Authentication + RLS
8. Wow workflow
9. Visual polish
10. Production-ready
```

Use:

``` bash
git status
git diff
git add .
git commit -m "Describe stable milestone"
git push
```

Always preserve a rollback point before Astra/Fugu handoffs.

------------------------------------------------------------------------

# 36. Near-Deadline Rules

Tell Astra:

``` text
Fix this specific functional issue only.

Do not redesign the UI.
Do not refactor unrelated working code.
Do not introduce new dependencies unless necessary.
```

Tell Fugu:

``` text
Fix this specific visual discrepancy only.

Do not modify backend, database, authentication, or data behavior.
Do not refactor unrelated working code.
```

As the deadline approaches, changes should get smaller.

------------------------------------------------------------------------

# 37. Ideal Final Demo

``` text
Admin signs in
      ↓
Profile resolves to Bays Ranch
      ↓
RLS authorizes Bays Ranch data
      ↓
Dashboard loads from PostgreSQL
      ↓
Metrics are data-driven
      ↓
Search / sort / filter work
      ↓
Open employee activity
      ↓
Summary + audio + location appear
      ↓
Manager adds "Needs Review"
      ↓
Database persists it
      ↓
Filter by Needs Review
      ↓
Refresh
      ↓
State remains
```

And:

``` text
Original Figma ≈ Production Application
```

------------------------------------------------------------------------

# 38. Model Cheat Sheet

  Stage                  Model
  ---------------------- -------------------
  Requirements           GPT-6 Astra
  Architecture           GPT-6 Astra
  Project setup          GPT-6 Astra
  Default Figma UI       Fugu
  Expanded Figma UI      Fugu
  Database schema        GPT-6 Astra
  Supabase integration   GPT-6 Astra
  Metrics                GPT-6 Astra
  Search/filter/sort     GPT-6 Astra
  Tags                   GPT-6 Astra
  Audio                  GPT-6 Astra
  Map                    GPT-6 Astra
  Authentication         GPT-6 Astra
  RLS                    GPT-6 Astra
  Wow feature            GPT-6 Astra
  Functional QA          GPT-6 Astra
  Visual QA              Fugu
  Regression QA          GPT-6 Astra
  Deployment             GPT-6 Astra
  README                 GPT-6 Astra + You
  Difficult bug          GPT-6 Astra Pro
  Security/deep review   GPT-6 Astra Pro
  Interview prep         GPT-6 Astra + You

------------------------------------------------------------------------

# 39. Optional Final Astra Pro Prompt

``` text
Perform a final engineering review of this timed developer-challenge submission.

Do not redesign the UI.
Do not perform broad refactors merely for code style.

Review specifically:

1. database design
2. relational integrity
3. query correctness
4. mutation correctness
5. persistence
6. authentication
7. authorization/RLS
8. farm-level isolation
9. loading/error behavior
10. production configuration
11. security mistakes
12. unnecessary complexity
13. anything I would have difficulty defending in an interview

Separate findings into:
- must fix before submission
- should fix if time allows
- acceptable tradeoffs

Only modify high-value issues that are safe this close to submission.
```

------------------------------------------------------------------------

# 40. Final Checklist

## Visual

-   [ ] Default dashboard closely matches Figma
-   [ ] Expanded state closely matches Figma
-   [ ] Sidebar accurate
-   [ ] Typography accurate
-   [ ] Cards accurate
-   [ ] Table accurate
-   [ ] Buttons/icons accurate
-   [ ] Spacing/alignment accurate

## Database

-   [ ] Relational schema
-   [ ] Farms modeled
-   [ ] Profiles modeled
-   [ ] Employees modeled
-   [ ] Fields modeled
-   [ ] Activity logs modeled
-   [ ] Recordings modeled appropriately
-   [ ] Tags modeled appropriately
-   [ ] Foreign keys/constraints
-   [ ] Useful indexes
-   [ ] Reproducible migrations/seed

## Functionality

-   [ ] Logs load from DB
-   [ ] Every row expands
-   [ ] Search works
-   [ ] Sort works
-   [ ] Filters work
-   [ ] This Month works
-   [ ] Metrics are meaningful
-   [ ] Audio works
-   [ ] Map works
-   [ ] Add Tag works
-   [ ] Tag persists after refresh
-   [ ] Wow workflow works

## Auth / Security

-   [ ] Login works
-   [ ] Profile maps user to farm
-   [ ] RLS enabled where appropriate
-   [ ] Farm data isolated
-   [ ] No service-role secret exposed client-side
-   [ ] No API keys committed
-   [ ] `.env.local` ignored

## UX

-   [ ] Loading state
-   [ ] Error state
-   [ ] Mutation pending state
-   [ ] Mutation failure handled
-   [ ] No obviously dead controls

## Production

-   [ ] `npm run build` succeeds
-   [ ] Vercel deployment works
-   [ ] Production Supabase works
-   [ ] Production auth works
-   [ ] Production persistence works
-   [ ] Incognito test passes
-   [ ] No major console errors
-   [ ] No unexpected failed requests

## GitHub

-   [ ] Correct remote
-   [ ] Stable milestones committed
-   [ ] README complete
-   [ ] No secrets
-   [ ] Repository frozen before deadline

## Interview

-   [ ] Can explain schema
-   [ ] Can explain normalization choices
-   [ ] Can explain auth
-   [ ] Can explain RLS
-   [ ] Can explain data flow
-   [ ] Can explain persistence
-   [ ] Can explain search/filter decisions
-   [ ] Can explain why no standalone backend service
-   [ ] Can explain scaling path
-   [ ] Can explain tradeoffs
-   [ ] Can explain wow feature
-   [ ] Can explain every major generated feature

------------------------------------------------------------------------

# Final Principle

Do not impress reviewers with the **number of technologies**.

Impress them with:

``` text
Figma fidelity
+
Product understanding
+
Thoughtful data modeling
+
Real persistence
+
Security awareness
+
One useful product extension
+
Production polish
+
Clear engineering judgment
```

Build the core first. Then earn the "wow" with depth.
