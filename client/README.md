# Performance Testing Platform - Frontend

A modern React + TypeScript frontend built with Vite and styled with Tailwind CSS.

## 🚀 Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Generic components (Button, Input, Card, etc.)
│   └── layout/         # Layout components (Header, Footer, Layout, etc.)
├── pages/              # Page-level components
├── hooks/              # Custom React hooks
├── services/           # API services and business logic
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── context/            # React context providers
├── lib/                # Library configurations
├── assets/             # Static assets (images, fonts, etc.)
├── App.tsx             # Main App component
├── main.tsx            # Application entry point
└── index.css           # Global styles with Tailwind directives
```

## 🛠️ Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your configuration.

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🎨 Component Structure

### Common Components
- **Button** - Reusable button with variants (primary, secondary, danger)
- **Input** - Form input with label and error handling
- **Card** - Container component with optional title

### Layout Components
- **Layout** - Main layout wrapper with header, main content, and footer

## 🔧 Development Guidelines

1. **Components**: Create reusable components in `components/common` or feature-specific components in their own folders
2. **Pages**: Keep page components in `pages/` directory
3. **Hooks**: Custom hooks should be in `hooks/` with `use` prefix
4. **Services**: API calls and business logic in `services/`
5. **Types**: TypeScript interfaces and types in `types/`
6. **Utils**: Helper functions in `utils/`

## 🌐 API Integration

The app uses Axios for API calls. Configuration is in `src/services/api.ts`:
- Base URL is configured via `VITE_API_BASE_URL` environment variable
- Automatic token injection for authenticated requests
- Global error handling

## 📦 Adding New Dependencies

```bash
npm install <package-name>
npm install -D <package-name>  # For dev dependencies
```

## 🎯 Environment Variables

All environment variables must be prefixed with `VITE_`:
- `VITE_API_BASE_URL` - Backend API URL

## 📄 License

MIT
