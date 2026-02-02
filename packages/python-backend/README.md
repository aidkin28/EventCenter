# Python Backend

FastAPI + LangGraph backend service for AI-powered features.

## Features

- **Update Chat** - Conversational activity extraction with intelligent clarification
- **Goal Review** - 11-expert council system for comprehensive goal evaluation
- **Activity Extraction** - Structured parsing of free-form text into categorized activities

## Quick Start

```bash
# From monorepo root
pnpm python:install    # Install dependencies
pnpm python:dev        # Start dev server on port 8000
```

Or directly:

```bash
cd packages/python-backend
uv run uvicorn src.assistant.main:app --reload --port 8000
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `POST /api/v1/updates/chat` | Conversational activity extraction |
| `POST /api/v1/updates/extract-activities` | Direct activity extraction |
| `POST /api/v1/goals/review` | Expert council goal review |
| `POST /api/v1/goals/revise` | AI-powered goal revision |

## Documentation

- **[Architecture Guide](./docs/ARCHITECTURE.md)** - Complete system architecture, data flows, and design patterns

## Configuration

Required environment variables (in root `.env`):

```bash
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-08-01-preview
```

## Development

```bash
# Lint
uv run ruff check .

# Type check
uv run mypy src/

# Test
uv run pytest
```

## Type Generation

Generate TypeScript types from Python schemas:

```bash
pnpm generate:types
```
