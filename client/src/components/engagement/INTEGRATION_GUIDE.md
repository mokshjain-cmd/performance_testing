# Engagement Dashboard - Integration Guide

## 📋 Overview

This guide shows exactly how to integrate the User Engagement Monitoring Dashboard into the existing Falcon Testing Dashboard codebase.

---

## 🔌 1. Header Integration

### Update Header Component

**File**: `client/src/components/common/Header.tsx`

**Add Import:**
```typescript
import { TrendingUp } from 'lucide-react'; // Add to existing imports
```

**Add Button (After Firmware button):**
```typescript
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

**Full Context:**
```typescript
// Line ~58-78 (approximate)
{isAdmin && (
  <>
    <button
      className="px-3 py-1.5 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 hover:text-blue-900 transition-all duration-200 flex items-center gap-1.5 border border-blue-200"
      onClick={() => setShowDeviceManagement(true)}
      title="Manage Devices"
    >
      <Cpu size={16} />
      <span className="hidden sm:inline">Devices</span>
    </button>
    
    <button
      className="px-3 py-1.5 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50 hover:text-purple-900 transition-all duration-200 flex items-center gap-1.5 border border-purple-200"
      onClick={() => onNavigate('admin/firmware-config')}
      title="Configure Firmware"
    >
      <Settings size={16} />
      <span className="hidden sm:inline">Firmware</span>
    </button>

    {/* 🆕 NEW: Performance Testing Button */}
    <button
      className="px-3 py-1.5 rounded-lg text-sm font-medium text-green-700 hover:bg-green-50 hover:text-green-900 transition-all duration-200 flex items-center gap-1.5 border border-green-200"
      onClick={() => onNavigate('admin/engagement')}
      title="User Engagement Monitoring"
    >
      <TrendingUp size={16} />
      <span className="hidden sm:inline">Performance Testing</span>
    </button>
  </>
)}
```

---

## 🛤️ 2. Routing Configuration

### Update App Router

**File**: `client/src/App.tsx`

**Add Import:**
```typescript
import UserEngagementDashboardPage from './pages/UserEngagementDashboardPage';
```

**Add Route:**
```typescript
// Inside <Routes>, add with other admin routes:
<Route 
  path="/admin/engagement" 
  element={
    <AdminRoute>
      <UserEngagementDashboardPage />
    </AdminRoute>
  } 
/>
```

**Full Example (assuming React Router v6):**
```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminRoute, TesterRoute } from './components/common';
import UserEngagementDashboardPage from './pages/UserEngagementDashboardPage';
// ... other imports

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
      <Route path="/admin/firmware-config" element={<AdminRoute><FirmwareConfigPage /></AdminRoute>} />
      <Route path="/admin/engagement" element={<AdminRoute><UserEngagementDashboardPage /></AdminRoute>} />
      
      {/* Tester Routes */}
      <Route path="/dashboard" element={<TesterRoute><DashboardPage /></TesterRoute>} />
      <Route path="/session/new" element={<TesterRoute><NewSessionPage /></TesterRoute>} />
      
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
```

---

## 🗂️ 3. Layout Integration

### Update Layout Navigation Handler

**File**: `client/src/components/layout/Layout.tsx`

**Update handleNavigate function:**
```typescript
const handleNavigate = (route: string) => {
  if (route === 'dashboard') {
    // Navigate to appropriate dashboard based on role
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/dashboard');
    }
  } else if (route === 'create-session') {
    navigate('/session/new');
  } else if (route === 'admin/firmware-config') {
    navigate('/admin/firmware-config');
  } else if (route === 'admin/engagement') {  // 🆕 NEW
    navigate('/admin/engagement');
  } else {
    navigate('/');
  }
};
```

**Same update in**: `client/src/components/dashboard/DashboardLayout.tsx`

---

## 🎯 4. Page Implementation

### Create Main Page Component

**File**: `client/src/pages/UserEngagementDashboardPage.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { 
  EngagementLayout,
  UserListPanel,
  MainContentArea,
  DateListPanel,
  UserOverviewCard,
  MetricGraphsSection,
  DetailedMetricView,
  LoadingSpinner,
  ErrorAlert,
  EmptyState
} from '../components/engagement';
import { engagementApi } from '../services/engagementApi';
import type { 
  User, 
  UserDetail, 
  DateMetrics,
  FilterType 
} from '../components/engagement/types/engagement.types';

const UserEngagementDashboardPage: React.FC = () => {
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetail | null>(null);
  const [dates, setDates] = useState<DateMetrics[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date panel expansion (for mobile/tablet)
  const [isDatePanelExpanded, setIsDatePanelExpanded] = useState(true);

  // Fetch all users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch user details when selection changes
  useEffect(() => {
    if (selectedUserId) {
      fetchUserDetails(selectedUserId);
      fetchUserDates(selectedUserId);
    } else {
      setSelectedUserDetail(null);
      setDates([]);
      setSelectedDate(null);
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await engagementApi.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      setUserDetailLoading(true);
      const data = await engagementApi.getUserDetails(userId);
      setSelectedUserDetail(data);
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError('Failed to load user details.');
    } finally {
      setUserDetailLoading(false);
    }
  };

  const fetchUserDates = async (userId: string) => {
    try {
      const data = await engagementApi.getUserDates(userId, 30);
      setDates(data);
    } catch (err) {
      console.error('Error fetching user dates:', err);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedDate(null); // Reset date selection
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    // Optionally scroll to top of main content
    document.querySelector('.main-content-area')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    // Filter by status
    if (filter !== 'all' && user.status !== filter) return false;
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
        <LoadingSpinner message="Loading engagement data..." />
      </div>
    );
  }

  // Error State
  if (error && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 p-8">
        <ErrorAlert 
          message={error} 
          onRetry={fetchUsers}
        />
      </div>
    );
  }

  return (
    <EngagementLayout
      userListPanel={
        <UserListPanel
          users={filteredUsers}
          selectedUserId={selectedUserId}
          onSelectUser={handleSelectUser}
          filter={filter}
          onFilterChange={setFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      }
      mainContent={
        <MainContentArea className="main-content-area">
          {!selectedUserId ? (
            <EmptyState
              icon="user"
              title="Select a user"
              description="Choose a user from the list to view their engagement metrics"
            />
          ) : userDetailLoading ? (
            <LoadingSpinner message="Loading user details..." />
          ) : !selectedUserDetail ? (
            <ErrorAlert message="Failed to load user details" />
          ) : selectedDate ? (
            <DetailedMetricView
              userId={selectedUserId}
              date={selectedDate}
              onClose={() => setSelectedDate(null)}
            />
          ) : (
            <>
              <UserOverviewCard user={selectedUserDetail} />
              <MetricGraphsSection userId={selectedUserId} />
            </>
          )}
        </MainContentArea>
      }
      datePanel={
        <DateListPanel
          dates={dates}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          isExpanded={isDatePanelExpanded}
          onToggleExpanded={() => setIsDatePanelExpanded(!isDatePanelExpanded)}
        />
      }
      isDatePanelExpanded={isDatePanelExpanded}
    />
  );
};

export default UserEngagementDashboardPage;
```

---

## 🔗 5. API Service Integration

### Create Engagement API Module

**File**: `client/src/services/engagementApi.ts`

```typescript
import apiClient from './api';
import type { 
  User, 
  UserDetail, 
  DateMetrics, 
  HRData, 
  SleepData, 
  ActivityData, 
  SpO2Data,
  TrendData
} from '../components/engagement/types/engagement.types';

export const engagementApi = {
  /**
   * Get all users with engagement summary
   */
  getAllUsers: async (): Promise<User[]> => {
    const res = await apiClient.get('/engagement/users');
    return res.data.data || [];
  },

  /**
   * Get detailed info for specific user
   */
  getUserDetails: async (userId: string): Promise<UserDetail> => {
    const res = await apiClient.get(`/engagement/users/${userId}`);
    return res.data.data;
  },

  /**
   * Get date list for user with data availability
   */
  getUserDates: async (userId: string, days: number = 30): Promise<DateMetrics[]> => {
    const res = await apiClient.get(`/engagement/users/${userId}/dates?days=${days}`);
    return res.data.data || [];
  },

  /**
   * Get all metrics for specific date
   */
  getDateMetrics: async (userId: string, date: string) => {
    const res = await apiClient.get(`/engagement/users/${userId}/metrics?date=${date}`);
    return res.data.data;
  },

  /**
   * Get HR data for specific date
   */
  getHRData: async (userId: string, date: string): Promise<HRData> => {
    const res = await apiClient.get(`/engagement/users/${userId}/metrics/hr?date=${date}`);
    return res.data.data;
  },

  /**
   * Get Sleep data for specific date
   */
  getSleepData: async (userId: string, date: string): Promise<SleepData> => {
    const res = await apiClient.get(`/engagement/users/${userId}/metrics/sleep?date=${date}`);
    return res.data.data;
  },

  /**
   * Get Activity data for specific date
   */
  getActivityData: async (userId: string, date: string): Promise<ActivityData> => {
    const res = await apiClient.get(`/engagement/users/${userId}/metrics/activity?date=${date}`);
    return res.data.data;
  },

  /**
   * Get SpO2 data for specific date
   */
  getSpO2Data: async (userId: string, date: string): Promise<SpO2Data> => {
    const res = await apiClient.get(`/engagement/users/${userId}/metrics/spo2?date=${date}`);
    return res.data.data;
  },

  /**
   * Get trend data for user (for graphs)
   */
  getTrendData: async (
    userId: string, 
    metric: 'hr' | 'sleep' | 'activity' | 'spo2', 
    days: number = 30
  ): Promise<TrendData[]> => {
    const res = await apiClient.get(`/engagement/users/${userId}/trends/${metric}?days=${days}`);
    return res.data.data || [];
  }
};
```

---

## 📦 6. Dependencies Installation

### Required Packages

```bash
cd client

# Chart library (already installed if using recharts elsewhere)
npm install recharts

# Animation library (optional but recommended)
npm install framer-motion

# Date utilities (optional)
npm install date-fns
```

**Update `package.json`:**
```json
{
  "dependencies": {
    "recharts": "^2.10.0",
    "framer-motion": "^10.16.0",
    "date-fns": "^2.30.0"
  }
}
```

---

## 🗂️ 7. File Structure Creation

### Create Directory Structure

**On Windows (PowerShell):**
```powershell
cd client\src\components
mkdir engagement
cd engagement
mkdir layout, panels, user-list, overview, graphs, detailed, date-list, shared, utils, types
```

**On macOS/Linux:**
```bash
cd client/src/components
mkdir -p engagement/{layout,panels,user-list,overview,graphs,detailed,date-list,shared,utils,types}
```

### Expected Structure
```
client/src/
├── components/
│   └── engagement/
│       ├── layout/
│       ├── panels/
│       ├── user-list/
│       ├── overview/
│       ├── graphs/
│       ├── detailed/
│       ├── date-list/
│       ├── shared/
│       ├── utils/
│       └── types/
├── pages/
│   └── UserEngagementDashboardPage.tsx  (create this)
└── services/
    └── engagementApi.ts  (create this)
```

---

## 🚀 8. Implementation Roadmap

### Phase 1: Foundation (Day 1)
- [ ] Create directory structure
- [ ] Add "Performance Testing" button to Header
- [ ] Set up routing
- [ ] Create page component skeleton
- [ ] Create API service module
- [ ] Create TypeScript types file
- [ ] Create utils files (dateFormatter, scoreHelpers, constants)

### Phase 2: Layout (Day 2)
- [ ] Implement EngagementLayout
- [ ] Create UserListPanel container
- [ ] Create MainContentArea container
- [ ] Create DateListPanel container
- [ ] Test responsive behavior

### Phase 3: User List (Day 3-4)
- [ ] Create SearchBar component
- [ ] Create FilterTabs component
- [ ] Create UserCard component
- [ ] Create StatusBadge component
- [ ] Implement search functionality
- [ ] Implement filter functionality
- [ ] Add loading/empty states

### Phase 4: User Overview (Day 5-6)
- [ ] Create UserOverviewCard component
- [ ] Create MetricCard subcomponent
- [ ] Create DataAvailabilityCard subcomponent
- [ ] Connect to API
- [ ] Add loading states

### Phase 5: Graphs (Day 7-8)
- [ ] Install recharts dependency
- [ ] Create GraphCard component
- [ ] Create TrendChart component
- [ ] Create MetricGraphsSection container
- [ ] Fetch and display trend data
- [ ] Add responsive behavior

### Phase 6: Date List (Day 9)
- [ ] Create DateCard component
- [ ] Create MetricIndicator component
- [ ] Create DatePanelToggle component
- [ ] Implement expand/collapse behavior
- [ ] Connect to API

### Phase 7: Detailed Views (Day 10-12)
- [ ] Create DetailedMetricView container
- [ ] Create HRDetailCard
- [ ] Create SleepDetailCard
- [ ] Create ActivityDetailCard
- [ ] Create SpO2DetailCard
- [ ] Create StatBadge component
- [ ] Connect to API
- [ ] Add transitions

### Phase 8: Shared Components (Day 13)
- [ ] Create LoadingSpinner
- [ ] Create ErrorAlert
- [ ] Create EmptyState
- [ ] Create ProgressBar
- [ ] Add all accessibility attributes

### Phase 9: Polish (Day 14-15)
- [ ] Add animations (framer-motion)
- [ ] Implement all hover states
- [ ] Add keyboard navigation
- [ ] Test on all screen sizes
- [ ] Performance optimization
- [ ] Cross-browser testing

### Phase 10: Testing & Documentation (Day 16)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] End-to-end testing
- [ ] Update README
- [ ] Create user documentation

---

## 🧪 9. Testing Integration

### Test Routes Work

**Test URL**: `http://localhost:3000/admin/engagement`

**Expected Behavior:**
1. Clicking "Performance Testing" in header navigates to engagement page
2. Page requires admin authentication
3. Non-admin users get redirected

### Test API Connectivity

**Create test file**: `client/src/components/engagement/EngagementTest.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { engagementApi } from '../../services/engagementApi';

const EngagementTest: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    engagementApi.getAllUsers()
      .then(users => setData(users))
      .catch(err => setError(err.message));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Engagement API Test</h1>
      {error && <div className="text-red-600">Error: {error}</div>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
};

export default EngagementTest;
```

**Add test route temporarily:**
```typescript
<Route path="/test-engagement" element={<EngagementTest />} />
```

**Visit**: `http://localhost:3000/test-engagement`

---

## 🔍 10. Debugging Checklist

### If Header Button Doesn't Appear
- [ ] Verify user is logged in as admin
- [ ] Check `getUserRole()` returns 'admin'
- [ ] Check console for errors
- [ ] Verify import of `TrendingUp` icon

### If Route Doesn't Work
- [ ] Verify route path matches exactly: `/admin/engagement`
- [ ] Check AdminRoute component is wrapping the page
- [ ] Verify page import path is correct
- [ ] Check for console errors

### If API Calls Fail
- [ ] Verify backend server is running
- [ ] Check API endpoint URLs match backend
- [ ] Verify authentication token is being sent
- [ ] Check CORS configuration
- [ ] Check backend ENGAGEMENT_MONITORING_GUIDE.md for correct endpoints

### If Styling Looks Wrong
- [ ] Verify Tailwind is processing new files
- [ ] Check tailwind.config.js includes engagement folder
- [ ] Run `npm run build` or restart dev server
- [ ] Clear browser cache

---

## 🎨 11. Tailwind Configuration Update

### Update Tailwind Config

**File**: `client/tailwind.config.js`

**Ensure content includes engagement folder:**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Explicitly include engagement components if needed
    "./src/components/engagement/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Add custom colors for engagement if not using standard Tailwind
        engagement: {
          active: '#10b981',
          'at-risk': '#f59e0b',
          inactive: '#ef4444',
        }
      },
      boxShadow: {
        // Add custom shadows
        'glass': '0 8px 32px rgba(0,0,0,0.06)',
        'glass-lg': '0 12px 48px rgba(0,0,0,0.08)',
      }
    },
  },
  plugins: [],
}
```

---

## 📱 12. Mobile Responsiveness Testing

### Test Breakpoints

**Desktop (≥1280px):**
```
http://localhost:3000/admin/engagement
- Resize browser to 1280px wide
- Verify 3-column layout
- Check all panels visible
```

**Tablet (768px-1279px):**
```
http://localhost:3000/admin/engagement
- Resize browser to 768-1279px
- Verify date panel hidden
- Check floating button appears
```

**Mobile (<768px):**
```
http://localhost:3000/admin/engagement
- Resize browser to <768px
- Verify user list drawer
- Check hamburger menu
```

### Chrome DevTools Testing
1. Open DevTools (F12)
2. Click "Toggle Device Toolbar" (Ctrl+Shift+M)
3. Test on:
   - iPhone 12 Pro (390px)
   - iPad Air (820px)
   - Desktop (1920px)

---

## 🔐 13. Authorization Check

### Verify Admin-Only Access

**Test with Admin Account:**
1. Login as admin
2. Navigate to `/admin/engagement`
3. Should see dashboard

**Test with Tester Account:**
1. Login as tester
2. Try to navigate to `/admin/engagement`
3. Should be redirected to `/dashboard` or `/login`

**AdminRoute Component Check:**

**File**: `client/src/components/common/AdminRoute.tsx`

```typescript
import { Navigate } from 'react-router-dom';
import { isLoggedIn, getUserRole } from '../../utils/auth';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  if (getUserRole() !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
```

---

## 📊 14. Performance Monitoring

### Add Performance Tracking

**Optional**: Add React Profiler

```typescript
import { Profiler } from 'react';

const onRenderCallback = (
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number
) => {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
};

// Wrap your page component
<Profiler id="EngagementDashboard" onRender={onRenderCallback}>
  <UserEngagementDashboardPage />
</Profiler>
```

### Performance Targets
- Initial load: < 2 seconds
- User selection: < 500ms
- Date selection: < 300ms
- Search/filter: < 200ms (with debounce)

---

## 🚢 15. Deployment Checklist

### Pre-Deployment
- [ ] All TypeScript errors resolved
- [ ] All console.log statements removed
- [ ] PropTypes or TypeScript types complete
- [ ] ESLint warnings addressed
- [ ] Build succeeds: `npm run build`
- [ ] Production bundle size reasonable

### Environment Variables
Ensure backend API URL is configured:

**File**: `client/.env.production`
```
VITE_API_URL=https://your-backend-api.com
```

### Build Command
```bash
cd client
npm run build
```

### Test Production Build Locally
```bash
npm run preview
```

---

## 📚 16. Documentation Integration

### Update Main README

**File**: `README.md`

Add section:
```markdown
## User Engagement Monitoring

The User Engagement Monitoring Dashboard provides admins with insights into how users are interacting with their Luna Ring devices.

### Features
- Real-time engagement tracking
- Multi-metric visualization (HR, Sleep, Activity, SpO₂)
- Status indicators (Active, At-Risk, Inactive)
- Date-specific detailed views
- Search and filter capabilities

### Access
- **Role Required**: Admin
- **URL**: `/admin/engagement`
- **Navigation**: Header → "Performance Testing" button

### Usage
1. Select a user from the left panel
2. View engagement overview and trend graphs
3. Click a date in the right panel for detailed metrics
4. Use search/filter to find specific users

For detailed implementation docs, see:
- `client/src/components/engagement/ENGAGEMENT_UI_SPEC.md`
- `client/src/components/engagement/COMPONENT_STRUCTURE.md`
- `client/src/components/engagement/VISUAL_LAYOUT_GUIDE.md`
```

---

## 🎯 Quick Start Command Reference

### Development
```bash
# Start frontend dev server
cd client
npm run dev

# Start backend server (separate terminal)
cd server
npm run dev

# Access engagement dashboard
http://localhost:3000/admin/engagement
```

### Testing
```bash
# Run tests
npm test

# Run specific test file
npm test UserCard.test.tsx

# Test coverage
npm test -- --coverage
```

### Building
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🔄 Migration from Existing Code

### If You Have Existing Engagement Components

1. **Backup existing files:**
```bash
cp -r client/src/components/engagement client/src/components/engagement.backup
```

2. **Merge approach:**
   - Keep existing API calls if they work
   - Adopt new UI components gradually
   - Use new layout but keep old cards temporarily
   - Migrate one section at a time

3. **Gradual rollout:**
   - Use feature flag: `const USE_NEW_ENGAGEMENT_UI = false;`
   - Toggle between old and new implementations
   - A/B test with different admin users

---

## ✅ Integration Complete Checklist

### Code Changes
- [ ] Header updated with Performance Testing button
- [ ] Routes configured in App.tsx
- [ ] Layout navigation handlers updated
- [ ] Page component created
- [ ] API service module created
- [ ] Types defined
- [ ] Utilities implemented

### File Structure
- [ ] Directory structure created
- [ ] All placeholder files exist
- [ ] Barrel exports (index.ts) created

### Testing
- [ ] Admin can access page
- [ ] Non-admin redirected
- [ ] Button appears in header
- [ ] Route works
- [ ] API calls succeed
- [ ] No console errors

### UI/UX
- [ ] Matches existing design system
- [ ] Responsive on all screen sizes
- [ ] Loading states work
- [ ] Error handling works
- [ ] Accessibility features present

### Documentation
- [ ] README updated
- [ ] Code comments added
- [ ] API documented
- [ ] Usage guide written

---

## 🆘 Common Issues & Solutions

### Issue: "Cannot find module 'engagement'"
**Solution**: Create barrel export file:
```typescript
// client/src/components/engagement/index.ts
export * from './layout/EngagementLayout';
// ... other exports
```

### Issue: Tailwind classes not applying
**Solution**: 
1. Check `tailwind.config.js` includes engagement folder
2. Restart dev server: `Ctrl+C` then `npm run dev`
3. Clear browser cache

### Issue: API 404 errors
**Solution**: 
1. Verify backend is running
2. Check backend has engagement routes set up
3. Verify API URL in environment variables

### Issue: TypeScript errors
**Solution**:
1. Install type definitions: `npm install @types/react @types/recharts`
2. Add `skipLibCheck: true` to tsconfig.json temporarily
3. Run `npm run type-check`

---

## 🎓 Learning Resources

### If You Need Help Understanding:

**React Patterns Used:**
- [React Hooks](https://react.dev/reference/react)
- [Context API](https://react.dev/learn/passing-data-deeply-with-context) (if needed)
- [Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)

**TypeScript:**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

**Tailwind CSS:**
- [Tailwind Documentation](https://tailwindcss.com/docs)
- [Responsive Design](https://tailwindcss.com/docs/responsive-design)

**Recharts:**
- [Recharts Examples](https://recharts.org/en-US/examples)
- [Line Chart](https://recharts.org/en-US/api/LineChart)

---

## 🚀 You're Ready!

Once you've completed the integration checklist above, your engagement dashboard will be fully integrated into the Falcon Testing Dashboard with complete design consistency and functionality.

**Next Steps:**
1. Follow the implementation roadmap (Phase 1-10)
2. Build components incrementally
3. Test thoroughly at each phase
4. Deploy with confidence

**Good luck! 🎉**
