/**
 * ANFSF L1+L4+L6+L7+L10 Pipeline
 *
 * Connects the minimal layer set to produce the first usable product:
 *   L1 (PRD Parse) → PRD Quality Gate → Why-What-How Reason → L4 (Graph Engine → IR)
 *     → L6 (Architecture Decision) → L7 (Contract/UI Synthesis)
 *     → L6 (Architecture Generation) → Detail Polisher → Write Files
 *     → Compile Validate → Quality Gate → L10 (Guard Checks)
 */

import { AINativePRDParser, AINativePRD, ValidationReport, PRDQualityReport } from '../prd/prd-parser';
import { InputGovernanceEngine } from '../input-governance/governance';
import { WhyWhatHowReasoner, ReasoningResult } from '../skills/why-what-how-reasoner';
import { DetailPolisher, FilePolishResult, DetailPolisherConfig } from '../skills/detail-polisher';
import { QualityGate, QualityGateResult, QualityGateInput } from '../core/quality/quality-gate';
import { RequirementGraphEngine, RequirementGraph, IR, GraphLevel } from '../req-graph/graph-engine';
import { ArchitectureAutoScaler, ArchitectureMode } from '../core/architecture/auto-scaling-engine';
import { UISynthesisModule, AssetManifest, ComponentTreeAssets, UISynthesisResult } from '../core/contract/ui-synthesis-module';
import { HallucinationGuardSkill, VerificationContext, VerificationResult } from '../skills/hallucination-guard-skill';
import { FrontendArchitect, FrontendArchitecture, GeneratedFile as FrontendGeneratedFile } from '../core/evolution/frontend-architect';
import { BackendArchitect, BackendArchitecture, GeneratedFile as BackendGeneratedFile } from '../core/evolution/backend-architect';
import { writeProjectFiles, WriteReport } from '../core/fs/file-writer';
import { RefinedGraph, refineGraphToRequirementGraph, applyRefinementConstraints } from '../core/fs/refined-graph-bridge';
import { CompileValidator, CompileValidationResult } from '../core/quality/compile-validator';
import { matchTemplateByKeywords, boostPRD, IndustryTemplate } from '../templates';

// ============================================================================
// Types
// ============================================================================

export interface PipelineConfig {
  apiKey: string;
  model?: string;
  uiFramework?: 'react' | 'vue' | 'angular' | 'svelte';
  uiLibrary?: 'antd' | 'material-ui' | 'chakra' | 'tailwind';
  enableGuardChecks?: boolean;
  outputDir?: string;
  backendFramework?: 'express' | 'koa' | 'fastify';
  enableQualityGate?: boolean;
  enableReasoning?: boolean;
  enableCompileValidation?: boolean;
  enableCodeQualityGate?: boolean;
  detailPolisherConfig?: DetailPolisherConfig;
  qualityGateMinScore?: number;
  onProgress?: (step: PipelineStep) => void;
}

export interface PipelineInput {
  prdText: string;
  /**
   * Optional pre-refined requirement graph from L2.
   * When provided, the pipeline bridges it to a 7-layer RequirementGraph
   * and uses it instead of building a graph directly from PRD fields.
   */
  refinedGraph?: RefinedGraph;
}

export interface PipelineError {
  step: string;
  message: string;
  recoverable: boolean;
}

export interface PipelineOutput {
  prd: AINativePRD;
  validation: ValidationReport;
  qualityReport: PRDQualityReport | null;
  reasoningResult: ReasoningResult | null;
  graph: RequirementGraph;
  ir: IR;
  architecture: ArchitectureMode;
  uiComponents: UISynthesisResult[];
  guardResults: VerificationResult | null;
  compileValidation: CompileValidationResult | null;
  polishResults: FilePolishResult[] | null;
  qualityGateResult: QualityGateResult | null;
  frontendArchitecture: FrontendArchitecture | null;
  backendArchitecture: BackendArchitecture | null;
  writeReport: { frontend: WriteReport; backend: WriteReport } | null;
  matchedTemplate: IndustryTemplate | null;
  errors: string[];
  pipelineErrors: PipelineError[];
}

export interface PipelineStep {
  name: string;
  duration: number;
  status: 'ok' | 'error' | 'skipped';
}

export interface PipelineResult {
  output: PipelineOutput | null;
  steps: PipelineStep[];
  totalDuration: number;
  success: boolean;
}

// ============================================================================
// Pipeline
// ============================================================================

export class ProductPipeline {
  private config: Required<PipelineConfig>;

  constructor(config: PipelineConfig) {
    this.config = {
      model: config.model || 'qwen3.5-plus',
      uiFramework: config.uiFramework || 'react',
      uiLibrary: config.uiLibrary || 'tailwind',
      enableGuardChecks: config.enableGuardChecks ?? true,
      apiKey: config.apiKey,
      outputDir: config.outputDir || './output',
      backendFramework: config.backendFramework || 'express',
      enableQualityGate: config.enableQualityGate ?? true,
      enableReasoning: config.enableReasoning ?? true,
      enableCompileValidation: config.enableCompileValidation ?? true,
      enableCodeQualityGate: config.enableCodeQualityGate ?? false,
      detailPolisherConfig: config.detailPolisherConfig ?? { apiKey: config.apiKey },
      qualityGateMinScore: config.qualityGateMinScore ?? 0.80,
      onProgress: config.onProgress ?? (() => {}),
    };
  }

  /**
   * Run with L2→L4 bridge: accepts a pre-refined graph from L2
   * RequirementRefinerSkill and processes it through the full pipeline.
   */
  async runWithRefined(refined: RefinedGraph, prdText: string): Promise<PipelineResult> {
    return this.run({ prdText, refinedGraph: refined });
  }

  /**
   * Run the full L1→L4→L6→L7→L10 pipeline.
   */
  async run(input: PipelineInput): Promise<PipelineResult> {
    const startTime = Date.now();
    const steps: PipelineStep[] = [];
    const errors: string[] = [];
    const pipelineErrors: PipelineError[] = [];

    // --- L1: PRD Parse ---
    const l1Start = Date.now();
    let prd: AINativePRD;
    let validation: ValidationReport;
    try {
      const parser = new AINativePRDParser({
        apiKey: this.config.apiKey,
        model: this.config.model,
      });
      prd = await parser.parse(input.prdText);
      validation = parser.validateCompleteness(prd);

      if (!validation.valid) {
        pipelineErrors.push({
          step: 'L1: PRD Parse',
          message: `PRD validation failed: missing ${validation.missing.join(', ')}`,
          recoverable: false,
        });
        return this.failResult(steps, errors, pipelineErrors, startTime);
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      pipelineErrors.push({ step: 'L1: PRD Parse', message: err, recoverable: false });
      return this.failResult(steps, errors, pipelineErrors, startTime);
    }
    this.recordStep(steps, { name: 'L1: PRD Parse', duration: Date.now() - l1Start, status: 'ok' });

    // --- Industry Template Detection & Boost ---
    let matchedTemplate: IndustryTemplate | null = null;
    let boostedPrdText = input.prdText;
    const templateStart = Date.now();
    try {
      const template = matchTemplateByKeywords(input.prdText);
      if (template) {
        matchedTemplate = template;
        boostedPrdText = boostPRD(input.prdText, template);
      }
    } catch {
      // Template matching is non-critical — proceed without boost
    }
    this.recordStep(steps, { name: 'Template Detection', duration: Date.now() - templateStart, status: 'ok' });

    // --- PRD Quality Gate ---
    let qualityReport: PRDQualityReport | null = null;
    if (this.config.enableQualityGate) {
      const qgStart = Date.now();
      try {
        const govEngine = new InputGovernanceEngine({ apiKey: this.config.apiKey, model: this.config.model });
        qualityReport = await govEngine.assessWithLLM(prd, boostedPrdText);
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        pipelineErrors.push({ step: 'PRD Quality Gate', message: err, recoverable: true });
      }
      this.recordStep(steps, { name: 'PRD Quality Gate', duration: Date.now() - qgStart, status: qualityReport ? 'ok' : 'error' });

      if (qualityReport && qualityReport.score < 50) {
        pipelineErrors.push({
          step: 'PRD Quality Gate',
          message: `PRD quality score too low: ${qualityReport.score}/100`,
          recoverable: true,
        });
      }
    }

    // --- Why-What-How Reasoning ---
    let reasoningResult: ReasoningResult | null = null;
    if (this.config.enableReasoning) {
      const reasonStart = Date.now();
      try {
        const reasoner = new WhyWhatHowReasoner({ apiKey: this.config.apiKey, model: this.config.model });
        reasoningResult = await reasoner.reason(boostedPrdText);
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        pipelineErrors.push({ step: 'Why-What-How Reasoning', message: err, recoverable: true });
      }
      this.recordStep(steps, { name: 'Why-What-How Reasoning', duration: Date.now() - reasonStart, status: reasoningResult ? 'ok' : 'error' });
    }

    // --- L4: Graph Engine → IR ---
    const l4Start = Date.now();
    let graph: RequirementGraph;
    let ir: IR;
    try {
      const engine = new RequirementGraphEngine();

      if (input.refinedGraph) {
        graph = refineGraphToRequirementGraph(input.refinedGraph);
        applyRefinementConstraints(graph, input.refinedGraph.quality);
        engine.normalize();
        ir = engine.compileToIR(prd);
      } else {
        graph = engine.build(
          { intent: prd.features[0]?.name || '' },
          {},
          prd.features,
          prd.userFlows,
          prd.backendSpecs,
          prd.workflow,
          { criteria: prd.acceptanceCriteria, constraints: prd.constraints }
        );
        engine.normalize();
        ir = engine.compileToIR(prd);
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      pipelineErrors.push({ step: 'L4 Graph Engine', message: err, recoverable: false });
      return this.failResult(steps, errors, pipelineErrors, startTime);
    }
    this.recordStep(steps, { name: input.refinedGraph ? 'L2→L4 Bridge + IR Compile' : 'L4: Graph→IR Compile', duration: Date.now() - l4Start, status: 'ok' });

    // --- L6: Architecture ---
    const l6Start = Date.now();
    let architecture: ArchitectureMode;
    try {
      const scaler = new ArchitectureAutoScaler();
      architecture = scaler.decideMode(prd);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      pipelineErrors.push({ step: 'L6 Architecture', message: err, recoverable: false });
      return this.failResult(steps, errors, pipelineErrors, startTime);
    }
    this.recordStep(steps, { name: 'L6: Architecture', duration: Date.now() - l6Start, status: 'ok' });

    // --- L7: UI Synthesis ---
    const l7Start = Date.now();
    const uiComponents: UISynthesisResult[] = [];
    try {
      const uiModule = new UISynthesisModule({
        framework: this.config.uiFramework,
        uiLibrary: this.config.uiLibrary,
      });

      if (ir.ui.components.length > 0) {
        for (const comp of ir.ui.components) {
          const pageForComp = ir.ui.pages.find(p => p.components.includes(comp.name));
          const pageAwareClasses = this.inferTailwindClasses(comp.name, pageForComp?.path);

          const componentTree: ComponentTreeAssets = {
            images: [],
            icons: [],
          };

          const result = await uiModule.synthesize(
            {
              componentName: comp.name,
              props: comp.props || {},
              state: comp.state || {},
              tailwindClasses: pageAwareClasses,
              dependencies: [],
            },
            componentTree
          );
          uiComponents.push(result);
        }
      }

      if (ir.ui.components.length === 0 && prd.uiRequirements.length > 0) {
        for (const uiReq of prd.uiRequirements) {
          const componentTree: ComponentTreeAssets = {
            images: [],
            icons: [],
          };

          const result = await uiModule.synthesize(
            {
              componentName: uiReq.component,
              props: {},
              tailwindClasses: ['p-4', 'rounded', 'bg-white'],
              dependencies: [],
            },
            componentTree
          );
          uiComponents.push(result);
        }
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      errors.push(`L7 UI Synthesis failed: ${err}`);
    }
    this.recordStep(steps, { name: 'L7: UI Synthesis', duration: Date.now() - l7Start, status: errors.length > 0 ? 'error' : 'ok' });

    // --- L6: Architecture Generation (Frontend + Backend) ---
    const l6genStart = Date.now();
    let frontendArch: FrontendArchitecture | null = null;
    let backendArch: BackendArchitecture | null = null;
    try {
      const frontendArchitect = new FrontendArchitect({
        framework: this.config.uiFramework === 'react' ? 'react' : this.config.uiFramework === 'vue' ? 'react' : 'react',
        router: 'react-router',
        stateLib: 'zustand',
      });
      frontendArch = frontendArchitect.generate(ir.ui, ir.workflow);

      const backendArchitect = new BackendArchitect({
        framework: this.config.backendFramework,
        language: 'typescript',
      });
      backendArch = backendArchitect.generate(ir.service, ir.data);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      pipelineErrors.push({ step: 'L6 Architecture Generation', message: err, recoverable: false });
      return this.failResult(steps, errors, pipelineErrors, startTime);
    }
    this.recordStep(steps, { name: 'L6: Architecture Generation', duration: Date.now() - l6genStart, status: frontendArch && backendArch ? 'ok' : 'error' });

    // --- Detail Polisher (polish generated files in memory) ---
    let polishResults: FilePolishResult[] | null = null;
    if (this.config.enableCodeQualityGate && frontendArch && backendArch) {
      const polishStart = Date.now();
      try {
        const allFiles = [
          ...frontendArch.files.map(f => ({ path: f.path, content: f.content })),
          ...backendArch.files.map(f => ({ path: f.path, content: f.content })),
        ];
        const polisher = new DetailPolisher(this.config.detailPolisherConfig);
        polishResults = await polisher.polish(allFiles, input.prdText);

        // Replace files with polished versions
        const polishMap = new Map(polishResults.filter(r => r.modified).map(r => [r.path, r.code]));
        for (const file of frontendArch.files) {
          if (polishMap.has(file.path)) file.content = polishMap.get(file.path)!;
        }
        for (const file of backendArch.files) {
          if (polishMap.has(file.path)) file.content = polishMap.get(file.path)!;
        }
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        errors.push(`Detail Polisher failed: ${err}`);
      }
      this.recordStep(steps, { name: 'Detail Polisher', duration: Date.now() - polishStart, status: 'ok' });
    }

    // --- Write generated files to disk ---
    let writeReport: { frontend: WriteReport; backend: WriteReport } | null = null;
    if (frontendArch && backendArch) {
      const writeStart = Date.now();
      try {
        const frontendFiles = frontendArch.files.map(f => ({ path: f.path, content: f.content }));
        const backendFiles = backendArch.files.map(f => ({ path: f.path, content: f.content }));
        writeReport = await writeProjectFiles(frontendFiles, backendFiles, this.config.outputDir);
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        pipelineErrors.push({ step: 'Write Files', message: err, recoverable: false });
        return this.failResult(steps, errors, pipelineErrors, startTime);
      }
      this.recordStep(steps, { name: 'Write Files', duration: Date.now() - writeStart, status: 'ok' });
    }

    // --- Compile Validation ---
    let compileValidation: CompileValidationResult | null = null;
    if (this.config.enableCompileValidation && writeReport) {
      const cvStart = Date.now();
      try {
        const validator = new CompileValidator();
        compileValidation = await validator.validate(this.config.outputDir);
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        errors.push(`Compile validation failed: ${err}`);
      }
      this.recordStep(steps, { name: 'Compile Validation', duration: Date.now() - cvStart, status: compileValidation?.success ? 'ok' : 'error' });
    }

    // --- Quality Gate (aggregate code quality, security, compile, SLOs) ---
    let qualityGateResult: QualityGateResult | null = null;
    if (this.config.enableCodeQualityGate && writeReport) {
      const qgStart = Date.now();
      try {
        const totalFiles = (frontendArch?.files.length ?? 0) + (backendArch?.files.length ?? 0);
        const polishedFiles = polishResults?.filter(r => r.modified).length ?? 0;

        const sourceFiles = [
          ...frontendArch.files.map(f => ({ path: f.path, content: f.content })),
          ...backendArch.files.map(f => ({ path: f.path, content: f.content })),
        ];

        const gate = new QualityGate({
          minScore: this.config.qualityGateMinScore,
        });
        const gateInput: QualityGateInput = {
          code: sourceFiles.map(f => f.content).join('\n\n'),
          ir,
          sourceFiles,
          projectDir: this.config.outputDir,
          totalFiles,
          polishedFiles,
        };
        qualityGateResult = await gate.evaluate(gateInput);
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        errors.push(`Quality Gate failed: ${err}`);
      }
      this.recordStep(steps, { name: 'Quality Gate', duration: Date.now() - qgStart, status: qualityGateResult?.passed ? 'ok' : 'error' });
    }

    // --- L10: Guard Checks ---
    let guardResult: VerificationResult | null = null;
    if (this.config.enableGuardChecks && uiComponents.length > 0) {
      const l10Start = Date.now();
      try {
        const guard = new HallucinationGuardSkill();
        const componentCode = uiComponents.map(c => c.code).join('\n\n');
        const ctx: VerificationContext = {
          generatedText: componentCode,
          sources: [{ id: 'prd', content: input.prdText, type: 'document', reliability: 1.0 }],
          mode: 'fast',
          enableGraphValidation: false,
        };
        guardResult = await guard.execute(ctx);
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        errors.push(`L10 Guard Check failed: ${err}`);
      }
      this.recordStep(steps, { name: 'L10: Guard Check', duration: Date.now() - l10Start, status: 'ok' });
    }

    const totalDuration = Date.now() - startTime;
    const output: PipelineOutput = {
      prd,
      validation,
      qualityReport,
      reasoningResult,
      graph,
      ir,
      architecture,
      uiComponents,
      guardResults: guardResult,
      compileValidation,
      polishResults,
      qualityGateResult,
      frontendArchitecture: frontendArch,
      backendArchitecture: backendArch,
      writeReport,
      matchedTemplate,
      errors,
      pipelineErrors,
    };

    return { output, steps, totalDuration, success: pipelineErrors.filter(e => !e.recoverable).length === 0 };
  }

  /**
   * Record a pipeline step and emit progress event.
   */
  private recordStep(steps: PipelineStep[], step: PipelineStep): void {
    steps.push(step);
    this.config.onProgress?.(step);
  }

  /**
   * Infer Tailwind utility classes from component name and page context.
   * Replaces the previous hardcoded ['p-4', 'rounded', 'bg-white'].
   */
  private inferTailwindClasses(componentName: string, pagePath?: string): string[] {
    const classes: string[] = [];
    const name = componentName.toLowerCase();

    classes.push('p-4');

    if (name.includes('card') || name.includes('tile')) {
      classes.push('rounded-lg', 'bg-white', 'shadow-md', 'overflow-hidden');
    } else if (name.includes('button') || name.includes('btn')) {
      classes.push('px-4', 'py-2', 'rounded', 'font-medium', 'transition-colors');
    } else if (name.includes('table') || name.includes('grid') || name.includes('list')) {
      classes.push('w-full', 'border-collapse');
    } else if (name.includes('form') || name.includes('input') || name.includes('field')) {
      classes.push('space-y-4');
    } else if (name.includes('header') || name.includes('nav') || name.includes('menu')) {
      classes.push('sticky', 'top-0', 'z-10', 'bg-white', 'border-b');
    } else if (name.includes('modal') || name.includes('dialog') || name.includes('popup')) {
      classes.push('fixed', 'inset-0', 'z-50', 'flex', 'items-center', 'justify-center');
    } else if (name.includes('chart') || name.includes('graph') || name.includes('dashboard')) {
      classes.push('rounded-lg', 'bg-white', 'shadow', 'p-6');
    } else if (name.includes('sidebar')) {
      classes.push('w-64', 'h-full', 'bg-gray-50', 'border-r');
    } else if (name.includes('footer')) {
      classes.push('bg-gray-100', 'border-t', 'py-4');
    } else {
      classes.push('rounded', 'bg-white');
    }

    if (pagePath && pagePath !== '/') {
      classes.unshift('max-w-7xl', 'mx-auto');
    }

    return classes;
  }

  private failResult(steps: PipelineStep[], errors: string[], pipelineErrors: PipelineError[], startTime: number): PipelineResult {
    return {
      output: null,
      steps,
      totalDuration: Date.now() - startTime,
      success: false,
    };
  }
}
