export const TABLES = [
  {
    path: "../../../README.md",
    salary: true,
    interval: "hr",
    rpc: "get_jobs",
    query: {
      job_type: "intern",
      is_usa: true,
    },
  },
  {
    path: "../../../NEW_GRAD_USA.md",
    salary: true,
    interval: "yr",
    rpc: "get_jobs",
    query: {
      job_type: "new_grad",
      is_usa: true,
    },
  },
  {
    path: "../../../INTERN_INTL.md",
    salary: false,
    interval: undefined,
    rpc: "get_jobs",
    query: {
      job_type: "intern",
      is_usa: false,
    },
  },
  {
    path: "../../../NEW_GRAD_INTL.md",
    salary: false,
    interval: undefined,
    rpc: "get_jobs",
    query: {
      job_type: "new_grad",
      is_usa: false,
    },
  },
  {
    path: "../../../MID_LEVEL_REMOTE_USA.md",
    salary: true,
    interval: "yr",
    rpc: "get_mid_level_remote_usa_jobs",
    query: {
      is_usa: true,
      remote_only: true,
      min_experience_years: 3,
      max_experience_years: 9,
    },
  },
] as const;

export const HEADERS = ["Company", "Position", "Location", "Posting", "Age"];

export const MARKERS = {
  faang: {
    start: "<!-- TABLE_FAANG_START -->",
    end: "<!-- TABLE_FAANG_END -->",
  },
  quant: {
    start: "<!-- TABLE_QUANT_START -->",
    end: "<!-- TABLE_QUANT_END -->",
  },
  other: { start: "<!-- TABLE_START -->", end: "<!-- TABLE_END -->" },
} as const;
