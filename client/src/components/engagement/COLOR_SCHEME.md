# 🎨 Engagement Dashboard - Color Scheme & Visual Reference

## Primary Metric Colors

### ❤️ **Heart Rate** (Red Theme)
- **Primary**: `#ef4444` (red-500)
- **Light**: `#fca5a5` (red-300)  
- **Dark**: `#dc2626` (red-600)
- **Background**: `rgba(239, 68, 68, 0.1)`
- **Gradient**: `['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.05)']`

**Usage**: HR line charts, HR detail card, heart icons

---

### 😴 **Sleep** (Purple Theme)
- **Primary**: `#8b5cf6` (purple-500)
- **Light**: `#c4b5fd` (purple-300)
- **Dark**: `#7c3aed` (purple-600)
- **Background**: `rgba(139, 92, 246, 0.1)`
- **Gradient**: `['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.05)']`

**Sleep Stage Colors**:
- **Deep**: `#1e40af` (blue-800) - Darkest, most restorative
- **REM**: `#8b5cf6` (purple-500) - Dream stage
- **Light**: `#06b6d4` (cyan-500) - Transition stage
- **Awake**: `#ef4444` (red-500) - Interruptions

**Usage**: Sleep score charts, hypnograph, sleep icons

---

### 🏃 **Activity** (Blue Theme)
- **Primary**: `#3b82f6` (blue-500)
- **Light**: `#93c5fd` (blue-300)
- **Dark**: `#2563eb` (blue-600)
- **Background**: `rgba(59, 130, 246, 0.1)`
- **Gradient**: `['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.05)']`

**Usage**: Steps charts, activity detail card, activity icons

---

### 🫁 **Blood Oxygen (SpO2)** (Green Theme)
- **Primary**: `#10b981` (green-500)
- **Light**: `#6ee7b7` (green-300)
- **Dark**: `#059669` (green-600)
- **Background**: `rgba(16, 185, 129, 0.1)`
- **Gradient**: `['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.05)']`

**Usage**: SpO2 line charts, blood oxygen detail card

---

## Status Colors

### ✅ **Active** 
- Color: `#10b981` (green-500)
- Badge: `bg-green-100 text-green-800`
- Meaning: User is engaged, data flowing regularly

### ⚠️ **At Risk / Declining**
- Color: `#f59e0b` (amber-500)
- Badge: `bg-yellow-100 text-yellow-800`
- Meaning: Engagement declining, needs attention

### ❌ **Inactive**
- Color: `#ef4444` (red-500)
- Badge: `bg-red-100 text-red-800`
- Meaning: No recent data, user disengaged

### 🔴 **Critical**
- Color: `#dc2626` (red-600)
- Badge: `bg-red-100 text-red-900`
- Meaning: Severe issues detected

---

## Heart Rate Zones

### 🔵 **Resting Zone** (40-100 bpm)
- Color: `rgba(59, 130, 246, 0.1)` (blue with alpha)
- Description: Rest and recovery

### 🟢 **Fat Burn Zone** (100-130 bpm)
- Color: `rgba(16, 185, 129, 0.1)` (green with alpha)
- Description: Optimal for fat burning

### 🟠 **Cardio Zone** (130-160 bpm)
- Color: `rgba(251, 146, 60, 0.15)` (orange with alpha)
- Description: Cardiovascular training

### 🔴 **Peak Zone** (160+ bpm)
- Color: `rgba(239, 68, 68, 0.15)` (red with alpha)
- Description: Maximum intensity

---

## SpO2 Health Zones

### 🟢 **Normal Range** (95-100%)
- Color: `rgba(16, 185, 129, 0.1)` (green)
- Status: Healthy, optimal oxygenation

### 🟡 **Borderline** (90-94%)
- Color: `rgba(251, 146, 60, 0.15)` (orange)
- Status: Monitoring recommended

### 🔴 **Low/Critical** (<90%)
- Color: `rgba(239, 68, 68, 0.15)` (red)
- Status: Medical attention required

---

## Neutral/UI Colors

### Text Colors
- **Primary Text**: `#1f2937` (gray-800)
- **Secondary Text**: `#6b7280` (gray-500)
- **Muted Text**: `#9ca3af` (gray-400)

### Borders & Backgrounds
- **Border**: `#e5e7eb` (gray-200) or `rgba(229,231,235,0.5)`
- **Background**: `#f9fafb` (gray-50)
- **Card Background**: `rgba(255, 255, 255, 0.8)` with backdrop-blur

### Shadows
- **Small**: `shadow-[0_4px_16px_rgba(0,0,0,0.04)]`
- **Medium**: `shadow-[0_8px_32px_rgba(0,0,0,0.06)]`
- **Large**: `shadow-[0_12px_48px_rgba(0,0,0,0.08)]`

---

## Gradient Cards (Used in Summary View)

### HR Summary Card
```css
bg-gradient-to-br from-red-50 to-white
border border-red-100
```

### Sleep Summary Card
```css
bg-gradient-to-br from-purple-50 to-white
border border-purple-100
```

### Activity Summary Card
```css
bg-gradient-to-br from-blue-50 to-white
border border-blue-100
```

### SpO2 Summary Card
```css
bg-gradient-to-br from-green-50 to-white
border border-green-100
```

---

## Chart Styling

### Grid Lines
- Color: `rgba(229, 231, 235, 0.5)`
- Width: `1px`

### Tooltips
- Background: `rgba(17, 24, 39, 0.95)` (dark gray with alpha)
- Title Color: `#f9fafb` (almost white)
- Body Color: `#e5e7eb` (light gray)
- Border: `rgba(255, 255, 255, 0.1)` (subtle white outline)
- Padding: `12px`
- Corner Radius: `8px`

### Data Points
- Background: `#fff` (white)
- Border: Metric-specific primary color
- Border Width: `2px`
- Hover Border Width: `3px`
- Radius: `4px` (default), `6px` (hover)

---

## Accessibility

All color combinations meet **WCAG 2.1 Level AA** standards:
- Text colors have minimum 4.5:1 contrast ratio
- Large text has minimum 3:1 contrast ratio
- Status colors are distinguishable for color-blind users
- Icons accompany color-coded information

---

## Usage Examples

### Stat Badge Color Selection
```tsx
<StatBadge color="red" />    // For HR metrics
<StatBadge color="purple" /> // For sleep metrics
<StatBadge color="blue" />   // For activity metrics
<StatBadge color="green" />  // For SpO2 metrics
<StatBadge color="orange" /> // For calories/intensity
<StatBadge color="gray" />   // For neutral info
```

### Progress Ring Color
```tsx
<ProgressRing color="#3b82f6" />  // Blue for steps
<ProgressRing color="#f97316" />  // Orange for calories
<ProgressRing color="#8b5cf6" />  // Purple for sleep score
```

---

## Design Principles

1. **Consistency**: Each metric type has a dedicated color that's used across all views
2. **Hierarchy**: Darker shades for primary elements, lighter for backgrounds
3. **Clarity**: High contrast for readability, subtle gradients for depth
4. **Emotion**: Colors reflect meaning (green=good, red=alert, purple=rest)
5. **Glassmorphism**: White backgrounds with alpha + backdrop blur for modern feel

---

**🎨 Consistent color usage creates professional, intuitive user experience!**
