// API types for ANFSF dashboard

export interface PipelineRun {
  id: string;
  status: string;
  startedAt: number;
  completedAt: number | null;
  stepCount: number;
}

export interface PipelineStep {
  name: string;
  duration: number;
  status: 'ok' | 'error' | 'skipped';
}

export interface HealthCheck {
  status: string;
  uptime: number;
  version: string;
  timestamp: number;
}
