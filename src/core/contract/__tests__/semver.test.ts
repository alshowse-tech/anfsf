/**
 * ASF V4.0 Contract Pack - Semver Tests
 * 
 * Unit tests for semantic versioning.
 * Version: v0.8.5
 */

import { describe, it, expect } from '@jest/globals';
import { parseSemVer, formatSemVer, bumpVersion, compareVersions, determineBumpType } from '../semver';

describe('parseSemVer', () => {
  it('should parse basic version', () => {
    const ver = parseSemVer('1.2.3');

    expect(ver.major).toBe(1);
    expect(ver.minor).toBe(2);
    expect(ver.patch).toBe(3);
    expect(ver.prerelease).toBeUndefined();
  });

  it('should parse version with leading v', () => {
    const ver = parseSemVer('v1.2.3');

    expect(ver.major).toBe(1);
    expect(ver.minor).toBe(2);
    expect(ver.patch).toBe(3);
  });

  it('should parse prerelease version', () => {
    const ver = parseSemVer('1.2.3-beta.1');

    expect(ver.major).toBe(1);
    expect(ver.minor).toBe(2);
    expect(ver.patch).toBe(3);
    expect(ver.prerelease).toBe('beta.1');
  });

  it('should parse version with build metadata', () => {
    const ver = parseSemVer('1.2.3+build.123');

    expect(ver.build).toBe('build.123');
  });

  it('should throw on invalid version', () => {
    expect(() => parseSemVer('invalid')).toThrow();
    expect(() => parseSemVer('1.2')).toThrow();
  });
});

describe('formatSemVer', () => {
  it('should format basic version', () => {
    const str = formatSemVer({ major: 1, minor: 2, patch: 3 });

    expect(str).toBe('1.2.3');
  });

  it('should format prerelease version', () => {
    const str = formatSemVer({ major: 1, minor: 2, patch: 3, prerelease: 'beta.1' });

    expect(str).toBe('1.2.3-beta.1');
  });

  it('should format version with build', () => {
    const str = formatSemVer({ major: 1, minor: 2, patch: 3, build: 'build.123' });

    expect(str).toBe('1.2.3+build.123');
  });
});

describe('bumpVersion', () => {
  it('should bump major version', () => {
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0');
    expect(bumpVersion('0.9.9', 'major')).toBe('1.0.0');
  });

  it('should bump minor version', () => {
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0');
    expect(bumpVersion('1.9.9', 'minor')).toBe('1.10.0');
  });

  it('should bump patch version', () => {
    expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4');
  });

  it('should remove prerelease on bump', () => {
    expect(bumpVersion('1.2.3-beta.1', 'patch')).toBe('1.2.4');
    expect(bumpVersion('1.2.3-beta.1', 'minor')).toBe('1.3.0');
  });
});

describe('compareVersions', () => {
  it('should return 0 for equal versions', () => {
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
    expect(compareVersions('v1.2.3', '1.2.3')).toBe(0);
  });

  it('should return -1 when first is less', () => {
    expect(compareVersions('1.2.3', '1.2.4')).toBe(-1);
    expect(compareVersions('1.2.3', '1.3.0')).toBe(-1);
    expect(compareVersions('1.2.3', '2.0.0')).toBe(-1);
  });

  it('should return 1 when first is greater', () => {
    expect(compareVersions('1.2.4', '1.2.3')).toBe(1);
    expect(compareVersions('1.3.0', '1.2.3')).toBe(1);
    expect(compareVersions('2.0.0', '1.2.3')).toBe(1);
  });

  it('should handle prerelease comparison', () => {
    // Release > prerelease
    expect(compareVersions('1.2.3', '1.2.3-beta.1')).toBe(1);
    expect(compareVersions('1.2.3-beta.1', '1.2.3')).toBe(-1);

    // Prerelease comparison
    expect(compareVersions('1.2.3-beta.1', '1.2.3-beta.2')).toBe(-1);
    expect(compareVersions('1.2.3-beta.2', '1.2.3-beta.1')).toBe(1);
  });
});

describe('determineBumpType', () => {
  it('should return major for breaking changes', () => {
    const result = determineBumpType({
      currentVersion: '1.2.3',
      isBreaking: true,
      hasNewFeatures: false,
      hasBugFixes: false,
    });

    expect(result).toBe('major');
  });

  it('should return minor for new features', () => {
    const result = determineBumpType({
      currentVersion: '1.2.3',
      isBreaking: false,
      hasNewFeatures: true,
      hasBugFixes: false,
    });

    expect(result).toBe('minor');
  });

  it('should return patch for bug fixes', () => {
    const result = determineBumpType({
      currentVersion: '1.2.3',
      isBreaking: false,
      hasNewFeatures: false,
      hasBugFixes: true,
    });

    expect(result).toBe('patch');
  });

  it('should return null for no changes', () => {
    const result = determineBumpType({
      currentVersion: '1.2.3',
      isBreaking: false,
      hasNewFeatures: false,
      hasBugFixes: false,
    });

    expect(result).toBeNull();
  });

  it('should prioritize breaking over features', () => {
    const result = determineBumpType({
      currentVersion: '1.2.3',
      isBreaking: true,
      hasNewFeatures: true,
      hasBugFixes: true,
    });

    expect(result).toBe('major');
  });
});
