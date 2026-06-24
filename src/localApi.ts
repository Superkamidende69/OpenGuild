import type {
  AppSettings,
  AutoModSettings,
  Channel,
  ChannelType,
  DirectMessage,
  EventItem,
  Guild,
  Message,
  ModerationReport,
  ModerationReportReason,
  ModerationReportStatus,
  ModerationState,
  User
} from "./types";

export interface LocalHostingState {
  mode: "local";
  startedAt: string;
  dataDir: string;
  apiBaseUrl: string;
}

export interface LocalApiState {
  users: User[];
  guilds: Guild[];
  directMessages: DirectMessage[];
  messages: Message[];
  events: EventItem[];
  settings: AppSettings;
  moderation: ModerationState;
  hosting: LocalHostingState;
}

export interface CreateGuildInput {
  name: string;
  template: "community" | "gaming" | "work";
}

export interface CreateChannelInput {
  name: string;
  type: Exclude<ChannelType, "stage">;
  category: string;
  topic: string;
}

export interface CreateReportInput {
  guildId: string;
  channelId: string;
  messageId: string;
  reporterId: string;
  targetUserId: string;
  reason: ModerationReportReason;
  details: string;
}

const fallbackApiBaseUrl = "http://127.0.0.1:4783";

export async function resolveApiBaseUrl() {
  try {
    return (await window.openGuild?.getApiBaseUrl()) || fallbackApiBaseUrl;
  } catch {
    return fallbackApiBaseUrl;
  }
}

export async function fetchLocalState(apiBaseUrl: string) {
  const response = await fetch(`${apiBaseUrl}/api/state`);
  if (!response.ok) {
    throw new Error(`Local server returned ${response.status}`);
  }
  return (await response.json()) as LocalApiState;
}

export async function createLocalGuild(apiBaseUrl: string, input: CreateGuildInput) {
  const response = await fetch(`${apiBaseUrl}/api/guilds`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unable to create server" }));
    throw new Error(error.error || "Unable to create server");
  }

  return (await response.json()) as { guild: Guild };
}

export async function createLocalChannel(apiBaseUrl: string, guildId: string, input: CreateChannelInput) {
  const response = await fetch(`${apiBaseUrl}/api/guilds/${encodeURIComponent(guildId)}/channels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unable to create channel" }));
    throw new Error(error.error || "Unable to create channel");
  }

  return (await response.json()) as { channel: Channel };
}

export async function updateLocalSettings(apiBaseUrl: string, settings: AppSettings) {
  const response = await fetch(`${apiBaseUrl}/api/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(settings)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unable to save settings" }));
    throw new Error(error.error || "Unable to save settings");
  }

  return (await response.json()) as { settings: AppSettings };
}

export async function createModerationReport(apiBaseUrl: string, input: CreateReportInput) {
  const response = await fetch(`${apiBaseUrl}/api/moderation/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unable to create report" }));
    throw new Error(error.error || "Unable to create report");
  }

  return (await response.json()) as { report: ModerationReport; moderation: ModerationState };
}

export async function updateModerationReport(
  apiBaseUrl: string,
  reportId: string,
  status: Exclude<ModerationReportStatus, "open">,
  actorId: string
) {
  const response = await fetch(`${apiBaseUrl}/api/moderation/reports/${encodeURIComponent(reportId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status, actorId })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unable to update report" }));
    throw new Error(error.error || "Unable to update report");
  }

  return (await response.json()) as { report: ModerationReport; moderation: ModerationState };
}

export async function deleteModeratedMessage(apiBaseUrl: string, messageId: string, actorId: string) {
  const response = await fetch(`${apiBaseUrl}/api/moderation/messages/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ actorId })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unable to delete message" }));
    throw new Error(error.error || "Unable to delete message");
  }

  return (await response.json()) as { messages: Message[]; moderation: ModerationState };
}

export async function updateAutoMod(apiBaseUrl: string, automod: AutoModSettings, actorId: string) {
  const response = await fetch(`${apiBaseUrl}/api/moderation/automod`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ ...automod, actorId })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unable to update AutoMod" }));
    throw new Error(error.error || "Unable to update AutoMod");
  }

  return (await response.json()) as { moderation: ModerationState };
}

export async function sendLocalMessage(
  apiBaseUrl: string,
  conversationId: string,
  authorId: string,
  body: string
) {
  const response = await fetch(`${apiBaseUrl}/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ authorId, body })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unable to send message" }));
    throw new Error(error.error || "Unable to send message");
  }

  return (await response.json()) as { message: Message };
}
