# OpenGuild Desktop

OpenGuild is a fully open-source desktop community chat app built as a local-first Discord alternative.

It is designed for people who want the familiar shape of modern server-based chat without closed-source lock-in, paid feature gates, or dependency on Discord services. OpenGuild does not use Discord branding, assets, APIs, client code, or proprietary systems. It is an independent project built with Electron, React, TypeScript, Vite, and a local Node.js host.

## Why OpenGuild

- Fully open source under the MIT license.
- Local-first by default: the desktop app starts a private host on `127.0.0.1`.
- Every server/guild created in the app is hosted locally and saved to local disk.
- Premium-style community features are unlocked for free.
- No subscriptions, paid boosts, paid uploads, paid cosmetics, or checkout flow.
- No fake seeded people, fake DMs, fake messages, or fake events.
- Built to become self-hostable, extensible, and community-owned.

## Current Status

OpenGuild is a working desktop prototype, not yet a production replacement for every Discord workflow.

The current app already includes the desktop shell, local host, server creation, channel creation, chat UI, local persistence, moderation tooling, settings, and free premium-style features. The next major milestones are full role permissions, invite management, real accounts, realtime networking, voice/video infrastructure, and production-ready storage.

## Implemented

- Desktop Electron app with a secure preload bridge.
- Local-first host service on `127.0.0.1` with persisted server/guild data.
- Server rail, guild switching, channel categories, and local server creation.
- Text, rules, announcement, forum, voice, and stage channel types.
- Create-channel flow for text, voice, stage, forum, announcement, and rules channels.
- Direct messages shell, message composer, slash-command suggestions, reactions, pinned/thread indicators, attachments, and bot-style message support.
- Attachment-only local messages with file metadata.
- Voice dock with mute, deafen, screen share, and connection controls.
- Activity, roles, members, moderation queue, integrations, inbox, perks, and settings panels.
- Command palette for channel and tool switching.
- Persisted server settings for overview, accent color, server tags, default channels, notification defaults, verification, media filtering, invites, discovery, welcome screen, and local moderation requirements.
- Persisted desktop settings for appearance, notifications, voice, privacy, and developer mode.
- Persisted local moderation with reports, AutoMod rules, message deletion, and audit log.
- Desktop packaging through Electron Builder.

## Free Premium-Style Features

OpenGuild treats premium-style features as normal community features:

- 500 MB upload metadata support.
- HD stream indicators.
- Custom emoji.
- Custom stickers.
- Server tags.
- Server themes.
- Enhanced role styles.
- Profile effects.
- Avatar decoration fields.
- Soundboard readiness.
- Vanity invite readiness.

These features are local-first and free for every server.

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
  main.cjs         Electron main process
  preload.cjs      Safe renderer bridge
src/
  App.tsx          Main product surface and local interactions
  localApi.ts      Renderer client for the local host API
  data.ts          Replaceable seed data
  types.ts         Shared domain models
  styles.css       Desktop UI system
server/
  local-server.cjs Local HTTP API and persisted guild host
```

## Roadmap

The goal is a complete open-source community platform with Discord-like workflows and local/self-hosted ownership.

- Role and permission editor.
- Invite management and vanity invite routing.
- Account creation, login, sessions, and profile editing.
- Realtime gateway using WebSocket/WebRTC signaling.
- Voice, video, screen share, and stage channel infrastructure.
- Production database support for users, guilds, roles, channels, messages, reports, and settings.
- Object storage for uploads, media thumbnails, and attachments.
- Thread creation, message search, markdown rendering, pins, mentions, and read states.
- Bot, slash command, webhook, OAuth, and plugin systems.
- Federation or discovery for self-hosted communities.
- End-to-end permission checks shared by client and server.

## Trademark Notice

OpenGuild is not affiliated with, endorsed by, or connected to Discord Inc. Discord is a trademark of its respective owner. OpenGuild is an independent open-source alternative and intentionally avoids Discord branding, assets, APIs, and proprietary code.
