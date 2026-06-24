import type { DirectMessage, EventItem, Guild, GuildPerks, GuildSettings, Message, User } from "./types";

const freePerks = (tag: string): GuildPerks => ({
  tier: 3,
  uploadLimitMb: 500,
  hdStreaming: true,
  customEmoji: true,
  customStickers: true,
  animatedAvatars: true,
  profileEffects: true,
  serverTag: tag,
  enhancedRoleStyles: true,
  serverTheme: true,
  soundboard: true,
  vanityInvite: true
});

const serverSettings = (
  description: string,
  rulesChannelId: string,
  systemChannelId: string,
  vanitySlug: string
): GuildSettings => ({
  description,
  rulesChannelId,
  systemChannelId,
  defaultNotificationLevel: "mentions",
  verificationLevel: "low",
  explicitMediaFilter: "members_without_roles",
  communityEnabled: true,
  discoveryEnabled: false,
  welcomeScreenEnabled: true,
  allowInvites: true,
  everyoneCanCreateChannels: false,
  require2faModeration: true,
  vanitySlug
});

export const users: User[] = [
  {
    id: "u-you",
    name: "You",
    handle: "you@local",
    avatar: "YO",
    status: "online",
    roleIds: ["owner", "engineer"],
    bio: "Building OpenGuild locally.",
    accent: "#64d2b8",
    profileEffect: "Aurora",
    avatarDecoration: "Founder Ring",
    serverTag: "OG"
  }
];

export const guilds: Guild[] = [
  {
    id: "g-open",
    name: "OpenGuild Project",
    initials: "OG",
    accent: "#64d2b8",
    boostLevel: 3,
    features: ["Community", "Onboarding", "Discovery", "Self-hosted", "Free Perks"],
    perks: freePerks("OG"),
    settings: serverSettings(
      "Local-first OpenGuild development server.",
      "c-welcome",
      "c-announcements",
      "openguild"
    ),
    roles: [
      { id: "owner", name: "Owner", color: "#f6c85f", permissions: ["Administrator"] },
      { id: "admin", name: "Admin", color: "#ff8a65", permissions: ["Manage server", "Manage roles"] },
      { id: "mod", name: "Moderator", color: "#e66b75", permissions: ["Kick members", "Manage messages"] },
      { id: "engineer", name: "Engineer", color: "#64d2b8", permissions: ["Create channels", "Use beta features"] },
      { id: "member", name: "Member", color: "#b7bcc9", permissions: ["Send messages", "Join voice"] }
    ],
    channels: [
      {
        id: "c-welcome",
        name: "welcome",
        type: "rules",
        category: "Start Here",
        topic: "Rules, onboarding, and community entry points."
      },
      {
        id: "c-announcements",
        name: "announcements",
        type: "announcement",
        category: "Start Here",
        topic: "Project updates and release notes."
      },
      {
        id: "c-general",
        name: "general",
        type: "text",
        category: "Text Channels",
        topic: "Daily project discussion, ideas, and questions."
      },
      {
        id: "c-dev",
        name: "dev-chat",
        type: "text",
        category: "Text Channels",
        topic: "Architecture, pull requests, and implementation details."
      },
      {
        id: "c-showcase",
        name: "showcase",
        type: "forum",
        category: "Text Channels",
        topic: "Share plugins, themes, and app builds."
      },
      {
        id: "c-lounge",
        name: "Lounge",
        type: "voice",
        category: "Voice Channels",
        topic: "Drop-in voice chat.",
        participants: []
      }
    ]
  },
  {
    id: "g-games",
    name: "Game Night",
    initials: "GN",
    accent: "#ff8a65",
    boostLevel: 3,
    features: ["Voice", "Streaming", "Clips", "Free Perks"],
    perks: freePerks("GN"),
    settings: serverSettings("Local game nights, clips, and voice sessions.", "c-games-general", "c-clips", "game-night"),
    roles: [
      { id: "member", name: "Member", color: "#b7bcc9", permissions: ["Send messages", "Join voice"] },
      { id: "mod", name: "Moderator", color: "#e66b75", permissions: ["Manage messages"] }
    ],
    channels: [
      {
        id: "c-games-general",
        name: "general",
        type: "text",
        category: "Chat",
        topic: "Queue planning and highlights."
      },
      {
        id: "c-clips",
        name: "clips",
        type: "forum",
        category: "Chat",
        topic: "Post clips and builds."
      },
      {
        id: "c-party",
        name: "Party Voice",
        type: "voice",
        category: "Voice",
        topic: "Voice party.",
        participants: []
      }
    ]
  },
  {
    id: "g-builders",
    name: "Builders Guild",
    initials: "BG",
    accent: "#b98cff",
    boostLevel: 3,
    features: ["Forum", "Threads", "Roles", "Automations", "Free Perks"],
    perks: freePerks("BG"),
    settings: serverSettings("Build notes, project threads, and local automations.", "c-builds", "c-builds", "builders"),
    roles: [
      { id: "member", name: "Member", color: "#b7bcc9", permissions: ["Send messages"] },
      { id: "engineer", name: "Engineer", color: "#64d2b8", permissions: ["Create channels"] }
    ],
    channels: [
      {
        id: "c-builds",
        name: "builds",
        type: "text",
        category: "Workshop",
        topic: "Post active builds and debugging notes."
      },
      {
        id: "c-ideas",
        name: "ideas",
        type: "forum",
        category: "Workshop",
        topic: "Feature ideas and RFCs."
      },
      {
        id: "c-focus",
        name: "Focus Room",
        type: "voice",
        category: "Voice",
        topic: "Quiet working room.",
        participants: []
      }
    ]
  }
];

export const directMessages: DirectMessage[] = [];

export const seedMessages: Message[] = [];

export const events: EventItem[] = [];
