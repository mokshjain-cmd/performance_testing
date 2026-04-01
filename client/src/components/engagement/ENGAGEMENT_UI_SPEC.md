# User Engagement Monitoring Dashboard - UI/UX Specification

## 🎨 Design System Compliance

### Color Palette
```css
/* Primary Colors */
--status-active: #10b981 (green-500)      /* Active users */
--status-warning: #f59e0b (amber-500)     /* At-risk users */
--status-inactive: #ef4444 (red-500)      /* Inactive users */
--status-critical: #dc2626 (red-600)      /* Critical status */

/* Accent Colors */
--primary: #3b82f6 (blue-500)             /* Interactive elements */
--secondary: #8b5cf6 (purple-500)         /* Admin features */
--info: #06b6d4 (cyan-500)                /* Information */

/* Neutral Colors */
--text-primary: #1f2937 (gray-800)
--text-secondary: #6b7280 (gray-500)
--text-muted: #9ca3af (gray-400)
--border: rgba(229,231,235,0.5) (gray-200/50)
--background: rgba(255,255,255,0.8) (white/80)
```

### Typography Scale
```css
/* Headings */
--h1: text-2xl font-bold tracking-tight
--h2: text-xl font-semibold
--h3: text-lg font-medium
--h4: text-sm font-medium uppercase tracking-wide

/* Body */
--body-lg: text-base font-normal
--body-md: text-sm font-normal
--body-sm: text-xs font-normal

/* Labels */
--label: text-xs font-medium uppercase tracking-wide text-gray-500
--badge: text-xs font-semibold
```

### Spacing System
- **Card Padding**: p-6 to p-8 (24px-32px)
- **Gap Between Elements**: gap-4 (16px) standard, gap-6 (24px) sections
- **Margins**: m-4 for container spacing
- **Icon Gaps**: gap-2 (8px) for icon+text combinations

### Shadow System
```css
--shadow-sm: shadow-[0_4px_16px_rgba(0,0,0,0.04)]
--shadow-md: shadow-[0_8px_32px_rgba(0,0,0,0.06)]
--shadow-lg: shadow-[0_12px_48px_rgba(0,0,0,0.08)]
```

---

## 📐 Layout Architecture

### Overall Structure
```
┌─────────────────────────────────────────────────────┐
│                    HEADER (h-14)                     │
├────────┬──────────────────────────────┬─────────────┤
│  USER  │       MAIN CONTENT           │    DATE     │
│  LIST  │                              │   PANEL     │
│ (280px)│   - User Overview Card       │   (280px)   │
│        │   - Metric Graphs            │  (collaps.) │
│        │   - Detailed View (optional) │             │
│ scroll │                              │   scroll    │
└────────┴──────────────────────────────┴─────────────┘
```

### Responsive Breakpoints
- **Desktop (≥1280px)**: Three-column layout (User List + Main + Date Panel)
- **Tablet (768px-1279px)**: Two-column (User List + Main), Date Panel becomes modal
- **Mobile (<768px)**: Single column, User List becomes drawer, Date Panel becomes modal

---

## 🧩 Component Hierarchy

```
UserEngagementDashboardPage/
├── Header (Global Navigation)
│   └── "Performance Testing" Button (new)
│
├── EngagementLayout
│   ├── UserListPanel/
│   │   ├── SearchBar
│   │   ├── FilterTabs (All | Active | At-Risk | Inactive)
│   │   ├── UserCard[] (repeating)
│   │   │   ├── UserAvatar
│   │   │   ├── UserName
│   │   │   ├── StatusBadge
│   │   │   ├── EngagementScore
│   │   │   └── LastActiveDate
│   │   └── EmptyState
│   │
│   ├── MainContentArea/
│   │   ├── UserOverviewCard/
│   │   │   ├── UserHeader (Name, Email, Avatar)
│   │   │   ├── KeyMetrics (Days Active, Engagement Score, Last Active)
│   │   │   └── QuickStats (Total HR, Sleep, Activity, SpO2 readings)
│   │   │
│   │   ├── MetricGraphsSection/
│   │   │   ├── GraphCard (HR Trend)
│   │   │   ├── GraphCard (Sleep Trend)
│   │   │   ├── GraphCard (Activity Trend)
│   │   │   └── GraphCard (SpO2 Trend)
│   │   │
│   │   └── DetailedMetricView (when date selected)/
│   │       ├── HRDetailCard
│   │       ├── SleepDetailCard
│   │       ├── ActivityDetailCard
│   │       └── SpO2DetailCard
│   │
│   └── DateListPanel/ (expandable)
│       ├── ToggleButton
│       ├── DateCard[] (repeating)
│       │   ├── Date
│       │   ├── DataAvailabilityIndicators (HR, Sleep, Activity, SpO2)
│       │   └── EngagementScore (for that day)
│       └── EmptyState
│
├── LoadingState
├── ErrorState
└── EmptyState
```

---

## 🎯 Component Specifications

### 1. Header Enhancement

**Location**: `client/src/components/common/Header.tsx`

**New Button (Admin Only)**:
```tsx
{isAdmin && (
  <button
    className="px-3 py-1.5 rounded-lg text-sm font-medium text-green-700 hover:bg-green-50 hover:text-green-900 transition-all duration-200 flex items-center gap-1.5 border border-green-200"
    onClick={() => onNavigate('admin/engagement')}
    title="User Engagement Monitoring"
  >
    <TrendingUp size={16} />
    <span className="hidden sm:inline">Performance Testing</span>
  </button>
)}
```

**Visual Position**: After "Firmware" button, before Logout

---

### 2. EngagementLayout Component

**File**: `client/src/components/engagement/EngagementLayout.tsx`

**Classes**:
```tsx
<div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
  <Header {...headerProps} />
  
  <div className="flex flex-1 overflow-hidden">
    {/* User List Panel - LEFT */}
    <div className="w-[280px] m-4 p-6 flex flex-col overflow-y-auto bg-white/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 rounded-2xl transition-all duration-300">
      {userListPanel}
    </div>

    {/* Main Content - CENTER */}
    <div className="flex-1 m-4 p-8 overflow-y-auto bg-white/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50">
      {mainContent}
    </div>

    {/* Date Panel - RIGHT (Expandable) */}
    <div className={`
      ${isDatePanelExpanded ? 'w-[280px]' : 'w-[60px]'} 
      m-4 p-6 flex flex-col overflow-y-auto 
      bg-white/80 backdrop-blur-xl 
      shadow-[0_8px_32px_rgba(0,0,0,0.06)] 
      border border-gray-100/50 rounded-2xl 
      transition-all duration-300
    `}>
      {datePanel}
    </div>
  </div>
</div>
```

**Responsive**:
```tsx
// Tablet: Hide date panel, show as modal
className="hidden xl:flex" // for date panel

// Mobile: User list as drawer
className="fixed inset-y-0 left-0 z-40 transform transition-transform duration-300
  ${isUserListOpen ? 'translate-x-0' : '-translate-x-full'} 
  lg:relative lg:translate-x-0"
```

---

### 3. UserListPanel Component

**File**: `client/src/components/engagement/UserListPanel.tsx`

#### Search Bar
```tsx
<div className="mb-4">
  <div className="relative">
    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    <input
      type="text"
      placeholder="Search users..."
      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  </div>
</div>
```

#### Filter Tabs
```tsx
<div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg">
  {[
    { label: 'All', value: 'all', count: allCount },
    { label: 'Active', value: 'active', count: activeCount },
    { label: 'At-Risk', value: 'at-risk', count: atRiskCount },
    { label: 'Inactive', value: 'inactive', count: inactiveCount },
  ].map(tab => (
    <button
      key={tab.value}
      onClick={() => setFilter(tab.value)}
      className={`
        flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200
        ${filter === tab.value 
          ? 'bg-white text-gray-900 shadow-sm' 
          : 'text-gray-600 hover:bg-white/50'
        }
      `}
    >
      {tab.label}
      <span className="ml-1 text-gray-400">({tab.count})</span>
    </button>
  ))}
</div>
```

#### UserCard Component
```tsx
<button
  onClick={() => onSelectUser(user._id)}
  className={`
    w-full text-left p-4 rounded-xl transition-all duration-200 border
    ${isSelected 
      ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 shadow-md' 
      : 'bg-white hover:bg-gray-50 border-gray-100 hover:border-gray-200 hover:shadow-sm'
    }
  `}
>
  <div className="flex items-start gap-3">
    {/* Avatar */}
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0">
      {user.name.charAt(0).toUpperCase()}
    </div>

    <div className="flex-1 min-w-0">
      {/* Name */}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium text-sm text-gray-900 truncate">
          {user.name}
        </span>
        <StatusBadge status={user.status} />
      </div>

      {/* Email */}
      <div className="text-xs text-gray-500 truncate mb-2">
        {user.email}
      </div>

      {/* Engagement Score */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${getScoreColor(user.engagementScore)}`}
            style={{ width: `${user.engagementScore}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-700">
          {user.engagementScore}
        </span>
      </div>

      {/* Last Active */}
      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
        <Clock size={12} />
        <span>{formatLastActive(user.lastActiveDate)}</span>
      </div>
    </div>
  </div>
</button>
```

#### StatusBadge Component
```tsx
const STATUS_STYLES = {
  active: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    icon: 'bg-green-500',
    label: 'Active'
  },
  'at-risk': {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    icon: 'bg-amber-500',
    label: 'At-Risk'
  },
  inactive: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    icon: 'bg-red-500',
    label: 'Inactive'
  }
};

<span className={`
  inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
  ${STATUS_STYLES[status].bg} ${STATUS_STYLES[status].text}
`}>
  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLES[status].icon}`}></span>
  {STATUS_STYLES[status].label}
</span>
```

#### Empty State
```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
    <Users size={32} className="text-gray-400" />
  </div>
  <h3 className="text-sm font-medium text-gray-900 mb-1">No users found</h3>
  <p className="text-xs text-gray-500">
    {searchQuery ? 'Try a different search term' : 'No users match the selected filter'}
  </p>
</div>
```

---

### 4. UserOverviewCard Component

**File**: `client/src/components/engagement/UserOverviewCard.tsx`

```tsx
<div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-8 mb-6">
  {/* Header Section */}
  <div className="flex items-start justify-between mb-6">
    <div className="flex items-center gap-4">
      {/* Large Avatar */}
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
        {user.name.charAt(0).toUpperCase()}
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{user.name}</h2>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>
    </div>

    {/* Status Badge (Large) */}
    <div className={`
      px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2
      ${STATUS_STYLES[user.status].bg} ${STATUS_STYLES[user.status].text}
    `}>
      <span className={`w-2 h-2 rounded-full ${STATUS_STYLES[user.status].icon}`}></span>
      {STATUS_STYLES[user.status].label}
    </div>
  </div>

  {/* Key Metrics Grid */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <MetricCard
      label="Days Active"
      value={user.totalDaysActive}
      icon={<Calendar size={20} />}
      color="blue"
    />
    <MetricCard
      label="Engagement Score"
      value={user.engagementScore}
      suffix="%"
      icon={<TrendingUp size={20} />}
      color={getEngagementScoreColor(user.engagementScore)}
    />
    <MetricCard
      label="Last Active"
      value={formatDate(user.lastActiveDate)}
      icon={<Clock size={20} />}
      color="gray"
    />
  </div>

  {/* Quick Stats - Data Availability */}
  <div className="mt-6 pt-6 border-t border-gray-200">
    <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-4">
      Data Availability (30 days)
    </h3>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <DataAvailabilityCard
        label="Heart Rate"
        icon={<Activity size={16} />}
        count={user.stats.hrDays}
        total={30}
        color="red"
      />
      <DataAvailabilityCard
        label="Sleep"
        icon={<Moon size={16} />}
        count={user.stats.sleepDays}
        total={30}
        color="indigo"
      />
      <DataAvailabilityCard
        label="Activity"
        icon={<TrendingUp size={16} />}
        count={user.stats.activityDays}
        total={30}
        color="green"
      />
      <DataAvailabilityCard
        label="SpO₂"
        icon={<Droplet size={16} />}
        count={user.stats.spo2Days}
        total={30}
        color="blue"
      />
    </div>
  </div>
</div>
```

#### MetricCard SubComponent
```tsx
<div className={`
  bg-gradient-to-br from-${color}-50 to-white 
  p-5 rounded-xl border border-${color}-100 
  shadow-sm transition-all duration-300 
  hover:shadow-md hover:-translate-y-1
`}>
  <div className="flex items-center justify-between mb-2">
    <span className="text-xs uppercase tracking-wide text-gray-600 font-medium">
      {label}
    </span>
    <div className={`text-${color}-500`}>
      {icon}
    </div>
  </div>
  <div className="text-3xl font-bold text-gray-900">
    {value}{suffix}
  </div>
</div>
```

#### DataAvailabilityCard SubComponent
```tsx
<div className="flex items-center gap-3">
  <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center text-${color}-600`}>
    {icon}
  </div>
  <div>
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-sm font-bold text-gray-900">
      {count}/{total} days
    </div>
  </div>
</div>
```

---

### 5. MetricGraphsSection Component

**File**: `client/src/components/engagement/MetricGraphsSection.tsx`

```tsx
<div className="space-y-6">
  <h3 className="text-xl font-semibold text-gray-900">Trend Analysis (Last 30 Days)</h3>
  
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* HR Trend */}
    <GraphCard
      title="Heart Rate"
      icon={<Activity size={18} className="text-red-500" />}
      color="red"
      data={hrTrendData}
      yAxisLabel="Days with Data"
    />

    {/* Sleep Trend */}
    <GraphCard
      title="Sleep"
      icon={<Moon size={18} className="text-indigo-500" />}
      color="indigo"
      data={sleepTrendData}
      yAxisLabel="Sleep Score"
    />

    {/* Activity Trend */}
    <GraphCard
      title="Activity"
      icon={<TrendingUp size={18} className="text-green-500" />}
      color="green"
      data={activityTrendData}
      yAxisLabel="Steps"
    />

    {/* SpO2 Trend */}
    <GraphCard
      title="SpO₂"
      icon={<Droplet size={18} className="text-blue-500" />}
      color="blue"
      data={spo2TrendData}
      yAxisLabel="Avg SpO₂ %"
    />
  </div>
</div>
```

#### GraphCard Component
```tsx
<div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-6 transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.08)]">
  {/* Header */}
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      {icon}
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
    </div>
    
    {/* Stats Summary */}
    <div className="flex items-center gap-3 text-xs">
      <span className="text-gray-500">
        Avg: <span className="font-semibold text-gray-900">{avgValue}</span>
      </span>
      <span className="text-gray-500">
        Days: <span className="font-semibold text-gray-900">{daysWithData}</span>
      </span>
    </div>
  </div>

  {/* Chart */}
  <div className="h-48">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          stroke="#9ca3af"
          style={{ fontSize: '11px' }}
        />
        <YAxis 
          stroke="#9ca3af"
          style={{ fontSize: '11px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
          }}
        />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={COLORS[color]}
          strokeWidth={2}
          dot={{ fill: COLORS[color], r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>

  {/* No Data State */}
  {data.length === 0 && (
    <div className="h-48 flex items-center justify-center text-gray-400">
      <div className="text-center">
        <BarChart size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No data available</p>
      </div>
    </div>
  )}
</div>
```

**Chart Colors**:
```tsx
const COLORS = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#10b981',
  indigo: '#6366f1',
  purple: '#8b5cf6',
  amber: '#f59e0b'
};
```

---

### 6. DateListPanel Component

**File**: `client/src/components/engagement/DateListPanel.tsx`

#### Toggle Button (when collapsed)
```tsx
<button
  onClick={() => setIsExpanded(!isExpanded)}
  className="w-full p-3 rounded-lg hover:bg-gray-100 transition-all duration-200 flex items-center justify-center"
  title={isExpanded ? 'Collapse' : 'Expand Date List'}
>
  {isExpanded ? (
    <ChevronRight size={20} className="text-gray-600" />
  ) : (
    <ChevronLeft size={20} className="text-gray-600" />
  )}
</button>
```

#### Expanded View
```tsx
<div className="flex flex-col h-full">
  {/* Header */}
  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
    <div className="flex items-center gap-2">
      <Calendar size={18} className="text-gray-600" />
      <h3 className="text-sm font-semibold text-gray-900">Activity Dates</h3>
    </div>
    <button
      onClick={() => setIsExpanded(false)}
      className="p-1 rounded-lg hover:bg-gray-100 transition-all"
    >
      <X size={16} className="text-gray-500" />
    </button>
  </div>

  {/* Date List */}
  <div className="space-y-2 overflow-y-auto flex-1">
    {dates.map(dateItem => (
      <DateCard
        key={dateItem.date}
        date={dateItem.date}
        metrics={dateItem.metrics}
        engagementScore={dateItem.engagementScore}
        isSelected={selectedDate === dateItem.date}
        onClick={() => onDateSelect(dateItem.date)}
      />
    ))}
  </div>
</div>
```

#### DateCard Component
```tsx
<button
  onClick={onClick}
  className={`
    w-full text-left p-4 rounded-xl transition-all duration-200 border
    ${isSelected
      ? 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 shadow-md'
      : 'bg-white hover:bg-gray-50 border-gray-100 hover:border-gray-200 hover:shadow-sm'
    }
  `}
>
  {/* Date Header */}
  <div className="flex items-center justify-between mb-3">
    <div className="text-sm font-semibold text-gray-900">
      {formatDateReadable(date)}
    </div>
    <div className="text-xs font-medium text-gray-500">
      {engagementScore}%
    </div>
  </div>

  {/* Metric Indicators */}
  <div className="flex gap-2">
    <MetricIndicator
      icon={<Activity size={14} />}
      available={metrics.hr}
      color="red"
      label="HR"
    />
    <MetricIndicator
      icon={<Moon size={14} />}
      available={metrics.sleep}
      color="indigo"
      label="Sleep"
    />
    <MetricIndicator
      icon={<TrendingUp size={14} />}
      available={metrics.activity}
      color="green"
      label="Activity"
    />
    <MetricIndicator
      icon={<Droplet size={14} />}
      available={metrics.spo2}
      color="blue"
      label="SpO₂"
    />
  </div>
</button>
```

#### MetricIndicator SubComponent
```tsx
<div
  className={`
    flex items-center justify-center w-8 h-8 rounded-lg transition-all
    ${available 
      ? `bg-${color}-100 text-${color}-600` 
      : 'bg-gray-100 text-gray-300'
    }
  `}
  title={`${label}: ${available ? 'Available' : 'No data'}`}
>
  {icon}
</div>
```

---

### 7. DetailedMetricView Component

**File**: `client/src/components/engagement/DetailedMetricView.tsx`

**Shown when a date is selected from DateListPanel**

```tsx
<div className="space-y-6 mt-8">
  <div className="flex items-center justify-between">
    <h3 className="text-xl font-semibold text-gray-900">
      Detailed Metrics for {formatDateFull(selectedDate)}
    </h3>
    <button
      onClick={() => setSelectedDate(null)}
      className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
    >
      <X size={16} className="inline mr-1" />
      Close
    </button>
  </div>

  {/* HR Detail */}
  <HRDetailCard data={hrData} />

  {/* Sleep Detail */}
  <SleepDetailCard data={sleepData} />

  {/* Activity Detail */}
  <ActivityDetailCard data={activityData} />

  {/* SpO2 Detail */}
  <SpO2DetailCard data={spo2Data} />
</div>
```

#### HRDetailCard
```tsx
<div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-8">
  <div className="flex items-center gap-2 mb-6">
    <Activity size={20} className="text-red-500" />
    <h4 className="text-lg font-semibold text-gray-900">Heart Rate</h4>
  </div>

  {/* Stats Grid */}
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
    <StatBadge label="Average" value={`${data.avg} BPM`} color="blue" />
    <StatBadge label="Minimum" value={`${data.min} BPM`} color="green" />
    <StatBadge label="Maximum" value={`${data.max} BPM`} color="red" />
    <StatBadge label="Readings" value={data.count} color="gray" />
  </div>

  {/* Wear Time Indicator */}
  <div className="mb-6">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-gray-700">Wear Time</span>
      <span className="text-sm font-semibold text-gray-900">{data.wearTime} hrs</span>
    </div>
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div 
        className="h-full bg-gradient-to-r from-green-400 to-green-600"
        style={{ width: `${(data.wearTime / 24) * 100}%` }}
      />
    </div>
  </div>

  {/* Timeline Graph */}
  <div className="h-64">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data.timeline}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="time" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" label={{ value: 'BPM', angle: -90 }} />
        <Tooltip />
        <Line type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  </div>
</div>
```

#### SleepDetailCard
```tsx
<div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-8">
  <div className="flex items-center gap-2 mb-6">
    <Moon size={20} className="text-indigo-500" />
    <h4 className="text-lg font-semibold text-gray-900">Sleep</h4>
  </div>

  {/* Sleep Score - Large Display */}
  <div className="text-center mb-8 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
    <div className="text-sm uppercase tracking-wide text-gray-600 mb-2">Sleep Score</div>
    <div className="text-5xl font-bold text-indigo-600">{data.score}</div>
    <div className="text-sm text-gray-500 mt-2">
      {data.duration} hrs • {data.startTime} - {data.endTime}
    </div>
  </div>

  {/* Sleep Stages Breakdown */}
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
    <SleepStageCard label="Deep" value={data.deep} color="indigo" />
    <SleepStageCard label="Light" value={data.light} color="blue" />
    <SleepStageCard label="REM" value={data.rem} color="purple" />
    <SleepStageCard label="Awake" value={data.awake} color="amber" />
  </div>

  {/* Sleep Timeline Visualization */}
  <div className="h-20">
    <div className="flex h-full rounded-lg overflow-hidden">
      <div 
        className="bg-indigo-600" 
        style={{ width: `${(data.deep / data.duration) * 100}%` }}
        title={`Deep: ${data.deep} min`}
      />
      <div 
        className="bg-blue-400" 
        style={{ width: `${(data.light / data.duration) * 100}%` }}
        title={`Light: ${data.light} min`}
      />
      <div 
        className="bg-purple-500" 
        style={{ width: `${(data.rem / data.duration) * 100}%` }}
        title={`REM: ${data.rem} min`}
      />
      <div 
        className="bg-amber-400" 
        style={{ width: `${(data.awake / data.duration) * 100}%` }}
        title={`Awake: ${data.awake} min`}
      />
    </div>
  </div>
</div>
```

#### ActivityDetailCard
```tsx
<div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-8">
  <div className="flex items-center gap-2 mb-6">
    <TrendingUp size={20} className="text-green-500" />
    <h4 className="text-lg font-semibold text-gray-900">Activity</h4>
  </div>

  {/* Activity Cards Grid */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <ActivityMetricCard
      icon={<Footprints size={24} />}
      label="Steps"
      value={data.steps}
      goal={10000}
      color="green"
    />
    <ActivityMetricCard
      icon={<MapPin size={24} />}
      label="Distance"
      value={`${data.distance} km`}
      goal={null}
      color="blue"
    />
    <ActivityMetricCard
      icon={<Flame size={24} />}
      label="Calories"
      value={data.calories}
      goal={2000}
      color="orange"
    />
  </div>
</div>
```

#### ActivityMetricCard
```tsx
<div className={`p-6 rounded-xl bg-gradient-to-br from-${color}-50 to-white border border-${color}-100`}>
  <div className={`text-${color}-600 mb-3`}>
    {icon}
  </div>
  <div className="text-sm text-gray-600 mb-1">{label}</div>
  <div className="text-3xl font-bold text-gray-900 mb-3">{value}</div>
  
  {goal && (
    <>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div 
          className={`h-full bg-${color}-500 transition-all duration-500`}
          style={{ width: `${Math.min((value / goal) * 100, 100)}%` }}
        />
      </div>
      <div className="text-xs text-gray-500">
        Goal: {goal.toLocaleString()}
      </div>
    </>
  )}
</div>
```

#### SpO2DetailCard
```tsx
<div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-8">
  <div className="flex items-center gap-2 mb-6">
    <Droplet size={20} className="text-blue-500" />
    <h4 className="text-lg font-semibold text-gray-900">Blood Oxygen (SpO₂)</h4>
  </div>

  {/* Stats Grid */}
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
    <StatBadge label="Average" value={`${data.avg}%`} color="blue" />
    <StatBadge label="Minimum" value={`${data.min}%`} color="amber" />
    <StatBadge label="Maximum" value={`${data.max}%`} color="green" />
    <StatBadge label="Readings" value={data.count} color="gray" />
  </div>

  {/* Timeline Graph */}
  <div className="h-64">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data.timeline}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="time" stroke="#9ca3af" />
        <YAxis domain={[90, 100]} stroke="#9ca3af" label={{ value: '%', angle: -90 }} />
        <Tooltip />
        <Line type="monotone" dataKey="spo2" stroke="#3b82f6" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  </div>
</div>
```

#### StatBadge Component (Reusable)
```tsx
<div className={`p-4 rounded-lg bg-${color}-50 border border-${color}-100`}>
  <div className="text-xs text-gray-600 mb-1">{label}</div>
  <div className={`text-2xl font-bold text-${color}-600`}>{value}</div>
</div>
```

---

## 🎭 State Management

### Loading States
```tsx
// Full Page Loading
<div className="flex items-center justify-center h-screen">
  <div className="text-center">
    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
    <p className="text-gray-600">Loading engagement data...</p>
  </div>
</div>

// Card Loading (Skeleton)
<div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 animate-pulse">
  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
  <div className="space-y-3">
    <div className="h-4 bg-gray-200 rounded w-full"></div>
    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
  </div>
</div>
```

### Empty States
```tsx
// No Users
<div className="flex flex-col items-center justify-center py-20 text-center">
  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
    <Users size={40} className="text-gray-400" />
  </div>
  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Users Found</h3>
  <p className="text-gray-500 max-w-md">
    There are currently no users enrolled in the performance testing program.
  </p>
</div>

// No Selected User
<div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
  <UserCircle size={64} className="mb-4 opacity-50" />
  <p className="text-lg">Select a user to view their engagement metrics</p>
</div>

// No Data for Date
<div className="text-center py-12 text-gray-400">
  <BarChart size={48} className="mx-auto mb-4 opacity-50" />
  <p className="text-sm">No data available for this date</p>
</div>
```

### Error States
```tsx
<div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
  <AlertCircle size={24} className="text-red-500 flex-shrink-0" />
  <div>
    <h4 className="text-red-900 font-semibold mb-1">Failed to load data</h4>
    <p className="text-red-700 text-sm mb-3">{error.message}</p>
    <button
      onClick={retry}
      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all"
    >
      Try Again
    </button>
  </div>
</div>
```

---

## 🔄 Interaction Patterns

### Hover Effects
```tsx
// Cards
className="transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"

// Buttons
className="transition-all duration-200 hover:bg-gray-100 hover:shadow-md"

// List Items
className="transition-all duration-200 hover:bg-gray-50 hover:border-gray-200"
```

### Click/Selection Feedback
```tsx
// Selected State
className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 shadow-md"

// Active State
className="scale-[0.98] transition-transform duration-100"

// Focus State
className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
```

### Expand/Collapse Animations
```tsx
// Panel Expansion
className="transition-all duration-300 ease-in-out"
style={{ width: isExpanded ? '280px' : '60px' }}

// Content Fade
className={`
  transition-opacity duration-200
  ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}
`}

// Height Animation (for dropdown content)
<motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: 'auto', opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
  transition={{ duration: 0.2 }}
>
```

---

## ♿ Accessibility

### Keyboard Navigation
- **Tab Order**: User List → Main Content → Date Panel → Header
- **Arrow Keys**: Navigate within lists (users, dates)
- **Enter/Space**: Select user/date
- **Escape**: Close modals, deselect, collapse panels

### ARIA Labels
```tsx
// User List
<nav aria-label="User list" role="navigation">
  <button
    aria-label={`Select ${user.name}, status: ${user.status}`}
    aria-pressed={isSelected}
  />
</nav>

// Status Indicators
<span className="status-badge" role="status" aria-label={`User status: ${status}`}>

// Graphs
<div role="img" aria-label="Heart rate trend chart showing daily averages">

// Loading States
<div role="status" aria-live="polite">
  <span className="sr-only">Loading engagement data</span>
</div>

// Empty States
<div role="status" aria-label="No users found">
```

### Screen Reader Only Text
```tsx
<span className="sr-only">
  Engagement score {score} out of 100
</span>

// Add to CSS
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### Focus Management
```tsx
// Restore focus after modal close
useEffect(() => {
  if (!isModalOpen && previousFocus) {
    previousFocus.focus();
  }
}, [isModalOpen]);

// Trap focus in modals
<FocusTrap active={isModalOpen}>
  <div className="modal">...</div>
</FocusTrap>
```

---

## 📱 Responsive Design

### Desktop (≥1280px)
- Three-column layout: User List (280px) + Main (flex-1) + Date Panel (280px)
- All panels visible simultaneously
- Graphs in 2-column grid

### Tablet (768px-1279px)
```tsx
// Hide date panel, show as modal
<div className="hidden xl:flex">
  <DateListPanel />
</div>

// Add floating button to open date panel modal
<button
  className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all xl:hidden"
  onClick={() => setShowDateModal(true)}
>
  <Calendar size={24} />
</button>
```

### Mobile (<768px)
```tsx
// User list as drawer
<div className={`
  fixed inset-y-0 left-0 z-40 w-[280px] 
  transform transition-transform duration-300
  ${isUserListOpen ? 'translate-x-0' : '-translate-x-full'}
  lg:relative lg:translate-x-0
`}>
  <UserListPanel />
</div>

// Hamburger menu to open drawer
<button
  className="lg:hidden fixed top-16 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
  onClick={() => setIsUserListOpen(true)}
>
  <Menu size={24} />
</button>

// Graphs stacked (1 column)
<div className="grid grid-cols-1 gap-6">
  {/* All graphs full-width */}
</div>
```

---

## 🎬 Animations & Transitions

### Page Transitions
```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {content}
</motion.div>
```

### List Item Animations
```tsx
<motion.div
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: index * 0.05 }}
>
  <UserCard />
</motion.div>
```

### Progress Bars
```tsx
<div className="h-2 bg-gray-200 rounded-full overflow-hidden">
  <motion.div
    className="h-full bg-gradient-to-r from-green-400 to-green-600"
    initial={{ width: 0 }}
    animate={{ width: `${percentage}%` }}
    transition={{ duration: 0.8, ease: "easeOut" }}
  />
</div>
```

---

## 🔧 Utility Functions

### Date Formatting
```typescript
export const formatLastActive = (date: string): string => {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return target.toLocaleDateString();
};

export const formatDateReadable = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
```

### Score Colors
```typescript
export const getEngagementScoreColor = (score: number): string => {
  if (score >= 70) return 'green';
  if (score >= 40) return 'amber';
  return 'red';
};

export const getScoreColorClass = (score: number): string => {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
};
```

### Status Helpers
```typescript
export const getUserStatus = (engagementScore: number, lastActiveDate: string): 'active' | 'at-risk' | 'inactive' => {
  const daysSinceActive = Math.floor(
    (Date.now() - new Date(lastActiveDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceActive > 7 || engagementScore < 30) return 'inactive';
  if (engagementScore < 50) return 'at-risk';
  return 'active';
};
```

---

## 📦 Reusable Components to Extract

### 1. StatusBadge
**File**: `client/src/components/engagement/StatusBadge.tsx`

### 2. MetricIndicator
**File**: `client/src/components/engagement/MetricIndicator.tsx`

### 3. StatCard / MetricCard
**File**: `client/src/components/engagement/StatCard.tsx`

### 4. GraphCard
**File**: `client/src/components/engagement/GraphCard.tsx`

### 5. LoadingSpinner
**File**: `client/src/components/engagement/LoadingSpinner.tsx`

### 6. EmptyState
**File**: `client/src/components/engagement/EmptyState.tsx`

### 7. ErrorAlert
**File**: `client/src/components/engagement/ErrorAlert.tsx`

---

## 🎯 Implementation Checklist

### Phase 1: Foundation
- [ ] Create `components/engagement/` directory structure
- [ ] Add "Performance Testing" button to Header.tsx
- [ ] Set up routing for `/admin/engagement`
- [ ] Create EngagementLayout component
- [ ] Implement responsive grid system

### Phase 2: User List
- [ ] Build UserListPanel component
- [ ] Implement search functionality
- [ ] Add filter tabs (All, Active, At-Risk, Inactive)
- [ ] Create UserCard component with status badges
- [ ] Add loading and empty states

### Phase 3: Main Content
- [ ] Build UserOverviewCard component
- [ ] Implement MetricGraphsSection
- [ ] Create GraphCard with Chart.js integration
- [ ] Add date range selector

### Phase 4: Date Panel
- [ ] Build DateListPanel component
- [ ] Implement expand/collapse functionality
- [ ] Create DateCard component
- [ ] Add metric availability indicators

### Phase 5: Detailed Views
- [ ] Create DetailedMetricView container
- [ ] Build HRDetailCard
- [ ] Build SleepDetailCard
- [ ] Build ActivityDetailCard
- [ ] Build SpO2DetailCard

### Phase 6: Polish
- [ ] Add all loading states (skeleton screens)
- [ ] Implement error boundaries
- [ ] Add smooth animations and transitions
- [ ] Test keyboard navigation
- [ ] Add ARIA labels for accessibility
- [ ] Test responsive layouts on all breakpoints
- [ ] Cross-browser testing
- [ ] Performance optimization (lazy loading, memoization)

---

## 📚 Dependencies

### Required Packages
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-router-dom": "^6.x",
    "lucide-react": "latest",
    "recharts": "^2.x", // For graphs
    "framer-motion": "^10.x", // For animations (optional)
    "date-fns": "^2.x" // For date utilities (optional)
  }
}
```

---

## 🎨 Design Tokens (Tailwind Extension)

Add to `tailwind.config.js`:
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        engagement: {
          active: '#10b981',
          'at-risk': '#f59e0b',
          inactive: '#ef4444',
        }
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0,0,0,0.06)',
        'glass-lg': '0 12px 48px rgba(0,0,0,0.08)',
      },
      backdropBlur: {
        xs: '2px',
      }
    }
  }
}
```

---

## 🚀 Performance Optimizations

### Lazy Loading
```typescript
const DetailedMetricView = lazy(() => import('./DetailedMetricView'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  {selectedDate && <DetailedMetricView date={selectedDate} />}
</Suspense>
```

### Memoization
```typescript
const UserCard = memo(({ user, isSelected, onClick }) => {
  // Component code
}, (prevProps, nextProps) => {
  return prevProps.user._id === nextProps.user._id && 
         prevProps.isSelected === nextProps.isSelected;
});

const graphData = useMemo(() => processGraphData(rawData), [rawData]);
```

### Virtualization (for long lists)
```typescript
import { FixedSizeList as List } from 'react-window';

<List
  height={600}
  itemCount={users.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <UserCard user={users[index]} />
    </div>
  )}
</List>
```

---

## ✅ Consistency Rules

1. **All cards use glassmorphic design**: `bg-white/80 backdrop-blur-xl`
2. **Standard padding**: `p-6` for small cards, `p-8` for large sections
3. **Border radius**: `rounded-xl` for cards, `rounded-lg` for buttons/inputs
4. **Shadows**: Use predefined shadow system (shadow-md default)
5. **Transitions**: Always 200-300ms with `ease-out` or `ease-in-out`
6. **Icon size**: 16px for inline, 18-20px for headers, 14px for compact
7. **Gap spacing**: `gap-4` default, `gap-6` for sections, `gap-2` for icon+text
8. **Text truncation**: Always use `truncate` for names/emails in constrained spaces
9. **Loading states**: Use skeleton screens, not just spinners
10. **Empty states**: Always include icon, heading, and description

---

## 🎯 Final Notes

This design maintains **100% visual consistency** with the existing admin dashboard while introducing specialized components for engagement monitoring. The color coding, typography, spacing, shadows, and interaction patterns all align with the established design system.

Key differentiators:
- **Status-first design**: Color coding immediately communicates user engagement health
- **Data density**: Efficiently displays multi-metric information without overwhelming
- **Progressive disclosure**: Overview → Trends → Detailed metrics hierarchy
- **Accessibility-first**: Full keyboard navigation and screen reader support
- **Responsive excellence**: Graceful degradation from desktop to mobile

The dashboard prioritizes **actionable insights** over raw data, helping admins quickly identify at-risk users and reclaim devices from inactive participants.
