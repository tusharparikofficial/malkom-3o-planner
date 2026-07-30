-- MALKOM 3.0 portal schema (generated from the reference Postgres database)
-- Tables use quoted camelCase identifiers to match the app's DTOs 1:1.



CREATE TYPE public."BlockKind" AS ENUM (
    'HERO',
    'RICH_TEXT',
    'KPI_STRIP',
    'GRID_GROUP',
    'STAT',
    'CARD',
    'LIST_ITEM',
    'QUOTE',
    'THEME_GROUP',
    'PROBLEM_STATEMENT',
    'BLUEPRINT_BLOCK',
    'DIAGRAM',
    'IMAGE',
    'DATA_TABLE',
    'CTA',
    'APPROACH_EMBED',
    'TIMELINE_EMBED'
);

CREATE TYPE public."BlockStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);

CREATE TYPE public."EntityType" AS ENUM (
    'PAGE',
    'SECTION',
    'CONTENT_BLOCK',
    'APPROACH',
    'APPROACH_OPTION',
    'CRITERION',
    'CRITERION_SCORE',
    'CONSIDERATION',
    'TIMELINE_PHASE',
    'TIMELINE_MILESTONE'
);

CREATE TYPE public."EventType" AS ENUM (
    'PAGE_VIEW',
    'PAGE_EXIT',
    'SECTION_VIEW',
    'FEEDBACK_OPEN',
    'FEEDBACK_SUBMIT',
    'NAV_CLICK'
);

CREATE TYPE public."FeedbackStatus" AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'ACCEPTED',
    'REJECTED',
    'RESOLVED'
);

CREATE TYPE public."FeedbackType" AS ENUM (
    'GENERAL',
    'SUGGESTION',
    'EDIT_PROPOSAL',
    'QUESTION',
    'CONCERN'
);

CREATE TYPE public."MilestoneStatus" AS ENUM (
    'PLANNED',
    'IN_PROGRESS',
    'DONE',
    'AT_RISK',
    'SLIPPED'
);

CREATE TYPE public."PhaseStatus" AS ENUM (
    'PLANNED',
    'IN_PROGRESS',
    'DONE',
    'AT_RISK'
);

CREATE TYPE public."Role" AS ENUM (
    'VIEWER',
    'ADMIN',
    'SUPER_ADMIN'
);

CREATE TABLE public."AnalyticsEvent" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "sessionId" text NOT NULL,
    type public."EventType" NOT NULL,
    "pageSlug" text NOT NULL,
    "sectionSlug" text,
    "durationMs" integer,
    meta jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."AppSetting" (
    key text NOT NULL,
    value jsonb NOT NULL,
    "updatedById" text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."Approach" (
    id text NOT NULL,
    title text NOT NULL,
    context text NOT NULL,
    "recommendedOptionId" text,
    rationale text,
    "order" integer NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."ApproachOption" (
    id text NOT NULL,
    "approachId" text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    pros text[],
    cons text[],
    effort integer,
    risk integer,
    "order" integer NOT NULL
);

CREATE TABLE public."Asset" (
    id text NOT NULL,
    "fileName" text NOT NULL,
    "mimeType" text NOT NULL,
    bytes integer NOT NULL,
    "storagePath" text NOT NULL,
    alt text,
    "uploadedById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "actorId" text NOT NULL,
    action text NOT NULL,
    "entityType" public."EntityType",
    "entityId" text,
    meta jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."Comment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "entityType" public."EntityType" NOT NULL,
    "entityId" text NOT NULL,
    "parentId" text,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."Consideration" (
    id text NOT NULL,
    "approachId" text NOT NULL,
    "optionId" text,
    kind text NOT NULL,
    text text NOT NULL,
    "order" integer NOT NULL
);

CREATE TABLE public."ContentBlock" (
    id text NOT NULL,
    "sectionId" text NOT NULL,
    "parentId" text,
    kind public."BlockKind" NOT NULL,
    payload jsonb NOT NULL,
    "order" integer NOT NULL,
    status public."BlockStatus" DEFAULT 'DRAFT'::public."BlockStatus" NOT NULL,
    "createdById" text NOT NULL,
    "updatedById" text,
    "publishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."ContentRevision" (
    id text NOT NULL,
    "blockId" text NOT NULL,
    kind public."BlockKind" NOT NULL,
    payload jsonb NOT NULL,
    status public."BlockStatus" NOT NULL,
    "editedById" text NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."Criterion" (
    id text NOT NULL,
    "approachId" text NOT NULL,
    label text NOT NULL,
    weight integer DEFAULT 1 NOT NULL,
    "order" integer NOT NULL
);

CREATE TABLE public."CriterionScore" (
    id text NOT NULL,
    "criterionId" text NOT NULL,
    "optionId" text NOT NULL,
    score integer,
    note text
);

CREATE TABLE public."Feedback" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "entityType" public."EntityType" NOT NULL,
    "entityId" text NOT NULL,
    type public."FeedbackType" NOT NULL,
    message text NOT NULL,
    "proposedText" text,
    status public."FeedbackStatus" DEFAULT 'OPEN'::public."FeedbackStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."FeedbackActivity" (
    id text NOT NULL,
    "feedbackId" text NOT NULL,
    "actorId" text NOT NULL,
    "fromStatus" public."FeedbackStatus" NOT NULL,
    "toStatus" public."FeedbackStatus" NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."LibraryDiagram" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    "diagramType" text NOT NULL,
    definition jsonb NOT NULL,
    "createdById" text NOT NULL,
    "updatedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "recipientRole" public."Role",
    "recipientId" text,
    "actorId" text NOT NULL,
    type text NOT NULL,
    message text NOT NULL,
    "entityType" public."EntityType",
    "entityId" text,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."Page" (
    id text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    summary text NOT NULL,
    "order" integer NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."Section" (
    id text NOT NULL,
    "pageId" text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text,
    "order" integer NOT NULL
);

CREATE TABLE public."Session" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "userAgent" text
);

CREATE TABLE public."TimelineMilestone" (
    id text NOT NULL,
    "phaseId" text NOT NULL,
    title text NOT NULL,
    description text,
    "dueDate" timestamp(3) without time zone NOT NULL,
    status public."MilestoneStatus" DEFAULT 'PLANNED'::public."MilestoneStatus" NOT NULL,
    "order" integer NOT NULL
);

CREATE TABLE public."TimelinePhase" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    status public."PhaseStatus" DEFAULT 'PLANNED'::public."PhaseStatus" NOT NULL,
    "order" integer NOT NULL
);

CREATE TABLE public."User" (
    id text NOT NULL,
    "ssoUserId" text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    role public."Role" DEFAULT 'VIEWER'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastSeenAt" timestamp(3) without time zone
);

ALTER TABLE ONLY public."AnalyticsEvent"
    ADD CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AppSetting"
    ADD CONSTRAINT "AppSetting_pkey" PRIMARY KEY (key);

ALTER TABLE ONLY public."ApproachOption"
    ADD CONSTRAINT "ApproachOption_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Approach"
    ADD CONSTRAINT "Approach_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Consideration"
    ADD CONSTRAINT "Consideration_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ContentBlock"
    ADD CONSTRAINT "ContentBlock_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ContentRevision"
    ADD CONSTRAINT "ContentRevision_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."CriterionScore"
    ADD CONSTRAINT "CriterionScore_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Criterion"
    ADD CONSTRAINT "Criterion_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."FeedbackActivity"
    ADD CONSTRAINT "FeedbackActivity_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Feedback"
    ADD CONSTRAINT "Feedback_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."LibraryDiagram"
    ADD CONSTRAINT "LibraryDiagram_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Page"
    ADD CONSTRAINT "Page_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Section"
    ADD CONSTRAINT "Section_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."TimelineMilestone"
    ADD CONSTRAINT "TimelineMilestone_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."TimelinePhase"
    ADD CONSTRAINT "TimelinePhase_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);

CREATE INDEX "AnalyticsEvent_pageSlug_type_createdAt_idx" ON public."AnalyticsEvent" USING btree ("pageSlug", type, "createdAt");

CREATE INDEX "AnalyticsEvent_userId_createdAt_idx" ON public."AnalyticsEvent" USING btree ("userId", "createdAt");

CREATE INDEX "AuditLog_actorId_createdAt_idx" ON public."AuditLog" USING btree ("actorId", "createdAt");

CREATE INDEX "Comment_entityType_entityId_idx" ON public."Comment" USING btree ("entityType", "entityId");

CREATE INDEX "ContentBlock_sectionId_status_order_idx" ON public."ContentBlock" USING btree ("sectionId", status, "order");

CREATE INDEX "ContentRevision_blockId_createdAt_idx" ON public."ContentRevision" USING btree ("blockId", "createdAt");

CREATE UNIQUE INDEX "CriterionScore_criterionId_optionId_key" ON public."CriterionScore" USING btree ("criterionId", "optionId");

CREATE INDEX "Feedback_entityType_entityId_idx" ON public."Feedback" USING btree ("entityType", "entityId");

CREATE INDEX "Feedback_status_createdAt_idx" ON public."Feedback" USING btree (status, "createdAt");

CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON public."Notification" USING btree ("recipientId", "readAt", "createdAt");

CREATE INDEX "Notification_recipientRole_readAt_createdAt_idx" ON public."Notification" USING btree ("recipientRole", "readAt", "createdAt");

CREATE UNIQUE INDEX "Page_slug_key" ON public."Page" USING btree (slug);

CREATE UNIQUE INDEX "Section_pageId_slug_key" ON public."Section" USING btree ("pageId", slug);

CREATE INDEX "Session_userId_expiresAt_idx" ON public."Session" USING btree ("userId", "expiresAt");

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);

CREATE UNIQUE INDEX "User_ssoUserId_key" ON public."User" USING btree ("ssoUserId");

ALTER TABLE ONLY public."AnalyticsEvent"
    ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."ApproachOption"
    ADD CONSTRAINT "ApproachOption_approachId_fkey" FOREIGN KEY ("approachId") REFERENCES public."Approach"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Comment"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Consideration"
    ADD CONSTRAINT "Consideration_approachId_fkey" FOREIGN KEY ("approachId") REFERENCES public."Approach"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Consideration"
    ADD CONSTRAINT "Consideration_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES public."ApproachOption"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ContentBlock"
    ADD CONSTRAINT "ContentBlock_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."ContentBlock"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ContentBlock"
    ADD CONSTRAINT "ContentBlock_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public."Section"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."ContentRevision"
    ADD CONSTRAINT "ContentRevision_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES public."ContentBlock"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."ContentRevision"
    ADD CONSTRAINT "ContentRevision_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."CriterionScore"
    ADD CONSTRAINT "CriterionScore_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES public."Criterion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."CriterionScore"
    ADD CONSTRAINT "CriterionScore_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES public."ApproachOption"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Criterion"
    ADD CONSTRAINT "Criterion_approachId_fkey" FOREIGN KEY ("approachId") REFERENCES public."Approach"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."FeedbackActivity"
    ADD CONSTRAINT "FeedbackActivity_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES public."Feedback"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Feedback"
    ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."LibraryDiagram"
    ADD CONSTRAINT "LibraryDiagram_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Section"
    ADD CONSTRAINT "Section_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES public."Page"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."TimelineMilestone"
    ADD CONSTRAINT "TimelineMilestone_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES public."TimelinePhase"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


