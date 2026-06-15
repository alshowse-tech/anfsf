/**
 * ANFSF PRD Quality Pre-Check V2 (GAP-08)
 *
 * Enhances V1 with structured issues, strengths, and category classification.
 */

import { evaluatePRDQuality, type PRDQualityReport, type PRDQualityDimensions } from "./prd-quality-check";

export interface QualityIssue {
  category: string;
  severity: "critical" | "major" | "minor" | "info";
  message: string;
}

export interface PRDQualityReportV2 extends PRDQualityReport {
  structuredIssues: QualityIssue[];
  strengths: string[];
  categories: string[];
}

function detectStrengths(text: string, dims: PRDQualityDimensions): string[] {
  const s:string[]=[];
  if(dims.completeness>=15) s.push("Good feature and user role coverage");
  if(dims.consistency>=15) s.push("Internally consistent requirements");
  if(dims.quantifiability>=15) s.push("Quantifiable metrics specified");
  if(dims.verifiability>=15) s.push("Testable acceptance criteria");
  if(/security|auth|permission|role.?based/i.test(text)) s.push("Security considerations addressed");
  if(/api|endpoint|graphql|restful|service/i.test(text)) s.push("API architecture considered");
  if(/mobile|responsive|\.*app|ios|android/i.test(text)) s.push("Multi-platform support");
  if(s.length===0) s.push("Core requirements identified");
  return s;
}

function classifyCategories(dims: PRDQualityDimensions): string[] {
  const cats:string[]=[];
  if(dims.completeness<15) cats.push("user-definition");
  if(dims.consistency<15) cats.push("consistency");
  if(dims.quantifiability<15) cats.push("metrics");
  if(dims.verifiability<15) cats.push("testability");
  return cats;
}

function buildStructuredIssues(text: string, base: PRDQualityReport): QualityIssue[] {
  const issues:QualityIssue[]=[];
  if(base.score<40) issues.push({category:"overall",severity:"critical",message:"PRD quality is low, needs significant improvement"});
  else if(base.score<70) issues.push({category:"overall",severity:"major",message:"PRD quality could be improved"});
  base.suggestions.forEach(s => {
    issues.push({category:"improvement",severity:"minor",message:s});
  });
  return issues;
}

export function evaluatePRDQualityV2(prdText: string): PRDQualityReportV2 {
  const base=evaluatePRDQuality(prdText);
  return Object.assign({}, base, {
    structuredIssues: buildStructuredIssues(prdText, base),
    strengths: detectStrengths(prdText, base.dimensions),
    categories: classifyCategories(base.dimensions),
  });
}