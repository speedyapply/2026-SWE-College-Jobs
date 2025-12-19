import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { JobListSchema } from "./types/job.schema";
import { JobCountsSchema } from "./types/job-counts.schema";

dotenv.config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

type JobQueryParams = Record<string, string | number | boolean | null>;

export async function fetchJobs(
  params: JobQueryParams,
  rpcName: string = "get_jobs"
) {
  if (!supabase) {
    throw new Error("Supabase client is not initialized.");
  }

  const { data, error } = await supabase.rpc(rpcName, params);

  if (error) {
    throw new Error(`Supabase query error: ${error.message}`);
  }

  try {
    return JobListSchema.parse(data);
  } catch (validationError) {
    throw new Error(`Data validation error: ${validationError}`);
  }
}

export async function fetchJobCounts() {
  if (!supabase) {
    throw new Error("Supabase client is not initialized.");
  }

  const { data, error } = await supabase.rpc("get_swe_job_counts");

  if (error) {
    throw new Error(`Supabase query error: ${error.message}`);
  }

  try {
    return JobCountsSchema.parse(data);
  } catch (validationError) {
    throw new Error(`Data validation error: ${validationError}`);
  }
}
