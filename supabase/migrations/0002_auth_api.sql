-- MALKOM 3.0 portal — auth integration + the full API surface as database
-- functions ("API in the database"). Every function mirrors a route of the
-- original Fastify API: same role checks, same JSON DTO shapes (tables use
-- camelCase identifiers so to_jsonb() emits DTO-ready keys).
--
-- Access model: clients get NO direct table access. Everything goes through
-- SECURITY DEFINER api_* functions which enforce roles explicitly.

create schema if not exists private;

-- ── Column defaults & updatedAt maintenance ─────────────────────────────────
-- Prisma generated ids/updatedAt client-side; in-database API needs defaults.
do $$
declare r record;
begin
  for r in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'id' and data_type = 'text'
  loop
    execute format('alter table public.%I alter column id set default gen_random_uuid()::text', r.table_name);
  end loop;
  for r in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'updatedAt'
  loop
    execute format('alter table public.%I alter column "updatedAt" set default now()', r.table_name);
  end loop;
end $$;

create or replace function private.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new."updatedAt" := now();
  return new;
end $$;

do $$
declare r record;
begin
  for r in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'updatedAt'
  loop
    execute format('drop trigger if exists trg_touch_updated on public.%I', r.table_name);
    execute format('create trigger trg_touch_updated before update on public.%I for each row execute function private.touch_updated_at()', r.table_name);
  end loop;
end $$;

-- ── Auth: link Supabase auth.users to the app''s User table ─────────────────
alter table public."User" add column if not exists "authId" uuid unique;

create or replace function private.derive_name(p_email text) returns text
language sql immutable as $$
  select initcap(replace(replace(split_part(p_email, '@', 1), '.', ' '), '_', ' '));
$$;

create or replace function private.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  v_email text := lower(new.email);
  -- Entra/Azure sign-ins carry full_name (and sometimes name) in the metadata.
  v_name  text := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    private.derive_name(new.email));
  v_role  public."Role" := 'VIEWER';
  v_supers jsonb;
begin
  select value into v_supers from public."AppSetting" where key = 'auth.superAdminEmails';
  if v_supers is not null and v_supers ? v_email then
    v_role := 'SUPER_ADMIN';
  end if;

  insert into public."User" (id, "ssoUserId", email, name, role, "authId", "lastSeenAt")
  values (gen_random_uuid()::text, v_email, v_email, v_name, v_role, new.id, now())
  on conflict (email) do update
    set "authId" = excluded."authId",
        "lastSeenAt" = now(),
        role = case when excluded.role = 'SUPER_ADMIN' then 'SUPER_ADMIN' else public."User".role end;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

-- ── Role helpers ────────────────────────────────────────────────────────────
create or replace function private.role_rank(r public."Role") returns int
language sql immutable as $$
  select case r when 'VIEWER' then 0 when 'ADMIN' then 1 when 'SUPER_ADMIN' then 2 end;
$$;

create or replace function private.me() returns public."User"
language sql stable security definer set search_path = public as $$
  select u.* from public."User" u where u."authId" = auth.uid();
$$;

create or replace function private.require(p_min public."Role") returns public."User"
language plpgsql stable security definer set search_path = public, private as $$
declare u public."User";
begin
  u := private.me();
  if u.id is null then
    raise exception 'Not authenticated' using errcode = 'P0401';
  end if;
  if private.role_rank(u.role) < private.role_rank(p_min) then
    raise exception 'Insufficient permissions' using errcode = 'P0403';
  end if;
  return u;
end $$;

create or replace function private.session_key() returns text
language sql stable as $$
  select coalesce(auth.jwt() ->> 'session_id', 'unknown');
$$;

-- ── Settings ────────────────────────────────────────────────────────────────
create or replace function private.setting_defaults() returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'brand.primaryColor', '"#0070AD"'::jsonb,
    'brand.primaryHover', '"#005A8C"'::jsonb,
    'brand.primarySoft', '"#E6F1F7"'::jsonb,
    'brand.logoAssetId', 'null'::jsonb,
    'site.title', '"MALKOM 3.0 MVP"'::jsonb,
    'site.footerNotice', '"Internal tool. Page usage is tracked per user to improve the MALKOM MVP plan."'::jsonb,
    'feature.inlineComments', 'true'::jsonb
  );
$$;

create or replace function private.settings_merged() returns jsonb
language sql stable security definer set search_path = public, private as $$
  select private.setting_defaults() || coalesce(
    (select jsonb_object_agg(key, value) from public."AppSetting"
     where key like 'brand.%' or key like 'site.%' or key like 'feature.%'),
    '{}'::jsonb);
$$;

create or replace function public.api_public_settings() returns jsonb
language sql stable security definer set search_path = public, private as $$
  select jsonb_build_object(
    'settings', private.settings_merged(),
    'devLoginEnabled', false,
    'ssoEnabled', false
  );
$$;

create or replace function public.api_admin_settings_get() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.require('SUPER_ADMIN');
  return private.settings_merged();
end $$;

create or replace function public.api_admin_settings_patch(p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u public."User"; k text; v jsonb;
begin
  u := private.require('SUPER_ADMIN');
  for k, v in select * from jsonb_each(p_patch) loop
    if k not like 'brand.%' and k not like 'site.%' and k not like 'feature.%' then
      continue;
    end if;
    insert into public."AppSetting" (key, value, "updatedById")
    values (k, v, u.id)
    on conflict (key) do update set value = excluded.value, "updatedById" = excluded."updatedById";
  end loop;
  insert into public."AuditLog" ("actorId", action, meta)
  values (u.id, 'SETTING_UPDATED', jsonb_build_object('keys', (select jsonb_agg(key) from jsonb_object_keys(p_patch) key)));
  return private.settings_merged();
end $$;

-- ── Me / users ──────────────────────────────────────────────────────────────
create or replace function public.api_me() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u public."User";
begin
  u := private.me();
  if u.id is null then
    raise exception 'Not authenticated' using errcode = 'P0401';
  end if;
  update public."User" set "lastSeenAt" = now() where id = u.id;
  return jsonb_build_object('id', u.id, 'email', u.email, 'name', u.name, 'role', u.role);
end $$;

create or replace function public.api_admin_users() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.require('SUPER_ADMIN');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', u.id, 'email', u.email, 'name', u.name, 'role', u.role,
      'createdAt', u."createdAt", 'lastSeenAt', u."lastSeenAt",
      '_count', jsonb_build_object('feedback', (select count(*) from public."Feedback" f where f."userId" = u.id))
    ) order by u."createdAt")
    from public."User" u where u.email <> 'system@malkom.local'), '[]'::jsonb);
end $$;

create or replace function public.api_admin_user_set_role(p_id text, p_role text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u public."User";
begin
  u := private.require('SUPER_ADMIN');
  if p_id = u.id then
    raise exception 'You cannot change your own role' using errcode = 'P0400';
  end if;
  update public."User" set role = p_role::public."Role" where id = p_id;
  if not found then raise exception 'User not found' using errcode = 'P0404'; end if;
  insert into public."AuditLog" ("actorId", action, "entityId", meta)
  values (u.id, 'ROLE_CHANGED', p_id, jsonb_build_object('role', p_role));
  return jsonb_build_object('id', p_id, 'role', p_role);
end $$;

-- ── Pages & content ─────────────────────────────────────────────────────────
create or replace function private.block_node(b public."ContentBlock", p_drafts boolean) returns jsonb
language sql stable security definer set search_path = public, private as $$
  select jsonb_build_object(
    'id', b.id, 'kind', b.kind, 'payload', b.payload, 'order', b."order",
    'status', b.status, 'createdById', b."createdById",
    'children', coalesce((
      select jsonb_agg(private.block_node(c, p_drafts) order by c."order")
      from public."ContentBlock" c
      where c."parentId" = b.id
        and (case when p_drafts then c.status <> 'ARCHIVED' else c.status = 'PUBLISHED' end)
    ), '[]'::jsonb));
$$;

create or replace function private.approach_dto(a public."Approach") returns jsonb
language sql stable security definer set search_path = public, private as $$
  select to_jsonb(a) || jsonb_build_object(
    'options', coalesce((
      select jsonb_agg(to_jsonb(o) || jsonb_build_object(
        'scores', coalesce((select jsonb_agg(to_jsonb(s)) from public."CriterionScore" s where s."optionId" = o.id), '[]'::jsonb)
      ) order by o."order")
      from public."ApproachOption" o where o."approachId" = a.id), '[]'::jsonb),
    'criteria', coalesce((
      select jsonb_agg(to_jsonb(c) order by c."order")
      from public."Criterion" c where c."approachId" = a.id), '[]'::jsonb),
    'considerations', coalesce((
      select jsonb_agg(to_jsonb(x) order by x."order")
      from public."Consideration" x where x."approachId" = a.id), '[]'::jsonb));
$$;

create or replace function private.timeline_dto() returns jsonb
language sql stable security definer set search_path = public, private as $$
  select coalesce((
    select jsonb_agg(to_jsonb(p) || jsonb_build_object(
      'milestones', coalesce((
        select jsonb_agg(to_jsonb(m) order by m."order")
        from public."TimelineMilestone" m where m."phaseId" = p.id), '[]'::jsonb)
    ) order by p."order")
    from public."TimelinePhase" p), '[]'::jsonb);
$$;

create or replace function private.kpis() returns jsonb
language sql stable security definer set search_path = public, private as $$
  select jsonb_build_object(
    'approaches.count', (select count(*)::text from public."Approach"),
    'options.count', (select count(*)::text from public."ApproachOption"),
    'feedback.open', (select count(*)::text from public."Feedback" where status in ('OPEN','UNDER_REVIEW')),
    'feedback.resolved', (select count(*)::text from public."Feedback" where status = 'RESOLVED'),
    'voices.count', (select count(*)::text from public."ContentBlock" where kind = 'QUOTE' and status = 'PUBLISHED'),
    'milestone.next.days', coalesce((
      select ceil(extract(epoch from (m."dueDate" - now())) / 86400)::int::text
      from public."TimelineMilestone" m
      where m."dueDate" >= now() and m.status <> 'DONE'
      order by m."dueDate" limit 1), '—')
  );
$$;

create or replace function public.api_pages() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.require('VIEWER');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'slug', p.slug, 'title', p.title, 'summary', p.summary,
      'order', p."order", 'updatedAt', p."updatedAt") order by p."order")
    from public."Page" p), '[]'::jsonb);
end $$;

create or replace function public.api_get_page(p_slug text, p_preview boolean default false) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare
  u public."User"; v_page public."Page"; v_drafts boolean;
  v_sections jsonb; v_approaches jsonb; v_timeline jsonb; v_diagrams jsonb;
begin
  u := private.require('VIEWER');
  v_drafts := p_preview and private.role_rank(u.role) >= 1;

  select * into v_page from public."Page" where slug = p_slug;
  if not found then raise exception 'Page not found' using errcode = 'P0404'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id, 'slug', s.slug, 'title', s.title, 'description', s.description, 'order', s."order",
    'blocks', coalesce((
      select jsonb_agg(private.block_node(b, v_drafts) order by b."order")
      from public."ContentBlock" b
      where b."sectionId" = s.id and b."parentId" is null
        and (case when v_drafts then b.status <> 'ARCHIVED' else b.status = 'PUBLISHED' end)
    ), '[]'::jsonb)) order by s."order"), '[]'::jsonb)
  into v_sections
  from public."Section" s where s."pageId" = v_page.id;

  select coalesce(jsonb_object_agg(a.id, private.approach_dto(a)), '{}'::jsonb)
  into v_approaches
  from public."Approach" a
  where a.id in (
    select b.payload ->> 'approachId'
    from public."ContentBlock" b join public."Section" s on s.id = b."sectionId"
    where s."pageId" = v_page.id and b.kind = 'APPROACH_EMBED');

  select case when exists (
    select 1 from public."ContentBlock" b join public."Section" s on s.id = b."sectionId"
    where s."pageId" = v_page.id and b.kind = 'TIMELINE_EMBED')
  then private.timeline_dto() else '[]'::jsonb end into v_timeline;

  select coalesce(jsonb_object_agg(d.id, jsonb_build_object(
    'id', d.id, 'title', d.title, 'diagramType', d."diagramType", 'definition', d.definition)), '{}'::jsonb)
  into v_diagrams
  from public."LibraryDiagram" d
  where d.id in (
    select b.payload ->> 'libraryDiagramId'
    from public."ContentBlock" b join public."Section" s on s.id = b."sectionId"
    where s."pageId" = v_page.id and b.kind = 'DIAGRAM');

  return jsonb_build_object(
    'id', v_page.id, 'slug', v_page.slug, 'title', v_page.title, 'summary', v_page.summary,
    'sections', v_sections,
    'embeds', jsonb_build_object(
      'approaches', v_approaches, 'timeline', v_timeline,
      'kpis', private.kpis(), 'diagrams', v_diagrams));
end $$;

create or replace function public.api_approaches() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.require('VIEWER');
  return coalesce((
    select jsonb_agg(private.approach_dto(a) order by a."order") from public."Approach" a), '[]'::jsonb);
end $$;

create or replace function public.api_timeline() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.require('VIEWER');
  return private.timeline_dto();
end $$;

-- ── Feedback ────────────────────────────────────────────────────────────────
create or replace function public.api_feedback_targets(p_page text) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare v_page public."Page";
begin
  perform private.require('VIEWER');
  select * into v_page from public."Page" where slug = p_page;
  if not found then raise exception 'Page not found' using errcode = 'P0404'; end if;
  return jsonb_build_object(
    'page', jsonb_build_object('entityType', 'PAGE', 'entityId', v_page.id, 'label', v_page.title),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'sectionId', s.id, 'title', s.title,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'entityType', 'CONTENT_BLOCK', 'entityId', b.id,
            'label', coalesce(
              left(b.payload ->> 'title', 60), left(b.payload ->> 'label', 60),
              left(b.payload ->> 'personaName', 60), left(b.payload ->> 'text', 60),
              lower(replace(b.kind::text, '_', ' ')))) order by b."order")
          from public."ContentBlock" b where b."sectionId" = s.id and b.status = 'PUBLISHED'
        ), '[]'::jsonb)) order by s."order")
      from public."Section" s where s."pageId" = v_page.id), '[]'::jsonb));
end $$;

create or replace function public.api_feedback_submit(p_entries jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u public."User"; e jsonb; n int := 0; ids jsonb := '[]'::jsonb; v_id text;
begin
  u := private.require('VIEWER');
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) between 1 and 20 is not true then
    raise exception 'entries must be an array of 1-20 items' using errcode = 'P0400';
  end if;
  for e in select * from jsonb_array_elements(p_entries) loop
    if length(coalesce(e ->> 'message', '')) < 10 then
      raise exception 'Each message needs at least 10 characters' using errcode = 'P0400';
    end if;
    insert into public."Feedback" ("userId", "entityType", "entityId", type, message, "proposedText")
    values (u.id, (e ->> 'entityType')::public."EntityType", e ->> 'entityId',
            (e ->> 'type')::public."FeedbackType", e ->> 'message', e ->> 'proposedText')
    returning id into v_id;
    ids := ids || to_jsonb(v_id);
    n := n + 1;
  end loop;
  if private.role_rank(u.role) < 2 then
    insert into public."Notification" ("recipientRole", "actorId", type, message)
    values ('SUPER_ADMIN', u.id, 'FEEDBACK_SUBMITTED',
            u.name || ' submitted ' || n || ' feedback item' || case when n > 1 then 's' else '' end);
  end if;
  return jsonb_build_object('created', n, 'ids', ids);
end $$;

create or replace function public.api_feedback_mine() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare u public."User";
begin
  u := private.require('VIEWER');
  return coalesce((
    select jsonb_agg(to_jsonb(f) order by f."createdAt" desc)
    from (select * from public."Feedback" where "userId" = u.id order by "createdAt" desc limit 100) f),
    '[]'::jsonb);
end $$;

create or replace function public.api_admin_feedback(p_status text default null, p_page int default 1, p_limit int default 20) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare v_total int;
begin
  perform private.require('SUPER_ADMIN');
  select count(*) into v_total from public."Feedback" f
  where p_status is null or f.status = p_status::public."FeedbackStatus";
  return jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(to_jsonb(f) || jsonb_build_object(
        'user', jsonb_build_object('name', u.name, 'email', u.email)) order by f."createdAt" desc)
      from (
        select * from public."Feedback" f2
        where p_status is null or f2.status = p_status::public."FeedbackStatus"
        order by f2."createdAt" desc
        offset greatest(p_page - 1, 0) * p_limit limit p_limit
      ) f join public."User" u on u.id = f."userId"), '[]'::jsonb),
    'meta', jsonb_build_object('total', v_total, 'page', p_page, 'limit', p_limit));
end $$;

create or replace function public.api_feedback_set_status(p_id text, p_status text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u public."User"; v_old public."FeedbackStatus"; f public."Feedback";
begin
  u := private.require('SUPER_ADMIN');
  select status into v_old from public."Feedback" where id = p_id;
  if not found then raise exception 'Feedback not found' using errcode = 'P0404'; end if;
  update public."Feedback" set status = p_status::public."FeedbackStatus" where id = p_id returning * into f;
  insert into public."FeedbackActivity" ("feedbackId", "actorId", "fromStatus", "toStatus", note)
  values (p_id, u.id, v_old, p_status::public."FeedbackStatus", p_note);
  return to_jsonb(f);
end $$;

-- ── Comments (ADMIN+) ───────────────────────────────────────────────────────
create or replace function public.api_comments(p_entity_type text, p_entity_id text) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.require('ADMIN');
  return coalesce((
    select jsonb_agg(to_jsonb(c) || jsonb_build_object(
      'user', jsonb_build_object('name', u.name),
      'replies', coalesce((
        select jsonb_agg(to_jsonb(r) || jsonb_build_object('user', jsonb_build_object('name', ru.name)) order by r."createdAt")
        from public."Comment" r join public."User" ru on ru.id = r."userId"
        where r."parentId" = c.id), '[]'::jsonb)) order by c."createdAt")
    from public."Comment" c join public."User" u on u.id = c."userId"
    where c."entityType" = p_entity_type::public."EntityType" and c."entityId" = p_entity_id and c."parentId" is null),
    '[]'::jsonb);
end $$;

create or replace function public.api_comment_add(p_entity_type text, p_entity_id text, p_body text, p_parent_id text default null) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u public."User"; c public."Comment";
begin
  u := private.require('ADMIN');
  if length(coalesce(p_body, '')) < 1 then
    raise exception 'Comment cannot be empty' using errcode = 'P0400';
  end if;
  insert into public."Comment" ("userId", "entityType", "entityId", body, "parentId")
  values (u.id, p_entity_type::public."EntityType", p_entity_id, p_body, p_parent_id)
  returning * into c;
  return to_jsonb(c) || jsonb_build_object('user', jsonb_build_object('name', u.name));
end $$;

-- ── Analytics ───────────────────────────────────────────────────────────────
create or replace function public.api_track(p_events jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u public."User"; e jsonb; n int := 0;
begin
  u := private.require('VIEWER');
  for e in select * from jsonb_array_elements(p_events) loop
    insert into public."AnalyticsEvent" ("userId", "sessionId", type, "pageSlug", "sectionSlug", "durationMs", meta)
    values (u.id, private.session_key(), (e ->> 'type')::public."EventType",
            left(e ->> 'pageSlug', 80), left(e ->> 'sectionSlug', 80),
            (e ->> 'durationMs')::int, e -> 'meta');
    n := n + 1;
    exit when n >= 50;
  end loop;
  return jsonb_build_object('ingested', n);
end $$;

create or replace function public.api_admin_analytics_summary() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.require('SUPER_ADMIN');
  return jsonb_build_object(
    'totalUsers', (select count(*) from public."User" where email <> 'system@malkom.local'),
    'totalViews', (select count(*) from public."AnalyticsEvent" where type = 'PAGE_VIEW'),
    'pages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'pageSlug', v."pageSlug", 'views', v.views, 'avgDwellMs', d.avg_dwell))
      from (select "pageSlug", count(*) as views from public."AnalyticsEvent"
            where type = 'PAGE_VIEW' group by "pageSlug") v
      left join (select "pageSlug", round(avg("durationMs")) as avg_dwell from public."AnalyticsEvent"
                 where type = 'PAGE_EXIT' and "durationMs" is not null group by "pageSlug") d
        on d."pageSlug" = v."pageSlug"), '[]'::jsonb));
end $$;

create or replace function public.api_admin_analytics_users() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.require('SUPER_ADMIN');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', u.id, 'name', u.name, 'email', u.email, 'role', u.role, 'lastSeenAt', u."lastSeenAt",
      '_count', jsonb_build_object(
        'events', (select count(*) from public."AnalyticsEvent" e where e."userId" = u.id),
        'feedback', (select count(*) from public."Feedback" f where f."userId" = u.id)))
      order by u."lastSeenAt" desc nulls last)
    from public."User" u where u.email <> 'system@malkom.local'), '[]'::jsonb);
end $$;

create or replace function public.api_admin_analytics_user(p_id text) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare v_user jsonb;
begin
  perform private.require('SUPER_ADMIN');
  select jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email, 'role', u.role, 'lastSeenAt', u."lastSeenAt")
  into v_user from public."User" u where u.id = p_id;
  if v_user is null then raise exception 'User not found' using errcode = 'P0404'; end if;
  return jsonb_build_object(
    'user', v_user,
    'byPage', coalesce((
      select jsonb_agg(jsonb_build_object(
        'pageSlug', g."pageSlug", 'type', g.type,
        '_count', jsonb_build_object('_all', g.n),
        '_avg', jsonb_build_object('durationMs', g.avg_ms)))
      from (select "pageSlug", type, count(*) as n, avg("durationMs") as avg_ms
            from public."AnalyticsEvent"
            where "userId" = p_id and type in ('PAGE_VIEW', 'PAGE_EXIT')
            group by "pageSlug", type) g), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'type', e.type, 'pageSlug', e."pageSlug", 'durationMs', e."durationMs", 'createdAt', e."createdAt"))
      from (select * from public."AnalyticsEvent" where "userId" = p_id
            order by "createdAt" desc limit 50) e), '[]'::jsonb));
end $$;

-- ── Notifications ───────────────────────────────────────────────────────────
create or replace function public.api_notifications() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare u public."User";
begin
  u := private.require('VIEWER');
  return jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(to_jsonb(n) || jsonb_build_object('actor', jsonb_build_object('name', a.name)) order by n."createdAt" desc)
      from (select * from public."Notification"
            where "recipientId" = u.id or "recipientRole" = u.role
            order by "createdAt" desc limit 20) n
      join public."User" a on a.id = n."actorId"), '[]'::jsonb),
    'unread', (select count(*) from public."Notification"
               where ("recipientId" = u.id or "recipientRole" = u.role) and "readAt" is null));
end $$;

create or replace function public.api_notifications_read_all() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u public."User";
begin
  u := private.require('VIEWER');
  update public."Notification" set "readAt" = now()
  where ("recipientId" = u.id or "recipientRole" = u.role) and "readAt" is null;
  return jsonb_build_object('read', true);
end $$;

-- ── Authoring: blocks ───────────────────────────────────────────────────────
create or replace function public.api_block_create(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u public."User"; b public."ContentBlock"; v_ctx text;
begin
  u := private.require('ADMIN');
  insert into public."ContentBlock" ("sectionId", "parentId", kind, payload, "order", "createdById")
  values (p ->> 'sectionId', p ->> 'parentId', (p ->> 'kind')::public."BlockKind",
          p -> 'payload', coalesce((p ->> 'order')::int, 0), u.id)
  returning * into b;
  if private.role_rank(u.role) < 2 then
    select pg.title || ' › ' || s.title into v_ctx
    from public."Section" s join public."Page" pg on pg.id = s."pageId"
    where s.id = b."sectionId";
    insert into public."Notification" ("recipientRole", "actorId", type, message, "entityType", "entityId")
    values ('SUPER_ADMIN', u.id, 'BLOCK_ADDED',
            u.name || ' added a ' || lower(replace(b.kind::text, '_', ' ')) || ' block on “' ||
            coalesce(v_ctx, 'a page') || '” — review & publish', 'CONTENT_BLOCK', b.id);
  end if;
  return to_jsonb(b);
end $$;

create or replace function public.api_block_update(p_id text, p_payload jsonb default null, p_order int default null, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u public."User"; b public."ContentBlock";
begin
  u := private.require('ADMIN');
  select * into b from public."ContentBlock" where id = p_id;
  if not found then raise exception 'Block not found' using errcode = 'P0404'; end if;
  if private.role_rank(u.role) < 2 and not (b."createdById" = u.id and b.status = 'DRAFT') then
    raise exception 'Admins can only edit their own draft blocks — use a suggestion instead' using errcode = 'P0403';
  end if;
  if p_payload is not null then
    insert into public."ContentRevision" ("blockId", kind, payload, status, "editedById", note)
    values (b.id, b.kind, b.payload, b.status, u.id, p_note);
    update public."ContentBlock"
    set payload = p_payload, status = 'DRAFT', "updatedById" = u.id,
        "order" = coalesce(p_order, "order")
    where id = p_id returning * into b;
  elsif p_order is not null then
    update public."ContentBlock" set "order" = p_order, "updatedById" = u.id
    where id = p_id returning * into b;
  end if;
  return to_jsonb(b);
end $$;

create or replace function public.api_block_publish(p_id text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u public."User"; b public."ContentBlock";
begin
  u := private.require('SUPER_ADMIN');
  update public."ContentBlock"
  set status = 'PUBLISHED', "publishedAt" = now(), "updatedById" = u.id
  where id = p_id returning * into b;
  if not found then raise exception 'Block not found' using errcode = 'P0404'; end if;
  insert into public."AuditLog" ("actorId", action, "entityType", "entityId")
  values (u.id, 'BLOCK_PUBLISHED', 'CONTENT_BLOCK', p_id);
  return to_jsonb(b);
end $$;

create or replace function public.api_block_archive(p_id text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u public."User"; b public."ContentBlock";
begin
  u := private.require('SUPER_ADMIN');
  update public."ContentBlock" set status = 'ARCHIVED', "updatedById" = u.id
  where id = p_id returning * into b;
  if not found then raise exception 'Block not found' using errcode = 'P0404'; end if;
  return to_jsonb(b);
end $$;

create or replace function public.api_block_revisions(p_id text) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.require('SUPER_ADMIN');
  return coalesce((
    select jsonb_agg(to_jsonb(r) || jsonb_build_object('editedBy', jsonb_build_object('name', u.name)) order by r."createdAt" desc)
    from public."ContentRevision" r join public."User" u on u.id = r."editedById"
    where r."blockId" = p_id), '[]'::jsonb);
end $$;

create or replace function public.api_block_revert(p_id text, p_revision_id text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u public."User"; b public."ContentBlock"; r public."ContentRevision";
begin
  u := private.require('SUPER_ADMIN');
  select * into b from public."ContentBlock" where id = p_id;
  select * into r from public."ContentRevision" where id = p_revision_id and "blockId" = p_id;
  if b.id is null or r.id is null then
    raise exception 'Block or revision not found' using errcode = 'P0404';
  end if;
  insert into public."ContentRevision" ("blockId", kind, payload, status, "editedById", note)
  values (b.id, b.kind, b.payload, b.status, u.id, 'before revert');
  insert into public."AuditLog" ("actorId", action, "entityType", "entityId")
  values (u.id, 'BLOCK_REVERTED', 'CONTENT_BLOCK', p_id);
  update public."ContentBlock" set payload = r.payload, status = 'DRAFT', "updatedById" = u.id
  where id = p_id returning * into b;
  return to_jsonb(b);
end $$;

-- ── Authoring: approaches (+ score matrix trigger) ──────────────────────────
create or replace function private.sync_score_matrix(p_approach_id text) returns void
language sql security definer set search_path = public, private as $$
  insert into public."CriterionScore" ("criterionId", "optionId")
  select c.id, o.id
  from public."Criterion" c
  cross join public."ApproachOption" o
  where c."approachId" = p_approach_id and o."approachId" = p_approach_id
  on conflict ("criterionId", "optionId") do nothing;
$$;

create or replace function private.trg_sync_matrix() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  perform private.sync_score_matrix(new."approachId");
  return new;
end $$;

drop trigger if exists trg_option_matrix on public."ApproachOption";
create trigger trg_option_matrix after insert on public."ApproachOption"
  for each row execute function private.trg_sync_matrix();
drop trigger if exists trg_criterion_matrix on public."Criterion";
create trigger trg_criterion_matrix after insert on public."Criterion"
  for each row execute function private.trg_sync_matrix();

create or replace function public.api_approach_upsert(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u public."User"; a public."Approach";
begin
  u := private.require('SUPER_ADMIN');
  if p ->> 'id' is null then
    insert into public."Approach" (title, context, rationale, "order")
    values (coalesce(p ->> 'title', 'New approach'), coalesce(p ->> 'context', ''), p ->> 'rationale',
            coalesce((p ->> 'order')::int, 0))
    returning * into a;
  else
    update public."Approach" set
      title = coalesce(p ->> 'title', title),
      context = coalesce(p ->> 'context', context),
      rationale = coalesce(p ->> 'rationale', rationale),
      "recommendedOptionId" = case when p ? 'recommendedOptionId' then p ->> 'recommendedOptionId' else "recommendedOptionId" end
    where id = p ->> 'id' returning * into a;
    if not found then raise exception 'Approach not found' using errcode = 'P0404'; end if;
  end if;
  return to_jsonb(a);
end $$;

create or replace function public.api_option_upsert(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u public."User"; o public."ApproachOption";
begin
  u := private.require('SUPER_ADMIN');
  if p ->> 'id' is null then
    insert into public."ApproachOption" ("approachId", title, description, pros, cons, effort, risk, "order")
    values (p ->> 'approachId', p ->> 'title', coalesce(p ->> 'description', ''),
            coalesce((select array_agg(x #>> '{}') from jsonb_array_elements(p -> 'pros') x), '{}'),
            coalesce((select array_agg(x #>> '{}') from jsonb_array_elements(p -> 'cons') x), '{}'),
            (p ->> 'effort')::int, (p ->> 'risk')::int, coalesce((p ->> 'order')::int, 0))
    returning * into o;
  else
    update public."ApproachOption" set
      title = coalesce(p ->> 'title', title),
      description = coalesce(p ->> 'description', description),
      pros = coalesce((select array_agg(x #>> '{}') from jsonb_array_elements(p -> 'pros') x), pros),
      cons = coalesce((select array_agg(x #>> '{}') from jsonb_array_elements(p -> 'cons') x), cons),
      effort = coalesce((p ->> 'effort')::int, effort),
      risk = coalesce((p ->> 'risk')::int, risk)
    where id = p ->> 'id' returning * into o;
    if not found then raise exception 'Option not found' using errcode = 'P0404'; end if;
  end if;
  return to_jsonb(o);
end $$;

create or replace function public.api_option_delete(p_id text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
begin
  perform private.require('SUPER_ADMIN');
  delete from public."CriterionScore" where "optionId" = p_id;
  delete from public."Consideration" where "optionId" = p_id;
  update public."Approach" set "recommendedOptionId" = null where "recommendedOptionId" = p_id;
  delete from public."ApproachOption" where id = p_id;
  return jsonb_build_object('deleted', true);
end $$;

create or replace function public.api_criterion_upsert(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare c public."Criterion";
begin
  perform private.require('SUPER_ADMIN');
  if p ->> 'id' is null then
    insert into public."Criterion" ("approachId", label, weight, "order")
    values (p ->> 'approachId', coalesce(p ->> 'label', 'New criterion'),
            coalesce((p ->> 'weight')::int, 1), coalesce((p ->> 'order')::int, 0))
    returning * into c;
  else
    update public."Criterion" set
      label = coalesce(p ->> 'label', label),
      weight = coalesce((p ->> 'weight')::int, weight)
    where id = p ->> 'id' returning * into c;
    if not found then raise exception 'Criterion not found' using errcode = 'P0404'; end if;
  end if;
  return to_jsonb(c);
end $$;

create or replace function public.api_criterion_delete(p_id text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
begin
  perform private.require('SUPER_ADMIN');
  delete from public."CriterionScore" where "criterionId" = p_id;
  delete from public."Criterion" where id = p_id;
  return jsonb_build_object('deleted', true);
end $$;

create or replace function public.api_score_update(p_id text, p_score int default null, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare s public."CriterionScore";
begin
  perform private.require('SUPER_ADMIN');
  update public."CriterionScore" set score = p_score, note = coalesce(p_note, note)
  where id = p_id returning * into s;
  if not found then raise exception 'Score not found' using errcode = 'P0404'; end if;
  return to_jsonb(s);
end $$;

-- ── Authoring: timeline ─────────────────────────────────────────────────────
create or replace function public.api_phase_upsert(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare ph public."TimelinePhase";
begin
  perform private.require('SUPER_ADMIN');
  if p ->> 'id' is null then
    insert into public."TimelinePhase" (title, description, "startDate", "endDate", status, "order")
    values (p ->> 'title', p ->> 'description', (p ->> 'startDate')::timestamptz,
            (p ->> 'endDate')::timestamptz, coalesce(p ->> 'status', 'PLANNED')::public."PhaseStatus",
            coalesce((p ->> 'order')::int, 0))
    returning * into ph;
  else
    update public."TimelinePhase" set
      title = coalesce(p ->> 'title', title),
      description = coalesce(p ->> 'description', description),
      "startDate" = coalesce((p ->> 'startDate')::timestamptz, "startDate"),
      "endDate" = coalesce((p ->> 'endDate')::timestamptz, "endDate"),
      status = coalesce((p ->> 'status')::public."PhaseStatus", status)
    where id = p ->> 'id' returning * into ph;
    if not found then raise exception 'Phase not found' using errcode = 'P0404'; end if;
  end if;
  return to_jsonb(ph);
end $$;

create or replace function public.api_phase_delete(p_id text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
begin
  perform private.require('SUPER_ADMIN');
  delete from public."TimelineMilestone" where "phaseId" = p_id;
  delete from public."TimelinePhase" where id = p_id;
  return jsonb_build_object('deleted', true);
end $$;

create or replace function public.api_milestone_upsert(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare m public."TimelineMilestone";
begin
  perform private.require('SUPER_ADMIN');
  if p ->> 'id' is null then
    insert into public."TimelineMilestone" ("phaseId", title, description, "dueDate", status, "order")
    values (p ->> 'phaseId', p ->> 'title', p ->> 'description', (p ->> 'dueDate')::timestamptz,
            coalesce(p ->> 'status', 'PLANNED')::public."MilestoneStatus", coalesce((p ->> 'order')::int, 0))
    returning * into m;
  else
    update public."TimelineMilestone" set
      title = coalesce(p ->> 'title', title),
      description = coalesce(p ->> 'description', description),
      "dueDate" = coalesce((p ->> 'dueDate')::timestamptz, "dueDate"),
      status = coalesce((p ->> 'status')::public."MilestoneStatus", status)
    where id = p ->> 'id' returning * into m;
    if not found then raise exception 'Milestone not found' using errcode = 'P0404'; end if;
  end if;
  return to_jsonb(m);
end $$;

create or replace function public.api_milestone_delete(p_id text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
begin
  perform private.require('SUPER_ADMIN');
  delete from public."TimelineMilestone" where id = p_id;
  return jsonb_build_object('deleted', true);
end $$;

-- ── Diagram library ─────────────────────────────────────────────────────────
create or replace function public.api_diagrams() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.require('VIEWER');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id, 'title', d.title, 'description', d.description, 'diagramType', d."diagramType",
      'createdAt', d."createdAt", 'updatedAt', d."updatedAt",
      'createdBy', jsonb_build_object('name', u.name)) order by d."updatedAt" desc)
    from public."LibraryDiagram" d join public."User" u on u.id = d."createdById"), '[]'::jsonb);
end $$;

create or replace function public.api_diagram(p_id text) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare d public."LibraryDiagram";
begin
  perform private.require('VIEWER');
  select * into d from public."LibraryDiagram" where id = p_id;
  if not found then raise exception 'Diagram not found' using errcode = 'P0404'; end if;
  return to_jsonb(d);
end $$;

create or replace function public.api_diagram_upsert(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u public."User"; d public."LibraryDiagram";
begin
  u := private.require('SUPER_ADMIN');
  if p ->> 'id' is null then
    insert into public."LibraryDiagram" (title, description, "diagramType", definition, "createdById")
    values (p ->> 'title', p ->> 'description', p ->> 'diagramType', p -> 'definition', u.id)
    returning * into d;
  else
    update public."LibraryDiagram" set
      title = coalesce(p ->> 'title', title),
      description = coalesce(p ->> 'description', description),
      "diagramType" = coalesce(p ->> 'diagramType', "diagramType"),
      definition = coalesce(p -> 'definition', definition),
      "updatedById" = u.id
    where id = p ->> 'id' returning * into d;
    if not found then raise exception 'Diagram not found' using errcode = 'P0404'; end if;
  end if;
  return to_jsonb(d);
end $$;

create or replace function public.api_diagram_delete(p_id text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u public."User";
begin
  u := private.require('SUPER_ADMIN');
  delete from public."LibraryDiagram" where id = p_id;
  if not found then raise exception 'Diagram not found' using errcode = 'P0404'; end if;
  insert into public."AuditLog" ("actorId", action, "entityId")
  values (u.id, 'DIAGRAM_DELETED', p_id);
  return jsonb_build_object('deleted', true);
end $$;

-- ── Lock down: no direct table access; API functions only ───────────────────
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
grant usage on schema public to anon, authenticated;

do $$
declare f record;
begin
  for f in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'api\_%'
  loop
    execute format('revoke all on function public.%I(%s) from public, anon', f.proname, f.args);
    execute format('grant execute on function public.%I(%s) to authenticated', f.proname, f.args);
  end loop;
end $$;
grant execute on function public.api_public_settings() to anon;

-- ── Seed the super-admin allowlist (editable in AppSetting) ─────────────────
insert into public."AppSetting" (key, value)
values ('auth.superAdminEmails', '["tushar.parik@wns.com", "u139289@wns.com", "tushar.parik@gmail.com"]'::jsonb)
on conflict (key) do nothing;
