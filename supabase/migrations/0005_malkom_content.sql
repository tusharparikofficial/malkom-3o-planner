-- MALKOM 3.0 MVP content: domain, technical proposal and architecture only.
;
-- Targets a first-cut MVP on 10 Sep 2026 and a final MVP demo 30 days later.
;
begin;
;
-- Retire the previous placeholder content (archived, not deleted — revisions survive).
;
update "ContentBlock" set status='ARCHIVED' where status<>'ARCHIVED';
;
delete from "LibraryDiagram";
;
delete from "TimelineMilestone"; delete from "TimelinePhase";
;
insert into "LibraryDiagram" (id, title, description, "diagramType", definition, "createdById")
values ('dg-three-path', $j$Task Lifecycle \u2014 Three-Path Model$j$, $j$Where work flows and where a human waits.$j$, 'block', $j${"type": "block", "size": "large", "positioning": "auto", "description": "How a unit of work moves from arrival to posting, and where a human does and does not wait.", "elements": [{"id": "work-arrives", "type": "block", "col": 0, "row": 1, "data": {"text": "Work Arrives", "subtitle": "Email \u00b7 SFTP \u00b7 EDI \u00b7 API \u00b7 Portal"}}, {"id": "arrival-path", "type": "block", "col": 1, "row": 1, "data": {"text": "Arrival Path", "subtitle": "Classify \u2192 Extract \u2192 Resolve \u2192 Validate", "state": "accent"}}, {"id": "task-ready", "type": "block", "col": 2, "row": 1, "data": {"text": "Task Ready", "subtitle": "Everything pre-computed"}}, {"id": "human-review", "type": "block", "col": 3, "row": 0, "data": {"text": "Human Review", "subtitle": "Open p95 300ms \u00b7 Submit p95 200ms"}}, {"id": "straight-through", "type": "block", "col": 3, "row": 2, "data": {"text": "Straight Through", "subtitle": "Confidence above threshold", "state": "success"}}, {"id": "post-to-record", "type": "block", "col": 4, "row": 1, "data": {"text": "Post to System of Record", "subtitle": "Idempotent \u00b7 Read-back verified"}}, {"id": "task-closed", "type": "block", "col": 5, "row": 1, "data": {"text": "Task Closed", "state": "success"}}, {"from": "work-arrives", "to": "arrival-path", "arrowHeadType": "arrowclosed"}, {"from": "arrival-path", "to": "task-ready", "arrowHeadType": "arrowclosed"}, {"from": "task-ready", "to": "human-review", "label": "Needs a decision", "arrowHeadType": "arrowclosed"}, {"from": "task-ready", "to": "straight-through", "label": "No decision needed", "arrowHeadType": "arrowclosed"}, {"from": "human-review", "to": "post-to-record", "label": "Approved", "arrowHeadType": "arrowclosed"}, {"from": "straight-through", "to": "post-to-record", "arrowHeadType": "arrowclosed"}, {"from": "post-to-record", "to": "task-closed", "arrowHeadType": "arrowclosed"}]}$j$::jsonb, (select id from "User" where email='system@malkom.local'))
;
insert into "LibraryDiagram" (id, title, description, "diagramType", definition, "createdById")
values ('dg-architecture', $j$MVP Architecture$j$, $j$Control plane compiles; the client environment runs the work.$j$, 'block', $j${"type": "block", "size": "large", "positioning": "auto", "description": "MVP architecture: configuration is compiled centrally, work runs entirely inside the client environment.", "elements": [{"id": "blueprint", "type": "block", "col": 0, "row": 0, "data": {"text": "Blueprint", "subtitle": "Process definition (YAML)"}}, {"id": "compiler", "type": "block", "col": 1, "row": 0, "data": {"text": "Compiler", "subtitle": "Validates and budgets", "state": "accent"}}, {"id": "signed-plan", "type": "block", "col": 2, "row": 0, "data": {"text": "Signed Plan", "subtitle": "Versioned, content-addressed"}}, {"id": "system-of-record", "type": "block", "col": 4, "row": 0, "data": {"text": "Client System of Record", "subtitle": "TMS \u00b7 ERP \u00b7 Portal"}}, {"id": "channels", "type": "block", "col": 0, "row": 2, "data": {"text": "Channels In", "subtitle": "Documents and messages"}}, {"id": "core-worker", "type": "block", "col": 1, "row": 2, "data": {"text": "core-worker", "subtitle": "Arrival and egress"}}, {"id": "postgres", "type": "block", "col": 2, "row": 2, "data": {"text": "PostgreSQL", "subtitle": "Events \u00b7 Projections \u00b7 Queues", "state": "accent"}}, {"id": "core-api", "type": "block", "col": 3, "row": 2, "data": {"text": "core-api", "subtitle": "Stateless request handler"}}, {"id": "workbench", "type": "block", "col": 4, "row": 2, "data": {"text": "Workbench", "subtitle": "Review and submit"}}, {"from": "blueprint", "to": "compiler", "arrowHeadType": "arrowclosed"}, {"from": "compiler", "to": "signed-plan", "arrowHeadType": "arrowclosed"}, {"from": "signed-plan", "to": "core-worker", "label": "Pinned at mint", "lineStyle": "dashed", "arrowHeadType": "arrowclosed"}, {"from": "channels", "to": "core-worker", "arrowHeadType": "arrowclosed"}, {"from": "core-worker", "to": "postgres", "arrowHeadType": "arrowclosed"}, {"from": "postgres", "to": "core-api", "arrowHeadType": "arrowclosed"}, {"from": "core-api", "to": "workbench", "arrowHeadType": "arrowclosed"}, {"from": "core-worker", "to": "system-of-record", "label": "Idempotent post", "arrowHeadType": "arrowclosed"}]}$j$::jsonb, (select id from "User" where email='system@malkom.local'))
;
insert into "LibraryDiagram" (id, title, description, "diagramType", definition, "createdById")
values ('dg-golden-thread', $j$Golden Thread \u2014 Document to Posting$j$, $j$The end-to-end run the MVP must demonstrate.$j$, 'sequence', $j${"type": "sequence", "size": "large", "positioning": "auto", "description": "The golden thread the MVP must demonstrate end to end: one document from receipt to a verified posting.", "elements": [{"id": "channel", "type": "sequenceActor", "data": {"heading": "Channel", "index": 0, "color": "default", "rows": 6}}, {"id": "pipeline", "type": "sequenceActor", "data": {"heading": "Pipeline", "index": 1, "color": "accent", "rows": 6}}, {"id": "agent", "type": "sequenceActor", "data": {"heading": "Reviewer", "index": 2, "color": "default", "rows": 6}}, {"id": "record", "type": "sequenceActor", "data": {"heading": "System of Record", "index": 3, "color": "success", "rows": 6}}, {"id": "a0", "type": "sequenceAction", "data": {"text": "Document received and de-duplicated", "row": 0, "from": "channel", "to": "pipeline"}}, {"id": "a1", "type": "sequenceAction", "data": {"text": "Task ready with fields and confidence", "row": 1, "from": "pipeline", "to": "agent"}}, {"id": "a2", "type": "sequenceAction", "data": {"text": "Corrections and approval submitted", "row": 2, "from": "agent", "to": "pipeline"}}, {"id": "a3", "type": "sequenceAction", "data": {"text": "Transaction posted with idempotency key", "row": 3, "from": "pipeline", "to": "record"}}, {"id": "a4", "type": "sequenceAction", "data": {"text": "Receipt returned and read back", "row": 4, "from": "record", "to": "pipeline"}}, {"id": "a5", "type": "sequenceAction", "data": {"text": "Task closed, audit trail complete", "row": 5, "from": "pipeline", "to": "agent"}}]}$j$::jsonb, (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='home' and s.slug='hero'),
        null, 'HERO', $j${"title": "MALKOM 3.0 \u2014 MVP", "subtitle": "A platform for document-driven logistics operations: work is captured from any channel, enriched automatically, reviewed by a person only where judgement is needed, and posted back into the client's system of record.", "badge": "First cut targeted 10 Sep 2026"}$j$::jsonb, 0, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='home' and s.slug='hero'),
        null, 'KPI_STRIP', $j${"metrics": [{"key": "approaches.count", "label": "Approaches evaluated"}, {"key": "options.count", "label": "Options considered"}, {"key": "milestone.next.days", "label": "Days to next milestone"}, {"key": "feedback.open", "label": "Open feedback"}, {"key": "feedback.resolved", "label": "Feedback resolved"}]}$j$::jsonb, 1, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='home' and s.slug='digests'),
        null, 'GRID_GROUP', $j${"columns": 2}$j$::jsonb, 0, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
-- home digest cards
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='home' and s.slug='digests'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='home' and s.slug='digests') and kind='GRID_GROUP' and status='PUBLISHED' limit 1),
        'CARD', $j${"title": "Business Problem", "body": "What the platform has to absorb: unstructured documents from many channels, work that must land inside systems we do not own, and per-item quality and time expectations.", "icon": "report_problem", "href": "/business-problem"}$j$::jsonb, 0, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='home' and s.slug='digests'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='home' and s.slug='digests') and kind='GRID_GROUP' and status='PUBLISHED' limit 1),
        'CARD', $j${"title": "Approach & Considerations", "body": "Delivery options for the MVP, scored against a weighted matrix, with the constraints, dependencies and risks behind the recommendation.", "icon": "alt_route", "href": "/approach"}$j$::jsonb, 1, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='home' and s.slug='digests'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='home' and s.slug='digests') and kind='GRID_GROUP' and status='PUBLISHED' limit 1),
        'CARD', $j${"title": "Solutions", "body": "Capability blueprint, architecture, the task lifecycle, and the delivery timeline to the 10 Sep first cut.", "icon": "architecture", "href": "/solutions/blueprint"}$j$::jsonb, 2, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='home' and s.slug='digests'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='home' and s.slug='digests') and kind='GRID_GROUP' and status='PUBLISHED' limit 1),
        'CARD', $j${"title": "Voice of Customer", "body": "What operations and IT stakeholders ask of a system like this, grouped into themes with the design implication for each.", "icon": "record_voice_over", "href": "/voice-of-customer"}$j$::jsonb, 3, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
-- business problem
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='business-problem' and s.slug='problems'),
        null, 'PROBLEM_STATEMENT', $j${"title": "Work is document-driven and arrives unstructured", "narrative": "Operational instructions reach the business as documents and messages \u2014 bills of lading, invoices, manifests, booking confirmations, status updates \u2014 through email, SFTP, EDI, APIs and carrier portals. Layouts differ by client, by trade lane and by counterparty, and the same logical document rarely looks the same twice.", "impact": "Any intake design that assumes a fixed format or a single channel fails on contact with real traffic.", "severity": 4, "stakeholders": ["Operations", "Client IT", "Trading partners"]}$j$::jsonb, 0, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='business-problem' and s.slug='problems'),
        null, 'PROBLEM_STATEMENT', $j${"title": "The system of record belongs to the client", "narrative": "The authoritative state of a shipment lives in the client's TMS, ERP or carrier portal. A platform doing this work must read from and write into systems it does not own, cannot migrate, and must not diverge from.", "impact": "Rules out owning shipment state; requires idempotent writes, read-back verification and reconciliation against the client's data.", "severity": 5, "stakeholders": ["Client IT", "Operations", "Compliance"]}$j$::jsonb, 1, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='business-problem' and s.slug='problems'),
        null, 'PROBLEM_STATEMENT', $j${"title": "Quality and time are measured per item", "narrative": "Each unit of work carries its own clock, its own accuracy expectation and its own audit obligation. Exceptions \u2014 missing references, ambiguous parties, failed postings \u2014 are normal traffic, not rare failures.", "impact": "The unit of measurement has to be the task itself, so service levels, quality sampling and audit all describe the same object.", "severity": 4, "stakeholders": ["Operations", "Quality", "Audit"]}$j$::jsonb, 2, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='business-problem' and s.slug='success-criteria'),
        null, 'RICH_TEXT', $j${"markdown": "The MVP is judged on one end-to-end run and the properties it demonstrates \u2014 not on breadth of coverage."}$j$::jsonb, 0, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='business-problem' and s.slug='success-criteria'),
        null, 'GRID_GROUP', $j${"columns": 2}$j$::jsonb, 1, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='business-problem' and s.slug='success-criteria'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='business-problem' and s.slug='success-criteria') and kind='GRID_GROUP' and status='PUBLISHED' limit 1),
        'LIST_ITEM', $j${"text": "One document type runs end to end, in production shape", "icon": "check_circle"}$j$::jsonb, 0, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='business-problem' and s.slug='success-criteria'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='business-problem' and s.slug='success-criteria') and kind='GRID_GROUP' and status='PUBLISHED' limit 1),
        'LIST_ITEM', $j${"text": "A reviewer never waits on the pipeline \u2014 enrichment happens before the task appears", "icon": "check_circle"}$j$::jsonb, 1, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='business-problem' and s.slug='success-criteria'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='business-problem' and s.slug='success-criteria') and kind='GRID_GROUP' and status='PUBLISHED' limit 1),
        'LIST_ITEM', $j${"text": "Postings are idempotent and verified by read-back", "icon": "check_circle"}$j$::jsonb, 2, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='business-problem' and s.slug='success-criteria'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='business-problem' and s.slug='success-criteria') and kind='GRID_GROUP' and status='PUBLISHED' limit 1),
        'LIST_ITEM', $j${"text": "A second document type is added by configuration, with no platform code change", "icon": "check_circle"}$j$::jsonb, 3, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='business-problem' and s.slug='success-criteria'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='business-problem' and s.slug='success-criteria') and kind='GRID_GROUP' and status='PUBLISHED' limit 1),
        'LIST_ITEM', $j${"text": "Every task can be replayed from its captured inputs", "icon": "check_circle"}$j$::jsonb, 4, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='business-problem' and s.slug='success-criteria'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='business-problem' and s.slug='success-criteria') and kind='GRID_GROUP' and status='PUBLISHED' limit 1),
        'LIST_ITEM', $j${"text": "Forms are generated from the field schema, never hand-built", "icon": "check_circle"}$j$::jsonb, 5, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
-- approach engine
;
insert into "Approach" (id, title, context, rationale, "order") values
('ap-mvp-shape', 'How we build the MVP by 10 September',
 'The MVP has to prove the architecture is real, not that the product is broad. Three delivery shapes were considered against a fixed first-cut date, with a further 30 days to a final MVP demonstration and no rollout in scope.',
 'A depth-first vertical slice is the only shape that retires architectural risk before the date. Breadth looks better in a demo and proves nothing; a mocked prototype proves less than nothing, because the hard parts stay hypothetical.',
 0)
;
insert into "ApproachOption" (id,"approachId",title,description,pros,cons,effort,risk,"order")
values ('op-depth','ap-mvp-shape',$j$"Option A \u2014 Depth-first vertical slice"$j$,$j$"One document type, one intake channel, one egress connector, built to production standard end to end: intake, enrichment, human review, posting, audit and replay."$j$,
 array[$j$"Retires the highest-risk assumptions first"$j$,$j$"Everything after it is configuration, not architecture"$j$,$j$"Produces a genuinely demonstrable golden thread"$j$]::text[], array[$j$"Narrow surface at the demo \u2014 one document type only"$j$]::text[], 3, 2, 0)
;
insert into "ApproachOption" (id,"approachId",title,description,pros,cons,effort,risk,"order")
values ('op-breadth','ap-mvp-shape',$j$"Option B \u2014 Breadth-first coverage"$j$,$j$"Cover several document types and channels with shallow processing, deferring the durable pieces \u2014 event log, replay, compensation \u2014 until after the MVP."$j$,
 array[$j$"Demonstrates apparent coverage early"$j$]::text[], array[$j$"Leaves every architectural question open"$j$,$j$"Rework is near-certain once durability is added"$j$,$j$"No credible answer on audit or recovery"$j$]::text[], 4, 5, 1)
;
insert into "ApproachOption" (id,"approachId",title,description,pros,cons,effort,risk,"order")
values ('op-prototype','ap-mvp-shape',$j$"Option C \u2014 Demonstration prototype"$j$,$j$"A UI-led prototype with mocked enrichment and no real posting into a system of record."$j$,
 array[$j$"Fastest to something visible"$j$]::text[], array[$j$"Proves none of the load-bearing mechanics"$j$,$j$"Cannot be extended into the real build"$j$,$j$"Risks a false positive on feasibility"$j$]::text[], 2, 5, 2)
;
update "Approach" set "recommendedOptionId"='op-depth' where id='ap-mvp-shape'
;
insert into "Criterion" (id,"approachId",label,weight,"order") values ('cr-proves','ap-mvp-shape',$j$"Proves the architecture"$j$,3,0)
;
insert into "Criterion" (id,"approachId",label,weight,"order") values ('cr-date','ap-mvp-shape',$j$"Fits the 10 Sep first cut"$j$,3,1)
;
insert into "Criterion" (id,"approachId",label,weight,"order") values ('cr-reuse','ap-mvp-shape',$j$"Reusable for the next stage"$j$,2,2)
;
insert into "Criterion" (id,"approachId",label,weight,"order") values ('cr-risk','ap-mvp-shape',$j$"Retires technical risk"$j$,3,3)
;
insert into "Criterion" (id,"approachId",label,weight,"order") values ('cr-demo','ap-mvp-shape',$j$"Demonstrates credibly"$j$,2,4)
;
insert into "CriterionScore" ("criterionId","optionId",score) values ('cr-proves','op-depth',5)
 on conflict ("criterionId","optionId") do update set score = excluded.score
;
insert into "CriterionScore" ("criterionId","optionId",score) values ('cr-proves','op-breadth',2)
 on conflict ("criterionId","optionId") do update set score = excluded.score
;
insert into "CriterionScore" ("criterionId","optionId",score) values ('cr-proves','op-prototype',1)
 on conflict ("criterionId","optionId") do update set score = excluded.score
;
insert into "CriterionScore" ("criterionId","optionId",score) values ('cr-date','op-depth',4)
 on conflict ("criterionId","optionId") do update set score = excluded.score
;
insert into "CriterionScore" ("criterionId","optionId",score) values ('cr-date','op-breadth',3)
 on conflict ("criterionId","optionId") do update set score = excluded.score
;
insert into "CriterionScore" ("criterionId","optionId",score) values ('cr-date','op-prototype',5)
 on conflict ("criterionId","optionId") do update set score = excluded.score
;
insert into "CriterionScore" ("criterionId","optionId",score) values ('cr-reuse','op-depth',5)
 on conflict ("criterionId","optionId") do update set score = excluded.score
;
insert into "CriterionScore" ("criterionId","optionId",score) values ('cr-reuse','op-breadth',3)
 on conflict ("criterionId","optionId") do update set score = excluded.score
;
insert into "CriterionScore" ("criterionId","optionId",score) values ('cr-reuse','op-prototype',1)
 on conflict ("criterionId","optionId") do update set score = excluded.score
;
insert into "CriterionScore" ("criterionId","optionId",score) values ('cr-risk','op-depth',5)
 on conflict ("criterionId","optionId") do update set score = excluded.score
;
insert into "CriterionScore" ("criterionId","optionId",score) values ('cr-risk','op-breadth',2)
 on conflict ("criterionId","optionId") do update set score = excluded.score
;
insert into "CriterionScore" ("criterionId","optionId",score) values ('cr-risk','op-prototype',1)
 on conflict ("criterionId","optionId") do update set score = excluded.score
;
insert into "CriterionScore" ("criterionId","optionId",score) values ('cr-demo','op-depth',4)
 on conflict ("criterionId","optionId") do update set score = excluded.score
;
insert into "CriterionScore" ("criterionId","optionId",score) values ('cr-demo','op-breadth',4)
 on conflict ("criterionId","optionId") do update set score = excluded.score
;
insert into "CriterionScore" ("criterionId","optionId",score) values ('cr-demo','op-prototype',3)
 on conflict ("criterionId","optionId") do update set score = excluded.score
;
insert into "Consideration" ("approachId",kind,text,"order") values ('ap-mvp-shape','CONSTRAINT',$j$"First cut of the MVP is due 10 September 2026; a final MVP demonstration follows about 30 days later."$j$,0)
;
insert into "Consideration" ("approachId",kind,text,"order") values ('ap-mvp-shape','CONSTRAINT',$j$"Rollout is explicitly out of scope \u2014 this is an MVP, not a production deployment."$j$,1)
;
insert into "Consideration" ("approachId",kind,text,"order") values ('ap-mvp-shape','DEPENDENCY',$j$"Access to a client sandbox or test instance of the target system of record, with credentials for an idempotent write path."$j$,2)
;
insert into "Consideration" ("approachId",kind,text,"order") values ('ap-mvp-shape','DEPENDENCY',$j$"A representative sample set of real documents for the chosen type, including the messy ones."$j$,3)
;
insert into "Consideration" ("approachId",kind,text,"order") values ('ap-mvp-shape','DEPENDENCY',$j$"An extraction endpoint for the chosen document type, stubbed initially if necessary."$j$,4)
;
insert into "Consideration" ("approachId",kind,text,"order") values ('ap-mvp-shape','ASSUMPTION',$j$"PostgreSQL carries the event log, projections, queues and timers; compute placement stays a deployment choice, not an architectural one."$j$,5)
;
insert into "Consideration" ("approachId",kind,text,"order") values ('ap-mvp-shape','ASSUMPTION',$j$"One isolated environment per client; no shared multi-tenant data path."$j$,6)
;
insert into "Consideration" ("approachId",kind,text,"order") values ('ap-mvp-shape','RISK',$j$"Extraction accuracy on real documents may sit below the straight-through threshold, shifting volume to review."$j$,7)
;
insert into "Consideration" ("approachId",kind,text,"order") values ('ap-mvp-shape','RISK',$j$"Connector access to the client system is the most common schedule risk and sits outside our control."$j$,8)
;
insert into "Consideration" ("approachId",kind,text,"order") values ('ap-mvp-shape','RISK',$j$"Requests for a shipment-level view during the demo; the model deliberately holds tasks and client references instead."$j$,9)
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='approach' and s.slug='intro'),
        null, 'RICH_TEXT', $j${"markdown": "The approach below sets out **how the MVP gets built by 10 September**, the options weighed, and the constraints and risks behind the recommendation. Every option, criterion score and consideration accepts feedback individually \u2014 use the feedback button, or the pencil icon on any item."}$j$::jsonb, 0, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='approach' and s.slug='approaches'),
        null, 'APPROACH_EMBED', $j${"approachId": "ap-mvp-shape"}$j$::jsonb, 0, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
-- solutions: blueprint
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='blueprint'),
        null, 'RICH_TEXT', $j${"markdown": "The platform is assembled from a small set of capabilities. Each is a service with a declared contract, so a process is composed rather than coded. The MVP exercises one path through all of them."}$j$::jsonb, 0, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='blueprint'),
        null, 'GRID_GROUP', $j${"columns": 3}$j$::jsonb, 1, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='blueprint'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='blueprint') and kind='GRID_GROUP' and status='PUBLISHED' limit 1),
        'BLUEPRINT_BLOCK', $j${"title": "Intake", "description": "Receives work from email, SFTP, EDI, API and portals. De-duplicates, identifies intent and mints a task.", "layer": "Channels", "icon": "inbox"}$j$::jsonb, 0, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='blueprint'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='blueprint') and kind='GRID_GROUP' and status='PUBLISHED' limit 1),
        'BLUEPRINT_BLOCK', $j${"title": "Understand", "description": "Classifies the document, extracts fields with confidence, resolves references against master data.", "layer": "Enrichment", "icon": "document_scanner"}$j$::jsonb, 1, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='blueprint'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='blueprint') and kind='GRID_GROUP' and status='PUBLISHED' limit 1),
        'BLUEPRINT_BLOCK', $j${"title": "Rules", "description": "Compiled decision tables that validate a task and decide whether it can complete without a person.", "layer": "Decisioning", "icon": "rule"}$j$::jsonb, 2, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='blueprint'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='blueprint') and kind='GRID_GROUP' and status='PUBLISHED' limit 1),
        'BLUEPRINT_BLOCK', $j${"title": "Human", "description": "Workbench forms generated from the field schema, queries that pause the clock, and exception handling.", "layer": "Review", "icon": "how_to_reg"}$j$::jsonb, 3, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='blueprint'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='blueprint') and kind='GRID_GROUP' and status='PUBLISHED' limit 1),
        'BLUEPRINT_BLOCK', $j${"title": "Execution", "description": "Runs the compiled plan in segments, with compensation when a step fails after a side effect.", "layer": "Runtime", "icon": "account_tree"}$j$::jsonb, 4, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='blueprint'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='blueprint') and kind='GRID_GROUP' and status='PUBLISHED' limit 1),
        'BLUEPRINT_BLOCK', $j${"title": "Egress", "description": "Writes into the client system of record idempotently and verifies the result by reading it back.", "layer": "Delivery", "icon": "output"}$j$::jsonb, 5, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='blueprint'),
        null, 'RICH_TEXT', $j${"markdown": "Observability, quality sampling and audit attach to the event stream rather than the pipeline, so they can be switched on without adding latency or failure modes to the path a person waits on."}$j$::jsonb, 2, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
-- solutions: HLD
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='hld'),
        null, 'RICH_TEXT', $j${"markdown": "Configuration is authored as a **blueprint**, compiled and signed centrally, then pinned to each task at the moment it is minted. Everything that touches client data runs inside the client's own environment; PostgreSQL holds the event log, projections, queues and timers."}$j$::jsonb, 0, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='hld'),
        null, 'DIAGRAM', $j${"source": "LIBRARY", "libraryDiagramId": "dg-architecture", "caption": "MVP architecture \u2014 control plane compiles, the client environment runs the work"}$j$::jsonb, 1, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='hld'),
        null, 'DATA_TABLE', $j${"columns": ["Component", "Responsibility", "Notes for review"], "rows": [["Blueprint + compiler", "Turns a process definition into a validated, budgeted, signed plan", "Publish fails if a step exceeds its latency budget or a contract does not match"], ["core-worker", "Runs arrival enrichment and egress", "Long-running loop; the only component that talks to the client system"], ["core-api", "Serves workbench reads and submissions", "Stateless; a single indexed read on task open"], ["PostgreSQL", "Event log, projections, queues, timers", "Architectural, not a deployment choice \u2014 everything else can move"], ["Workbench", "Review, correct, query, approve", "Forms generated from the field schema"]], "caption": "Components in scope for the first cut"}$j$::jsonb, 2, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
-- solutions: LLD
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='lld'),
        null, 'RICH_TEXT', $j${"markdown": "The lifecycle below is the core prescription: **a person never waits for the pipeline**. Enrichment finishes before a task becomes visible, so opening and submitting a task are simple reads and writes."}$j$::jsonb, 0, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='lld'),
        null, 'DIAGRAM', $j${"source": "LIBRARY", "libraryDiagramId": "dg-three-path", "caption": "Task lifecycle \u2014 arrival is asynchronous; review and submit are fast paths"}$j$::jsonb, 1, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='lld'),
        null, 'DIAGRAM', $j${"source": "LIBRARY", "libraryDiagramId": "dg-golden-thread", "caption": "Golden thread \u2014 the end-to-end run the MVP must demonstrate"}$j$::jsonb, 2, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='lld'),
        null, 'DATA_TABLE', $j${"columns": ["Path", "When it runs", "Target", "Rule"], "rows": [["Arrival", "Work arrives", "p95 under 8s", "Asynchronous \u2014 nobody is watching"], ["Interactive", "A reviewer opens a task", "p95 under 300ms", "One indexed read, no external calls"], ["Submit", "A reviewer submits", "p95 under 200ms", "Validate, record, enqueue \u2014 posting happens after"]], "caption": "Latency budgets asserted in CI, not aspirations"}$j$::jsonb, 3, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='solutions' and s.slug='timeline'),
        null, 'TIMELINE_EMBED', $j${}$j$::jsonb, 0, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
-- voice of customer
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='voice-of-customer' and s.slug='themes'),
        null, 'THEME_GROUP', $j${"title": "Operate inside our systems", "implication": "Read from and write into the existing system of record; do not ask us to migrate or maintain a parallel copy."}$j$::jsonb, 0, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='voice-of-customer' and s.slug='themes'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='voice-of-customer' and s.slug='themes') and kind='THEME_GROUP' and status='PUBLISHED' and payload->>'title'=$j$"Operate inside our systems"$j$ limit 1),
        'QUOTE', $j${"text": "We are not moving off our TMS. Anything you build has to work against it.", "personaName": "Operations Director", "personaRole": "Freight forwarder", "sentiment": "NEGATIVE"}$j$::jsonb, 0, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='voice-of-customer' and s.slug='themes'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='voice-of-customer' and s.slug='themes') and kind='THEME_GROUP' and status='PUBLISHED' and payload->>'title'=$j$"Operate inside our systems"$j$ limit 1),
        'QUOTE', $j${"text": "If it writes into our system, we need to know it will not double-post.", "personaName": "IT Manager", "personaRole": "Client IT", "sentiment": "NEUTRAL"}$j$::jsonb, 1, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='voice-of-customer' and s.slug='themes'),
        null, 'THEME_GROUP', $j${"title": "Show me what happened", "implication": "Every automated decision has to be explainable and reversible after the fact."}$j$::jsonb, 1, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='voice-of-customer' and s.slug='themes'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='voice-of-customer' and s.slug='themes') and kind='THEME_GROUP' and status='PUBLISHED' and payload->>'title'=$j$"Show me what happened"$j$ limit 1),
        'QUOTE', $j${"text": "When something goes wrong I need to see exactly what was read and what was sent.", "personaName": "Quality Lead", "personaRole": "Operations", "sentiment": "NEUTRAL"}$j$::jsonb, 0, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='voice-of-customer' and s.slug='themes'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='voice-of-customer' and s.slug='themes') and kind='THEME_GROUP' and status='PUBLISHED' and payload->>'title'=$j$"Show me what happened"$j$ limit 1),
        'QUOTE', $j${"text": "Audit will ask for the trail. If we cannot produce it, we cannot use it.", "personaName": "Compliance Officer", "personaRole": "Compliance", "sentiment": "NEGATIVE"}$j$::jsonb, 1, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='voice-of-customer' and s.slug='themes'),
        null, 'THEME_GROUP', $j${"title": "Do not slow my team down", "implication": "Tools that pause mid-task are abandoned; speed at the point of review matters more than automation percentage."}$j$::jsonb, 2, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='voice-of-customer' and s.slug='themes'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='voice-of-customer' and s.slug='themes') and kind='THEME_GROUP' and status='PUBLISHED' and payload->>'title'=$j$"Do not slow my team down"$j$ limit 1),
        'QUOTE', $j${"text": "The current screens take seconds to load. That is where the day goes.", "personaName": "Team Lead", "personaRole": "Operations", "sentiment": "NEGATIVE"}$j$::jsonb, 0, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
insert into "ContentBlock" ("sectionId","parentId",kind,payload,"order",status,"publishedAt","createdById")
values ((select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='voice-of-customer' and s.slug='themes'),
        (select id from "ContentBlock" where "sectionId"=(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='voice-of-customer' and s.slug='themes') and kind='THEME_GROUP' and status='PUBLISHED' and payload->>'title'=$j$"Do not slow my team down"$j$ limit 1),
        'QUOTE', $j${"text": "If the system has already done the reading, checking it is quick work.", "personaName": "Senior Agent", "personaRole": "Operations", "sentiment": "POSITIVE"}$j$::jsonb, 1, 'PUBLISHED', now(), (select id from "User" where email='system@malkom.local'))
;
-- timeline: first cut 10 Sep 2026, final MVP demo ~10 Oct 2026, no rollout
;
insert into "TimelinePhase" (id,title,description,"startDate","endDate",status,"order")
values ('ph-foundations',$j$"Foundations"$j$,$j$"Repository, domain model, compiler and environment provisioning."$j$,'2026-08-04'::timestamptz,'2026-08-22'::timestamptz,'IN_PROGRESS',0)
;
insert into "TimelinePhase" (id,title,description,"startDate","endDate",status,"order")
values ('ph-first-cut',$j$"MVP First Cut"$j$,$j$"The vertical slice: one document type running end to end to production standard."$j$,'2026-08-23'::timestamptz,'2026-09-10'::timestamptz,'PLANNED',1)
;
insert into "TimelinePhase" (id,title,description,"startDate","endDate",status,"order")
values ('ph-demo',$j$"MVP Hardening and Demo"$j$,$j$"Second document type by configuration, replay and audit, demonstration pack."$j$,'2026-09-11'::timestamptz,'2026-10-10'::timestamptz,'PLANNED',2)
;
insert into "TimelineMilestone" ("phaseId",title,description,"dueDate",status,"order")
values ('ph-foundations',$j$"Skeleton and CI gates"$j$,$j$"Workspace, domain model, dependency rules enforced in CI."$j$,'2026-08-08'::timestamptz,'PLANNED',0)
;
insert into "TimelineMilestone" ("phaseId",title,description,"dueDate",status,"order")
values ('ph-foundations',$j$"Compiler produces a signed plan"$j$,$j$"Blueprint YAML compiles, validates contracts and prints its segment budget."$j$,'2026-08-15'::timestamptz,'PLANNED',1)
;
insert into "TimelineMilestone" ("phaseId",title,description,"dueDate",status,"order")
values ('ph-foundations',$j$"Environment provisioning proven"$j$,$j$"A fresh client environment stands up from one command."$j$,'2026-08-22'::timestamptz,'PLANNED',2)
;
insert into "TimelineMilestone" ("phaseId",title,description,"dueDate",status,"order")
values ('ph-first-cut',$j$"Arrival path green"$j$,$j$"Intake mints a task; classify, extract, resolve and validate run in one segment."$j$,'2026-08-29'::timestamptz,'PLANNED',0)
;
insert into "TimelineMilestone" ("phaseId",title,description,"dueDate",status,"order")
values ('ph-first-cut',$j$"Review path green"$j$,$j$"Workbench form generated from schema; latency budgets asserted in CI."$j$,'2026-09-05'::timestamptz,'PLANNED',1)
;
insert into "TimelineMilestone" ("phaseId",title,description,"dueDate",status,"order")
values ('ph-first-cut',$j$"MVP first cut \u2014 golden thread end to end"$j$,$j$"Document in, reviewed, posted idempotently, read back, audited."$j$,'2026-09-10'::timestamptz,'PLANNED',2)
;
insert into "TimelineMilestone" ("phaseId",title,description,"dueDate",status,"order")
values ('ph-demo',$j$"Second document type by configuration"$j$,$j$"Added through schema and rules only, with no platform code change."$j$,'2026-09-24'::timestamptz,'PLANNED',0)
;
insert into "TimelineMilestone" ("phaseId",title,description,"dueDate",status,"order")
values ('ph-demo',$j$"Replay and audit trail"$j$,$j$"Any task re-runs deterministically from captured inputs."$j$,'2026-10-03'::timestamptz,'PLANNED',1)
;
insert into "TimelineMilestone" ("phaseId",title,description,"dueDate",status,"order")
values ('ph-demo',$j$"Final MVP demonstration"$j$,$j$"Walkthrough of the golden thread and the architecture behind it."$j$,'2026-10-10'::timestamptz,'PLANNED',2)
;
update "Page" set summary = case slug
 when 'home' then 'Everything happening on the MALKOM 3.0 MVP at a glance.'
 when 'approach' then 'How the MVP gets built by 10 September: options, weighted scoring, constraints and risks.'
 when 'business-problem' then 'What the platform has to absorb, and what the MVP must prove.'
 when 'solutions' then 'Capability blueprint, architecture, task lifecycle and the delivery timeline.'
 when 'voice-of-customer' then 'What operations and IT stakeholders ask of a system like this.'
 else summary end
;
commit;
