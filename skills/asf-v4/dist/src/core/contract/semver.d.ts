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
export declare function parseSemVer(version: string): SemVer;
/**
 * Convert SemVer object to string.
 */
export declare function formatSemVer(ver: SemVer): string;
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
export declare function bumpVersion(currentVersion: string, bumpType: BumpType): string;
/**
 * Compare two versions.
 *
 * @param a - First version
 * @param b - Second version
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export declare function compareVersions(a: string, b: string): number;
/**
 * Check if version a is greater than version b.
 */
export declare function isGreaterThan(a: string, b: string): boolean;
/**
 * Check if version a is less than version b.
 */
export declare function isLessThan(a: string, b: string): boolean;
/**
 * Check if version a equals version b.
 */
export declare function isEqual(a: string, b: string): boolean;
/**
 * Validate version string.
 */
export declare function isValidVersion(version: string): boolean;
/**
 * Get next version based on diff analysis.
 *
 * @param currentVersion - Current version
 * @param isBreaking - Whether changes are breaking
 * @param hasNewFeatures - Whether there are new features
 * @param hasBugFixes - Whether there are bug fixes
 * @returns Bump type or null if no bump needed
 */
export declare function determineBumpType(params: {
    currentVersion: string;
    isBreaking: boolean;
    hasNewFeatures: boolean;
    hasBugFixes: boolean;
}): BumpType | null;
/**
 * Check if version is stable (no prerelease).
 */
export declare function isStable(version: string): boolean;
/**
 * Create prerelease version.
 */
export declare function toPrerelease(version: string, prerelease?: string): string;
/**
 * Get major version string.
 */
export declare function getMajorVersion(version: string): string;
/**
 * Get version range for compatibility.
 */
export declare function getVersionRange(version: string, compatibility: 'major' | 'minor'): string;
