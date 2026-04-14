/**
 * Core Types
 * 
 * @module asf-v4/core/types
 */

export class RefinedGraph {
  modules?: RefinedModule[];
  metadata?: any;
  dependencies?: any[];

  constructor() {
    this.modules = [];
    this.metadata = {};
    this.dependencies = [];
  }

  addModule(name: string, subGraph: RefinedGraph): void {
    if (!this.modules) {
      this.modules = [];
    }
    this.modules.push({ name, subGraph } as any);
  }

  setCrossModuleProtocol(protocol: string): void {
    this.metadata = { ...this.metadata, crossModuleProtocol: protocol };
  }
}

export interface RefinedModule {
  name: string;
  scope: string;
  priority: number;
  subGraph?: RefinedGraph;
}