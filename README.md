# Bandmate MCP Server

An MCP (Model Context Protocol) server that provides access to the Bandmate REST API for managing songs and lists with chord notations.

## Installation

```bash
cd bandmate-mcp
npm install
npm run build
```

## Configuration

Set the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `BANDMATE_API_URL` | Base URL for the Bandmate API | `https://vertigox.ue.r.appspot.com/api` |
| `BANDMATE_AUTH_TOKEN` | Firebase auth token for authenticated endpoints | (empty) |

## Usage with Claude Code

Add to your Claude Code MCP configuration (`~/.claude/mcp_settings.json`):

```json
{
  "mcpServers": {
    "bandmate": {
      "command": "node",
      "args": ["/path/to/bandmate-mcp/dist/index.js"],
      "env": {
        "BANDMATE_API_URL": "https://vertigox.ue.r.appspot.com/api",
        "BANDMATE_AUTH_TOKEN": "your-firebase-token"
      }
    }
  }
}
```

Or using npx (after publishing):

```json
{
  "mcpServers": {
    "bandmate": {
      "command": "npx",
      "args": ["bandmate-mcp"],
      "env": {
        "BANDMATE_AUTH_TOKEN": "your-firebase-token"
      }
    }
  }
}
```

## Available Tools

### Song Tools

| Tool | Description |
|------|-------------|
| `get_songs` | Get songs (public or filtered by userId/ids) |
| `get_song` | Get a single song by ID |
| `get_songs_by_user` | Get all songs created by a specific user |
| `get_songs_in_list` | Get all songs in a specific list |
| `upsert_song` | Create or update a song |
| `search_songs` | Search songs by title or tags |

### List Tools

| Tool | Description |
|------|-------------|
| `get_lists` | Get lists (public or filtered by userId) |
| `get_list` | Get a single list by ID |
| `upsert_list` | Create or update a list (requires auth) |

## Tool Parameters

### get_songs
- `userId` (optional): Filter to user's songs + public songs
- `ids` (optional): Comma-separated song IDs to fetch

### get_song
- `id` (required): Song ID

### get_songs_by_user
- `userId` (required): User ID

### get_songs_in_list
- `listId` (required): List ID

### upsert_song
- `id` (optional): Song ID for updates
- `title` (required): Song title
- `chordsText` (required): Chord notation and lyrics
- `isPublic` (optional): Public visibility (default: false)
- `bpm` (optional): Beats per minute
- `key` (optional): Musical key
- `voice` (optional): Vocal range
- `tags` (optional): Array of tags
- `spotifyUrl` (optional): Spotify link
- `youtubeUrl` (optional): YouTube link
- `userId` (optional): Creator user ID

### get_lists
- `userId` (optional): Filter to user's lists + public lists

### get_list
- `id` (required): List ID

### upsert_list
- `id` (optional): List ID for updates
- `name` (optional): List name
- `isPrivate` (optional): Private visibility (default: false)
- `songs` (optional): Array of song IDs
- `userId` (optional): Owner user ID

### search_songs
- `query` (required): Search term
- `userId` (optional): Include user's private songs

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Deployment to Google Cloud Run

This MCP server uses SSE (Server-Sent Events) transport, making it deployable as a remote HTTP service.

### Prerequisites

1. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
2. Authenticate: `gcloud auth login`
3. Set your project: `gcloud config set project YOUR_PROJECT_ID`

### Deploy

```bash
# Build and deploy in one command
gcloud run deploy bandmate-mcp \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "BANDMATE_API_URL=https://vertigox.ue.r.appspot.com/api"

# Or with authentication token
gcloud run deploy bandmate-mcp \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "BANDMATE_API_URL=https://vertigox.ue.r.appspot.com/api,BANDMATE_AUTH_TOKEN=your-token"
```

### Using the Remote MCP Server

Once deployed, you'll get a URL like `https://bandmate-mcp-xxxxx-uc.a.run.app`.

#### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service info |
| `/health` | GET | Health check |
| `/sse` | GET | SSE connection for MCP |
| `/messages` | POST | Client-to-server messages |

#### With Claude Desktop (Remote SSE)

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "bandmate": {
      "url": "https://bandmate-mcp-xxxxx-uc.a.run.app/sse"
    }
  }
}
```

### Local Docker Testing

```bash
# Build the image
docker build -t bandmate-mcp .

# Run locally
docker run -p 8080:8080 \
  -e BANDMATE_API_URL=https://vertigox.ue.r.appspot.com/api \
  bandmate-mcp

# Test health endpoint
curl http://localhost:8080/health
```

## License

MIT
