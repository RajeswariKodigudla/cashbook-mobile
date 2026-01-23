/**
 * Chart loader utility - only loads charts on native platforms
 * This file prevents Metro from trying to bundle react-native-chart-kit on web
 */

import { Platform } from 'react-native';

let chartComponents: { LineChart: any; PieChart: any; BarChart: any } | null = null;

// Create a safe require function that won't be analyzed by Metro on web
const safeRequire = (moduleName: string): any => {
  try {
    // Use Function constructor to prevent static analysis
    const req = new Function('return typeof require !== "undefined" && require');
    const requireFn = req();
    if (requireFn) {
      return requireFn(moduleName);
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
};

export const getChartComponents = (): { LineChart: any; PieChart: any; BarChart: any } => {
  // On web, always return null immediately
  if (Platform.OS === 'web') {
    return { LineChart: null, PieChart: null, BarChart: null };
  }

  // If already loaded, return cached
  if (chartComponents) {
    return chartComponents;
  }

  // On native platforms, load charts
  try {
    const chartKit = safeRequire('react-native-chart-kit');
    
    if (chartKit && chartKit.LineChart && chartKit.PieChart) {
      chartComponents = {
        LineChart: chartKit.LineChart,
        PieChart: chartKit.PieChart,
        BarChart: chartKit.BarChart || null,
      };
      return chartComponents;
    }
  } catch (error) {
    // Charts not available - will use fallback UI
    // Don't log on web as it's expected
    if (Platform.OS !== 'web') {
      console.warn('Chart components not available:', error);
    }
  }

  chartComponents = { LineChart: null, PieChart: null, BarChart: null };
  return chartComponents;
};

