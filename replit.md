# DALChat - Discord-Style Chat Application

## Overview

DALChat is a Discord-inspired real-time chat application with a modern dark theme and lime-green accents. The application features a multi-server, multi-channel architecture where users can create servers, join channels, and send messages. It uses a guest-based authentication system and implements a polling mechanism for message updates.

The project is designed as a full-stack JavaScript application with a simple Express backend and vanilla JavaScript frontend, now configured for Replit deployment.

## Recent Changes (November 22, 2025)

- **Converted from Vercel serverless to traditional Express server**: Created new `server.js` that runs on port 5000 and serves both static files and API endpoints
- **Updated frontend to use backend API**: Replaced Supabase calls with fetch requests to `/api/*` endpoints
- **Added Node.js configuration**: Created `.gitignore`, configured npm scripts, and set up workflow
- **Configured deployment**: Set up autoscale deployment configuration for Replit

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: Vanilla JavaScript (ES6+), HTML5, CSS3

**Key Design Decisions**:

- **Pure JavaScript approach**: No frontend frameworks used. This decision simplifies deployment and reduces bundle size while maintaining full control over the DOM and state management.
- **Global state management**: Uses module-level variables (`currentUser`, `currentServer`, `currentChannel`, `members`) to track application state. This approach is simple and sufficient for the app's scope but may need refactoring for scaling.
- **Polling-based updates**: Implements `pollInterval` (2 second intervals) for periodic message fetching rather than WebSockets. Trade-off: simpler implementation and broader compatibility vs. real-time performance.
- **Guest authentication**: Users join as guests with auto-generated IDs (`guest-${Date.now()}`). No persistent authentication required, prioritizing ease of access over security.
- **Responsive grid layout**: Three-column layout using CSS Grid with a compact server list (72px), sidebar (260px), main chat area (flexible), and members panel (300px).
- **Backend API integration**: Frontend communicates with backend via fetch requests to `/api/data`, `/api/server`, and `/api/message` endpoints.

**UI/UX Patterns**:
- Discord-inspired interface with server icons showing initial letters
- Dark theme with lime-green (`#9dfc5a`) accent colors
- Accessible markup with ARIA labels and semantic HTML

### Backend Architecture

**Technology Stack**: Node.js, Express.js

**Key Design Decisions**:

- **Traditional Express server**: Uses `server.js` in the root for both development and production. The `api/server.js` file remains from the original Vercel setup but is no longer used.
- **In-memory storage**: Uses a simple JavaScript object (`servers = {}`) for data persistence. Trade-off: zero infrastructure complexity vs. data loss on restart. Suitable for prototyping but requires migration to a database for production.
- **RESTful API design**: Three endpoints handle core functionality:
  - `GET /api/data`: Retrieves all servers and messages
  - `POST /api/server`: Creates new servers
  - `POST /api/message`: Posts messages to a server
- **CORS enabled**: Allows cross-origin requests for flexible frontend deployment
- **Stateless design**: Each request is independent; no session management required

**Data Structure**:
```javascript
servers = {
  "ServerName": {
    messages: [
      { username, text, time }
    ]
  }
}
```

### Frontend-Backend Communication

- **Fetch API**: Used for all HTTP requests from frontend
- **Polling mechanism**: Frontend periodically fetches `/api/data` to retrieve updates
- **Base URL pattern**: Frontend uses `/api` prefix for all API calls

## External Dependencies

### NPM Packages

1. **express (^4.18.2)**: Web application framework
   - Purpose: HTTP server, routing, and middleware support
   - Core dependency for backend functionality

2. **cors (^2.8.5)**: Cross-Origin Resource Sharing middleware
   - Purpose: Enable cross-origin requests between frontend and API
   - Required for API access

3. **@supabase/supabase-js (^2.84.0)**: Supabase client library
   - Purpose: Originally used but now removed from the codebase
   - Could be used for future database persistence migration
   - Currently listed in package.json but not imported/used

### Deployment Platform

**Replit**: Current deployment target
- Traditional Express server on port 5000
- Static file hosting and API endpoints from single server
- Autoscale deployment configuration
- Environment: Node.js >= 18.0.0

### Potential Integration Points

- **Supabase**: Database dependency present but not implemented. When activated, would replace in-memory storage with PostgreSQL tables for servers, channels, messages, and users.
- **Real-time updates**: Could migrate from polling to Supabase real-time subscriptions or WebSocket implementation for better performance.
- **Authentication**: Could implement proper user accounts via Supabase Auth instead of guest-only access.

### Browser APIs Used

- **Fetch API**: HTTP requests
- **DOM manipulation**: Direct element creation and updates
- **Local Storage**: Potentially used for client-side caching (manifest.json suggests PWA capabilities)