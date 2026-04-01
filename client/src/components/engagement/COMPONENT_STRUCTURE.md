# Engagement Dashboard - Component File Structure

## 📁 Directory Structure

```
client/src/
├── components/
│   └── engagement/
│       ├── index.ts                          # Barrel exports
│       │
│       ├── layout/
│       │   └── EngagementLayout.tsx          # Main 3-column layout
│       │
│       ├── panels/
│       │   ├── UserListPanel.tsx             # Left sidebar - user list
│       │   ├── DateListPanel.tsx             # Right sidebar - date list
│       │   └── MainContentArea.tsx           # Center content wrapper
│       │
│       ├── user-list/
│       │   ├── UserCard.tsx                  # Individual user item
│       │   ├── SearchBar.tsx                 # Search input
│       │   ├── FilterTabs.tsx                # All/Active/At-Risk/Inactive tabs
│       │   └── UserListEmpty.tsx             # Empty state
│       │
│       ├── overview/
│       │   ├── UserOverviewCard.tsx          # User header + key metrics
│       │   ├── MetricCard.tsx                # Single metric display
│       │   └── DataAvailabilityCard.tsx      # HR/Sleep/Activity/SpO2 indicators
│       │
│       ├── graphs/
│       │   ├── MetricGraphsSection.tsx       # Container for all trend graphs
│       │   ├── GraphCard.tsx                 # Reusable graph wrapper
│       │   └── TrendChart.tsx                # Line chart component
│       │
│       ├── detailed/
│       │   ├── DetailedMetricView.tsx        # Container for date-specific details
│       │   ├── HRDetailCard.tsx              # Heart rate details
│       │   ├── SleepDetailCard.tsx           # Sleep details
│       │   ├── ActivityDetailCard.tsx        # Activity details
│       │   ├── SpO2DetailCard.tsx            # SpO2 details
│       │   └── StatBadge.tsx                 # Avg/Min/Max badge
│       │
│       ├── date-list/
│       │   ├── DateCard.tsx                  # Individual date item
│       │   ├── DatePanelToggle.tsx           # Expand/collapse button
│       │   └── MetricIndicator.tsx           # Data availability dot
│       │
│       ├── shared/
│       │   ├── StatusBadge.tsx               # Active/At-Risk/Inactive badge
│       │   ├── LoadingSpinner.tsx            # Loading state
│       │   ├── ErrorAlert.tsx                # Error display
│       │   ├── EmptyState.tsx                # Generic empty state
│       │   └── ProgressBar.tsx               # Animated progress bar
│       │
│       ├── utils/
│       │   ├── dateFormatter.ts              # Date utility functions
│       │   ├── scoreHelpers.ts               # Score color/status helpers
│       │   └── constants.ts                  # Status configs, colors
│       │
│       └── types/
│           └── engagement.types.ts           # TypeScript interfaces
│
├── pages/
│   └── UserEngagementDashboardPage.tsx       # Main page component
│
└── services/
    └── engagementApi.ts                      # API client methods
```

---

## 🔄 Data Flow

```
UserEngagementDashboardPage (State Container)
    ↓
    ├─→ Fetch Users List (API)
    ├─→ Fetch Selected User Details (API)
    └─→ Fetch Date-Specific Metrics (API)
    ↓
EngagementLayout
    ↓
    ├─→ UserListPanel          (receives: users[], selectedUserId, onSelectUser)
    │   ├─→ SearchBar          (receives: value, onChange)
    │   ├─→ FilterTabs         (receives: activeFilter, onFilterChange)
    │   └─→ UserCard[]         (receives: user, isSelected, onClick)
    │       └─→ StatusBadge    (receives: status)
    │
    ├─→ MainContentArea        (receives: selectedUser, selectedDate)
    │   ├─→ UserOverviewCard   (if selectedUser && !selectedDate)
    │   │   ├─→ MetricCard[]
    │   │   └─→ DataAvailabilityCard[]
    │   │
    │   ├─→ MetricGraphsSection (if selectedUser && !selectedDate)
    │   │   └─→ GraphCard[]
    │   │       └─→ TrendChart
    │   │
    │   └─→ DetailedMetricView (if selectedUser && selectedDate)
    │       ├─→ HRDetailCard
    │       ├─→ SleepDetailCard
    │       ├─→ ActivityDetailCard
    │       └─→ SpO2DetailCard
    │
    └─→ DateListPanel          (receives: dates[], selectedDate, onSelectDate)
        ├─→ DatePanelToggle    (receives: isExpanded, onToggle)
        └─→ DateCard[]         (receives: date, metrics, isSelected, onClick)
            └─→ MetricIndicator[]
```

---

## 📝 TypeScript Interfaces

**File**: `client/src/components/engagement/types/engagement.types.ts`

```typescript
export type UserStatus = 'active' | 'at-risk' | 'inactive';

export interface User {
  _id: string;
  name: string;
  email: string;
  status: UserStatus;
  engagementScore: number;
  lastActiveDate: string;
  totalDaysActive: number;
}

export interface UserStats {
  hrDays: number;
  sleepDays: number;
  activityDays: number;
  spo2Days: number;
}

export interface UserDetail extends User {
  stats: UserStats;
  createdAt: string;
}

export interface DateMetrics {
  date: string;
  engagementScore: number;
  metrics: {
    hr: boolean;
    sleep: boolean;
    activity: boolean;
    spo2: boolean;
  };
}

export interface HRData {
  avg: number;
  min: number;
  max: number;
  count: number;
  wearTime: number;
  timeline: Array<{
    time: string;
    hr: number;
  }>;
}

export interface SleepData {
  score: number;
  duration: number;
  startTime: string;
  endTime: string;
  deep: number;
  light: number;
  rem: number;
  awake: number;
}

export interface ActivityData {
  steps: number;
  distance: number;
  calories: number;
}

export interface SpO2Data {
  avg: number;
  min: number;
  max: number;
  count: number;
  timeline: Array<{
    time: string;
    spo2: number;
  }>;
}

export interface TrendData {
  date: string;
  value: number;
  count?: number;
}

export type FilterType = 'all' | 'active' | 'at-risk' | 'inactive';

export type MetricColor = 'red' | 'blue' | 'green' | 'indigo' | 'purple' | 'amber';
```

---

## 🎨 Constants File

**File**: `client/src/components/engagement/utils/constants.ts`

```typescript
import { Activity, Moon, TrendingUp, Droplet } from 'lucide-react';
import type { UserStatus, MetricColor } from '../types/engagement.types';

export const STATUS_CONFIG = {
  active: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    icon: 'bg-green-500',
    label: 'Active',
    description: 'Regularly using device'
  },
  'at-risk': {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    icon: 'bg-amber-500',
    label: 'At-Risk',
    description: 'Declining usage detected'
  },
  inactive: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    icon: 'bg-red-500',
    label: 'Inactive',
    description: 'No recent activity'
  }
} as const;

export const METRIC_CONFIG = {
  hr: {
    label: 'Heart Rate',
    icon: Activity,
    color: 'red' as MetricColor,
    unit: 'BPM'
  },
  sleep: {
    label: 'Sleep',
    icon: Moon,
    color: 'indigo' as MetricColor,
    unit: 'score'
  },
  activity: {
    label: 'Activity',
    icon: TrendingUp,
    color: 'green' as MetricColor,
    unit: 'steps'
  },
  spo2: {
    label: 'SpO₂',
    icon: Droplet,
    color: 'blue' as MetricColor,
    unit: '%'
  }
} as const;

export const CHART_COLORS = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#10b981',
  indigo: '#6366f1',
  purple: '#8b5cf6',
  amber: '#f59e0b'
} as const;

export const ENGAGEMENT_THRESHOLDS = {
  active: 70,
  atRisk: 40,
  inactive: 0
} as const;

export const FILTER_TABS = [
  { value: 'all' as const, label: 'All' },
  { value: 'active' as const, label: 'Active' },
  { value: 'at-risk' as const, label: 'At-Risk' },
  { value: 'inactive' as const, label: 'Inactive' }
] as const;
```

---

## 🔧 Utility Functions

**File**: `client/src/components/engagement/utils/dateFormatter.ts`

```typescript
export const formatLastActive = (date: string): string => {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  
  return target.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: target.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

export const formatDateShort = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatDateReadable = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

export const formatDateFull = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

export const formatTime = (time: string): string => {
  const d = new Date(time);
  return d.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};
```

**File**: `client/src/components/engagement/utils/scoreHelpers.ts`

```typescript
import type { UserStatus, MetricColor } from '../types/engagement.types';
import { ENGAGEMENT_THRESHOLDS } from './constants';

export const getEngagementScoreColor = (score: number): MetricColor => {
  if (score >= ENGAGEMENT_THRESHOLDS.active) return 'green';
  if (score >= ENGAGEMENT_THRESHOLDS.atRisk) return 'amber';
  return 'red';
};

export const getScoreColorClass = (score: number): string => {
  const color = getEngagementScoreColor(score);
  return `bg-${color}-500`;
};

export const getScoreTextClass = (score: number): string => {
  const color = getEngagementScoreColor(score);
  return `text-${color}-600`;
};

export const getUserStatus = (
  engagementScore: number, 
  lastActiveDate: string
): UserStatus => {
  const daysSinceActive = Math.floor(
    (Date.now() - new Date(lastActiveDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Inactive if no activity in 7 days OR score is critically low
  if (daysSinceActive > 7 || engagementScore < ENGAGEMENT_THRESHOLDS.atRisk) {
    return 'inactive';
  }
  
  // At-risk if score is moderate
  if (engagementScore < ENGAGEMENT_THRESHOLDS.active) {
    return 'at-risk';
  }
  
  return 'active';
};

export const getStatusPriority = (status: UserStatus): number => {
  const priorities: Record<UserStatus, number> = {
    'inactive': 1,
    'at-risk': 2,
    'active': 3
  };
  return priorities[status];
};

export const calculateEngagementScore = (stats: {
  hrDays: number;
  sleepDays: number;
  activityDays: number;
  spo2Days: number;
}): number => {
  const maxDays = 30;
  const weights = {
    hr: 0.3,
    sleep: 0.3,
    activity: 0.2,
    spo2: 0.2
  };
  
  const score = (
    (stats.hrDays / maxDays) * weights.hr +
    (stats.sleepDays / maxDays) * weights.sleep +
    (stats.activityDays / maxDays) * weights.activity +
    (stats.spo2Days / maxDays) * weights.spo2
  ) * 100;
  
  return Math.round(Math.min(score, 100));
};
```

---

## 🎯 Component Implementation Priority

### High Priority (Core Functionality)
1. **EngagementLayout** - Foundation for entire page
2. **UserListPanel** - Primary navigation
3. **UserCard** - Most frequently viewed component
4. **StatusBadge** - Critical visual indicator
5. **UserOverviewCard** - Main content when user selected

### Medium Priority (Enhanced Experience)
6. **GraphCard & TrendChart** - Data visualization
7. **MetricGraphsSection** - Trend overview
8. **DateListPanel** - Secondary navigation
9. **DateCard** - Date selection
10. **SearchBar & FilterTabs** - User discovery

### Lower Priority (Deep Dive Features)
11. **DetailedMetricView** - Date-specific details
12. **HRDetailCard** - Detailed heart rate view
13. **SleepDetailCard** - Detailed sleep view
14. **ActivityDetailCard** - Detailed activity view
15. **SpO2DetailCard** - Detailed SpO2 view

### Polish (User Experience)
16. **LoadingSpinner** - Loading states
17. **ErrorAlert** - Error handling
18. **EmptyState** - No data scenarios
19. **ProgressBar** - Visual feedback
20. **Animations** - Transitions and micro-interactions

---

## 🔌 API Integration Points

**File**: `client/src/services/engagementApi.ts`

```typescript
import apiClient from './api';
import type { User, UserDetail, DateMetrics, HRData, SleepData, ActivityData, SpO2Data } from '../components/engagement/types/engagement.types';

export const engagementApi = {
  // Get all users with engagement summary
  getAllUsers: async (): Promise<User[]> => {
    const res = await apiClient.get('/engagement/users');
    return res.data.data;
  },

  // Get detailed info for specific user
  getUserDetails: async (userId: string): Promise<UserDetail> => {
    const res = await apiClient.get(`/engagement/users/${userId}`);
    return res.data.data;
  },

  // Get date list for user
  getUserDates: async (userId: string, days: number = 30): Promise<DateMetrics[]> => {
    const res = await apiClient.get(`/engagement/users/${userId}/dates?days=${days}`);
    return res.data.data;
  },

  // Get metrics for specific date
  getDateMetrics: async (userId: string, date: string) => {
    const res = await apiClient.get(`/engagement/users/${userId}/metrics?date=${date}`);
    return res.data.data;
  },

  // Get HR data for date
  getHRData: async (userId: string, date: string): Promise<HRData> => {
    const res = await apiClient.get(`/engagement/users/${userId}/metrics/hr?date=${date}`);
    return res.data.data;
  },

  // Get Sleep data for date
  getSleepData: async (userId: string, date: string): Promise<SleepData> => {
    const res = await apiClient.get(`/engagement/users/${userId}/metrics/sleep?date=${date}`);
    return res.data.data;
  },

  // Get Activity data for date
  getActivityData: async (userId: string, date: string): Promise<ActivityData> => {
    const res = await apiClient.get(`/engagement/users/${userId}/metrics/activity?date=${date}`);
    return res.data.data;
  },

  // Get SpO2 data for date
  getSpO2Data: async (userId: string, date: string): Promise<SpO2Data> => {
    const res = await apiClient.get(`/engagement/users/${userId}/metrics/spo2?date=${date}`);
    return res.data.data;
  },

  // Get trend data for user
  getTrendData: async (userId: string, metric: 'hr' | 'sleep' | 'activity' | 'spo2', days: number = 30) => {
    const res = await apiClient.get(`/engagement/users/${userId}/trends/${metric}?days=${days}`);
    return res.data.data;
  }
};
```

---

## 📦 Barrel Exports

**File**: `client/src/components/engagement/index.ts`

```typescript
// Layout
export { default as EngagementLayout } from './layout/EngagementLayout';

// Panels
export { default as UserListPanel } from './panels/UserListPanel';
export { default as DateListPanel } from './panels/DateListPanel';
export { default as MainContentArea } from './panels/MainContentArea';

// User List
export { default as UserCard } from './user-list/UserCard';
export { default as SearchBar } from './user-list/SearchBar';
export { default as FilterTabs } from './user-list/FilterTabs';

// Overview
export { default as UserOverviewCard } from './overview/UserOverviewCard';
export { default as MetricCard } from './overview/MetricCard';

// Graphs
export { default as MetricGraphsSection } from './graphs/MetricGraphsSection';
export { default as GraphCard } from './graphs/GraphCard';

// Detailed
export { default as DetailedMetricView } from './detailed/DetailedMetricView';
export { default as HRDetailCard } from './detailed/HRDetailCard';
export { default as SleepDetailCard } from './detailed/SleepDetailCard';
export { default as ActivityDetailCard } from './detailed/ActivityDetailCard';
export { default as SpO2DetailCard } from './detailed/SpO2DetailCard';

// Date List
export { default as DateCard } from './date-list/DateCard';
export { default as MetricIndicator } from './date-list/MetricIndicator';

// Shared
export { default as StatusBadge } from './shared/StatusBadge';
export { default as LoadingSpinner } from './shared/LoadingSpinner';
export { default as ErrorAlert } from './shared/ErrorAlert';
export { default as EmptyState } from './shared/EmptyState';

// Types
export * from './types/engagement.types';

// Utils
export * from './utils/dateFormatter';
export * from './utils/scoreHelpers';
export * from './utils/constants';
```

---

## 🧪 Testing Strategy

### Unit Tests
- `StatusBadge.test.tsx` - Badge rendering for all statuses
- `UserCard.test.tsx` - User card interactions
- `scoreHelpers.test.ts` - Score calculation logic
- `dateFormatter.test.ts` - Date formatting edge cases

### Integration Tests
- `UserListPanel.test.tsx` - Search and filter functionality
- `GraphCard.test.tsx` - Chart data rendering
- `DetailedMetricView.test.tsx` - Multi-component interaction

### E2E Tests
- User selection flow
- Date selection and detail view
- Search and filter combinations
- Responsive layout transitions

---

## 📊 Performance Considerations

### Code Splitting
```typescript
// Lazy load detailed views
const DetailedMetricView = lazy(() => 
  import('./components/engagement/detailed/DetailedMetricView')
);

// Lazy load charts
const TrendChart = lazy(() => 
  import('./components/engagement/graphs/TrendChart')
);
```

### Memoization Strategy
- Memo all list items (`UserCard`, `DateCard`)
- Memo computed values (filtered users, sorted dates)
- Use `useMemo` for expensive calculations (engagement scores, trend data)
- Use `useCallback` for event handlers passed to children

### Data Fetching
- Fetch user list on mount (cache for session)
- Fetch user details on selection (cache per user)
- Fetch date metrics on demand (cache per user-date pair)
- Implement debounced search (300ms)
- Use stale-while-revalidate pattern for non-critical data

---

## 🎨 Styling Conventions

### Class Name Patterns
```typescript
// Container classes
const containerClass = "bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50";

// Interactive element
const buttonClass = "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md";

// Status indicator
const statusClass = `${STATUS_CONFIG[status].bg} ${STATUS_CONFIG[status].text}`;

// Responsive visibility
const responsiveClass = "hidden xl:flex lg:grid-cols-2 sm:text-sm";
```

### CSS-in-JS (Optional)
For dynamic color values that can't be Tailwind classes:
```typescript
import { CHART_COLORS } from './utils/constants';

<div style={{ borderColor: CHART_COLORS[color] }}>
```

---

## 🚀 Quick Start Implementation

1. **Create directory structure**:
```bash
mkdir -p client/src/components/engagement/{layout,panels,user-list,overview,graphs,detailed,date-list,shared,utils,types}
```

2. **Copy type definitions** from ENGAGEMENT_UI_SPEC.md → `types/engagement.types.ts`

3. **Copy utility functions** from ENGAGEMENT_UI_SPEC.md → `utils/`

4. **Start with core components**:
   - EngagementLayout (layout shell)
   - StatusBadge (reusable)
   - UserCard (core UI element)

5. **Build incrementally**:
   - Add one panel at a time
   - Test each component in isolation
   - Connect to API as needed

6. **Add polish**:
   - Loading states
   - Animations
   - Accessibility features
