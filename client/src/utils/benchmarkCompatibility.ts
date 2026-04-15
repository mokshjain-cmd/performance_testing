/**
 * Benchmark Device Capabilities - Simplified
 */

export function getMetricIcon(metric: string): string {
  const icons: { [key: string]: string } = {
    'HR': '❤️',
    'SPO2': '🫁',
    'Sleep': '😴',
    'Activity': '🏃',
    'Stress': '😰',
    'SkinTemp': '🌡️',
  };
  return icons[metric] || '📊';
}
