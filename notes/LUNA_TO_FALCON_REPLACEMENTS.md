# Luna → Falcon Display Text Replacements

This document tracks all user-facing "Luna" text that needs to be replaced with "Falcon" in the frontend.

## Completed Replacements

### SessionFormPage.tsx
- ✅ Device dropdown: "Luna" → "Falcon"
- ✅ "Luna Firmware Version" → "Falcon Firmware Version"
- ✅ "Mobile Type (Luna Device)" → "Mobile Type (Falcon Device)"
- ✅ Comment: "Always show Luna" → "Always show Falcon"
- ✅ Comment: "For Sleep/Activity with Luna" → "For Sleep/Activity with Falcon"
- ✅ Comment: "Fetch firmware versions for Luna" → "Fetch firmware versions for Falcon"

### ActivitySessionPage.tsx  
- ✅ "Luna Ring Metrics" → "Falcon Ring Metrics"
- ✅ "Luna Accuracy" → "Falcon Accuracy"

## Remaining Replacements Needed

### Activity Components
**AdminActivitySessionView.tsx:**
- "Luna Ring Metrics" → "Falcon Ring Metrics"
- "Luna Accuracy" → "Falcon Accuracy"
- Table row: "Luna" → "Falcon"
- Chart dataKey: "Luna" → "Falcon"

**AdminActivityOverviewTab.tsx:**
- "How close Luna is to benchmark" → "How close Falcon is to benchmark"
- "Luna performs best when" → "Falcon performs best when"
- Other tooltip references

**AdminActivityBenchmarkTab.tsx:**
- "Compare Luna performance" → "Compare Falcon performance"  
- "Luna - Benchmark" labels → "Falcon - Benchmark"

**AdminActivityFirmwareTab.tsx:**
- Chart labels: "Luna - Benchmark" → "Falcon - Benchmark"

**AdminActivityUserView.tsx:**
- Multiple bias tooltip references: "Luna - Benchmark" → "Falcon - Benchmark"
- "Luna overestimates/underestimates" → "Falcon overestimates/underestimates"
- "tracked by Luna device" → "tracked by Falcon device"
- "how Luna measurements are" → "how Falcon measurements are"

**ActivityOverviewPage.tsx** (User Dashboard):
- Same as AdminActivityUserView - all user-facing references

### Sleep Components
**AdminSleepSessionView.tsx:**
- "Luna" label in stats comparison table
- "Luna and benchmark agree" → "Falcon and benchmark agree"
- "Luna correctly identify" → "Falcon correctly identify"
- "How well Luna detects" → "How well Falcon detects"
- "How well Luna avoids" → "How well Falcon avoids"
- Chart column header: "Luna (Predictions)" → "Falcon (Predictions)"
- All tooltip references to Luna

**SleepSessionPage.tsx** (User Dashboard):
- "Luna Sleep Metrics" → "Falcon Sleep Metrics"
- "Luna overestimated/underestimated" → "Falcon overestimated/underestimated"
- All display references

**AdminSleepOverviewTab.tsx:**
- Stage sensitivity explanations
- Tooltip references

**SleepSessionsTab.tsx:**
- Table header: "Luna" → "Falcon"

### Sleep Chart Components
**HypnogramChart.tsx:**
- Legend name: "Luna" → "Falcon"

**StageDurationChart.tsx:**
- Bar dataKey: "Luna" → "Falcon"

### Overview Tabs
**AdminOverviewTab.tsx:**
- "Total Luna Readings" → "Total Falcon Readings"

**AdminActivityDashboardPage.tsx:**
- "Luna vs Benchmark" → "Falcon vs Benchmark"

### Admin Components  
**AdminSleepUserView.tsx:**
- "Luna Ring" label → "Falcon Ring"

**AdminSidebar.tsx / Other Admin:**
- Any remaining display references

## Technical Notes

### What NOT to Change:
- ❌ Internal field/variable names: `.luna`, `lunaStats`, `lunaEpochs`, `lunaDevice`
- ❌ API deviceType values: `deviceType: 'luna'`, `devices: ['luna']`
- ❌ Comparison logic: `d.deviceType === 'luna'`, `pair.d1 === 'luna'`
- ❌ Data keys in objects (backend compatibility): `luna: { totalSteps... }`

### What TO Change:
- ✅ Display labels, headers, titles
- ✅ Tooltip/help text visible to users
- ✅ Chart legends and axis labels
- ✅ Table column headers and row labels
- ✅ Form field labels
- ✅ Comments (for developer clarity)

## Recommended Approach

Create a display name utility:
```typescript
// utils/deviceNames.ts
export const getDeviceDisplayName = (deviceType: string): string => {
  const displayNames: Record<string, string> = {
    'luna': 'Falcon',
    'polar': 'Polar',
    'masimo': 'Masimo',
    'apple': 'Apple',
    // ... others
  };
  return displayNames[deviceType] || deviceType;
};
```

Then use: `{getDeviceDisplayName('luna')}` instead of hardcoded "Luna" text.
