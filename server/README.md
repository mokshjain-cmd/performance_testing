# Performance Testing Platform - Backend

A Node.js backend application built with Express, TypeScript, and MongoDB.

## Project Structure

```
server/
├── src/
│   ├── config/         # Configuration files (database, etc.)
│   ├── controllers/    # Request handlers
│   ├── services/       # Business logic
│   ├── routes/         # API routes
│   ├── middleware/     # Custom middleware
│   ├── models/         # Mongoose models
│   ├── tools/          # Utility functions
│   ├── parsers/        # Data parsers
│   ├── app.ts          # Express app configuration
│   └── server.ts       # Entry point
├── dist/               # Compiled JavaScript (generated)
├── .env                # Environment variables
└── package.json
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Update the MongoDB URI if needed

3. **Start MongoDB:**
   ```bash
   # Make sure MongoDB is running on your system
   # Default: mongodb://localhost:27017
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### Health Check
- **GET** `/api/health`
  - Returns server health status and database connection status

### Sessions
- **POST** `/api/sessions/create`
  - Create a new performance testing session with device files
  - Content-Type: `multipart/form-data`
  - Body:
    - `sessionName` (string, required): Name of the session
    - `activity` (string, required): Activity being tested
    - `startTime` (ISO date string, required): Session start time
    - `endTime` (ISO date string, required): Session end time
    - `deviceTypes[]` (array of strings, required): List of device types
    - `deviceFiles[]` (array of files, required): Raw data files for each device

- **GET** `/api/sessions`
  - Get all sessions

- **GET** `/api/sessions/:id`
  - Get a specific session by ID

- **DELETE** `/api/sessions/:id`
  - Delete a session by ID

### Devices
- **POST** `/api/devices`
  - Create or update device information
  - Body (JSON):
    ```json
    {
      "deviceType": "iPhone 14 Pro",
      "manufacturer": "Apple",
      "model": "iPhone14,3",
      "screenSize": "6.1 inch",
      "resolution": "2556x1179",
      "processor": "A16 Bionic",
      "ram": "6GB",
      "os": "iOS",
      "osVersion": "17.0"
    }
    ```

- **GET** `/api/devices/:deviceType`
  - Get device information by device type

### Root
- **GET** `/`
  - Returns API information

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run linting

## Technologies

- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type-safe JavaScript
- **MongoDB** - Database
- **Mongoose** - MongoDB ODM
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logger

## Development

The project follows a modular architecture:

- **Controllers** - Handle HTTP requests and responses
- **Services** - Contain business logic
- **Routes** - Define API endpoints
- **Middleware** - Process requests (authentication, validation, etc.)
- **Models** - Define data schemas
- **Tools** - Utility functions
- **Parsers** - Data transformation functions
