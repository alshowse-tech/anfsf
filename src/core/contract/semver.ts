/**
 * ASF V4.0 Contract Pack - Semantic Versioning
 * 
 * Semver utilities for contract version management.
 * Version: v0.8.5
 */

/**
 * Semantic version parts.
 */
export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

/**
 * Version bump type.
 */
export type BumpType = 'major' | 'minor' | 'patch';

/**
 * Parse semantic version string.
 * 
 * @param version - Version string (e.g., "1.2.3", "v1.2.3", "1.2.3-beta.1")
 * @returns Parsed SemVer object
 * @throws Error if version is invalid
 */
export function parseSemVer(version: string): SemVer {
  // Remove leading 'v' if present
  const cleanVersion = version.replace(/^v/, '');
  
  // Match semver pattern
  const match = cleanVersion.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/
  );
  
  if (!match) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  
  const [, major, minor, patch, prerelease, build] = match;
  
  return {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
    prerelease: prerelease || undefined,
    build: build || undefined,
  };
}

/**
 * Convert SemVer object to string.
 */
export function formatSemVer(ver: SemVer): string {
  let result = `${ver.major}.${ver.minor}.${ver.patch}`;
  
  if (ver.prerelease) {
    result += `-${ver.prerelease}`;
  }
  
  if (ver.build) {
    result += `+${ver.build}`;
  }
  
  return result;
}

/**
 * Bump version by type.
 * 
 * @param currentVersion - Current version string
 * @param bumpType - Type of bump (major, minor, patch)
 * @returns New version string
 * 
 * @example
 * ```typescript
 * bumpVersion('1.2.3', 'major')  // '2.0.0'
 * bumpVersion('1.2.3', 'minor')  // '1.3.0'
 * bumpVersion('1.2.3', 'patch')  // '1.2.4'
 * ```
 */
export function bumpVersion(currentVersion: string, bumpType: BumpType): string {
  const ver = parseSemVer(currentVersion);
  
  switch (bumpType) {
    case 'major':
      ver.major += 1;
      ver.minor = 0;
      ver.patch = 0;
      ver.prerelease = undefined;
      ver.build = undefined;
      break;
      
    case 'minor':
      ver.minor += 1;
      ver.patch = 0;
      ver.prerelease = undefined;
      ver.build = undefined;
      break;
      
    case 'patch':
      ver.patch += 1;
      ver.prerelease = undefined;
      ver.build = undefined;
      break;
  }
  
  return formatSemVer(ver);
}

/**
 * Compare two versions.
 * 
 * @param a - First version
 * @param b - Second version
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const verA = parseSemVer(a);
  const verB = parseSemVer(b);
  
  // Compare major
  if (verA.major !== verB.major) {
    return verA.major < verB.major ? -1 : 1;
  }
  
  // Compare minor
  if (verA.minor !== verB.minor) {
    return verA.minor < verB.minor ? -1 : 1;
  }
  
  // Compare patch
  if (verA.patch !== verB.patch) {
    return verA.patch < verB.patch ? -1 : 1;
  }
  
  // Compare prerelease (no prerelease > prerelease)
  if (!verA.prerelease && verB.prerelease) {
    return 1;
  }
  if (verA.prerelease && !verB.prerelease) {
    return -1;
  }
  
  if (verA.prerelease && verB.prerelease) {
    const prereleaseA = verA.prerelease.split('.');
    const prereleaseB = verB.prerelease.split('.');
    
    for (let i = 0; i < Math.max(prereleaseA.length, prereleaseB.length); i++) {
      const partA = prereleaseA[i];
      const partB = prereleaseB[i];
      
      if (partA === undefined) return -1;
      if (partB === undefined) return 1;
      
      // Numeric comparison if both are numbers
      const numA = parseInt(partA, 10);
      const numB = parseInt(partB, 10);
      
      if (!isNaN(numA) && !isNaN(numB)) {
        if (numA !== numB) {
          return numA < numB ? -1 : 1;
        }
      } else {
        // String comparison
        if (partA !== partB) {
          return partA < partB ? -1 : 1;
        }
      }
    }
  }
  
  // Build metadata is ignored for precedence
  return 0;
}

/**
 * Check if version a is greater than version b.
 */
export function isGreaterThan(a: string, b: string): boolean {
  return compareVersions(a, b) > 0;
}

/**
 * Check if version a is less than version b.
 */
export function isLessThan(a: string, b: string): boolean {
  return compareVersions(a, b) < 0;
}

/**
 * Check if version a equals version b.
 */
export function isEqual(a: string, b: string): boolean {
  return compareVersions(a, b) === 0;
}

/**
 * Validate version string.
 */
export function isValidVersion(version: string): boolean {
  try {
    parseSemVer(version);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get next version based on diff analysis.
 * 
 * @param currentVersion - Current version
 * @param isBreaking - Whether changes are breaking
 * @param hasNewFeatures - Whether there are new features
 * @param hasBugFixes - Whether there are bug fixes
 * @returns Bump type or null if no bump needed
 */
export function determineBumpType(params: {
  currentVersion: string;
  isBreaking: boolean;
  hasNewFeatures: boolean;
  hasBugFixes: boolean;
}): BumpType | null {
  const { isBreaking, hasNewFeatures, hasBugFixes } = params;
  
  if (isBreaking) {
    return 'major';
  }
  
  if (hasNewFeatures) {
    return 'minor';
  }
  
  if (hasBugFixes) {
    return 'patch';
  }
  
  return null;
}

/**
 * Check if version is stable (no prerelease).
 */
export function isStable(version: string): boolean {
  const ver = parseSemVer(version);
  return !ver.prerelease;
}

/**
 * Create prerelease version.
 */
export function toPrerelease(version: string, prerelease: string = 'beta.1'): string {
  const ver = parseSemVer(version);
  ver.prerelease = prerelease;
  return formatSemVer(ver);
}

/**
 * Get major version string.
 */
export function getMajorVersion(version: string): string {
  const ver = parseSemVer(version);
  return `${ver.major}.0.0`;
}

/**
 * Get version range for compatibility.
 */
export function getVersionRange(version: string, compatibility: 'major' | 'minor'): string {
  const ver = parseSemVer(version);
  
  if (compatibility === 'major') {
    return `^${ver.major}.0.0`;
  }
  
  return `~${ver.major}.${ver.minor}.0`;
}
