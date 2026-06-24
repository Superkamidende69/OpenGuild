# OpenGuild Desktop

OpenGuild is an open-source, Discord-like desktop community app foundation built with Electron, React, TypeScript, and Vite.

It does not use Discord branding, assets, APIs, or proprietary code. The goal is to provide a self-hostable community/chat platform with familiar modern community features.

## Implemented In This First Build

- Desktop Electron shell with secure preload bridge.
- Local-first host service on `127.0.0.1` with persisted server/guild data.
- Server rail, guild switching, channel categories, text, rules, announcement, forum, voice, and stage channel types.
- Direct messages, message composer, local message sending, slash-command suggestions, reactions, pinned/thread indicators, attachments, and bot-style messages.
- Free premium-style perks for every local server: 500 MB upload metadata, HD stream indicators, custom emoji, custom stickers, server tags, enhanced role styles, profile effects, soundboard slots, vanity invite readiness, and server theming.
- Persisted server settings for overview, accent color, server tags, default channels, notification defaults, verification, media filtering, invites, discovery, welcome screen, and local moderation requirements.
- Voice dock with mute, deafen, screen share, and connection controls.
- Activity, roles, members, moderation queue, integrations, inbox, and settings panels.
- Command palette for channel and tool switching.
- Create-local-server flow with community, gaming, and work templates.
- Create-channel flow for text, voice, stage, forum, announcement, and rules channels.
- Persisted local settings for appearance, notifications, voice, privacy, and developer mode.
- Persisted local moderation with reports, AutoMod rules, message deletion, and audit log.
- Local seed data without demo people, fake DMs, fake messages, or fake scheduled events.
- Desktop packaging script through Electron Builder.

## Feature Targets

The UI is structured for these product areas:

- Accounts, profiles, avatars, presence, rich status, and streamer mode.
- Guilds, roles, permissions, invites, onboarding, discovery, and free perk tiers.
- Text chat, DMs, group DMs, reactions, threads, pins, mentions, markdown, search, and attachments.
- Voice, video, stage channels, screen sharing, device diagnostics, and noise controls.
- Forums, announcements, rules channels, inbox, notification controls, and audit logs.
- Moderation queues, AutoMod rules, reports, bans, kicks, timeouts, and safety actions.
- Bots, slash commands, webhooks, app directory, OAuth scopes, plugins, and themes.
- Self-hosted storage, push notifications, federation/discovery, and encrypted transports.

## Development

Use the bundled Codex runtime or a local Node.js 20+ install.

```bash
pnpm install
pnpm desktop
```

For browser-only development:

```bash
pnpm dev
```

`pnpm dev` starts both Vite and the local OpenGuild host. The host API runs at:

```text
http://127.0.0.1:4783
```

Run only the local host:

```bash
pnpm local-server
```

For production assets:

```bash
pnpm build
```

For an unpacked desktop build:

```bash
pnpm package
```

## Project Structure

```text
electron/
  main.cjs        Electron main process
  preload.cjs     Safe renderer bridge
src/
  App.tsx         Main product surface and local interactions
  localApi.ts     Renderer client for the local host API
  data.ts         Replaceable seed data
  types.ts        Shared domain models
  styles.css      Desktop UI system
server/
  local-server.cjs Local HTTP API and persisted guild host
```

## Local Hosting Model

OpenGuild is local-first. The desktop app starts a private localhost server before the window opens. In development, `pnpm dev` starts the same server beside Vite.

The local host stores data in `.openguild-data/` when running from this project folder. The packaged desktop app stores data in the app user-data directory. Each created server/guild gets its own folder:

```text
.openguild-data/
  openguild.db.json
  guilds/
    <guild-id>/
      guild.json
      messages.json
      uploads/
```

Current local API endpoints:

```text
GET  /api/health
GET  /api/state
GET  /api/events
POST /api/guilds
POST /api/guilds/:guildId/channels
PUT  /api/guilds/:guildId/settings
POST /api/conversations/:conversationId/messages
PUT  /api/settings
POST /api/moderation/reports
PATCH /api/moderation/reports/:reportId
DELETE /api/moderation/messages/:messageId
PUT  /api/moderation/automod
```

## Backend Roadmap

The current app is now a working local-hosted desktop prototype. To make it production-grade across multiple machines, wire these boundaries:

- Auth service with passwordless, OAuth, and session refresh.
- Realtime gateway using WebSocket/WebRTC signaling.
- Postgres-compatible persistence for users, guilds, roles, channels, messages, reports, and events.
- Object storage for uploads and media thumbnails.
- Voice/video SFU integration.
- Job workers for moderation rules, notifications, search indexing, and media processing.
- End-to-end permission checks shared by client and server.
