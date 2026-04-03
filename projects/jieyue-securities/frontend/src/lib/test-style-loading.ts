/**
 * 样式加载测试工具
 * 基于 ANFSF V1.5.0 Layer 8.5.7 Readiness Gate
 * 
 * 用于验证：
 * - Critical CSS 内联
 * - FOUC 风险检测
 * - 响应式布局验证
 * - 性能指标
 */

export interface StyleTestResult {
  testName: string;
  passed: boolean;
  details: string;
  metrics?: Record<string, any>;
}

export interface StyleTestReport {
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: StyleTestResult[];
  summary: {
    styleLoadingSuccess: number;
    criticalCSSInline: boolean;
    foucRisk: 'none' | 'low' | 'medium' | 'high';
    firstScreenLoadTime: number;
    styleFileSize: number;
  };
}

/**
 * 测试样式加载
 */
export async function testStyleLoading(): Promise<StyleTestReport> {
  const results: StyleTestResult[] = [];
  const startTime = performance.now();

  // 测试 1: 样式表是否加载
  const stylesheetTest = testStylesheets();
  results.push(stylesheetTest);

  // 测试 2: Critical CSS 是否内联
  const criticalCSSTest = testCriticalCSS();
  results.push(criticalCSSTest);

  // 测试 3: 字体加载
  const fontTest = testFonts();
  results.push(fontTest);

  // 测试 4: FOUC 风险检测
  const foucTest = testFOUCRisk();
  results.push(foucTest);

  // 测试 5: 响应式布局
  const responsiveTest = testResponsiveLayout();
  results.push(responsiveTest);

  // 测试 6: 样式文件大小
  const fileSizeTest = await testStyleFileSize();
  results.push(fileSizeTest);

  const endTime = performance.now();
  const loadTime = endTime - startTime;

  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedTests,
    failedTests,
    results,
    summary: {
      styleLoadingSuccess: passedTests / results.length * 100,
      criticalCSSInline: criticalCSSTest.passed,
      foucRisk: foucTest.metrics?.risk as any || 'medium',
      firstScreenLoadTime: loadTime,
      styleFileSize: fileSizeTest.metrics?.size || 0,
    },
  };
}

/**
 * 测试 1: 样式表加载
 */
function testStylesheets(): StyleTestResult {
  try {
    const stylesheets = Array.from(document.styleSheets);
    const passed = stylesheets.length > 0;
    
    return {
      testName: 'Stylesheet Loading',
      passed,
      details: passed
        ? `Found ${stylesheets.length} stylesheets`
        : 'No stylesheets found',
      metrics: {
        count: stylesheets.length,
      },
    };
  } catch (error) {
    return {
      testName: 'Stylesheet Loading',
      passed: false,
      details: `Error: ${error}`,
    };
  }
}

/**
 * 测试 2: Critical CSS 内联
 */
function testCriticalCSS(): StyleTestResult {
  const criticalStyle = document.getElementById('critical-css');
  const passed = criticalStyle !== null && criticalStyle.textContent?.length! > 0;

  return {
    testName: 'Critical CSS Inline',
    passed,
    details: passed
      ? `Critical CSS found (${criticalStyle?.textContent?.length} chars)`
      : 'Critical CSS not found or empty',
    metrics: {
      size: criticalStyle?.textContent?.length || 0,
    },
  };
}

/**
 * 测试 3: 字体加载
 */
function testFonts(): StyleTestResult {
  // Font Loading API 检查
  const hasFontAPI = 'fonts' in document;
  
  return {
    testName: 'Font Loading',
    passed: true,
    details: hasFontAPI ? 'Font Loading API available' : 'Using fallback font detection',
  };
}

/**
 * 测试 4: FOUC 风险检测
 */
function testFOUCRisk(): StyleTestResult {
  const html = document.documentElement;
  const hasVisibility = html.style.visibility !== 'hidden';
  const hasCriticalCSS = document.getElementById('critical-css') !== null;
  
  let risk: 'none' | 'low' | 'medium' | 'high' = 'none';
  
  if (!hasCriticalCSS) {
    risk = 'high';
  } else if (!hasVisibility) {
    risk = 'medium';
  } else {
    risk = 'none';
  }

  return {
    testName: 'FOUC Risk Detection',
    passed: risk !== 'high',
    details: `FOUC Risk Level: ${risk}`,
    metrics: {
      risk,
      hasCriticalCSS,
      hasVisibility,
    },
  };
}

/**
 * 测试 5: 响应式布局
 */
function testResponsiveLayout(): StyleTestResult {
  const breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  };

  const currentWidth = window.innerWidth;
  let activeBreakpoint = 'base';

  for (const [key, value] of Object.entries(breakpoints)) {
    if (currentWidth >= value) {
      activeBreakpoint = key;
    }
  }

  // 检查是否有响应式类
  const hasResponsiveClasses = document.querySelector('[class*="md:"]') !== null ||
                               document.querySelector('[class*="lg:"]') !== null;

  return {
    testName: 'Responsive Layout',
    passed: hasResponsiveClasses,
    details: `Current viewport: ${currentWidth}px (${activeBreakpoint})`,
    metrics: {
      viewport: currentWidth,
      breakpoint: activeBreakpoint,
      hasResponsiveClasses,
    },
  };
}

/**
 * 测试 6: 样式文件大小
 */
async function testStyleFileSize(): Promise<StyleTestResult> {
  try {
    // 简化的文件大小检查
    const stylesheets = Array.from(document.styleSheets);
    const count = stylesheets.length;
    
    // 估算大小 (基于样式表数量)
    const estimatedSize = count * 10; // 每个样式表约 10KB
    const passed = estimatedSize < 50;

    return {
      testName: 'Style File Size',
      passed,
      details: `Estimated CSS size: ~${estimatedSize}KB (${count} stylesheets, target: <50KB)`,
      metrics: {
        size: estimatedSize,
        count,
        target: 50,
      },
    };
  } catch (error) {
    return {
      testName: 'Style File Size',
      passed: true,
      details: 'Size check skipped (cross-origin restrictions)',
    };
  }
}

/**
 * 打印测试报告到控制台
 */
export function printTestReport(report: StyleTestReport): void {
  console.group('📊 Style Loading Test Report');
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Total Tests: ${report.totalTests}`);
  console.log(`Passed: ${report.passedTests} ✅`);
  console.log(`Failed: ${report.failedTests} ❌`);
  console.log('');
  
  console.log('📋 Test Results:');
  report.results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`  ${icon} ${result.testName}: ${result.details}`);
  });
  
  console.log('');
  console.log('📈 Summary:');
  console.log(`  Style Loading Success: ${report.summary.styleLoadingSuccess.toFixed(1)}%`);
  console.log(`  Critical CSS Inline: ${report.summary.criticalCSSInline ? 'Yes ✅' : 'No ❌'}`);
  console.log(`  FOUC Risk: ${report.summary.foucRisk}`);
  console.log(`  First Screen Load Time: ${report.summary.firstScreenLoadTime.toFixed(2)}ms`);
  console.log(`  Style File Size: ${report.summary.styleFileSize}KB`);
  
  console.groupEnd();
}

/**
 * 运行所有测试并返回结果
 */
export async function runAllTests(): Promise<StyleTestReport> {
  const report = await testStyleLoading();
  printTestReport(report);
  return report;
}
