# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a Turborepo monorepo using Bun as the package manager. The project contains:

### Applications
- **`apps/web`**: Next.js 15 frontend application (React 19, TypeScript)
- **`apps/backend/http-backend`**: Express.js HTTP API server with authentication endpoints
- **`apps/backend/price-poller`**: WebSocket client for real-time cryptocurrency price data from Binance

### Shared Packages
- **`@repo/ui`**: Shared React component library with button, card, and code components
- **`@repo/eslint-config`**: ESLint configurations for Next.js and React applications
- **`@repo/typescript-config`**: TypeScript configurations for different project types

### Architecture Overview
The project implements a cryptocurrency trading platform with:
- Frontend web application for user interface
- HTTP backend for authentication and API endpoints (currently has stub `/signin` and `/signup` endpoints)
- Price polling service that connects to Binance WebSocket streams for real-time data collection:
  - **Kline streams**: Candlestick data for BTC, ETH, and other cryptocurrencies across multiple intervals
  - **BookTicker streams**: Real-time bid/ask prices with in-memory buffering for batch database inserts
  - Includes placeholder for TimescaleDB integration for time-series data storage

## Development Commands

### Root Level Commands
```bash
# Install all dependencies
bun install

# Run all applications in development mode
bun run dev

# Build all applications
bun run build

# Lint all applications
bun run lint

# Type checking across all workspaces
bun run check-types

# Format code with Prettier
bun run format
```

### Individual Application Commands

#### Web Application (apps/web)
```bash
# Development with Turbopack
bun run dev --filter=web

# Build for production
bun run build --filter=web

# Type checking
bun run check-types --filter=web

# Linting with zero warnings tolerance
bun run lint --filter=web
```

#### Backend Services
```bash
# Run HTTP backend directly
cd apps/backend/http-backend && bun run index.ts

# Run price poller directly  
cd apps/backend/price-poller && bun run index.ts

# Or use Turbo filters from root
bun run dev --filter=http-backend
bun run dev --filter=backend  # price-poller package name
```

## Technology Stack

- **Package Manager**: Bun (v1.2.20)
- **Monorepo**: Turborepo with TUI interface
- **Frontend**: Next.js 15 with React 19, TypeScript, Turbopack dev server
- **Backend**: Express.js v5 with TypeScript for HTTP API
- **Real-time Data**: WebSocket (ws library) for Binance futures API streams
- **Database**: TimescaleDB (placeholder for time-series cryptocurrency data)
- **Code Quality**: ESLint with zero warnings policy, Prettier, TypeScript strict mode

## Development Notes

- The web application runs on port 3000 with Turbopack for fast development
- HTTP backend uses port 3000 (configurable via PORT environment variable) 
- Price poller connects to Binance futures WebSocket streams:
  - Kline streams for candlestick data (1m, 5m, 15m, 1h, 4h, 1d intervals)
  - BookTicker streams for real-time bid/ask prices
  - Uses in-memory buffering with batch inserts (1000 records or 5 second intervals)
- All applications use TypeScript with strict type checking
- ESLint enforced with `--max-warnings 0` policy
- Turborepo handles task dependencies and caching with TUI interface