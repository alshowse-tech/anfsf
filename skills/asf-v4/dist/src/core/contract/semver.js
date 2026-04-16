"use strict";
/**
 * ASF V4.0 Contract Pack - Semantic Versioning
 *
 * Semver utilities for contract version management.
 * Version: v0.8.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSemVer = parseSemVer;
exports.formatSemVer = formatSemVer;
exports.bumpVersion = bumpVersion;
exports.compareVersions = compareVersions;
exports.isGreaterThan = isGreaterThan;
exports.isLessThan = isLessThan;
exports.isEqual = isEqual;
exports.isValidVersion = isValidVersion;
exports.determineBumpType = determineBumpType;
exports.isStable = isStable;
exports.toPrerelease = toPrerelease;
exports.getMajorVersion = getMajorVersion;
exports.getVersionRange = getVersionRange;
/**
 * Parse semantic version string.
 *
 * @param version - Version string (e.g., "1.2.3", "v1.2.3", "1.2.3-beta.1")
 * @returns Parsed SemVer object
 * @throws Error if version is invalid
 */
function parseSemVer(version) {
    // Remove leading 'v' if present
    const cleanVersion = version.replace(/^v/, '');
    // Match semver pattern
    const match = cleanVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/);
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
function formatSemVer(ver) {
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
function bumpVersion(currentVersion, bumpType) {
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
function compareVersions(a, b) {
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
            if (partA === undefined)
                return -1;
            if (partB === undefined)
                return 1;
            // Numeric comparison if both are numbers
            const numA = parseInt(partA, 10);
            const numB = parseInt(partB, 10);
            if (!isNaN(numA) && !isNaN(numB)) {
                if (numA !== numB) {
                    return numA < numB ? -1 : 1;
                }
            }
            else {
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
function isGreaterThan(a, b) {
    return compareVersions(a, b) > 0;
}
/**
 * Check if version a is less than version b.
 */
function isLessThan(a, b) {
    return compareVersions(a, b) < 0;
}
/**
 * Check if version a equals version b.
 */
function isEqual(a, b) {
    return compareVersions(a, b) === 0;
}
/**
 * Validate version string.
 */
function isValidVersion(version) {
    try {
        parseSemVer(version);
        return true;
    }
    catch {
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
function determineBumpType(params) {
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
function isStable(version) {
    const ver = parseSemVer(version);
    return !ver.prerelease;
}
/**
 * Create prerelease version.
 */
function toPrerelease(version, prerelease = 'beta.1') {
    const ver = parseSemVer(version);
    ver.prerelease = prerelease;
    return formatSemVer(ver);
}
/**
 * Get major version string.
 */
function getMajorVersion(version) {
    const ver = parseSemVer(version);
    return `${ver.major}.0.0`;
}
/**
 * Get version range for compatibility.
 */
function getVersionRange(version, compatibility) {
    const ver = parseSemVer(version);
    if (compatibility === 'major') {
        return `^${ver.major}.0.0`;
    }
    return `~${ver.major}.${ver.minor}.0`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VtdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NvcmUvY29udHJhY3Qvc2VtdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7QUF5Qkgsa0NBc0JDO0FBS0Qsb0NBWUM7QUFnQkQsa0NBMkJDO0FBU0QsMENBeURDO0FBS0Qsc0NBRUM7QUFLRCxnQ0FFQztBQUtELDBCQUVDO0FBS0Qsd0NBT0M7QUFXRCw4Q0FxQkM7QUFLRCw0QkFHQztBQUtELG9DQUlDO0FBS0QsMENBR0M7QUFLRCwwQ0FRQztBQWxRRDs7Ozs7O0dBTUc7QUFDSCxTQUFnQixXQUFXLENBQUMsT0FBZTtJQUN6QyxnQ0FBZ0M7SUFDaEMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFL0MsdUJBQXVCO0lBQ3ZCLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQzlCLDBHQUEwRyxDQUMzRyxDQUFDO0lBRUYsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUV6RCxPQUFPO1FBQ0wsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDO1FBQzFCLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQztRQUMxQixLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUM7UUFDMUIsVUFBVSxFQUFFLFVBQVUsSUFBSSxTQUFTO1FBQ25DLEtBQUssRUFBRSxLQUFLLElBQUksU0FBUztLQUMxQixDQUFDO0FBQ0osQ0FBQztB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dGVudCI6WyIvKipcbiAqIEFTRiBWNC4wIENvbnRyYWN0IFBhY2sgLSBTZW1hbnRpYyBWZXJzaW9uaW5nXG4gKiBcbiAqIFNlbXZlciB1dGlsaXRpZXMgZm9yIGNvbnRyYWN0IHZlcnNpb24gbWFuYWdlbWVudC5cbiAqIFZlcnNpb246IHYwLjguNVxuICovXG5cbi8qKlxuICogU2VtYW50aWMgdmVyc2lvbiBwYXJ0cy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTZW1WZXIge1xuICBtYWpvcjogbnVtYmVyO1xuICBtaW5vcjogbnVtYmVyO1xuICBwYXRjaDogbnVtYmVyO1xuICBwcmVyZWxlYXNlPzogc3RyaW5nO1xuICBidWlsZD86IHN0cmluZztcbn1cblxuLyoqXG4gKiBWZXJzaW9uIGJ1bXAgdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUgQnVtcFR5cGUgPSAnbWFqb3InIHwgJ21pbm9yJyB8ICdwYXRjaCc7XG5cbi8qKlxuICogUGFyc2Ugc2VtYW50aWMgdmVyc2lvbiBzdHJpbmcuXG4gKiBcbiAqIEBwYXJhbSB2ZXJzaW9uIC0gVmVyc2lvbiBzdHJpbmcgKGUuZy4sIFwiMS4yLjNcIiwgXCJ2MS4yLjNcIiwgXCIxLjIuMy1iZXRhLjFcIilcbiAqIEByZXR1cm5zIFBhcnNlZCBTZW1WZXIgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHZlcnNpb24gaXMgaW52YWxpZFxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VTZW1WZXIodmVyc2lvbjogc3RyaW5nKTogU2VtVmVyIHtcbiAgLy8gUmVtb3ZlIGxlYWRpbmcgJ3YnIGlmIHByZXNlbnRcbiAgY29uc3QgY2xlYW5WZXJzaW9uID0gdmVyc2lvbi5yZXBsYWNlKC9edi8sICcnKTtcbiAgXG4gIC8vIE1hdGNoIHNlbXZlciBwYXR0ZXJuXG4gIGNvbnN0IG1hdGNoID0gY2xlYW5WZXJzaW9uLm1hdGNoKFxuICAgIC9eKFxcZCspXFwuKFxcZCspXFwuKFxcZCspKD86LShbMC05QS1aYS16LV0rKD86XFwuWzAtOUEtWmEtei1dKykqKSk/KD86XFwrKFswLTlBLVphLXotXSsoPzpcXC5bMC05QS1aYS16LV0rKSopKT8kL1xuICApO1xuICBcbiAgaWYgKCFtYXRjaCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBzZW1hbnRpYyB2ZXJzaW9uOiAke3ZlcnNpb259YCk7XG4gIH1cbiAgXG4gIGNvbnN0IFssIG1ham9yLCBtaW5vciwgcGF0Y2gsIHByZXJlbGVhc2UsIGJ1aWxkXSA9IG1hdGNoO1xuICBcbiAgcmV0dXJuIHtcbiAgICBtYWpvcjogcGFyc2VJbnQobWFqb3IsIDEwKSxcbiAgICBtaW5vcjogcGFyc2VJbnQobWlub3IsIDEwKSxcbiAgICBwYXRjaDogcGFyc2VJbnQocGF0Y2gsIDEwKSxcbiAgICBwcmVyZWxlYXNlOiBwcmVyZWxlYXNlIHx8IHVuZGVmaW5lZCxcbiAgICBidWlsZDogYnVpbGQgfHwgdW5kZWZpbmVkLFxuICB9O1xufVxuXG4vKipcbiAqIENvbnZlcnQgU2VtVmVyIG9iamVjdCB0byBzdHJpbmcuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRTZW1WZXIodmVyOiBTZW1WZXIpOiBzdHJpbmcge1xuICBsZXQgcmVzdWx0ID0gYCR7dmVyLm1ham9yfS4ke3Zlci5taW5vcn0uJHt2ZXIucGF0Y2h9YDtcbiAgXG4gIGlmICh2ZXIucHJlcmVsZWFzZSkge1xuICAgIHJlc3VsdCArPSBgLSR7dmVyLnByZXJlbGVhc2V9YDtcbiAgfVxuICBcbiAgaWYgKHZlci5idWlsZCkge1xuICAgIHJlc3VsdCArPSBgKyR7dmVyLmJ1aWxkfWA7XG4gIH1cbiAgXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogQnVtcCB2ZXJzaW9uIGJ5IHR5cGUuXG4gKiBcbiAqIEBwYXJhbSBjdXJyZW50VmVyc2lvbiAtIEN1cnJlbnQgdmVyc2lvbiBzdHJpbmdcbiAqIEBwYXJhbSBidW1wVHlwZSAtIFR5cGUgb2YgYnVtcCAobWFqb3IsIG1pbm9yLCBwYXRjaClcbiAqIEByZXR1cm5zIE5ldyB2ZXJzaW9uIHN0cmluZ1xuICogXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogYnVtcFZlcnNpb24oJzEuMi4zJywgJ21ham9yJykgIC8vICcyLjAuMCdcbiAqIGJ1bXBWZXJzaW9uKCcxLjIuMycsICdtaW5vcicpICAvLyAnMS4zLjAnXG4gKiBidW1wVmVyc2lvbignMS4yLjMnLCAncGF0Y2gnKSAgLy8gJzEuMi40J1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidW1wVmVyc2lvbihjdXJyZW50VmVyc2lvbjogc3RyaW5nLCBidW1wVHlwZTogQnVtcFR5cGUpOiBzdHJpbmcge1xuICBjb25zdCB2ZXIgPSBwYXJzZVNlbVZlcihjdXJyZW50VmVyc2lvbik7XG4gIFxuICBzd2l0Y2ggKGJ1bXBUeXBlKSB7XG4gICAgY2FzZSAnbWFqb3InOlxuICAgICAgdmVyLm1ham9yICs9IDE7XG4gICAgICB2ZXIubWlub3IgPSAwO1xuICAgICAgdmVyLnBhdGNoID0gMDtcbiAgICAgIHZlci5wcmVyZWxlYXNlID0gdW5kZWZpbmVkO1xuICAgICAgdmVyLmJ1aWxkID0gdW5kZWZpbmVkO1xuICAgICAgYnJlYWs7XG4gICAgICBcbiAgICBjYXNlICdtaW5vcic6XG4gICAgICB2ZXIubWlub3IgKz0gMTtcbiAgICAgIHZlci5wYXRjaCA9IDA7XG4gICAgICB2ZXIucHJlcmVsZWFzZSA9IHVuZGVmaW5lZDtcbiAgICAgIHZlci5idWlsZCA9IHVuZGVmaW5lZDtcbiAgICAgIGJyZWFrO1xuICAgICAgXG4gICAgY2FzZSAncGF0Y2gnOlxuICAgICAgdmVyLnBhdGNoICs9IDE7XG4gICAgICB2ZXIucHJlcmVsZWFzZSA9IHVuZGVmaW5lZDtcbiAgICAgIHZlci5idWlsZCA9IHVuZGVmaW5lZDtcbiAgICAgIGJyZWFrO1xuICB9XG4gIFxuICByZXR1cm4gZm9ybWF0U2VtVmVyKHZlcik7XG59XG5cbi8qKlxuICogQ29tcGFyZSB0d28gdmVyc2lvbnMuXG4gKiBcbiAqIEBwYXJhbSBhIC0gRmlyc3QgdmVyc2lvblxuICogQHBhcmFtIGIgLSBTZWNvbmQgdmVyc2lvblxuICogQHJldHVybnMgLTEgaWYgYSA8IGIsIDAgaWYgYSA9PT0gYiwgMSBpZiBhID4gYlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZVZlcnNpb25zKGE6IHN0cmluZywgYjogc3RyaW5nKTogbnVtYmVyIHtcbiAgY29uc3QgdmVyQSA9IHBhcnNlU2VtVmVyKGEpO1xuICBjb25zdCB2ZXJCID0gcGFyc2VTZW1WZXIoYik7XG4gIFxuICAvLyBDb21wYXJlIG1ham9yXG4gIGlmICh2ZXJBLm1ham9yICE9PSB2ZXJCLm1ham9yKSB7XG4gICAgcmV0dXJuIHZlckEubWFqb3IgPCB2ZXJCLm1ham9yID8gLTEgOiAxO1xuICB9XG4gIFxuICAvLyBDb21wYXJlIG1pbm9yXG4gIGlmICh2ZXJBLm1pbm9yICE9PSB2ZXJCLm1pbm9yKSB7XG4gICAgcmV0dXJuIHZlckEubWlub3IgPCB2ZXJCLm1pbm9yID8gLTEgOiAxO1xuICB9XG4gIFxuICAvLyBDb21wYXJlIHBhdGNoXG4gIGlmICh2ZXJBLnBhdGNoICE9PSB2ZXJCLnBhdGNoKSB7XG4gICAgcmV0dXJuIHZlckEucGF0Y2ggPCB2ZXJCLnBhdGNoID8gLTEgOiAxO1xuICB9XG4gIFxuICAvLyBDb21wYXJlIHByZXJlbGVhc2UgKG5vIHByZXJlbGVhc2UgPiBwcmVyZWxlYXNlKVxuICBpZiAoIXZlckEucHJlcmVsZWFzZSAmJiB2ZXJCLnByZXJlbGVhc2UpIHtcbiAgICByZXR1cm4gMTtcbiAgfVxuICBpZiAodmVyQS5wcmVyZWxlYXNlICYmICF2ZXJCLnByZXJlbGVhc2UpIHtcbiAgICByZXR1cm4gLTE7XG4gIH1cbiAgXG4gIGlmICh2ZXJBLnByZXJlbGVhc2UgJiYgdmVyQi5wcmVyZWxlYXNlKSB7XG4gICAgY29uc3QgcHJlcmVsZWFzZUEgPSB2ZXJBLnByZXJlbGVhc2Uuc3BsaXQoJy4nKTtcbiAgICBjb25zdCBwcmVyZWxlYXNlQiA9IHZlckIucHJlcmVsZWFzZS5zcGxpdCgnLicpO1xuICAgIFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5tYXgocHJlcmVsZWFzZUEubGVuZ3RoLCBwcmVyZWxlYXNlQi5sZW5ndGgpOyBpKyspIHtcbiAgICAgIGNvbnN0IHBhcnRBID0gcHJlcmVsZWFzZUFbaV07XG4gICAgICBjb25zdCBwYXJ0QiA9IHByZXJlbGVhc2VCW2ldO1xuICAgICAgXG4gICAgICBpZiAocGFydEEgPT09IHVuZGVmaW5lZCkgcmV0dXJuIC0xO1xuICAgICAgaWYgKHBhcnRCID09PSB1bmRlZmluZWQpIHJldHVybiAxO1xuICAgICAgXG4gICAgICAvLyBOdW1lcmljIGNvbXBhcmlzb24gaWYgYm90aCBhcmUgbnVtYmVyc1xuICAgICAgY29uc3QgbnVtQSA9IHBhcnNlSW50KHBhcnRBLCAxMCk7XG4gICAgICBjb25zdCBudW1CID0gcGFyc2VJbnQocGFydEIsIDEwKTtcbiAgICAgIFxuICAgICAgaWYgKCFpc05hTihudW1BKSAmJiAhaXNOYU4obnVtQikpIHtcbiAgICAgICAgaWYgKG51bUEgIT09IG51bUIpIHtcbiAgICAgICAgICByZXR1cm4gbnVtQSA8IG51bUIgPyAtMSA6IDE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFN0cmluZyBjb21wYXJpc29uXG4gICAgICAgIGlmIChwYXJ0QSAhPT0gcGFydEIpIHtcbiAgICAgICAgICByZXR1cm4gcGFydEEgPCBwYXJ0QiA/IC0xIDogMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBcbiAgLy8gQnVpbGQgbWV0YWRhdGEgaXMgaWdub3JlZCBmb3IgcHJlY2VkZW5jZVxuICByZXR1cm4gMDtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiB2ZXJzaW9uIGEgaXMgZ3JlYXRlciB0aGFuIHZlcnNpb24gYi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzR3JlYXRlclRoYW4oYTogc3RyaW5nLCBiOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIGNvbXBhcmVWZXJzaW9ucyhhLCBiKSA+IDA7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgdmVyc2lvbiBhIGlzIGxlc3MgdGhhbiB2ZXJzaW9uIGIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0xlc3NUaGFuKGE6IHN0cmluZywgYjogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBjb21wYXJlVmVyc2lvbnMoYSwgYikgPCAwO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIHZlcnNpb24gYSBlcXVhbHMgdmVyc2lvbiBiLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFcXVhbChhOiBzdHJpbmcsIGI6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gY29tcGFyZVZlcnNpb25zKGEsIGIpID09PSAwO1xufVxuXG4vKipcbiAqIFZhbGlkYXRlIHZlcnNpb24gc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNWYWxpZFZlcnNpb24odmVyc2lvbjogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHRyeSB7XG4gICAgcGFyc2VTZW1WZXIodmVyc2lvbik7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCBuZXh0IHZlcnNpb24gYmFzZWQgb24gZGlmZiBhbmFseXNpcy5cbiAqIFxuICogQHBhcmFtIGN1cnJlbnRWZXJzaW9uIC0gQ3VycmVudCB2ZXJzaW9uXG4gKiBAcGFyYW0gaXNCcmVha2luZyAtIFdoZXRoZXIgY2hhbmdlcyBhcmUgYnJlYWtpbmdcbiAqIEBwYXJhbSBoYXNOZXdGZWF0dXJlcyAtIFdoZXRoZXIgdGhlcmUgYXJlIG5ldyBmZWF0dXJlc1xuICogQHBhcmFtIGhhc0J1Z0ZpeGVzIC0gV2hldGhlciB0aGVyZSBhcmUgYnVnIGZpeGVzXG4gKiBAcmV0dXJucyBCdW1wIHR5cGUgb3IgbnVsbCBpZiBubyBidW1wIG5lZWRlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGV0ZXJtaW5lQnVtcFR5cGUocGFyYW1zOiB7XG4gIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmc7XG4gIGlzQnJlYWtpbmc6IGJvb2xlYW47XG4gIGhhc05ld0ZlYXR1cmVzOiBib29sZWFuO1xuICBoYXNCdWdGaXhlczogYm9vbGVhbjtcbn0pOiBCdW1wVHlwZSB8IG51bGwge1xuICBjb25zdCB7IGlzQnJlYWtpbmcsIGhhc05ld0ZlYXR1cmVzLCBoYXNCdWdGaXhlcyB9ID0gcGFyYW1zO1xuICBcbiAgaWYgKGlzQnJlYWtpbmcpIHtcbiAgICByZXR1cm4gJ21ham9yJztcbiAgfVxuICBcbiAgaWYgKGhhc05ld0ZlYXR1cmVzKSB7XG4gICAgcmV0dXJuICdtaW5vcic7XG4gIH1cbiAgXG4gIGlmIChoYXNCdWdGaXhlcykge1xuICAgIHJldHVybiAncGF0Y2gnO1xuICB9XG4gIFxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiB2ZXJzaW9uIGlzIHN0YWJsZSAobm8gcHJlcmVsZWFzZSkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0YWJsZSh2ZXJzaW9uOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgdmVyID0gcGFyc2VTZW1WZXIodmVyc2lvbik7XG4gIHJldHVybiAhdmVyLnByZXJlbGVhc2U7XG59XG5cbi8qKlxuICogQ3JlYXRlIHByZXJlbGVhc2UgdmVyc2lvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvUHJlcmVsZWFzZSh2ZXJzaW9uOiBzdHJpbmcsIHByZXJlbGVhc2U6IHN0cmluZyA9ICdiZXRhLjEnKTogc3RyaW5nIHtcbiAgY29uc3QgdmVyID0gcGFyc2VTZW1WZXIodmVyc2lvbik7XG4gIHZlci5wcmVyZWxlYXNlID0gcHJlcmVsZWFzZTtcbiAgcmV0dXJuIGZvcm1hdFNlbVZlcih2ZXIpO1xufVxuXG4vKipcbiAqIEdldCBtYWpvciB2ZXJzaW9uIHN0cmluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE1ham9yVmVyc2lvbih2ZXJzaW9uOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB2ZXIgPSBwYXJzZVNlbVZlcih2ZXJzaW9uKTtcbiAgcmV0dXJuIGAke3Zlci5tYWpvcn0uMC4wYDtcbn1cblxuLyoqXG4gKiBHZXQgdmVyc2lvbiByYW5nZSBmb3IgY29tcGF0aWJpbGl0eS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFZlcnNpb25SYW5nZSh2ZXJzaW9uOiBzdHJpbmcsIGNvbXBhdGliaWxpdHk6ICdtYWpvcicgfCAnbWlub3InKTogc3RyaW5nIHtcbiAgY29uc3QgdmVyID0gcGFyc2VTZW1WZXIodmVyc2lvbik7XG4gIFxuICBpZiAoY29tcGF0aWJpbGl0eSA9PT0gJ21ham9yJykge1xuICAgIHJldHVybiBgXiR7dmVyLm1ham9yfS4wLjBgO1xuICB9XG4gIFxuICByZXR1cm4gYH4ke3Zlci5tYWpvcn0uJHt2ZXIubWlub3J9LjBgO1xufVxuIl19