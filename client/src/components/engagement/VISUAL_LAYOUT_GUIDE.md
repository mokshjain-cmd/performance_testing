# Engagement Dashboard - Visual Layout Guide

## 🖼️ Desktop Layout (≥1280px)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  HEADER (h-14px)                                                   🟢 Admin ⚙️  │
│  [Logo] Noise-Benchmarking  |  Dashboard  Devices  Firmware  🆕 Performance ➡️  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┬───────────────────────────────────────────────────┬──────────────┐
│ USER LIST   │           MAIN CONTENT AREA                      │  DATE PANEL  │
│ (280px)     │                                                   │  (280px)     │
│             │                                                   │              │
│ 🔍 Search   │  ┌─────────────────────────────────────────────┐ │  📅 Dates    │
│             │  │  USER OVERVIEW CARD                         │ │              │
│ All Active  │  │  ┌───┐ John Doe                    🟢 Active │ │  ▶ Mar 28   │
│ At-Risk     │  │  │ J │ john@noise.com                       │ │  │ ●●●○      │
│    Inact    │  │  └───┘                                       │ │  │ 85%       │
│─────────────│  │                                              │ │  │           │
│ ┌─────────┐ │  │  ┌──────┐ ┌──────┐ ┌──────┐                │ │  ▷ Mar 27   │
│ │  ●  Jane│ │  │  │  25  │ │  82% │ │ 2 days│                │ │  │ ●●○○      │
│ │  Smith  │ │  │  │ Days │ │Score │ │  ago │                 │ │  │ 60%       │
│ │ [████ ]│ │  │  └──────┘ └──────┘ └──────┘                 │ │             │
│ │ 82% 2d  │ │  │                                              │ │  ▷ Mar 26   │
│ └─────────┘ │  │  📊 Data Availability (30 days)              │ │  │ ●○○○      │
│             │  │  ❤️ HR: 25/30  🌙 Sleep: 22/30              │ │  │ 30%       │
│ ┌─────────┐ │  │  📈 Activity: 28/30  💧 SpO₂: 20/30        │ │             │
│ │ ⚠  John │ │  └─────────────────────────────────────────────┘ │  ▷ Mar 25   │
│ │ Johnson │ │                                                   │  ...         │
│ │ [███░ ]│ │  ┌─────────────────────────────────────────────┐ │             │
│ │ 45% 3d  │ │  │  TREND ANALYSIS (Last 30 Days)              │ │  [Scroll]    │
│ └─────────┘ │  └─────────────────────────────────────────────┘ │             │
│             │                                                   │              │
│ ┌─────────┐ │  ┌──────────────┐  ┌──────────────┐            │              │
│ │ ✗  Mike │ │  │ Heart Rate   │  │ Sleep        │            │              │
│ │ Davis   │ │  │ ───────┌─┐   │  │    ┌──┐      │            │              │
│ │ [█░░░ ]│ │  │ ──┌──┐ │ │   │  │  ┐│  └──┐    │            │              │
│ │ 12% 7d  │ │  │   │  └─┘ └── │  │ ┌┘│     └─   │            │              │
│ └─────────┘ │  └──────────────┘  └──────────────┘            │              │
│             │                                                   │              │
│   [More]    │  ┌──────────────┐  ┌──────────────┐            │              │
│             │  │ Activity     │  │ SpO₂         │            │              │
│ [Scrollable]│  │   ┌─┐        │  │ ─────────    │            │              │
│             │  │ ┌─┘ └─┐      │  │      ───     │            │              │
│             │  │ │     └──    │  │         ──── │            │              │
│             │  └──────────────┘  └──────────────┘            │              │
│             │                                                   │              │
│             │  [No date selected - showing trends]             │              │
└─────────────┴───────────────────────────────────────────────────┴──────────────┘
```

---

## 🖼️ Desktop Layout with Date Selected

```
┌─────────────┬───────────────────────────────────────────────────┬──────────────┐
│ USER LIST   │           MAIN CONTENT AREA                      │  DATE PANEL  │
│             │                                                   │              │
│ [Same as    │  ┌─────────────────────────────────────────────┐ │  📅 Dates    │
│  above]     │  │  Detailed Metrics for March 28, 2026   [×]  │ │              │
│             │  └─────────────────────────────────────────────┘ │  ⬛ Mar 28   │ ← Selected
│             │                                                   │  │ ●●●○      │
│             │  ┌─────────────────────────────────────────────┐ │  │ 85%       │
│             │  │  ❤️  HEART RATE                             │ │              │
│             │  │                                              │ │  ▷ Mar 27   │
│             │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐                │ │  │ ●●○○      │
│             │  │  │ 68 │ │ 52 │ │ 98 │ │1247│                │ │  │ 60%       │
│             │  │  │Avg │ │Min │ │Max │ │ #  │                │ │              │
│             │  │  └────┘ └────┘ └────┘ └────┘                │ │  ▷ Mar 26   │
│             │  │                                              │ │  │ ●○○○      │
│             │  │  Wear Time: 18.5 hrs  [███████████░░]       │ │  │ 30%       │
│             │  │                                              │ │              │
│             │  │  ┌───────────────────────────────────┐       │ │  [Scroll]    │
│             │  │  │ 100├─┐ ┌──┐  ┌──┐                │       │ │             │
│             │  │  │  90│ └─┘  └──┘  └─┐               │       │ │             │
│             │  │  │  80│              └────           │       │ │             │
│             │  │  │  70│                              │       │ │             │
│             │  │  │  60├──────────────────────────────│       │ │             │
│             │  │  └───────────────────────────────────┘       │ │             │
│             │  └─────────────────────────────────────────────┘ │             │
│             │                                                   │              │
│             │  ┌─────────────────────────────────────────────┐ │             │
│             │  │  🌙  SLEEP                                   │ │             │
│             │  │                                              │ │             │
│             │  │         Sleep Score                          │ │             │
│             │  │            85                                │ │             │
│             │  │      7h 45m • 11:30 PM - 7:15 AM            │ │             │
│             │  │                                              │ │             │
│             │  │  Deep: 95m  Light: 240m  REM: 85m  Awake:45m│ │             │
│             │  │  [████████░░░░░░░░░░░░██░]                  │ │             │
│             │  └─────────────────────────────────────────────┘ │             │
│             │                                                   │              │
│             │  ┌─────────────────────────────────────────────┐ │             │
│             │  │  📈  ACTIVITY                                │ │             │
│             │  │                                              │ │             │
│             │  │  ┌──────┐  ┌──────┐  ┌──────┐               │ │             │
│             │  │  │8,542 │  │6.2 km│  │ 342  │               │ │             │
│             │  │  │Steps │  │Dist. │  │ Cal. │               │ │             │
│             │  │  │85%   │  │      │  │ 17%  │               │ │             │
│             │  │  └──────┘  └──────┘  └──────┘               │ │             │
│             │  └─────────────────────────────────────────────┘ │             │
│             │                                                   │              │
│             │  ┌─────────────────────────────────────────────┐ │             │
│             │  │  💧  BLOOD OXYGEN (SpO₂)                    │ │             │
│             │  │                                              │ │             │
│             │  │  [Similar to HR with graph]                 │ │             │
│             │  └─────────────────────────────────────────────┘ │             │
└─────────────┴───────────────────────────────────────────────────┴──────────────┘
```

---

## 📱 Tablet Layout (768px-1279px)

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER                                            [≡]       │
└─────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────────────────────────────────────┐
│ USER LIST    │        MAIN CONTENT                          │
│ (320px)      │                                              │
│              │  [User Overview Card - Full Width]           │
│ 🔍 Search    │                                              │
│              │  ┌──────────────┬──────────────┐             │
│ [Filter Tabs]│  │ Heart Rate   │ Sleep        │             │
│              │  └──────────────┴──────────────┘             │
│ User Cards   │  ┌──────────────┬──────────────┐             │
│ [Stacked]    │  │ Activity     │ SpO₂         │             │
│              │  └──────────────┴──────────────┘             │
│              │                                              │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘

                              ┌──────────┐
                              │ Floating │
                              │    📅    │ ← Opens Date Modal
                              └──────────┘
```

---

## 📱 Mobile Layout (<768px)

```
┌─────────────────────────────┐
│  HEADER              [≡ 📅] │
└─────────────────────────────┘

┌─────────────────────────────┐
│    MAIN CONTENT             │
│    (Full Width)             │
│                             │
│  [User Overview Card]       │
│                             │
│  [HR Graph - Full Width]    │
│                             │
│  [Sleep Graph - Full Width] │
│                             │
│  [Activity Graph]           │
│                             │
│  [SpO₂ Graph]               │
│                             │
└─────────────────────────────┘

┌──────────┐
│    ≡     │ ← Opens User List Drawer
└──────────┘

When User List Opened (Drawer from left):
┌─────────┬───────────────────┐
│ USERS   │ [Overlay]         │
│         │                   │
│ Search  │  [Darkened]       │
│ Filters │                   │
│ List    │  [Tap to close]   │
│         │                   │
└─────────┴───────────────────┘
```

---

## 🎨 Component Visual Details

### StatusBadge Variations

```
Active:      [●] Active       Green bg, green dot
At-Risk:     [●] At-Risk      Amber bg, amber dot
Inactive:    [●] Inactive     Red bg, red dot
```

### UserCard States

**Unselected:**
```
┌────────────────────────────┐
│ ┌──┐                       │
│ │JD│ Jane Doe     [●] Act  │
│ └──┘ jane@noise.com        │
│      ████████████░░  82    │
│      🕐 2 days ago          │
└────────────────────────────┘
```

**Selected:**
```
┌────────────────────────────┐ ← Blue gradient bg
│ ┌──┐                       │
│ │JD│ Jane Doe     [●] Act  │ ← Bold text
│ └──┘ jane@noise.com        │
│      ████████████░░  82    │
│      🕐 2 days ago          │
└────────────────────────────┘
```

**Hovered:**
```
┌────────────────────────────┐ ← Shadow increases, -translate-y
│ ┌──┐                       │
│ │JD│ Jane Doe     [●] Act  │
│ └──┘ jane@noise.com        │
│      ████████████░░  82    │
│      🕐 2 days ago          │
└────────────────────────────┘
```

### MetricIndicator States

**Available:**
```
┌───┐
│ ❤ │  Red bg, red icon (HR)
└───┘
```

**Unavailable:**
```
┌───┐
│ ❤ │  Gray bg, gray icon (HR)
└───┘
```

### DateCard Visual

**Unselected:**
```
┌──────────────────────┐
│ Mar 28, 2026    85%  │
│ ●●●○                 │  HR, Sleep, Activity present; SpO₂ missing
└──────────────────────┘
```

**Selected:**
```
┌──────────────────────┐ ← Purple gradient bg
│ Mar 28, 2026    85%  │
│ ●●●○                 │
└──────────────────────┘
```

### GraphCard

```
┌─────────────────────────────────────────┐
│ ❤️  Heart Rate           Avg: 68  Days: 25│
│                                         │
│  100├─┐ ┌──┐  ┌──┐                     │
│   90│ └─┘  └──┘  └─┐                   │
│   80│              └────┐               │
│   70│                   └──┐            │
│   60├───────────────────────┴───────────│
│                                         │
│   Mar 1      Mar 15      Mar 30         │
└─────────────────────────────────────────┘
```

### Loading State (Skeleton)

```
┌─────────────────────────────┐
│ ░░░░░░░░░░░░░░              │  ← Pulsing gray bars
│                             │
│ ░░░░░░░░░░░░░░░░░░░░        │
│ ░░░░░░░░░░░░░░░░            │
│                             │
│ ░░░░░░░░░░░                 │
└─────────────────────────────┘
```

### Empty State

```
┌─────────────────────────────┐
│                             │
│        ┌─────┐              │
│        │  👥 │              │  ← Large icon
│        └─────┘              │
│                             │
│     No Users Found          │  ← Heading
│                             │
│   Try a different search    │  ← Description
│                             │
└─────────────────────────────┘
```

---

## 🎭 Interaction Flows

### Flow 1: User Selection
1. **User clicks on UserCard**
   - Card animates (scale 0.98 → 1.0)
   - Background changes to gradient
   - Border highlights
   - Main content area transitions (fade out → fade in)
   
2. **User Overview loads**
   - Skeleton appears first
   - Data populates section by section
   - Graphs animate from left (stagger: 50ms each)

3. **Date panel populates**
   - Date cards load
   - Most recent date highlighted by default

**Duration**: 300ms transition

### Flow 2: Date Selection
1. **User clicks DateCard**
   - Card background changes to purple gradient
   - Previous selection fades back to white
   
2. **Main content scrolls to top**
   - Smooth scroll behavior

3. **Detailed metrics load**
   - Collapse trend graphs (height → 0, opacity → 0)
   - Show detailed view (opacity: 0 → 1, translateY: 20 → 0)
   - Cards appear with stagger animation

**Duration**: 200ms per card

### Flow 3: Search and Filter
1. **User types in search box**
   - Debounced 300ms
   - User list filters in real-time
   - Matching users stay, others fade out
   
2. **User clicks filter tab**
   - Active tab slides indicator to new position
   - List filters with fade transition (200ms)
   - Count badges update

**Duration**: 200ms

### Flow 4: Mobile Drawer
1. **User taps hamburger menu**
   - Drawer slides in from left (transform: translateX)
   - Overlay fades in behind
   - Body scroll locked

2. **User taps overlay or close button**
   - Drawer slides out
   - Overlay fades out
   - Body scroll restored

**Duration**: 300ms ease-in-out

---

## 🔍 Focus States (Keyboard Navigation)

### Tab Order
1. Header navigation buttons
2. User search input
3. Filter tabs (left to right)
4. User cards (top to bottom)
5. Main content interactive elements
6. Date panel toggle button
7. Date cards (top to bottom)

### Focus Indicators
```css
focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
```

### Visual Example
```
┌────────────────────────────┐
│ ┌──┐                       │  ← Blue ring around card
│ │JD│ Jane Doe     [●] Act  │
│ └──┘ jane@noise.com        │
│      ████████████░░  82    │
│      🕐 2 days ago          │
└────────────────────────────┘
  ↑ 2px blue ring
```

---

## 💡 Visual Hierarchy

### Information Priority

**Level 1 (Immediate Recognition):**
- User names
- Status badges (color-coded)
- Engagement scores
- Selected states

**Level 2 (Quick Scan):**
- Email addresses
- Last active timestamps
- Graph trends (shape/direction)
- Date availability indicators

**Level 3 (Detailed Inspection):**
- Individual stat values
- Chart axis labels
- Fine-grained metrics in detailed view

### Size Hierarchy
```
User Name:        text-sm font-medium
Email:            text-xs text-gray-500
Heading (Card):   text-lg font-semibold
Heading (Page):   text-2xl font-bold
Stat Value:       text-3xl font-bold
Stat Label:       text-xs uppercase tracking-wide
```

### Color Intensity
```
Primary Info:     text-gray-900 (darkest)
Secondary Info:   text-gray-600
Tertiary Info:    text-gray-500
Muted Info:       text-gray-400 (lightest)
```

---

## 📊 Data Density Examples

### Low Density (Empty User)
```
┌────────────────────────────┐
│ ┌──┐                       │
│ │MD│ Mike Davis   [●] Inac │
│ └──┘ mike@noise.com        │
│      ███░░░░░░░░░░░  12    │
│      🕐 7 days ago          │
└────────────────────────────┘

Main Content:
- Large empty state graphic
- "No recent data" message
- Suggestion to check connection
```

### High Density (Active User)
```
┌────────────────────────────┐
│ ┌──┐                       │
│ │JD│ Jane Doe     [●] Act  │
│ └──┘ jane@noise.com        │
│      ████████████░░  95    │
│      🕐 Today               │
└────────────────────────────┘

Main Content:
- All 4 graphs populated
- 30 date cards in right panel
- Rich detailed metrics available
```

---

## 🎨 Animation Timing Reference

```typescript
const ANIMATION_TIMINGS = {
  // Transitions
  fast: '150ms',      // Hover effects, small state changes
  normal: '200ms',    // Button clicks, tab switches
  slow: '300ms',      // Panel expansions, page transitions
  
  // Delays
  stagger: '50ms',    // List items appearing
  tooltipDelay: '500ms',
  
  // Easing
  easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.6, 1)',
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
};
```

---

## 🔄 State Transitions Diagram

```
Initial Load
    ↓
[Loading State] ───────────→ [Error State]
    ↓ (success)                    ↓ (retry)
    ↓                              ↓
[Empty State] ←────────────────────┘
    ↓ (users exist)
    ↓
[User List Visible]
    ↓ (user selected)
    ↓
[User Overview + Trend Graphs]
    ↓ (date selected)
    ↓
[Detailed Metric View]
    ↓ (date deselected)
    ↓
[Back to User Overview]
    ↓ (different user selected)
    ↓
[New User Overview] (with transition animation)
```

---

## 🧪 Visual Testing Checklist

### Desktop
- [ ] Three-column layout renders correctly
- [ ] All panels scroll independently
- [ ] Graphs resize proportionally
- [ ] Cards maintain aspect ratio
- [ ] Hover states work on all interactive elements

### Tablet
- [ ] Date panel hidden, floating button visible
- [ ] Graphs in 2-column grid
- [ ] User list width adjusts appropriately
- [ ] Modal overlay works for date panel

### Mobile
- [ ] User list drawer slides correctly
- [ ] Graphs stack vertically (1 column)
- [ ] Touch interactions work (tap, swipe)
- [ ] Floating buttons positioned correctly
- [ ] Content doesn't overflow horizontally

### Accessibility
- [ ] High contrast mode compatible
- [ ] Focus indicators visible
- [ ] Screen reader announces state changes
- [ ] Keyboard navigation works end-to-end
- [ ] Color blind friendly (not color-only indicators)

### Performance
- [ ] List virtualization for 100+ users
- [ ] Smooth animations at 60fps
- [ ] No layout shift during loading
- [ ] Images/icons lazy load
- [ ] Debounced search (no lag)

---

## 📐 Precise Measurements

### Panel Widths
```css
--user-list-width: 280px
--date-panel-width: 280px
--date-panel-collapsed: 60px
--main-content: calc(100% - 280px - 280px - 48px) /* minus panels + gaps */
```

### Card Spacing
```css
--card-padding: 32px (p-8)
--card-gap: 24px (gap-6)
--section-gap: 40px (gap-10)
```

### Border Radius
```css
--radius-sm: 8px (rounded-lg)
--radius-md: 12px (rounded-xl)
--radius-lg: 16px (rounded-2xl)
```

### Typography Line Heights
```css
--heading-lh: 1.2
--body-lh: 1.5
--compact-lh: 1.4
```

### Icon Sizes
```css
--icon-xs: 12px
--icon-sm: 14px
--icon-md: 16px
--icon-lg: 18px
--icon-xl: 20px
--icon-2xl: 24px
```

---

## 🎯 Final Visual Checklist

Before marking the design complete, ensure:

✅ **Consistency:**
- [ ] All cards use glassmorphic design
- [ ] Borders are uniform (gray-100/50)
- [ ] Shadows match existing admin pages
- [ ] Text colors follow hierarchy

✅ **Interactivity:**
- [ ] All buttons have hover states
- [ ] Selection states are clear
- [ ] Loading states look polished
- [ ] Transitions are smooth

✅ **Responsiveness:**
- [ ] Mobile drawer functions correctly
- [ ] Tablet modal works
- [ ] Desktop three-column stable
- [ ] No horizontal scroll

✅ **Accessibility:**
- [ ] Keyboard navigation complete
- [ ] ARIA labels present
- [ ] Focus indicators visible
- [ ] Color contrast ratio ≥4.5:1

✅ **Performance:**
- [ ] No janky animations
- [ ] Fast initial load
- [ ] Smooth scrolling
- [ ] Efficient re-renders

✅ **Data Handling:**
- [ ] Empty states meaningful
- [ ] Error states actionable
- [ ] Loading states informative
- [ ] Success states celebratory
