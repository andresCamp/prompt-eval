# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with Turbopack (http://localhost:3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code linting
- `npm run storybook` - Start Storybook development server (port 6006)
- `npm run build-storybook` - Build Storybook for production

### Testing
- Vitest configuration available but no test files currently exist
- Storybook tests configured with Vitest plugin

## Architecture Overview

### Project Type
Next.js 15.4.1 application with TypeScript, using the App Router structure

### Key Directories
- `/app` - Next.js app router pages and API routes
  - `/app/playground` - Pipeline Threading Playground application
  - `/app/api/chat` - AI chat API endpoint supporting multiple providers
- `/components` - React components
  - `/components/ui` - Base shadcn/ui components (DO NOT MODIFY without permission)
  - `/components/prompt-playground` - Playground-specific components and utilities
- `/lib` - Utility functions and shared logic

### Core Application: Pipeline Threading Playground

A comprehensive prompt engineering testing system that allows threading at multiple stages:
1. **Model threads** - Different AI models/providers (OpenAI, Anthropic, Google, Groq)
2. **Data threads** - Different data sets
3. **System prompt threads** - Different system instructions
4. **Initial message threads** - Different starting messages
5. **User message threads** - Different user inputs
6. **Execution threads** - All combinations of the above

The system executes all thread combinations in parallel batches to prevent rate limiting.

### AI Provider Integration

The application supports multiple AI providers through the Vercel AI SDK:
- **OpenAI**: gpt-4o
- **Anthropic**: Claude models (claude-sonnet-4-20250514, claude-3-7-sonnet-20250219, claude-3-5-sonnet-20241022)
- **Google**: Gemini models (gemini-2.5-flash, gemini-2.5-flash-lite-preview-06-17) - requires GEMINI_API_KEY env var
- **Groq**: moonshotai/kimi-k2-instruct

Model-to-provider mapping is handled automatically in `/app/api/chat/route.ts`.

### State Management
- React hooks (useState, useEffect) for local state
- Jotai for global state management

### UI Components
- shadcn/ui components with Radix UI primitives
- Tailwind CSS v4 for styling
- Lucide React for icons

### Type System
Strong TypeScript typing throughout with interfaces defined in:
- `/components/prompt-playground/shared/types.ts` - Core types for threads, pipeline config, responses

## Development Guidelines

### Component Structure
- Functional components with TypeScript
- Props interfaces defined inline or in types.ts
- Hooks for state and side effects

### Code Style Rules (from .cursor/rules/keep-it-simple.mdc)
1. Use existing functionality first before implementing custom solutions
2. Minimize state management - only add state when necessary
3. Trust component libraries' built-in behaviors
4. Avoid premature optimization
5. One responsibility per function
6. DO NOT modify base/primitive components in /components/ui without permission

### API Structure
- API routes in `/app/api/` directory
- Use Next.js route handlers (POST, GET, etc.)
- Return proper JSON responses with error handling

### Environment Variables
Required:
- AI provider API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, GROQ_API_KEY)

## Common Tasks

### Adding a New AI Model
1. Add model to MODEL_PROVIDER_MAP in `/app/api/chat/route.ts`
2. Update MODEL_PROVIDER_MAP in `/components/prompt-playground/shared/types.ts`
3. Model will automatically appear in model selector

### Creating New Thread Types
1. Define interface in `/components/prompt-playground/shared/types.ts`
2. Add rendering function in `/components/prompt-playground/shared/utils.ts`
3. Implement handlers in `/app/playground/page.tsx`
4. Update execution thread generation logic

### Modifying UI Components
- Base components in `/components/ui` should NOT be modified
- Create wrapper components or extend functionality in `/components/prompt-playground`
- Follow existing patterns for CollapsibleCard, ThreadableSection, etc.