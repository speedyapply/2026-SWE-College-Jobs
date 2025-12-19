import * as fs from "fs";
import * as path from "path";
import * as core from "@actions/core";
import dotenv from "dotenv";
import { fetchJobCounts, fetchJobs } from "./queries";
import { Job } from "./types/job.schema";
import { HEADERS, MARKERS, TABLES } from "./config";

dotenv.config();
const APPLY_IMG_URL = process.env.APPLY_IMG_URL;

function generateMarkdownTable(
  jobs: Job[],
  salary?: boolean,
  interval: string = "yr"
) {
  const headers = salary
    ? [...HEADERS.slice(0, 3), "Salary", ...HEADERS.slice(3)]
    : HEADERS;

  let table = `| ${headers.join(" | ")} |\n`;
  table += `|${headers.map(() => "---").join("|")}|\n`;

  jobs.forEach((job) => {
    const applyCell = `<a href="${job.job_url}"><img src="${APPLY_IMG_URL}" alt="Apply" width="70"/></a>`;

    const companyCell = job.company_url
      ? `<a href="${job.company_url}"><strong>${
          job.company_name || ""
        }</strong></a>`
      : `<strong>${job.company_name || ""}</strong>`;

    const row = [
      companyCell,
      job.job_title || "",
      job.job_locations || "",
      applyCell,
      `${job.age}d`,
    ];

    if (salary && job.salary) {
      const salary =
        job.salary >= 1000
          ? `${(job.salary / 1000).toFixed(0)}k`
          : job.salary.toString();

      const salaryCell = `$${salary}/${interval}`;
      row.splice(3, 0, salaryCell);
    } else if (salary && !job.salary) {
      const salaryCell = "";
      row.splice(3, 0, salaryCell);
    }

    table += `| ${row.join(" | ")} |\n`;
  });

  return table;
}

function updateTable(
  readmeContent: string,
  marker: { start: string; end: string },
  tableContent: string
): string {
  const { start, end } = marker;
  const before = readmeContent.split(start)[0];
  const after = readmeContent.split(end)[1] ?? "";
  return `${before}${start}\n${tableContent}\n${end}${after}`;
}

function updateReadme(
  tables: { [K in keyof typeof MARKERS]: string },
  filePath: string
) {
  const readmePath = path.join(__dirname, filePath);
  let readmeContent = fs.readFileSync(readmePath, "utf8");

  readmeContent = updateTable(readmeContent, MARKERS.faang, tables.faang);
  readmeContent = updateTable(readmeContent, MARKERS.quant, tables.quant);
  readmeContent = updateTable(readmeContent, MARKERS.other, tables.other);

  fs.writeFileSync(readmePath, readmeContent, "utf8");
}

async function updateCounts(filePath: string) {
  const readmePath = path.join(__dirname, filePath);
  let readmeContent = fs.readFileSync(readmePath, { encoding: "utf8" });

  const jobCounts = await fetchJobCounts();

  readmeContent = readmeContent.replace(
    /(\[Internships :books:\]\(\/\))(\s+-\s+\*\*\d+\*\*\s+available)/,
    `$1 - **${jobCounts.intern_usa_count}** available`
  );
  readmeContent = readmeContent.replace(
    /(\[New Graduate :mortar_board:\]\(\/NEW_GRAD_USA\.md\))(\s+-\s+\*\*\d+\*\* available)?/,
    `$1 - **${jobCounts.new_grad_usa_count}** available`
  );
  readmeContent = readmeContent.replace(
    /(\[Internships :books:\]\(\/INTERN_INTL\.md\))(\s+-\s+\*\*\d+\*\*)?/,
    `$1 - **${jobCounts.intern_intl_count}**`
  );
  readmeContent = readmeContent.replace(
    /(\[New Graduate :mortar_board:\]\(\/NEW_GRAD_INTL\.md\))(\s+-\s+\*\*\d+\*\* available)?/,
    `$1 - **${jobCounts.new_grad_intl_count}** available`
  );

  fs.writeFileSync(readmePath, readmeContent, { encoding: "utf8" });
}

async function main() {
  try {
    for (const table of TABLES) {
      const faangJobs = await fetchJobs({
        ...table.query,
        company_type: "faang",
      }, table.rpc);
      const quantJobs = await fetchJobs({
        ...table.query,
        company_type: "financial",
      }, table.rpc);
      const jobs = await fetchJobs({
        ...table.query,
        company_type: "other",
      }, table.rpc);

      const tables = {
        faang: generateMarkdownTable(faangJobs, table.salary, table.interval),
        quant: generateMarkdownTable(quantJobs, table.salary, table.interval),
        other: generateMarkdownTable(jobs),
      };

      updateReadme(tables, table.path);
      updateCounts(table.path);
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unknown error occurred");
    }
  }
}

main();
