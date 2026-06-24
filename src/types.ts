export type Presence = "online" | "idle" | "dnd" | "offline" | "streaming";

export type ChannelType =
  | "text"
  | "voice"
  | "stage"
  | "forum"
  | "announcement"
  | "rules";

export interface Role {
  id: string;
  name: string;
  color: string;
  permissions: string[];
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  category: string;
  topic: string;
  unread?: number;
  locked?: boolean;
  nsfw?: boolean;
  participants?: string[];
}

export interface AppSettings {
  streamerMode: boolean;
  compactMode: boolean;
  reduceMotion: boolean;
  pushToTalk: boolean;
  desktopNotifications: boolean;
  soundEffects: boolean;
  showUnreadBadges: boolean;
  developerMode: boolean;
}

export type ModerationReportStatus = "open" | "resolved" | "dismissed";
export type ModerationReportReason = "spam" | "harassment" | "unsafe" | "off-topic" | "other";

export interface ModerationReport {
  id: string;
  guildId: string;
  channelId: string;
  messageId: string;
  reporterId: string;
  targetUserId: string;
  reason: ModerationReportReason;
  details: string;
  status: ModerationReportStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ModerationAuditEntry {
  id: string;
  guildId: string;
  actorId: string;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
}

export interface AutoModSettings {
  spamFilter: boolean;
  linkFilter: boolean;
  inviteFilter: boolean;
  capsFilter: boolean;
}

export interface ModerationState {
  reports: ModerationReport[];
  auditLog: ModerationAuditEntry[];
  automod: AutoModSettings;
}

export interface GuildPerks {
  tier: number;
  uploadLimitMb: number;
  hdStreaming: boolean;
  customEmoji: boolean;
  customStickers: boolean;
  animatedAvatars: boolean;
  profileEffects: boolean;
  serverTag: string;
  enhancedRoleStyles: boolean;
  serverTheme: boolean;
  soundboard: boolean;
  vanityInvite: boolean;
}

export type NotificationLevel = "all" | "mentions";
export type VerificationLevel = "none" | "low" | "medium" | "high";
export type ExplicitMediaFilter = "off" | "members_without_roles" | "all_members";

export interface GuildSettings {
  description: string;
  rulesChannelId: string;
  systemChannelId: string;
  defaultNotificationLevel: NotificationLevel;
  verificationLevel: VerificationLevel;
  explicitMediaFilter: ExplicitMediaFilter;
  communityEnabled: boolean;
  discoveryEnabled: boolean;
  welcomeScreenEnabled: boolean;
  allowInvites: boolean;
  everyoneCanCreateChannels: boolean;
  require2faModeration: boolean;
  vanitySlug: string;
}

export interface Guild {
  id: string;
  name: string;
  initials: string;
  accent: string;
  boostLevel: number;
  features: string[];
  perks: GuildPerks;
  settings: GuildSettings;
  hosting?: {
    mode: "local";
    host: string;
    port: number;
    apiBaseUrl: string;
    dataPath: string;
  };
  roles: Role[];
  channels: Channel[];
}

export interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  status: Presence;
  roleIds: string[];
  bio: string;
  accent: string;
  bot?: boolean;
  profileEffect?: string;
  avatarDecoration?: string;
  serverTag?: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  reacted?: boolean;
}

export interface Attachment {
  name: string;
  type: "image" | "video" | "file";
  size: string;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  body: string;
  timestamp: string;
  edited?: boolean;
  pinned?: boolean;
  reactions: Reaction[];
  attachments?: Attachment[];
  threadCount?: number;
}

export interface DirectMessage {
  id: string;
  userId: string;
  lastMessage: string;
  unread?: number;
}

export interface EventItem {
  id: string;
  title: string;
  channelId: string;
  startsAt: string;
  attendees: number;
}
