const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const os = require("node:os");

const DEFAULT_PORT = Number(process.env.OPENGUILD_PORT || 4783);
const startedAt = new Date().toISOString();
const clients = new Set();
const demoUserIds = new Set(["u-aria", "u-mina", "u-sol", "u-nova", "u-ren"]);
const defaultSettings = {
  streamerMode: false,
  compactMode: false,
  reduceMotion: false,
  pushToTalk: true,
  desktopNotifications: true,
  soundEffects: true,
  showUnreadBadges: true,
  developerMode: false
};
const allowedChannelTypes = new Set(["text", "voice", "stage", "forum", "announcement", "rules"]);
const defaultAutoMod = {
  spamFilter: true,
  linkFilter: false,
  inviteFilter: false,
  capsFilter: false
};
const defaultGuildPerks = (tag = "OG") => ({
  tier: 3,
  uploadLimitMb: 500,
  hdStreaming: true,
  customEmoji: true,
  customStickers: true,
  animatedAvatars: true,
  profileEffects: true,
  serverTag: String(tag || "OG").slice(0, 4).toUpperCase(),
  enhancedRoleStyles: true,
  serverTheme: true,
  soundboard: true,
  vanityInvite: true
});
const allowedNotificationLevels = new Set(["all", "mentions"]);
const allowedVerificationLevels = new Set(["none", "low", "medium", "high"]);
const allowedExplicitMediaFilters = new Set(["off", "members_without_roles", "all_members"]);
const allowedRolePermissions = new Set([
  "Administrator",
  "View channels",
  "Manage server",
  "Manage roles",
  "Manage channels",
  "Create channels",
  "Manage messages",
  "Send messages",
  "Attach files",
  "Use custom emoji",
  "Use custom stickers",
  "Create threads",
  "Mention everyone",
  "Join voice",
  "Speak",
  "Stream",
  "Use soundboard",
  "Kick members",
  "Ban members",
  "Timeout members",
  "View audit log",
  "Manage webhooks",
  "Use beta features"
]);
const allowedReportReasons = new Set(["spam", "harassment", "unsafe", "off-topic", "other"]);
const allowedReportStatuses = new Set(["resolved", "dismissed"]);

function defaultDataDir() {
  if (process.env.OPENGUILD_DATA_DIR) {
    return process.env.OPENGUILD_DATA_DIR;
  }

  if (process.env.OPENGUILD_DESKTOP_DATA_DIR) {
    return path.join(process.env.OPENGUILD_DESKTOP_DATA_DIR, "local-host");
  }

  return path.join(process.cwd(), ".openguild-data");
}

function createSeedData(dataDir, port) {
  const guilds = [
    {
      id: "g-open",
      name: "OpenGuild Project",
      initials: "OG",
      accent: "#64d2b8",
      boostLevel: 3,
      features: ["Community", "Onboarding", "Discovery", "Self-hosted", "Free Perks"],
      perks: defaultGuildPerks("OG"),
      hosting: localHosting("g-open", dataDir, port),
      roles: [
        { id: "owner", name: "Owner", color: "#f6c85f", permissions: ["Administrator"], hoist: true, mentionable: false, position: 100, managed: true },
        { id: "admin", name: "Admin", color: "#ff8a65", permissions: ["Manage server", "Manage roles"], hoist: true, mentionable: false, position: 80 },
        { id: "mod", name: "Moderator", color: "#e66b75", permissions: ["Kick members", "Manage messages"], hoist: true, mentionable: true, position: 60 },
        { id: "engineer", name: "Engineer", color: "#64d2b8", permissions: ["Create channels", "Use beta features"], hoist: true, mentionable: true, position: 40 },
        { id: "member", name: "Member", color: "#b7bcc9", permissions: ["View channels", "Send messages", "Join voice"], hoist: false, mentionable: false, position: 0, managed: true }
      ],
      channels: [
        {
          id: "c-welcome",
          name: "welcome",
          type: "rules",
          category: "Start Here",
          topic: "Rules, onboarding, and community entry points.",
          unread: 1
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
      perks: defaultGuildPerks("GN"),
      hosting: localHosting("g-games", dataDir, port),
      roles: [
        { id: "mod", name: "Moderator", color: "#e66b75", permissions: ["Manage messages"], hoist: true, mentionable: true, position: 60 },
        { id: "member", name: "Member", color: "#b7bcc9", permissions: ["View channels", "Send messages", "Join voice"], hoist: false, mentionable: false, position: 0, managed: true }
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
      perks: defaultGuildPerks("BG"),
      hosting: localHosting("g-builders", dataDir, port),
      roles: [
        { id: "engineer", name: "Engineer", color: "#64d2b8", permissions: ["Create channels"], hoist: true, mentionable: true, position: 40 },
        { id: "member", name: "Member", color: "#b7bcc9", permissions: ["View channels", "Send messages"], hoist: false, mentionable: false, position: 0, managed: true }
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

  return {
    meta: {
      schemaVersion: 5,
      createdAt: startedAt,
      localOnly: true
    },
    users: [
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
    ],
    guilds,
    directMessages: [],
    messages: [],
    events: [],
    invites: [],
    settings: { ...defaultSettings },
    moderation: {
      reports: [],
      auditLog: [],
      automod: { ...defaultAutoMod }
    }
  };
}

function localHosting(guildId, dataDir, port) {
  return {
    mode: "local",
    host: "127.0.0.1",
    port,
    apiBaseUrl: `http://127.0.0.1:${port}`,
    dataPath: path.join(dataDir, "guilds", guildId)
  };
}

function loadDb(dataDir, port) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(path.join(dataDir, "guilds"), { recursive: true });
  const dbPath = path.join(dataDir, "openguild.db.json");

  if (fs.existsSync(dbPath)) {
    const rawDb = fs.readFileSync(dbPath, "utf8").replace(/^\uFEFF/, "");
    const db = JSON.parse(rawDb);
    db.guilds = db.guilds.map((guild) => ({
      ...guild,
      hosting: localHosting(guild.id, dataDir, port)
    }));
    sanitizeDb(db);
    persistDb(dataDir, db);
    return db;
  }

  const db = createSeedData(dataDir, port);
  sanitizeDb(db);
  persistDb(dataDir, db);
  return db;
}

function sanitizeDb(db) {
  db.meta = {
    ...(db.meta || {}),
    schemaVersion: 5,
    localOnly: true
  };
  db.users = (db.users || []).filter((user) => !demoUserIds.has(user.id));
  if (!db.users.some((user) => user.id === "u-you")) {
    db.users.unshift({
      id: "u-you",
      name: "You",
      handle: "you@local",
      avatar: "YO",
      status: "online",
      roleIds: ["owner"],
      bio: "Building OpenGuild locally.",
      accent: "#64d2b8",
      profileEffect: "Aurora",
      avatarDecoration: "Founder Ring",
      serverTag: "OG"
    });
  }
  db.users = db.users.map((user) =>
    user.id === "u-you"
      ? {
          ...user,
          profileEffect: user.profileEffect || "Aurora",
          avatarDecoration: user.avatarDecoration || "Founder Ring",
          serverTag: user.serverTag || "OG"
        }
      : user
  );

  db.directMessages = (db.directMessages || []).filter((dm) => !demoUserIds.has(dm.userId));
  db.events = [];
  db.settings = {
    ...defaultSettings,
    ...(db.settings || {})
  };
  db.moderation = {
    reports: Array.isArray(db.moderation?.reports)
      ? db.moderation.reports.filter(
          (report) => !demoUserIds.has(report.reporterId) && !demoUserIds.has(report.targetUserId)
        )
      : [],
    auditLog: Array.isArray(db.moderation?.auditLog)
      ? db.moderation.auditLog.filter((entry) => !demoUserIds.has(entry.actorId)).slice(0, 100)
      : [],
    automod: {
      ...defaultAutoMod,
      ...(db.moderation?.automod || {})
    }
  };
  db.messages = (db.messages || []).filter(
    (message) => !demoUserIds.has(message.authorId) && !String(message.channelId).startsWith("dm-")
  );

  db.guilds = (db.guilds || []).map((guild) => {
    const normalizedGuild = {
      ...guild,
      boostLevel: Math.max(typeof guild.boostLevel === "number" ? guild.boostLevel : 0, 3),
      features: Array.from(
        new Set([
          ...(guild.features || []).filter((feature) => feature !== "Events" && feature !== "Verified Bots"),
          "Free Perks"
        ])
      ),
      perks: normalizeGuildPerks(guild),
      channels: (guild.channels || [])
        .map((channel) => ({
          ...channel,
          unread: undefined,
          participants: Array.isArray(channel.participants)
            ? channel.participants.filter((participantId) => !demoUserIds.has(participantId))
            : channel.participants
        }))
    };
    normalizedGuild.settings = normalizeGuildSettings(normalizedGuild);
    normalizedGuild.roles = normalizeGuildRoles(normalizedGuild.roles);
    return normalizedGuild;
  });

  db.invites = normalizeInvites(db.invites, db.guilds);

  const validRoleIds = new Set(db.guilds.flatMap((guild) => guild.roles.map((role) => role.id)));
  db.users = db.users.map((user) => ({
    ...user,
    roleIds: Array.from(new Set([...(user.roleIds || []).filter((roleId) => validRoleIds.has(roleId)), "member"]))
  }));
}

function normalizeGuildPerks(guild) {
  const base = defaultGuildPerks(guild.initials || initialsFor(guild.name || "OG"));
  const current = guild.perks && typeof guild.perks === "object" ? guild.perks : {};
  return {
    ...base,
    ...current,
    tier: Math.max(Number(current.tier || guild.boostLevel || base.tier), 3),
    uploadLimitMb: Math.max(Number(current.uploadLimitMb || base.uploadLimitMb), 500),
    serverTag: String(current.serverTag || base.serverTag).slice(0, 4).toUpperCase(),
    hdStreaming: true,
    customEmoji: true,
    customStickers: true,
    animatedAvatars: true,
    profileEffects: true,
    enhancedRoleStyles: true,
    serverTheme: true,
    soundboard: true,
    vanityInvite: true
  };
}

function defaultGuildSettings(guild) {
  const channels = Array.isArray(guild.channels) ? guild.channels : [];
  const firstChannel = channels[0]?.id || "";
  const rulesChannel = channels.find((channel) => channel.type === "rules")?.id || firstChannel;
  const systemChannel =
    channels.find((channel) => channel.type === "announcement")?.id ||
    channels.find((channel) => channel.type === "text")?.id ||
    firstChannel;

  return {
    description: `${guild.name || "This server"} is hosted locally on this machine.`,
    rulesChannelId: rulesChannel,
    systemChannelId: systemChannel,
    defaultNotificationLevel: "mentions",
    verificationLevel: "low",
    explicitMediaFilter: "members_without_roles",
    communityEnabled: true,
    discoveryEnabled: false,
    welcomeScreenEnabled: true,
    allowInvites: true,
    everyoneCanCreateChannels: false,
    require2faModeration: true,
    vanitySlug: slugify(guild.name || "local-server")
  };
}

function normalizeGuildSettings(guild) {
  const base = defaultGuildSettings(guild);
  const current = guild.settings && typeof guild.settings === "object" ? guild.settings : {};
  const channels = Array.isArray(guild.channels) ? guild.channels : [];
  const channelIds = new Set(channels.map((channel) => channel.id));
  const nextRulesChannelId = channelIds.has(current.rulesChannelId) ? current.rulesChannelId : base.rulesChannelId;
  const nextSystemChannelId = channelIds.has(current.systemChannelId) ? current.systemChannelId : base.systemChannelId;

  return {
    ...base,
    ...current,
    description: sanitizeLimitedText(current.description || base.description, 180),
    rulesChannelId: nextRulesChannelId,
    systemChannelId: nextSystemChannelId,
    defaultNotificationLevel: allowedNotificationLevels.has(current.defaultNotificationLevel)
      ? current.defaultNotificationLevel
      : base.defaultNotificationLevel,
    verificationLevel: allowedVerificationLevels.has(current.verificationLevel)
      ? current.verificationLevel
      : base.verificationLevel,
    explicitMediaFilter: allowedExplicitMediaFilters.has(current.explicitMediaFilter)
      ? current.explicitMediaFilter
      : base.explicitMediaFilter,
    communityEnabled: current.communityEnabled !== false,
    discoveryEnabled: Boolean(current.discoveryEnabled),
    welcomeScreenEnabled: current.welcomeScreenEnabled !== false,
    allowInvites: current.allowInvites !== false,
    everyoneCanCreateChannels: Boolean(current.everyoneCanCreateChannels),
    require2faModeration: current.require2faModeration !== false,
    vanitySlug: slugify(current.vanitySlug || base.vanitySlug)
  };
}

function normalizeGuildRoles(roles) {
  const sourceRoles = Array.isArray(roles) ? roles.filter((role) => role?.id !== "bot") : [];
  const normalized = sourceRoles
    .map((role, index) => normalizeRole(role, index))
    .filter(Boolean);
  const byId = new Map(normalized.map((role) => [role.id, role]));

  if (!byId.has("owner")) {
    byId.set("owner", normalizeRole({
      id: "owner",
      name: "Owner",
      color: "#f6c85f",
      permissions: ["Administrator"],
      hoist: true,
      mentionable: false,
      position: 100,
      managed: true
    }));
  }

  if (!byId.has("member")) {
    byId.set("member", normalizeRole({
      id: "member",
      name: "Member",
      color: "#b7bcc9",
      permissions: ["View channels", "Send messages", "Join voice"],
      hoist: false,
      mentionable: false,
      position: 0,
      managed: true
    }));
  }

  byId.set("owner", {
    ...byId.get("owner"),
    managed: true,
    hoist: true,
    position: Math.max(Number(byId.get("owner").position || 0), 100),
    permissions: ["Administrator"]
  });
  byId.set("member", {
    ...byId.get("member"),
    managed: true,
    position: 0
  });

  return Array.from(byId.values()).sort((a, b) => b.position - a.position || a.name.localeCompare(b.name));
}

function normalizeRole(role, fallbackPosition = 0) {
  if (!role || typeof role !== "object") {
    return null;
  }

  const id = sanitizeRoleId(role.id || role.name);
  if (!id) {
    return null;
  }

  const permissions = Array.isArray(role.permissions)
    ? Array.from(new Set(role.permissions.filter((permission) => allowedRolePermissions.has(permission))))
    : [];

  return {
    id,
    name: sanitizeLimitedText(role.name || id, 40) || id,
    color: typeof role.color === "string" && /^#[0-9a-f]{6}$/i.test(role.color) ? role.color.toLowerCase() : "#b7bcc9",
    permissions,
    hoist: Boolean(role.hoist),
    mentionable: Boolean(role.mentionable),
    position: Number.isFinite(Number(role.position)) ? Number(role.position) : fallbackPosition,
    managed: role.managed === true || id === "owner" || id === "member"
  };
}

function sanitizeRoleId(value) {
  return slugify(String(value || "role")).slice(0, 40);
}

function sanitizeLimitedText(value, maxLength) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function persistDb(dataDir, db) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(path.join(dataDir, "guilds"), { recursive: true });
  fs.writeFileSync(path.join(dataDir, "openguild.db.json"), JSON.stringify(db, null, 2));

  for (const guild of db.guilds) {
    const guildDir = path.join(dataDir, "guilds", guild.id);
    fs.mkdirSync(path.join(guildDir, "uploads"), { recursive: true });
    fs.writeFileSync(path.join(guildDir, "guild.json"), JSON.stringify(guild, null, 2));
    fs.writeFileSync(
      path.join(guildDir, "messages.json"),
      JSON.stringify(
        db.messages.filter((message) =>
          guild.channels.some((channel) => channel.id === message.channelId)
        ),
        null,
        2
      )
    );
  }
}

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function createId(prefix, value) {
  const slug = slugify(value);
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${prefix}-${slug || "local"}-${suffix}`;
}

function initialsFor(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 3) || "LG";
}

function createGuild(body, db, dataDir, port) {
  const name = String(body.name || "").trim();
  if (name.length < 2) {
    const error = new Error("Server name must be at least 2 characters.");
    error.statusCode = 400;
    throw error;
  }

  const id = createId("g", name);
  const accentChoices = ["#64d2b8", "#ff8a65", "#f6c85f", "#b98cff", "#7ea7ff", "#e66b75"];
  const accent = accentChoices[db.guilds.length % accentChoices.length];
  const template = String(body.template || "community");

  const guild = {
    id,
    name,
    initials: initialsFor(name),
    accent,
    boostLevel: 3,
    features:
      template === "gaming"
        ? ["Voice", "Clips", "Roles", "Free Perks"]
        : template === "work"
          ? ["Threads", "Forums", "Roles", "Audit Log", "Free Perks"]
          : ["Community", "Onboarding", "Moderation", "Free Perks"],
    perks: defaultGuildPerks(initialsFor(name)),
    hosting: localHosting(id, dataDir, port),
    roles: [
      { id: "owner", name: "Owner", color: "#f6c85f", permissions: ["Administrator"], hoist: true, mentionable: false, position: 100, managed: true },
      { id: "mod", name: "Moderator", color: "#e66b75", permissions: ["Manage messages", "Timeout members"], hoist: true, mentionable: true, position: 60 },
      { id: "member", name: "Member", color: "#b7bcc9", permissions: ["View channels", "Send messages", "Join voice"], hoist: false, mentionable: false, position: 0, managed: true }
    ],
    channels: [
      {
        id: createId("c", `${name} welcome`),
        name: "welcome",
        type: "rules",
        category: "Start Here",
        topic: `Welcome to ${name}. This server is hosted locally on this machine.`
      },
      {
        id: createId("c", `${name} announcements`),
        name: "announcements",
        type: "announcement",
        category: "Start Here",
        topic: "Local announcements and server updates."
      },
      {
        id: createId("c", `${name} general`),
        name: "general",
        type: "text",
        category: "Text Channels",
        topic: `General chat for ${name}.`
      },
      {
        id: createId("c", `${name} forum`),
        name: template === "work" ? "roadmap" : "showcase",
        type: "forum",
        category: "Text Channels",
        topic: "Local forum posts and threads."
      },
      {
        id: createId("c", `${name} lounge`),
        name: template === "gaming" ? "Party Voice" : "Lounge",
        type: "voice",
        category: "Voice Channels",
        topic: "Local voice room placeholder.",
        participants: []
      }
    ]
  };
  guild.settings = defaultGuildSettings(guild);

  db.guilds.push(guild);
  db.messages.push({
    id: createId("m", `${name} welcome`),
    channelId: guild.channels[0].id,
    authorId: "u-you",
    body: `${name} is now hosted locally. Data lives in ${guild.hosting.dataPath}.`,
    timestamp: formatTime(),
    reactions: [{ emoji: "host", count: 1 }],
    pinned: true
  });

  persistDb(dataDir, db);
  broadcast({ type: "guild.created", guild });
  return guild;
}

function createChannel(guildId, body, db, dataDir) {
  const guild = db.guilds.find((candidate) => candidate.id === guildId);
  if (!guild) {
    const error = new Error("Server not found.");
    error.statusCode = 404;
    throw error;
  }

  const name = slugify(String(body.name || "new-channel")) || "new-channel";
  const type = allowedChannelTypes.has(body.type) ? body.type : "text";
  const channel = {
    id: createId("c", `${guild.name} ${name}`),
    name,
    type,
    category: String(body.category || defaultCategoryForChannel(type)).trim() || defaultCategoryForChannel(type),
    topic: String(body.topic || `Local ${name} channel.`).trim() || `Local ${name} channel.`,
    participants: type === "voice" || type === "stage" ? [] : undefined
  };

  guild.channels.push(channel);
  persistDb(dataDir, db);
  broadcast({ type: "channel.created", guildId, channel });
  return channel;
}

function updateGuildSettings(guildId, body, db, dataDir) {
  const guild = db.guilds.find((candidate) => candidate.id === guildId);
  if (!guild) {
    const error = new Error("Server not found.");
    error.statusCode = 404;
    throw error;
  }

  if (typeof body.name === "string") {
    const name = sanitizeLimitedText(body.name, 64);
    if (name.length < 2) {
      const error = new Error("Server name must be at least 2 characters.");
      error.statusCode = 400;
      throw error;
    }
    guild.name = name;
  }

  if (typeof body.initials === "string") {
    guild.initials = sanitizeInitials(body.initials || initialsFor(guild.name));
  } else {
    guild.initials = sanitizeInitials(guild.initials || initialsFor(guild.name));
  }

  if (typeof body.accent === "string" && /^#[0-9a-f]{6}$/i.test(body.accent)) {
    guild.accent = body.accent.toLowerCase();
  }

  if (typeof body.serverTag === "string") {
    guild.perks = {
      ...normalizeGuildPerks(guild),
      serverTag: sanitizeInitials(body.serverTag || guild.initials).slice(0, 4)
    };
  } else {
    guild.perks = normalizeGuildPerks(guild);
  }

  const incomingSettings = body.settings && typeof body.settings === "object" ? body.settings : {};
  const currentSettings = normalizeGuildSettings(guild);
  guild.settings = normalizeGuildSettings({
    ...guild,
    settings: {
      ...currentSettings,
      ...Object.fromEntries(
        Object.entries(incomingSettings).filter(([key]) => Object.prototype.hasOwnProperty.call(currentSettings, key))
      )
    }
  });

  persistDb(dataDir, db);
  broadcast({ type: "guild.settings.updated", guild });
  return guild;
}

function updateGuildRoles(guildId, body, db, dataDir) {
  const guild = db.guilds.find((candidate) => candidate.id === guildId);
  if (!guild) {
    const error = new Error("Server not found.");
    error.statusCode = 404;
    throw error;
  }

  const incomingRoles = Array.isArray(body.roles) ? body.roles : [];
  if (incomingRoles.length === 0) {
    const error = new Error("At least one role is required.");
    error.statusCode = 400;
    throw error;
  }

  const existingManagedRoles = new Map((guild.roles || []).filter((role) => role.managed).map((role) => [role.id, role]));
  const nextRoles = normalizeGuildRoles([
    ...incomingRoles,
    ...Array.from(existingManagedRoles.values()).filter((role) => !incomingRoles.some((incoming) => incoming.id === role.id))
  ]);

  if (!nextRoles.some((role) => role.id === "owner") || !nextRoles.some((role) => role.id === "member")) {
    const error = new Error("Owner and Member roles are required.");
    error.statusCode = 400;
    throw error;
  }

  guild.roles = nextRoles;

  const validRoleIds = new Set(nextRoles.map((role) => role.id));
  db.users = db.users.map((user) => ({
    ...user,
    roleIds: Array.from(new Set([...(user.roleIds || []).filter((roleId) => validRoleIds.has(roleId)), "member"]))
  }));

  addAuditEntry(db, guild.id, body.actorId || "u-you", "Roles updated", "roles", `${nextRoles.length} roles saved`);
  persistDb(dataDir, db);
  broadcast({ type: "guild.roles.updated", guild, users: db.users, moderation: db.moderation });
  return guild;
}

function normalizeInvites(invites, guilds) {
  if (!Array.isArray(invites)) {
    return [];
  }

  const guildById = new Map(guilds.map((guild) => [guild.id, guild]));
  const seenCodes = new Set();

  return invites
    .map((invite) => normalizeInvite(invite, guildById, seenCodes))
    .filter(Boolean);
}

function normalizeInvite(invite, guildById, seenCodes = new Set()) {
  if (!invite || typeof invite !== "object") {
    return null;
  }

  const guild = guildById.get(String(invite.guildId || ""));
  if (!guild) {
    return null;
  }

  const channel = guild.channels.find((candidate) => candidate.id === invite.channelId) || guild.channels[0];
  if (!channel) {
    return null;
  }

  const code = sanitizeInviteCode(invite.code || createInviteCode(seenCodes));
  if (!code || seenCodes.has(code)) {
    return null;
  }
  seenCodes.add(code);

  const maxUses = Number(invite.maxUses);
  const uses = Math.max(0, Number(invite.uses || 0));
  const expiresAt = typeof invite.expiresAt === "string" && !Number.isNaN(new Date(invite.expiresAt).getTime())
    ? invite.expiresAt
    : null;

  return {
    id: String(invite.id || createId("i", code)),
    guildId: guild.id,
    channelId: channel.id,
    code,
    inviterId: String(invite.inviterId || "u-you"),
    uses,
    maxUses: Number.isFinite(maxUses) && maxUses > 0 ? Math.min(10000, Math.floor(maxUses)) : null,
    temporary: Boolean(invite.temporary),
    createdAt: typeof invite.createdAt === "string" ? invite.createdAt : new Date().toISOString(),
    expiresAt,
    revoked: Boolean(invite.revoked)
  };
}

function listGuildInvites(guildId, db) {
  const guild = db.guilds.find((candidate) => candidate.id === guildId);
  if (!guild) {
    const error = new Error("Server not found.");
    error.statusCode = 404;
    throw error;
  }

  return db.invites.filter((invite) => invite.guildId === guild.id);
}

function createInvite(guildId, body, db, dataDir, port) {
  const guild = db.guilds.find((candidate) => candidate.id === guildId);
  if (!guild) {
    const error = new Error("Server not found.");
    error.statusCode = 404;
    throw error;
  }

  guild.settings = normalizeGuildSettings(guild);
  if (!guild.settings.allowInvites) {
    const error = new Error("Invites are disabled for this server.");
    error.statusCode = 403;
    throw error;
  }

  const channel = guild.channels.find((candidate) => candidate.id === body.channelId) || guild.channels[0];
  if (!channel) {
    const error = new Error("Channel not found.");
    error.statusCode = 404;
    throw error;
  }

  const existingCodes = new Set(db.invites.map((invite) => sanitizeInviteCode(invite.code)));
  const maxUses = Number(body.maxUses);
  const expiresInHours = Number(body.expiresInHours);
  const invite = {
    id: createId("i", `${guild.id} ${channel.id}`),
    guildId: guild.id,
    channelId: channel.id,
    code: createInviteCode(existingCodes),
    inviterId: String(body.actorId || "u-you"),
    uses: 0,
    maxUses: Number.isFinite(maxUses) && maxUses > 0 ? Math.min(10000, Math.floor(maxUses)) : null,
    temporary: Boolean(body.temporary),
    createdAt: new Date().toISOString(),
    expiresAt: Number.isFinite(expiresInHours) && expiresInHours > 0
      ? new Date(Date.now() + Math.min(8760, Math.floor(expiresInHours)) * 60 * 60 * 1000).toISOString()
      : null,
    revoked: false
  };

  db.invites.unshift(invite);
  addAuditEntry(db, guild.id, invite.inviterId, "Invite created", `invite:${invite.code}`, `#${channel.name}`);
  persistDb(dataDir, db);
  broadcast({ type: "invite.created", invite, invites: listGuildInvites(guild.id, db), moderation: db.moderation });
  return {
    invite: withInviteUrl(invite, port),
    invites: listGuildInvites(guild.id, db),
    moderation: db.moderation
  };
}

function revokeInvite(guildId, inviteId, body, db, dataDir) {
  const guild = db.guilds.find((candidate) => candidate.id === guildId);
  if (!guild) {
    const error = new Error("Server not found.");
    error.statusCode = 404;
    throw error;
  }

  const invite = db.invites.find((candidate) => candidate.guildId === guild.id && candidate.id === inviteId);
  if (!invite) {
    const error = new Error("Invite not found.");
    error.statusCode = 404;
    throw error;
  }

  invite.revoked = true;
  addAuditEntry(db, guild.id, body.actorId || "u-you", "Invite revoked", `invite:${invite.code}`, invite.code);
  persistDb(dataDir, db);
  broadcast({ type: "invite.revoked", invite, invites: listGuildInvites(guild.id, db), moderation: db.moderation });
  return {
    invite,
    invites: listGuildInvites(guild.id, db),
    moderation: db.moderation
  };
}

function resolveInvite(rawCode, db, port) {
  const code = sanitizeInviteCode(rawCode);
  if (!code) {
    const error = new Error("Invite code is required.");
    error.statusCode = 400;
    throw error;
  }

  const invite = db.invites.find((candidate) => sanitizeInviteCode(candidate.code) === code);
  if (invite) {
    if (!isInviteActive(invite)) {
      const error = new Error("Invite has expired, been revoked, or hit its use limit.");
      error.statusCode = 410;
      throw error;
    }

    const guild = db.guilds.find((candidate) => candidate.id === invite.guildId);
    const channel = guild?.channels.find((candidate) => candidate.id === invite.channelId) || null;
    if (!guild || !channel) {
      const error = new Error("Invite target is unavailable.");
      error.statusCode = 404;
      throw error;
    }

    return createInviteRoute(withInviteUrl(invite, port), guild, channel, false, port, invite.code);
  }

  const guild = db.guilds.find((candidate) => {
    const settings = normalizeGuildSettings(candidate);
    return settings.allowInvites && slugify(settings.vanitySlug) === code;
  });
  if (!guild) {
    const error = new Error("Invite route not found.");
    error.statusCode = 404;
    throw error;
  }

  const settings = normalizeGuildSettings(guild);
  const channel =
    guild.channels.find((candidate) => candidate.id === settings.systemChannelId) ||
    guild.channels.find((candidate) => candidate.type === "text" || candidate.type === "announcement" || candidate.type === "rules") ||
    guild.channels[0] ||
    null;

  return createInviteRoute(null, guild, channel, true, port, settings.vanitySlug);
}

function createInviteRoute(invite, guild, channel, vanity, port, code) {
  return {
    invite,
    guild,
    channel,
    vanity,
    route: `/guilds/${guild.id}${channel ? `/channels/${channel.id}` : ""}`,
    url: `http://127.0.0.1:${port}/invite/${encodeURIComponent(sanitizeInviteCode(code))}`
  };
}

function withInviteUrl(invite, port) {
  return {
    ...invite,
    url: `http://127.0.0.1:${port}/invite/${encodeURIComponent(invite.code)}`
  };
}

function isInviteActive(invite) {
  if (invite.revoked) {
    return false;
  }
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now()) {
    return false;
  }
  return invite.maxUses === null || invite.uses < invite.maxUses;
}

function createInviteCode(existingCodes = new Set()) {
  for (let attempts = 0; attempts < 8; attempts += 1) {
    const code = crypto.randomBytes(5).toString("hex");
    if (!existingCodes.has(code)) {
      existingCodes.add(code);
      return code;
    }
  }
  return createId("invite", Date.now()).replace(/^invite-/, "");
}

function sanitizeInviteCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function sanitizeInitials(value) {
  return String(value || "OG")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 4) || "OG";
}

function updateSettings(body, db, dataDir) {
  db.settings = {
    ...defaultSettings,
    ...(db.settings || {}),
    ...Object.fromEntries(
      Object.keys(defaultSettings)
        .filter((key) => typeof body[key] === "boolean")
        .map((key) => [key, body[key]])
    )
  };

  persistDb(dataDir, db);
  broadcast({ type: "settings.updated", settings: db.settings });
  return db.settings;
}

function createModerationReport(body, db, dataDir) {
  const guild = db.guilds.find((candidate) => candidate.id === body.guildId);
  const message = db.messages.find((candidate) => candidate.id === body.messageId);
  if (!guild || !message) {
    const error = new Error("Message or server not found.");
    error.statusCode = 404;
    throw error;
  }

  const channel = guild.channels.find((candidate) => candidate.id === message.channelId);
  if (!channel) {
    const error = new Error("Channel not found.");
    error.statusCode = 404;
    throw error;
  }

  const reason = allowedReportReasons.has(body.reason) ? body.reason : "other";
  const existing = db.moderation.reports.find(
    (report) => report.status === "open" && report.messageId === message.id
  );
  if (existing) {
    return existing;
  }

  const report = {
    id: createId("r", `${reason} ${message.id}`),
    guildId: guild.id,
    channelId: channel.id,
    messageId: message.id,
    reporterId: body.reporterId || "u-you",
    targetUserId: body.targetUserId || message.authorId,
    reason,
    details: String(body.details || "").trim(),
    status: "open",
    createdAt: new Date().toISOString()
  };

  db.moderation.reports.unshift(report);
  addAuditEntry(db, guild.id, report.reporterId, "Report created", `message:${message.id}`, reason);
  persistDb(dataDir, db);
  broadcast({ type: "moderation.report.created", report, moderation: db.moderation });
  return report;
}

function updateModerationReport(reportId, body, db, dataDir) {
  const report = db.moderation.reports.find((candidate) => candidate.id === reportId);
  if (!report) {
    const error = new Error("Report not found.");
    error.statusCode = 404;
    throw error;
  }

  const status = allowedReportStatuses.has(body.status) ? body.status : "resolved";
  report.status = status;
  report.resolvedAt = new Date().toISOString();
  report.resolvedBy = body.actorId || "u-you";

  addAuditEntry(db, report.guildId, report.resolvedBy, `Report ${status}`, `report:${report.id}`, report.reason);
  persistDb(dataDir, db);
  broadcast({ type: "moderation.report.updated", report, moderation: db.moderation });
  return report;
}

function deleteModeratedMessage(messageId, body, db, dataDir) {
  const message = db.messages.find((candidate) => candidate.id === messageId);
  if (!message) {
    const error = new Error("Message not found.");
    error.statusCode = 404;
    throw error;
  }

  const guild = db.guilds.find((candidate) =>
    candidate.channels.some((channel) => channel.id === message.channelId)
  );
  const actorId = body.actorId || "u-you";
  db.messages = db.messages.filter((candidate) => candidate.id !== messageId);
  for (const report of db.moderation.reports) {
    if (report.messageId === messageId && report.status === "open") {
      report.status = "resolved";
      report.resolvedAt = new Date().toISOString();
      report.resolvedBy = actorId;
    }
  }

  addAuditEntry(
    db,
    guild?.id || "local",
    actorId,
    "Message deleted",
    `message:${messageId}`,
    `Removed from #${message.channelId}`
  );
  persistDb(dataDir, db);
  broadcast({ type: "moderation.message.deleted", messageId, moderation: db.moderation });
  return db.messages;
}

function updateAutoMod(body, db, dataDir) {
  const nextAutomod = { ...defaultAutoMod, ...(db.moderation.automod || {}) };
  for (const key of Object.keys(defaultAutoMod)) {
    if (typeof body[key] === "boolean") {
      nextAutomod[key] = body[key];
    }
  }

  db.moderation.automod = nextAutomod;
  addAuditEntry(db, "local", body.actorId || "u-you", "AutoMod updated", "automod", JSON.stringify(nextAutomod));
  persistDb(dataDir, db);
  broadcast({ type: "moderation.automod.updated", moderation: db.moderation });
  return db.moderation;
}

function addAuditEntry(db, guildId, actorId, action, target, detail) {
  db.moderation.auditLog.unshift({
    id: createId("a", action),
    guildId,
    actorId,
    action,
    target,
    detail,
    createdAt: new Date().toISOString()
  });
  db.moderation.auditLog = db.moderation.auditLog.slice(0, 100);
}

function defaultCategoryForChannel(type) {
  if (type === "voice") {
    return "Voice Channels";
  }
  if (type === "stage") {
    return "Stage Channels";
  }
  if (type === "rules" || type === "announcement") {
    return "Start Here";
  }
  return "Text Channels";
}

function createMessage(conversationId, body, db, dataDir) {
  const text = String(body.body || "").trim();
  const attachments = sanitizeAttachments(body.attachments);
  if (!text && attachments.length === 0) {
    const error = new Error("Message body is required.");
    error.statusCode = 400;
    throw error;
  }

  const message = {
    id: createId("m", text),
    channelId: conversationId,
    authorId: body.authorId || "u-you",
    body: text || "Shared an attachment",
    timestamp: formatTime(),
    reactions: [],
    attachments: attachments.length ? attachments : undefined
  };

  db.messages.push(message);
  persistDb(dataDir, db);
  broadcast({ type: "message.created", conversationId, message });
  return message;
}

function sanitizeAttachments(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 10)
    .map((attachment) => {
      const type = ["image", "video", "file"].includes(attachment?.type) ? attachment.type : "file";
      return {
        name: String(attachment?.name || "local-file").slice(0, 120),
        type,
        size: String(attachment?.size || "0 B").slice(0, 32)
      };
    })
    .filter((attachment) => attachment.name.trim().length > 0);
}

function formatTime() {
  return new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function broadcast(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}

function createRequestHandler({ dataDir, port }) {
  const db = loadDb(dataDir, port);

  return async function handleRequest(req, res) {
    try {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);

      if (req.method === "GET" && url.pathname === "/api/health") {
        sendJson(res, 200, {
          ok: true,
          mode: "local",
          startedAt,
          dataDir,
          apiBaseUrl: `http://127.0.0.1:${port}`,
          hostname: os.hostname()
        });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/state") {
        sendJson(res, 200, {
          ...db,
          hosting: {
            mode: "local",
            startedAt,
            dataDir,
            apiBaseUrl: `http://127.0.0.1:${port}`
          }
        });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/events") {
        res.writeHead(200, {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Content-Type": "text/event-stream"
        });
        res.write(`data: ${JSON.stringify({ type: "connected", startedAt })}\n\n`);
        clients.add(res);
        req.on("close", () => clients.delete(res));
        return;
      }

      const apiInviteResolveMatch = url.pathname.match(/^\/api\/invites\/([^/]+)$/);
      if (req.method === "GET" && apiInviteResolveMatch) {
        const route = resolveInvite(decodeURIComponent(apiInviteResolveMatch[1]), db, port);
        sendJson(res, 200, route);
        return;
      }

      const vanityInviteMatch = url.pathname.match(/^\/invite\/([^/]+)$/);
      if (req.method === "GET" && vanityInviteMatch) {
        const route = resolveInvite(decodeURIComponent(vanityInviteMatch[1]), db, port);
        sendJson(res, 200, route);
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/guilds") {
        const body = await readJson(req);
        const guild = createGuild(body, db, dataDir, port);
        sendJson(res, 201, { guild });
        return;
      }

      if (req.method === "PUT" && url.pathname === "/api/settings") {
        const body = await readJson(req);
        const settings = updateSettings(body, db, dataDir);
        sendJson(res, 200, { settings });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/moderation/reports") {
        const body = await readJson(req);
        const report = createModerationReport(body, db, dataDir);
        sendJson(res, 201, { report, moderation: db.moderation });
        return;
      }

      const reportMatch = url.pathname.match(/^\/api\/moderation\/reports\/([^/]+)$/);
      if (req.method === "PATCH" && reportMatch) {
        const body = await readJson(req);
        const report = updateModerationReport(decodeURIComponent(reportMatch[1]), body, db, dataDir);
        sendJson(res, 200, { report, moderation: db.moderation });
        return;
      }

      const moderationMessageMatch = url.pathname.match(/^\/api\/moderation\/messages\/([^/]+)$/);
      if (req.method === "DELETE" && moderationMessageMatch) {
        const body = await readJson(req);
        const messages = deleteModeratedMessage(decodeURIComponent(moderationMessageMatch[1]), body, db, dataDir);
        sendJson(res, 200, { messages, moderation: db.moderation });
        return;
      }

      if (req.method === "PUT" && url.pathname === "/api/moderation/automod") {
        const body = await readJson(req);
        const moderation = updateAutoMod(body, db, dataDir);
        sendJson(res, 200, { moderation });
        return;
      }

      const channelMatch = url.pathname.match(/^\/api\/guilds\/([^/]+)\/channels$/);
      if (req.method === "POST" && channelMatch) {
        const body = await readJson(req);
        const channel = createChannel(decodeURIComponent(channelMatch[1]), body, db, dataDir);
        sendJson(res, 201, { channel });
        return;
      }

      const guildSettingsMatch = url.pathname.match(/^\/api\/guilds\/([^/]+)\/settings$/);
      if (req.method === "PUT" && guildSettingsMatch) {
        const body = await readJson(req);
        const guild = updateGuildSettings(decodeURIComponent(guildSettingsMatch[1]), body, db, dataDir);
        sendJson(res, 200, { guild });
        return;
      }

      const guildInviteListMatch = url.pathname.match(/^\/api\/guilds\/([^/]+)\/invites$/);
      if (req.method === "GET" && guildInviteListMatch) {
        const invites = listGuildInvites(decodeURIComponent(guildInviteListMatch[1]), db);
        sendJson(res, 200, { invites });
        return;
      }

      if (req.method === "POST" && guildInviteListMatch) {
        const body = await readJson(req);
        const result = createInvite(decodeURIComponent(guildInviteListMatch[1]), body, db, dataDir, port);
        sendJson(res, 201, result);
        return;
      }

      const guildInviteMatch = url.pathname.match(/^\/api\/guilds\/([^/]+)\/invites\/([^/]+)$/);
      if (req.method === "DELETE" && guildInviteMatch) {
        const body = await readJson(req);
        const result = revokeInvite(
          decodeURIComponent(guildInviteMatch[1]),
          decodeURIComponent(guildInviteMatch[2]),
          body,
          db,
          dataDir
        );
        sendJson(res, 200, result);
        return;
      }

      const guildRolesMatch = url.pathname.match(/^\/api\/guilds\/([^/]+)\/roles$/);
      if (req.method === "PUT" && guildRolesMatch) {
        const body = await readJson(req);
        const guild = updateGuildRoles(decodeURIComponent(guildRolesMatch[1]), body, db, dataDir);
        sendJson(res, 200, { guild, users: db.users, moderation: db.moderation });
        return;
      }

      const messageMatch = url.pathname.match(/^\/api\/conversations\/([^/]+)\/messages$/);
      if (req.method === "POST" && messageMatch) {
        const body = await readJson(req);
        const message = createMessage(decodeURIComponent(messageMatch[1]), body, db, dataDir);
        sendJson(res, 201, { message });
        return;
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (error) {
      sendJson(res, error.statusCode || 500, {
        error: error.message || "Local server error"
      });
    }
  };
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve(server.address().port);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "127.0.0.1");
  });
}

async function startLocalServer(options = {}) {
  const dataDir = options.dataDir || defaultDataDir();
  const preferredPort = Number(options.port || DEFAULT_PORT);
  const candidatePorts = [
    preferredPort,
    ...Array.from({ length: 10 }, (_, index) => preferredPort + index + 1)
  ];

  for (const candidatePort of candidatePorts) {
    const server = http.createServer(createRequestHandler({ dataDir, port: candidatePort || preferredPort }));
    try {
      const port = await listen(server, candidatePort);
      server.localDataDir = dataDir;
      server.localPort = port;
      server.apiBaseUrl = `http://127.0.0.1:${port}`;
      return {
        server,
        dataDir,
        port,
        apiBaseUrl: server.apiBaseUrl
      };
    } catch (error) {
      if (error.code !== "EADDRINUSE") {
        throw error;
      }
    }
  }

  throw new Error("Unable to start OpenGuild local server.");
}

module.exports = {
  startLocalServer
};

if (require.main === module) {
  startLocalServer()
    .then((local) => {
      console.log(`OpenGuild local server running at ${local.apiBaseUrl}`);
      console.log(`Local data directory: ${local.dataDir}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
