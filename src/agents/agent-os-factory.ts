/**
 * ANFSF V4 Layer 9 - AgentOS Factory
 *
 * Factory and singleton pattern following established conventions.
 */

import { AgentOS } from './agent-os';
import type { AgentOSConfig } from './types';

export function createAgentOS(config?: Partial<AgentOSConfig>): AgentOS {
  return new AgentOS(config);
}

let defaultAgentOS: AgentOS | null = null;

export function getDefaultAgentOS(): AgentOS {
  if (!defaultAgentOS) {
    defaultAgentOS = new AgentOS();
  }
  return defaultAgentOS;
}

export function resetDefaultAgentOS(): void {
  defaultAgentOS = null;
}
