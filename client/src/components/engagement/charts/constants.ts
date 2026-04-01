// Design System Constants for Engagement Dashboard

export const COLORS = {
  // Metric-specific colors
  hr: {
    primary: '#ef4444',      // red-500
    light: '#fca5a5',        // red-300
    dark: '#dc2626',         // red-600
    bg: 'rgba(239, 68, 68, 0.1)',
    gradient: ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.05)']
  },
  sleep: {
    primary: '#8b5cf6',      // purple-500
    light: '#c4b5fd',        // purple-300
    dark: '#7c3aed',         // purple-600
    bg: 'rgba(139, 92, 246, 0.1)',
    gradient: ['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.05)'],
    stages: {
      deep: '#1e40af',       // blue-800
      rem: '#8b5cf6',        // purple-500
      light: '#06b6d4',      // cyan-500
      awake: '#ef4444'       // red-500
    }
  },
  activity: {
    primary: '#3b82f6',      // blue-500
    light: '#93c5fd',        // blue-300
    dark: '#2563eb',         // blue-600
    bg: 'rgba(59, 130, 246, 0.1)',
    gradient: ['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.05)']
  },
  spo2: {
    primary: '#10b981',      // green-500
    light: '#6ee7b7',        // green-300
    dark: '#059669',         // green-600
    bg: 'rgba(16, 185, 129, 0.1)',
    gradient: ['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.05)']
  },
  
  // Status colors
  status: {
    active: '#10b981',       // green-500
    declining: '#f59e0b',    // amber-500
    inactive: '#ef4444',     // red-500
    critical: '#dc2626'      // red-600
  },
  
  // Zone colors (for HR zones)
  zones: {
    resting: 'rgba(59, 130, 246, 0.1)',    // blue - 50-60% max HR
    fatBurn: 'rgba(16, 185, 129, 0.1)',    // green - 60-70%
    cardio: 'rgba(251, 146, 60, 0.15)',    // orange - 70-80%
    peak: 'rgba(239, 68, 68, 0.15)'        // red - 80-90%
  },
  
  // Neutral colors
  neutral: {
    text: '#1f2937',         // gray-800
    textLight: '#6b7280',    // gray-500
    border: '#e5e7eb',       // gray-200
    bg: '#f9fafb',           // gray-50
    bgCard: 'rgba(255, 255, 255, 0.8)'
  }
};

export const CHART_DEFAULTS = {
  font: {
    family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    size: 12,
    weight: '400'
  },
  animation: {
    duration: 750,
    easing: 'easeInOutQuart' as const
  },
  grid: {
    color: 'rgba(229, 231, 235, 0.5)',
    lineWidth: 1
  },
  tooltip: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    titleColor: '#f9fafb',
    bodyColor: '#e5e7eb',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    padding: 12,
    cornerRadius: 8,
    titleFont: {
      size: 13,
      weight: '600'
    },
    bodyFont: {
      size: 12,
      weight: '400'
    }
  }
};

export const HR_ZONES = {
  resting: { min: 40, max: 100, label: 'Resting', color: COLORS.zones.resting },
  fatBurn: { min: 100, max: 130, label: 'Fat Burn', color: COLORS.zones.fatBurn },
  cardio: { min: 130, max: 160, label: 'Cardio', color: COLORS.zones.cardio },
  peak: { min: 160, max: 220, label: 'Peak', color: COLORS.zones.peak }
};

export const SPO2_ZONES = {
  normal: { min: 95, max: 100, color: 'rgba(16, 185, 129, 0.1)' },
  warning: { min: 90, max: 95, color: 'rgba(251, 146, 60, 0.15)' },
  critical: { min: 0, max: 90, color: 'rgba(239, 68, 68, 0.15)' }
};

export const SLEEP_STAGE_LABELS = {
  deep: 'DEEP',
  rem: 'REM',
  light: 'LIGHT',
  awake: 'AWAKE'
};

export const METRIC_ICONS = {
  hr: 'HR',
  sleep: 'Sleep',
  activity: 'Activity',
  spo2: 'SpO2'
};
