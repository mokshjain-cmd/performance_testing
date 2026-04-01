# Authentication System Guide

## Overview

This authentication system provides secure user registration and login using:
- **Email Domain Restriction**: Only `@nexxbase.com` emails are allowed
- **OTP Verification**: 6-digit one-time password sent via email
- **JWT Authentication**: Secure token-based sessions (7-day expiry)
- **Role-Based Access**: Supports `admin` and `tester` roles

## Architecture

### Components

1. **Models**
   - `OTP.ts`: Stores temporary OTPs with automatic expiry (10 minutes)
   - `Users.ts`: User document with email, name, role

2. **Services**
   - `auth.service.ts`: Core authentication logic (OTP generation/verification, JWT handling)
   - `mail.service.ts`: Email delivery via Nodemailer + Mailtrap

3. **Controllers**
   - `auth.controller.ts`: HTTP request handlers for auth endpoints

4. **Middleware**
   - `authenticateJWT`: Verify JWT tokens and attach user to request
   - `verifyUserRole`: Legacy user ID verification (kept for backwards compatibility)
   - `requireRole()`: Role-based access control
   - `requireAdmin`, `requireTester`: Shorthand role checks

5. **Routes**
   - `/api/auth/*`: Public authentication endpoints
   - All other routes: Protected (require JWT authentication)

## Protected vs Public Routes

### Public Routes (No Authentication Required)
- `POST /api/auth/login/request-otp` - Request login OTP
- `POST /api/auth/login/verify-otp` - Verify OTP and login
- `POST /api/auth/signup/request-otp` - Request signup OTP
- `POST /api/auth/signup/verify-otp` - Verify OTP and signup
- `GET /api/health` - Health check

### Protected Routes (JWT Authentication Required)

All routes below require the `Authorization: Bearer <token>` header:

- `GET /api/auth/me` - Get current user
- `GET /api/sessions/*` - All session endpoints
- `GET /api/devices/*` - All device endpoints
- `GET /api/users/*` - All user endpoints
- `GET /api/activity-performance/*` - Activity performance endpoints
- `GET /api/benchmark-comparisons/*` - Benchmark comparison endpoints
- `GET /api/admin/daily-trends/*` - Admin daily trends
- `GET /api/admin/global-summary/*` - Admin global summary
- `GET /api/firmware-performance/*` - Firmware performance endpoints
- `GET /api/cron/*` - Cron job management endpoints

**Important**: If you attempt to access a protected route without a valid JWT token, you will receive a `401 Unauthorized` response.

## API Endpoints

### 1. Request Login OTP

**Endpoint**: `POST /api/auth/login/request-otp`

**Description**: Request a one-time password (OTP) to be sent to the user's email for login.

**Headers**:
| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User's email address (must be @nexxbase.com) |

**Example Request**:
```http
POST /api/auth/login/request-otp
Content-Type: application/json

{
  "email": "user@nexxbase.com"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "OTP sent to user@nexxbase.com"
}
```

**Error Responses**:

| Status Code | Response | Description |
|------------|----------|-------------|
| 400 | `{"success": false, "message": "Email is required"}` | Missing email in request |
| 400 | `{"success": false, "message": "Only @nexxbase.com email addresses are allowed"}` | Invalid email domain |
| 400 | `{"success": false, "message": "No user found with this email. Please sign up first."}` | User doesn't exist |
| 500 | `{"success": false, "message": "An error occurred. Please try again."}` | Server error |

**Requirements**:
- Email must end with `@nexxbase.com`
- User must already exist in database
- OTP expires in 10 minutes
- OTP is sent via email to the provided address

---

### 2. Verify OTP and Login

**Endpoint**: `POST /api/auth/login/verify-otp`

**Description**: Verify the OTP and log in the user, returning a JWT token.

**Headers**:
| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User's email address |
| `otp` | string | Yes | 6-digit OTP received via email |

**Example Request**:
```http
POST /api/auth/login/verify-otp
Content-Type: application/json

{
  "email": "user@nexxbase.com",
  "otp": "123456"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWJhM...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "user@nexxbase.com",
    "role": "tester"
  }
}
```

**Error Responses**:

| Status Code | Response | Description |
|------------|----------|-------------|
| 400 | `{"success": false, "message": "Email and OTP are required"}` | Missing required fields |
| 400 | `{"success": false, "message": "Invalid or expired OTP"}` | OTP incorrect or expired |
| 404 | `{"success": false, "message": "User not found"}` | User doesn't exist |
| 500 | `{"success": false, "message": "An error occurred. Please try again."}` | Server error |

**Requirements**:
- OTP must match the one sent via email
- OTP must not be expired (10-minute window)
- Returns JWT token valid for 7 days
- User must exist in database

---

### 3. Request Signup OTP

**Endpoint**: `POST /api/auth/signup/request-otp`

**Description**: Request a one-time password (OTP) to be sent to a new user's email for signup.

**Headers**:
| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | New user's email address (must be @nexxbase.com) |

**Example Request**:
```http
POST /api/auth/signup/request-otp
Content-Type: application/json

{
  "email": "newuser@nexxbase.com"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "OTP sent to newuser@nexxbase.com"
}
```

**Error Responses**:

| Status Code | Response | Description |
|------------|----------|-------------|
| 400 | `{"success": false, "message": "Email is required"}` | Missing email in request |
| 400 | `{"success": false, "message": "Only @nexxbase.com email addresses are allowed"}` | Invalid email domain |
| 400 | `{"success": false, "message": "User with this email already exists. Please login instead."}` | Email already registered |
| 500 | `{"success": false, "message": "An error occurred. Please try again."}` | Server error |

**Requirements**:
- Email must end with `@nexxbase.com`
- User must NOT already exist in database
- OTP expires in 10 minutes
- OTP is sent via email to the provided address

---

### 4. Verify OTP and Signup

**Endpoint**: `POST /api/auth/signup/verify-otp`

**Description**: Verify the OTP and create a new user account, returning a JWT token.

**Headers**:
| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | New user's email address |
| `otp` | string | Yes | 6-digit OTP received via email |
| `name` | string | Yes | User's full name |
| `role` | string | No | User role: `tester` (default) or `admin` |

**Example Request**:
```http
POST /api/auth/signup/verify-otp
Content-Type: application/json

{
  "email": "newuser@nexxbase.com",
  "otp": "123456",
  "name": "John Doe",
  "role": "tester"
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "message": "Signup successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWJhM...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "newuser@nexxbase.com",
    "role": "tester"
  }
}
```

**Error Responses**:

| Status Code | Response | Description |
|------------|----------|-------------|
| 400 | `{"success": false, "message": "Email, OTP, and name are required"}` | Missing required fields |
| 400 | `{"success": false, "message": "Invalid or expired OTP"}` | OTP incorrect or expired |
| 500 | `{"success": false, "message": "An error occurred. Please try again."}` | Server error |

**Requirements**:
- OTP must match the one sent via email
- OTP must not be expired (10-minute window)
- Email, OTP, and name are required fields
- Role defaults to `tester` if not provided
- Returns JWT token valid for 7 days
- Creates new user in database

---

### 5. Get Current User (Protected)

**Endpoint**: `GET /api/auth/me`

**Description**: Get the currently authenticated user's details.

**Headers**:
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <jwt-token>` | Yes |

**Request Body**: None (GET request)

**Example Request**:
```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWJhM...
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "user@nexxbase.com",
    "role": "tester",
    "createdAt": "2024-02-25T10:30:00.000Z"
  }
}
```

**Error Responses**:

| Status Code | Response | Description |
|------------|----------|-------------|
| 401 | `{"success": false, "message": "No authorization token provided"}` | Missing Authorization header |
| 401 | `{"success": false, "message": "Invalid authorization header format. Expected: Bearer <token>"}` | Invalid header format |
| 401 | `{"success": false, "message": "Invalid or expired token"}` | Token invalid or expired |
| 401 | `{"success": false, "message": "User not found"}` | User no longer exists |
| 500 | `{"success": false, "message": "An error occurred. Please try again."}` | Server error |

**Requirements**:
- Valid JWT token must be provided in Authorization header
- Token format: `Bearer <token>`
- Token must not be expired (7-day validity)
- User associated with token must exist in database

## Environment Variables

Add these to your `.env` file (see `.env.example`):

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-use-minimum-32-characters
JWT_EXPIRES_IN=7d

# Mail Configuration (Mailtrap for development)
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=your_mailtrap_username
MAIL_PASS=your_mailtrap_password
MAIL_FROM=noreply@perftesting.com
```

### Generate Secure JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Usage Examples

### Frontend Integration (React/TypeScript)

#### 1. Login Flow
```typescript
// Step 1: Request OTP
const requestLoginOTP = async (email: string) => {
  const response = await fetch('/api/auth/login/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  const data = await response.json();
  if (data.success) {
    console.log('OTP sent to email');
  }
};

// Step 2: Verify OTP and get JWT
const verifyLoginOTP = async (email: string, otp: string) => {
  const response = await fetch('/api/auth/login/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  
  const data = await response.json();
  if (data.success) {
    // Store JWT in localStorage or secure cookie
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  }
};
```

#### 2. Signup Flow
```typescript
// Step 1: Request OTP
const requestSignupOTP = async (email: string) => {
  const response = await fetch('/api/auth/signup/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  return await response.json();
};

// Step 2: Verify OTP and create account
const verifySignupOTP = async (email: string, otp: string, name: string) => {
  const response = await fetch('/api/auth/signup/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, name, role: 'tester' })
  });
  
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  }
};
```

#### 3. Protected API Calls
```typescript
const fetchProtectedData = async () => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch('/api/protected-endpoint', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
};
```

#### 4. Get Current User
```typescript
const getCurrentUser = async () => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch('/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
};
```

### Backend - Protecting Routes

#### Using JWT Authentication
```typescript
import { Router } from 'express';
import { authenticateJWT, requireAdmin, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Protect a route (any authenticated user)
router.get('/protected', authenticateJWT, (req, res) => {
  res.json({
    message: 'You are authenticated',
    user: req.user
  });
});

// Admin-only route
router.get('/admin-only', authenticateJWT, requireAdmin, (req, res) => {
  res.json({ message: 'Admin access granted' });
});

// Custom role check
router.get('/multi-role', authenticateJWT, requireRole(['admin', 'tester']), (req, res) => {
  res.json({ message: 'Access granted to admin or tester' });
});
```

## Security Features

### 1. Email Domain Restriction
- Only `@nexxbase.com` emails can register/login
- Validated using regex: `/^[^\s@]+@nexxbase\.com$/i`

### 2. OTP Security
- 6-digit random codes (100,000 - 999,999)
- Hashed with bcrypt (10 salt rounds) before storage
- 10-minute expiry with automatic cleanup (MongoDB TTL index)
- Single-use: marked as verified after successful use
- Separate OTPs for login vs signup

### 3. JWT Security
- Signed with secret key (minimum 32 characters recommended)
- 7-day expiry (configurable)
- Payload includes: `userId`, `email`, `role`
- Verified on every protected route

### 4. Password-less Authentication
- No passwords to hash, store, or leak
- OTP sent only to verified email
- Reduces attack surface

## Error Handling

### Common Error Responses

**Invalid Email Domain**:
```json
{
  "success": false,
  "message": "Only @nexxbase.com email addresses are allowed"
}
```

**User Not Found**:
```json
{
  "success": false,
  "message": "No user found with this email. Please sign up first."
}
```

**Invalid OTP**:
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

**Missing Authorization**:
```json
{
  "success": false,
  "message": "No authorization token provided"
}
```

**Expired Token**:
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

## Testing

### Using Mailtrap
1. Create account at [mailtrap.io](https://mailtrap.io)
2. Get SMTP credentials from inbox settings
3. Add to `.env` file
4. All emails will be captured in Mailtrap (no real emails sent)

### Testing OTP Flow
1. Request OTP via `/auth/login/request-otp` or `/auth/signup/request-otp`
2. Check Mailtrap inbox for OTP email
3. Copy 6-digit code from email
4. Verify OTP via `/auth/login/verify-otp` or `/auth/signup/verify-otp`
5. Store returned JWT token
6. Use token in `Authorization: Bearer <token>` header for protected routes

## Database Schema

### OTP Collection
```typescript
{
  email: string;           // Lowercase, trimmed
  otp: string;             // Bcrypt hashed (never plain text)
  purpose: 'login' | 'signup';
  createdAt: Date;
  expiresAt: Date;         // TTL index (auto-delete after expiry)
  verified: boolean;       // Marked true after successful verification
}

// Indexes:
// - TTL: { expiresAt: 1 } - Auto-delete expired OTPs
// - Compound: { email: 1, purpose: 1, verified: 1 }
```

### User Collection
```typescript
{
  name: string;
  email: string;           // Unique, lowercase
  role: 'tester' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}
```

## Middleware Chain

### Request Flow
```
Client Request
    ↓
authenticateJWT         → Extract & verify JWT
    ↓                    → Attach user to req.user
    ↓                    → Set req.userId, req.userRole
requireRole(['admin'])  → Check if req.userRole matches
    ↓
Controller/Handler      → Access req.user safely
```

## Best Practices

### 1. Token Storage (Frontend)
- **Development**: `localStorage` is acceptable
- **Production**: Use `httpOnly` cookies for better security
- Never expose tokens in URLs or logs

### 2. Token Refresh
- Current implementation: 7-day expiry, no refresh
- Future enhancement: Implement refresh tokens for longer sessions

### 3. Logout
- Frontend: Remove token from storage
- Backend: No server-side logout needed (stateless JWT)
- Future enhancement: Token blacklist for revocation

### 4. Environment Variables
- **Never commit `.env` to version control**
- Use strong, random JWT secrets (32+ characters)
- Rotate JWT secret periodically in production
- Use different secrets for dev/staging/production

### 5. Rate Limiting
- Consider adding rate limiting to OTP endpoints
- Prevent brute-force OTP guessing
- Limit: 5 OTP requests per email per hour

## Troubleshooting

### "No authorization token provided"
- Ensure `Authorization: Bearer <token>` header is present
- Check token format (must start with "Bearer ")

### "Invalid or expired token"
- Token may have expired (7-day default)
- JWT_SECRET may have changed
- Token may be malformed

### "User not found"
- User may have been deleted from database
- Token contains userId that doesn't exist

### "Invalid or expired OTP"
- OTP expired (10-minute limit)
- Wrong OTP entered
- OTP already used (verified=true)

### "Only @nexxbase.com email addresses are allowed"
- Email doesn't match required domain
- Check for typos or extra spaces

## Migration Guide

### Updating Existing Routes

If you have existing routes without JWT authentication:

**Before**:
```typescript
router.get('/sessions', verifyUserRole, getSessionsController);
```

**After**:
```typescript
router.get('/sessions', authenticateJWT, getSessionsController);
```

The controller can now access:
- `req.user` - Full user document
- `req.userId` - User ID string
- `req.userRole` - 'admin' or 'tester'

## Future Enhancements

1. **Refresh Tokens**: Implement long-lived refresh tokens
2. **Email Verification**: Verify email ownership during signup
3. **Rate Limiting**: Prevent OTP spam and brute-force attacks
4. **Token Blacklist**: Implement logout with token revocation
5. **2FA**: Add optional two-factor authentication
6. **Session Management**: Track active sessions per user
7. **Password Option**: Add optional password-based login
8. **Social Auth**: OAuth integration (Google, GitHub, etc.)

---

**Last Updated**: February 2024
**Maintained By**: Development Team
