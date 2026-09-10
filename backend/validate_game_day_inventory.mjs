import { AUTHORITATIVE_WORKBOOK, scriptRelativePath, validateWorkbook } from "./game-day/guideInventory.mjs";

const jsonMode = process.argv.includes("--json");
const workbookArg = process.argv.find((argument) => argument.endsWith(".xlsx"));
const workbookPath = scriptRelativePath(import.meta.url, AUTHORITATIVE_WORKBOOK, workbookArg);
const report = validateWorkbook(workbookPath);

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("Game Day research inventory validation");
  console.log(`Workbook: ${workbookPath}`);
  console.log(`Canonical launch teams: ${report.canonicalLaunchTeamCount}`);
  console.log(`Workbook records: ${report.workbookRecordCount}`);
  console.log(`Missing canonical teams: ${report.missingCanonicalTeams.join(", ") || "none"}`);
  console.log(`Noncanonical extras: ${report.extras.join(", ") || "none"}`);
  console.log(`Duplicates: ${report.duplicateRecords.length}`);
  console.log(`Unmatched names: ${report.unmatched.length}`);
  console.log(`Ambiguous names: ${report.ambiguous.length}`);
  console.log(`Missing venue IDs: ${report.missingVenueIds.join(", ") || "none"}`);
  console.log(`Missing venue names: ${report.missingVenueNames.join(", ") || "none"}`);
  console.log(`Venue identifier conflicts: ${report.conflictingIdentifiers.length}`);

  for (const [category, coverage] of Object.entries(report.completeness)) {
    console.log(
      `${category}: ${coverage.totalComplete}/${report.workbookRecordCount} total; ` +
        `${coverage.canonicalComplete}/${report.canonicalLaunchTeamCount} canonical; ` +
        `${report.sourceCoverage[category]}/${report.workbookRecordCount} source URLs`
    );
  }
  console.log(
    `Verification dates: ${report.verificationDateCoverage}/${report.workbookRecordCount}`
  );
  console.log(
    "Northwestern venues: weeks 1,3 => 5960; weeks 5,6,8,10,13 => 11823"
  );

  console.log("Exceptions:");
  for (const exception of report.exceptions) {
    const detail = exception.category
      ? `${exception.category}: ${exception.fields?.join(", ") || exception.type}`
      : exception.type;
    console.log(
      `- ${exception.school}: ${detail}${exception.approved ? " [approved]" : " [unexpected]"}`
    );
  }
  console.log(`Result: ${report.valid ? "PASS" : "FAIL"}`);
}

if (!report.valid) process.exitCode = 1;
