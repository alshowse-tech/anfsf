/**
 * Tests for Industry Templates
 */

import { getTemplate, listTemplates, getTemplateIds, matchTemplateByKeywords, boostPRD, createIndustryTemplates } from '../index';

describe('Industry Templates', () => {
  it('should list all templates', () => {
    const templates = listTemplates();
    expect(templates.length).toBe(5);
  });

  it('should return all template IDs', () => {
    const ids = getTemplateIds();
    expect(ids).toContain('ecommerce');
    expect(ids).toContain('finance');
    expect(ids).toContain('government');
  });

  it('should get ecommerce template', () => {
    const template = getTemplate('ecommerce');
    expect(template.id).toBe('ecommerce');
    expect(template.features.length).toBeGreaterThan(0);
    expect(template.complianceRules.length).toBeGreaterThan(0);
  });

  it('should get finance template', () => {
    const template = getTemplate('finance');
    expect(template.id).toBe('finance');
    expect(template.techStack.auth).toBe('oauth2+2fa');
  });

  it('should get government template', () => {
    const template = getTemplate('government');
    expect(template.id).toBe('government');
    expect(template.scaffolding.length).toBeGreaterThan(0);
  });

  it('should match ecommerce by keywords', () => {
    const template = matchTemplateByKeywords('我们需要一个电商系统，支持商品、购物车和支付');
    expect(template?.id).toBe('ecommerce');
  });

  it('should match finance by keywords', () => {
    const template = matchTemplateByKeywords('金融交易平台，需要风控和交易引擎');
    expect(template?.id).toBe('finance');
  });

  it('should match government by keywords', () => {
    const template = matchTemplateByKeywords('政务审批系统和公文管理');
    expect(template?.id).toBe('government');
  });

  it('should return null when no match', () => {
    const template = matchTemplateByKeywords('这是一个简单的计算器');
    expect(template).toBeNull();
  });

  it('should boost PRD with template requirements', () => {
    const template = getTemplate('ecommerce');
    const boosted = boostPRD('Build a shop', template);

    expect(boosted).toContain('行业模板增强');
    expect(boosted).toContain('商品目录');
    expect(boosted).toContain('架构约束');
    expect(boosted).toContain('合规要求');
  });

  it('should create templates via factory', () => {
    const templates = createIndustryTemplates();
    expect(Object.keys(templates).length).toBe(5);
  });

  it('should have scaffolding for key templates', () => {
    const ecommerce = getTemplate('ecommerce');
    expect(ecommerce.scaffolding.length).toBeGreaterThan(0);

    const finance = getTemplate('finance');
    expect(finance.scaffolding.length).toBeGreaterThan(0);

    const government = getTemplate('government');
    expect(government.scaffolding.length).toBeGreaterThan(0);
  });
});
