/**
 * Requirement Refiner Skill 单元测试 (Vitest 格式 - 简化版)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { RequirementRefinerSkill } from '../src/skills/requirement-refiner-skill'
import { SkillContext } from '../src/core/skill'

describe('RequirementRefinerSkill', () => {
  let skill: RequirementRefinerSkill

  beforeEach(() => {
    const mockContext: SkillContext = {
      mcpClient: {} as any,
      mcpTools: [],
      mcpResources: [],
      logger: console,
      mempalace: {} as any
    }
    skill = new RequirementRefinerSkill(mockContext)
  })

  describe('基本功能', () => {
    it('应该有 refine 方法', () => {
      expect(skill.refine).toBeDefined()
      expect(typeof skill.refine).toBe('function')
    })

    it('应该有 knowledgeBase', () => {
      expect(skill['knowledgeBase']).toBeDefined()
    })

    it('应该有 confidenceCalculator', () => {
      expect(skill['confidenceCalculator']).toBeDefined()
    })

    it('应该有 completionEngine', () => {
      expect(skill['completionEngine']).toBeDefined()
    })

    it('应该有 feedbackLoop', () => {
      expect(skill['feedbackLoop']).toBeDefined()
    })
  })
})
