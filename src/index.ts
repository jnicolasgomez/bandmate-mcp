#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import cors from "cors";
import { z } from "zod";

const API_BASE_URL = process.env.BANDMATE_API_URL || "https://vertigox.ue.r.appspot.com/api";
const AUTH_TOKEN = process.env.BANDMATE_AUTH_TOKEN || "";
const PORT = parseInt(process.env.PORT || "8080", 10);

// Helper function for API requests
async function apiRequest(
  endpoint: string,
  method: string = "GET",
  body?: unknown,
  requiresAuth: boolean = false
): Promise<unknown> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (requiresAuth && AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Create the MCP server
const server = new McpServer({
  name: "bandmate-mcp",
  version: "1.0.0",
});

// ============ SONG TOOLS ============

server.registerTool(
  "get_songs",
  {
    description: "Get songs from Bandmate. Returns public songs, or if userId is provided, returns user's songs plus public songs.",
    inputSchema: {
      userId: z.string().optional().describe("Optional user ID to filter songs"),
      ids: z.string().optional().describe("Optional comma-separated list of song IDs to fetch specific songs"),
    },
  },
  async ({ userId, ids }) => {
    let endpoint = "/songs";
    const params = new URLSearchParams();

    if (ids) {
      params.append("ids", ids);
    } else if (userId) {
      params.append("userId", userId);
    }

    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    const result = await apiRequest(endpoint);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "get_song",
  {
    description: "Get a single song by its ID",
    inputSchema: {
      id: z.string().describe("The song ID to fetch"),
    },
  },
  async ({ id }) => {
    const result = await apiRequest(`/songs/${id}`);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "get_songs_by_user",
  {
    description: "Get all songs created by a specific user",
    inputSchema: {
      userId: z.string().describe("The user ID to fetch songs for"),
    },
  },
  async ({ userId }) => {
    const result = await apiRequest(`/songs/user/${userId}`);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "get_songs_in_list",
  {
    description: "Get all songs contained in a specific list",
    inputSchema: {
      listId: z.string().describe("The list ID to fetch songs from"),
    },
  },
  async ({ listId }) => {
    const result = await apiRequest(`/songs/list/${listId}`);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "upsert_song",
  {
    description: "Create a new song or update an existing one. If id is provided, updates that song; otherwise creates a new one.",
    inputSchema: {
      id: z.string().optional().describe("Optional song ID (for updates). If not provided, a new song is created."),
      title: z.string().describe("The song title"),
      chordsText: z.string().describe("The chord notation and lyrics"),
      isPublic: z.boolean().default(false).describe("Whether the song is publicly visible"),
      bpm: z.number().optional().describe("Beats per minute"),
      key: z.string().optional().describe("Musical key (e.g., 'C', 'Am', 'G#')"),
      voice: z.string().optional().describe("Vocal range or type"),
      tags: z.array(z.string()).optional().describe("Searchable tags for the song"),
      spotifyUrl: z.string().optional().describe("Spotify link to the song"),
      youtubeUrl: z.string().optional().describe("YouTube link to the song"),
      userId: z.string().optional().describe("Creator user ID"),
    },
  },
  async ({ id, title, chordsText, isPublic, bpm, key, voice, tags, spotifyUrl, youtubeUrl, userId }) => {
    const songData: Record<string, unknown> = {
      title,
      "chords-text": chordsText,
      public: isPublic,
      details: {},
      tags: tags || [],
    };

    if (id) songData.id = id;
    if (bpm) (songData.details as Record<string, unknown>).bpm = bpm;
    if (key) (songData.details as Record<string, unknown>).key = key;
    if (voice) (songData.details as Record<string, unknown>).voice = voice;
    if (spotifyUrl) songData.spotifyUrl = spotifyUrl;
    if (youtubeUrl) songData.youtubeUrl = youtubeUrl;
    if (userId) songData.user_id = userId;

    const result = await apiRequest("/songs", "POST", songData);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ============ LIST TOOLS ============

server.registerTool(
  "get_lists",
  {
    description: "Get lists from Bandmate. Returns public lists, or if userId is provided, returns user's lists plus public lists.",
    inputSchema: {
      userId: z.string().optional().describe("Optional user ID to filter lists"),
    },
  },
  async ({ userId }) => {
    let endpoint = "/lists";
    if (userId) {
      endpoint += `?userId=${encodeURIComponent(userId)}`;
    }

    const result = await apiRequest(endpoint);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "get_list",
  {
    description: "Get a single list by its ID",
    inputSchema: {
      id: z.string().describe("The list ID to fetch"),
    },
  },
  async ({ id }) => {
    const result = await apiRequest(`/lists/${id}`);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "upsert_list",
  {
    description: "Create a new list or update an existing one. Requires authentication.",
    inputSchema: {
      id: z.string().optional().describe("Optional list ID (for updates). If not provided, a new list is created."),
      name: z.string().optional().describe("The list name"),
      isPrivate: z.boolean().default(false).describe("Whether the list is private"),
      songs: z.array(z.string()).optional().describe("Array of song IDs in the list"),
      userId: z.string().optional().describe("Owner user ID"),
    },
  },
  async ({ id, name, isPrivate, songs, userId }) => {
    const listData: Record<string, unknown> = {
      private: isPrivate,
    };

    if (id) listData.id = id;
    if (name) listData.name = name;
    if (songs) listData.songs = songs;
    if (userId) listData.user_uid = userId;

    const result = await apiRequest("/lists", "POST", listData, true);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ============ ARTIST TOOLS ============

server.registerTool(
  "get_artists",
  {
    description: "Get all artists from Bandmate.",
    inputSchema: {},
  },
  async () => {
    const result = await apiRequest("/artists");
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "upsert_artist",
  {
    description: "Create a new artist or update an existing one. The artist ID is derived from the name (lowercased and trimmed), so upserting with the same name is idempotent.",
    inputSchema: {
      name: z.string().describe("The artist display name"),
    },
  },
  async ({ name }) => {
    const result = await apiRequest("/artists", "POST", { name });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ============ UTILITY TOOLS ============

server.registerTool(
  "search_songs",
  {
    description: "Search for songs by title or tags. Returns matching public songs.",
    inputSchema: {
      query: z.string().describe("Search query to match against song titles and tags"),
      userId: z.string().optional().describe("Optional user ID to include user's private songs in search"),
    },
  },
  async ({ query, userId }) => {
    let endpoint = "/songs";
    if (userId) {
      endpoint += `?userId=${encodeURIComponent(userId)}`;
    }

    const result = await apiRequest(endpoint) as { body?: Array<{ title?: string; tags?: string[] }> };
    const songs = result.body || result;

    const queryLower = query.toLowerCase();
    const filtered = (songs as Array<{ title?: string; tags?: string[] }>).filter((song) => {
      const titleMatch = song.title?.toLowerCase().includes(queryLower);
      const tagsMatch = song.tags?.some((tag: string) => tag.toLowerCase().includes(queryLower));
      return titleMatch || tagsMatch;
    });

    return {
      content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
    };
  }
);

// ============ EXPRESS SERVER ============

const app = express();

app.use(cors());
app.use(express.json());

// Store active transports for session management
const streamableTransports = new Map<string, StreamableHTTPServerTransport>();

// Health check endpoint for Cloud Run
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "healthy", service: "bandmate-mcp" });
});

// Root endpoint
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "bandmate-mcp",
    version: "1.0.0",
    description: "MCP server for Bandmate REST API",
    endpoints: {
      health: "/health",
      mcp: "/mcp",
    },
  });
});

// Streamable HTTP endpoint
app.all("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  let transport: StreamableHTTPServerTransport;

  if (sessionId && streamableTransports.has(sessionId)) {
    transport = streamableTransports.get(sessionId)!;
  } else if (!sessionId && req.method === "POST") {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: (newSessionId) => {
        streamableTransports.set(newSessionId, transport);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        streamableTransports.delete(transport.sessionId);
      }
    };

    await server.connect(transport);
  } else {
    res.status(400).json({ error: "Bad Request: missing session ID or not an initialization request" });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Bandmate MCP server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`MCP endpoint (Streamable HTTP): http://localhost:${PORT}/mcp`);
});
