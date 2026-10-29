import type { ParseReport } from '../../../shared/api/harvest.ts';

// Only companies whose last parse completed without page failures are presented. The report is
// a local artifact (ignored by git); a missing report has no recorded errors.
export function hasParseErrors(report: ParseReport | undefined): boolean {
  if (!report) return false;
  return report.status !== 'complete' || (report.failures?.length ?? 0) > 0;
}
