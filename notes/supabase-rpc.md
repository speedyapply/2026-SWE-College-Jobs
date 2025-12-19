# Supabase RPC Reference

This note summarizes the Postgres RPC functions used by this repo and what each one does. These are created in your Supabase project and called by the GitHub Action under `.github/scripts`.

## Overview
- RPCs are Postgres functions exposed through Supabase.
- The job updater uses them to fetch rows and update Markdown tables.
- All functions below assume a `public.jobs` table with the columns created earlier.

## get_jobs
Returns active jobs filtered by job type, USA flag, and company type.

```sql
create or replace function public.get_jobs(
  job_type text,
  is_usa boolean,
  company_type text
)
returns table (
  company_name text,
  company_url text,
  job_title text,
  job_locations text,
  job_url text,
  age int,
  salary numeric
) language sql stable as $$
  select
    j.company_name,
    j.company_url,
    j.job_title,
    j.job_locations,
    j.job_url,
    extract(day from now() - j.created_at)::int as age,
    j.salary
  from public.jobs j
  where j.status = 'active'
    and j.job_type = get_jobs.job_type
    and j.is_usa = get_jobs.is_usa
    and j.company_type = get_jobs.company_type
  order by j.created_at desc;
$$;
```

## get_mid_level_remote_usa_jobs
Returns active mid-level jobs filtered to US + remote + experience range, split by company type.

```sql
create or replace function public.get_mid_level_remote_usa_jobs(
  company_type text,
  is_usa boolean,
  remote_only boolean,
  min_experience_years int,
  max_experience_years int
)
returns table (
  company_name text,
  company_url text,
  job_title text,
  job_locations text,
  job_url text,
  age int,
  salary numeric
) language sql stable as $$
  select
    j.company_name,
    j.company_url,
    j.job_title,
    j.job_locations,
    j.job_url,
    extract(day from now() - j.created_at)::int as age,
    j.salary
  from public.jobs j
  where j.status = 'active'
    and j.company_type = get_mid_level_remote_usa_jobs.company_type
    and j.is_usa = get_mid_level_remote_usa_jobs.is_usa
    and (remote_only = false or j.is_remote = true)
    and (min_experience_years is null or j.min_experience_years >= min_experience_years)
    and (max_experience_years is null or j.max_experience_years <= max_experience_years)
  order by j.created_at desc;
$$;
```

## get_swe_job_counts
Returns counts for the four lists that display totals in `README.md`.

```sql
create or replace function public.get_swe_job_counts()
returns table (
  intern_usa_count int,
  new_grad_usa_count int,
  intern_intl_count int,
  new_grad_intl_count int
) language sql stable as $$
  select
    count(*) filter (where j.job_type = 'intern' and j.is_usa = true and j.status = 'active')::int,
    count(*) filter (where j.job_type = 'new_grad' and j.is_usa = true and j.status = 'active')::int,
    count(*) filter (where j.job_type = 'intern' and j.is_usa = false and j.status = 'active')::int,
    count(*) filter (where j.job_type = 'new_grad' and j.is_usa = false and j.status = 'active')::int
  from public.jobs j;
$$;
```

## add_new_job
Inserts a new job row based on GitHub issue form input.

```sql
create or replace function public.add_new_job(
  _job_title text,
  _job_url text,
  _company_name text,
  _company_url text,
  _location text,
  _type text,
  _usa boolean
)
returns void language plpgsql as $$
begin
  insert into public.jobs (
    job_title,
    job_url,
    company_name,
    company_url,
    job_locations,
    job_type,
    is_usa,
    is_remote,
    company_type,
    status
  )
  values (
    _job_title,
    _job_url,
    _company_name,
    _company_url,
    _location,
    _type,
    _usa,
    case when _location ilike '%remote%' then true else false end,
    'other',
    'active'
  )
  on conflict (job_url) do nothing;
end;
$$;
```

## update_job
Updates fields for an existing job row and toggles status.

```sql
create or replace function public.update_job(
  _job_url text,
  _new_job_title text,
  _new_company_name text,
  _new_company_url text,
  _new_location text,
  _new_type text,
  _new_usa boolean,
  _new_status text
)
returns void language plpgsql as $$
begin
  update public.jobs
  set
    job_title = coalesce(_new_job_title, job_title),
    company_name = coalesce(_new_company_name, company_name),
    company_url = coalesce(_new_company_url, company_url),
    job_locations = coalesce(_new_location, job_locations),
    job_type = coalesce(_new_type, job_type),
    is_usa = coalesce(_new_usa, is_usa),
    status = coalesce(_new_status, status),
    is_remote = case
      when _new_location is null then is_remote
      else (_new_location ilike '%remote%')
    end
  where job_url = _job_url;
end;
$$;
```

## Where these are used in the repo
- `.github/scripts/src/queries.ts` calls `get_jobs`, `get_swe_job_counts`, and `get_mid_level_remote_usa_jobs` via Supabase RPC.
- `.github/scripts/src/mutations.ts` calls `add_new_job` and `update_job` via Supabase RPC.
- `.github/scripts/src/get-jobs.ts` uses those results to rebuild Markdown tables.

## Run Locally
From the repo root:

```bash
cd .github/scripts
npm install
SUPABASE_URL=your_url SUPABASE_KEY=your_service_role_key APPLY_IMG_URL=https://i.imgur.com/JpkfjIq.png npm run get-jobs
```

This regenerates the Markdown tables in the root files using your Supabase data.

## Seed Data Example
Use this to insert a couple of sample rows for quick testing.

```sql
insert into public.jobs (
  company_name,
  company_url,
  job_title,
  job_locations,
  job_url,
  job_type,
  company_type,
  is_usa,
  is_remote,
  min_experience_years,
  max_experience_years,
  salary,
  status
) values
(
  'Example Co',
  'https://example.com',
  'Software Engineer II',
  'Remote - USA',
  'https://example.com/jobs/123',
  'mid_level',
  'other',
  true,
  true,
  3,
  6,
  140000,
  'active'
),
(
  'Sample Finance',
  'https://finance.example.com',
  'Backend Engineer',
  'Remote - USA',
  'https://finance.example.com/jobs/456',
  'mid_level',
  'financial',
  true,
  true,
  4,
  8,
  160000,
  'active'
);
```
