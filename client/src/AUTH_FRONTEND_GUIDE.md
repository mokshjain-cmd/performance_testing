# Frontend Authentication Guide

## Overview
User authentication state is stored in `localStorage` with two keys:
- `userId` - MongoDB ObjectId of the logged-in user
- `userRole` - User role: `'admin'` or `'tester'`

## Utility Functions

Located in `client/src/utils/auth.ts`:

```typescript
import { getUserId, getUserRole, isAdmin, isTester, isLoggedIn, logout, setAuth } from '../utils/auth';

// Get current user ID
const userId = getUserId(); // string | null

// Get current user role
const role = getUserRole(); // 'admin' | 'tester' | null

// Check if user is admin
if (isAdmin()) {
  // Show admin features
}

// Check if user is tester
if (isTester()) {
  // Show tester features
}

// Check if user is logged in
if (isLoggedIn()) {
  // Authenticated view
}

// Logout user
logout(); // Removes userId and userRole from localStorage

// Set authentication (used after login/signup)
setAuth('userId123', 'admin');
```

## React Hook

Located in `client/src/hooks/useAuth.ts`:

```typescript
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { userId, userRole, isAdmin, isTester, isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <LoginPrompt />;
  }

  return (
    <div>
      <h1>Welcome, User {userId}</h1>
      
      {isAdmin && (
        <AdminPanel />
      )}
      
      {isTester && (
        <TesterDashboard />
      )}
    </div>
  );
}
```

## Usage Examples

### 1. Conditional Rendering Based on Role

```typescript
import { useAuth } from '../hooks/useAuth';

function Dashboard() {
  const { isAdmin } = useAuth();

  return (
    <div>
      <h1>Dashboard</h1>
      
      {isAdmin && (
        <button>Delete All Sessions</button>
      )}
    </div>
  );
}
```

### 2. Protecting Routes

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function AdminRoute({ children }) {
  const { isAdmin, isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

// Usage in routes
<Route path="/admin" element={
  <AdminRoute>
    <AdminPage />
  </AdminRoute>
} />
```

### 3. Login Page

```typescript
import { setAuth } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = async (email: string) => {
    const res = await fetch(`/api/users/by-email?email=${email}`);
    const data = await res.json();
    
    if (data.success) {
      // Store auth in localStorage
      setAuth(data.data._id, data.data.role);
      
      // Redirect based on role
      if (data.data.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  };

  return <LoginForm onLogin={handleLogin} />;
}
```

### 4. API Requests with User Context

```typescript
import { getUserId } from '../utils/auth';

async function createSession(sessionData) {
  const userId = getUserId();
  
  const response = await fetch('/api/sessions/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...sessionData,
      userId, // Include userId in request
    }),
  });
  
  return response.json();
}
```

### 5. Role-Based Navigation

```typescript
import { useAuth } from '../hooks/useAuth';

function Header() {
  const { isAdmin, userRole } = useAuth();

  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/sessions">Sessions</Link>
      
      {isAdmin && (
        <>
          <Link to="/admin/users">Manage Users</Link>
          <Link to="/admin/stats">Statistics</Link>
        </>
      )}
      
      <span className="role-badge">{userRole}</span>
    </nav>
  );
}
```

### 6. Logout Handler

```typescript
import { logout } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // Clears localStorage
    navigate('/login');
  };

  return (
    <button onClick={handleLogout}>
      Logout
    </button>
  );
}
```

## Current Implementation

### LoginPage
```typescript
// After successful login
localStorage.setItem('userId', data.data._id);
localStorage.setItem('userRole', data.data.role || 'tester');
```

### Layout & DashboardLayout
```typescript
// On logout
localStorage.removeItem('userId');
localStorage.removeItem('userRole');
```

## Best Practices

1. **Always check authentication status** before rendering protected content
2. **Use the `useAuth` hook** instead of directly accessing `localStorage`
3. **Clear auth state on logout** using the `logout()` utility
4. **Handle role changes** by listening to storage events (already handled in `useAuth` hook)
5. **Default to 'tester' role** if role is not provided (as per backend default)

## Example: Complete Admin Dashboard

```typescript
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { getUserId } from '../utils/auth';

function AdminDashboard() {
  const { isAdmin, isLoggedIn, userId } = useAuth();

  // Redirect if not logged in
  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  // Fetch admin data
  const fetchAdminStats = async () => {
    const response = await fetch(
      `/api/admin/global-summary?userId=${userId}`
    );
    return response.json();
  };

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {/* Admin content here */}
    </div>
  );
}
```

## Migration Notes

If you need to migrate existing code:

**Before:**
```typescript
const userId = localStorage.getItem('userId');
```

**After:**
```typescript
import { getUserId } from '../utils/auth';
const userId = getUserId();
```

**Or using the hook:**
```typescript
import { useAuth } from '../hooks/useAuth';
const { userId } = useAuth();
```
