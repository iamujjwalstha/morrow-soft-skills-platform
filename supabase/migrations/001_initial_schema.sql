-- Morrow initial data model. Review with your security requirements before production use.
create extension if not exists pgcrypto;

create type public.workspace_role as enum ('learner', 'trainer', 'org_admin');
create type public.scenario_status as enum ('draft', 'published', 'archived');
create type public.session_status as enum ('in_progress', 'completed', 'abandoned');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'learner',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  title text not null check (char_length(title) between 1 and 160),
  category text not null default 'Communication',
  status public.scenario_status not null default 'draft',
  current_version integer not null default 1 check (current_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scenario_versions (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  version integer not null check (version > 0),
  objective text not null,
  persona text not null,
  opening_line text not null,
  character_mood text not null default 'Concerned',
  learner_role text not null default 'Learner',
  learner_instructions text not null default '',
  setting text not null default 'Workplace conversation',
  description text not null default '',
  difficulty text not null default 'Beginner' check (difficulty in ('Beginner','Intermediate','Advanced')),
  estimated_minutes integer not null default 6 check (estimated_minutes between 1 and 90),
  rubric jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (scenario_id, version)
);

create table public.pathways (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text not null default '',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.pathway_modules (
  id uuid primary key default gen_random_uuid(),
  pathway_id uuid not null references public.pathways(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  scenario_version integer not null,
  position integer not null check (position >= 0),
  unique (pathway_id, position),
  foreign key (scenario_id, scenario_version) references public.scenario_versions(scenario_id, version)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scenario_id uuid references public.scenarios(id) on delete cascade,
  pathway_id uuid references public.pathways(id) on delete cascade,
  assigned_user_id uuid references auth.users(id) on delete cascade,
  assigned_by uuid not null references auth.users(id),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  check ((scenario_id is not null)::int + (pathway_id is not null)::int = 1)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  learner_id uuid not null references auth.users(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete restrict,
  scenario_version integer not null,
  assignment_id uuid references public.assignments(id) on delete set null,
  status public.session_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  foreign key (scenario_id, scenario_version) references public.scenario_versions(scenario_id, version)
);

create table public.session_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  sequence_number integer not null check (sequence_number >= 0),
  speaker text not null check (speaker in ('learner','character','system')),
  content text not null check (char_length(content) <= 12000),
  created_at timestamptz not null default now(),
  unique (session_id, sequence_number)
);

create table public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions(id) on delete cascade,
  model_name text,
  prompt_version text not null,
  overall_score numeric(5,2) check (overall_score between 0 and 100),
  summary text not null default '',
  strengths jsonb not null default '[]'::jsonb,
  improvements jsonb not null default '[]'::jsonb,
  next_step text not null default '',
  generated_at timestamptz not null default now()
);

create table public.rubric_scores (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.feedback_reports(id) on delete cascade,
  criterion text not null,
  score numeric(3,2) not null check (score between 1 and 5),
  rationale text not null,
  evidence text not null default '',
  suggestion text not null default '',
  unique (report_id, criterion)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index memberships_user_idx on public.memberships(user_id);
create index scenarios_org_status_idx on public.scenarios(organization_id, status);
create index sessions_learner_date_idx on public.sessions(learner_id, started_at desc);
create index sessions_org_date_idx on public.sessions(organization_id, started_at desc);
create index turns_session_sequence_idx on public.session_turns(session_id, sequence_number);
create index assignments_user_due_idx on public.assignments(assigned_user_id, due_at);

create or replace function public.is_org_member(org_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.memberships m where m.organization_id = org_id and m.user_id = auth.uid()) $$;

create or replace function public.has_org_role(org_id uuid, allowed public.workspace_role[])
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.memberships m where m.organization_id = org_id and m.user_id = auth.uid() and m.role = any(allowed)) $$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.scenarios enable row level security;
alter table public.scenario_versions enable row level security;
alter table public.pathways enable row level security;
alter table public.pathway_modules enable row level security;
alter table public.assignments enable row level security;
alter table public.sessions enable row level security;
alter table public.session_turns enable row level security;
alter table public.feedback_reports enable row level security;
alter table public.rubric_scores enable row level security;
alter table public.audit_events enable row level security;

create policy "members can read their organizations" on public.organizations for select using (public.is_org_member(id));
create policy "users read own profile" on public.profiles for select using (id = auth.uid());
create policy "users update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "members can see org membership list" on public.memberships for select using (public.is_org_member(organization_id));
create policy "org members read scenarios" on public.scenarios for select using (public.is_org_member(organization_id));
create policy "trainers create scenarios" on public.scenarios for insert with check (public.has_org_role(organization_id, array['trainer','org_admin']::public.workspace_role[]) and created_by = auth.uid());
create policy "trainers update scenarios" on public.scenarios for update using (public.has_org_role(organization_id, array['trainer','org_admin']::public.workspace_role[])) with check (public.has_org_role(organization_id, array['trainer','org_admin']::public.workspace_role[]));
create policy "trainers delete scenarios" on public.scenarios for delete using (public.has_org_role(organization_id, array['trainer','org_admin']::public.workspace_role[]));
create policy "members read scenario versions" on public.scenario_versions for select using (exists (select 1 from public.scenarios s where s.id = scenario_id and public.is_org_member(s.organization_id)));
create policy "trainers manage scenario versions" on public.scenario_versions for all using (exists (select 1 from public.scenarios s where s.id = scenario_id and public.has_org_role(s.organization_id, array['trainer','org_admin']::public.workspace_role[]))) with check (exists (select 1 from public.scenarios s where s.id = scenario_id and public.has_org_role(s.organization_id, array['trainer','org_admin']::public.workspace_role[])) and created_by = auth.uid());
create policy "members read pathways" on public.pathways for select using (public.is_org_member(organization_id));
create policy "trainers manage pathways" on public.pathways for all using (public.has_org_role(organization_id, array['trainer','org_admin']::public.workspace_role[])) with check (public.has_org_role(organization_id, array['trainer','org_admin']::public.workspace_role[]) and created_by = auth.uid());
create policy "members read pathway modules" on public.pathway_modules for select using (exists (select 1 from public.pathways p where p.id = pathway_id and public.is_org_member(p.organization_id)));
create policy "trainers manage pathway modules" on public.pathway_modules for all using (exists (select 1 from public.pathways p where p.id = pathway_id and public.has_org_role(p.organization_id, array['trainer','org_admin']::public.workspace_role[]))) with check (exists (select 1 from public.pathways p where p.id = pathway_id and public.has_org_role(p.organization_id, array['trainer','org_admin']::public.workspace_role[])));
create policy "members read assignments" on public.assignments for select using (public.is_org_member(organization_id) and (assigned_user_id = auth.uid() or public.has_org_role(organization_id, array['trainer','org_admin']::public.workspace_role[])));
create policy "trainers manage assignments" on public.assignments for all using (public.has_org_role(organization_id, array['trainer','org_admin']::public.workspace_role[])) with check (public.has_org_role(organization_id, array['trainer','org_admin']::public.workspace_role[]) and assigned_by = auth.uid());
create policy "learners and trainers read sessions" on public.sessions for select using (learner_id = auth.uid() or public.has_org_role(organization_id, array['trainer','org_admin']::public.workspace_role[]));
create policy "learners create their own sessions" on public.sessions for insert with check (learner_id = auth.uid() and public.is_org_member(organization_id));
create policy "learners update their own sessions" on public.sessions for update using (learner_id = auth.uid()) with check (learner_id = auth.uid() and public.is_org_member(organization_id));
create policy "session participants read turns" on public.session_turns for select using (exists (select 1 from public.sessions s where s.id = session_id and (s.learner_id = auth.uid() or public.has_org_role(s.organization_id, array['trainer','org_admin']::public.workspace_role[]))));
create policy "learners add turns to own active sessions" on public.session_turns for insert with check (exists (select 1 from public.sessions s where s.id = session_id and s.learner_id = auth.uid() and s.status = 'in_progress'));
create policy "participants read feedback" on public.feedback_reports for select using (exists (select 1 from public.sessions s where s.id = session_id and (s.learner_id = auth.uid() or public.has_org_role(s.organization_id, array['trainer','org_admin']::public.workspace_role[]))));
create policy "participants read rubric scores" on public.rubric_scores for select using (exists (select 1 from public.feedback_reports fr join public.sessions s on s.id = fr.session_id where fr.id = report_id and (s.learner_id = auth.uid() or public.has_org_role(s.organization_id, array['trainer','org_admin']::public.workspace_role[]))));
create policy "org admins read audit events" on public.audit_events for select using (organization_id is not null and public.has_org_role(organization_id, array['org_admin']::public.workspace_role[]));

-- Deliberately do not grant browser-side inserts to feedback_reports or rubric_scores.
-- Generate these through a trusted server route after authenticating the session owner.
-- Before production, add validated server-side write flows and review all policies with tests.
