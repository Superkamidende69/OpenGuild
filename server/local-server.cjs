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
const allowedChannelTypes = new Set(["text", "voice", "forum", "announcement", "rules"]);
const defaultAutoMod = {
  spamFilter: true,
  linkFilter: false,
  inviteFilter: false,
  capsFilter: false
};
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
      boostLevel: 0,
      features: ["Community", "Onboarding", "Discovery", "Self-hosted"],
      hosting: localHosting("g-open", dataDir, port),
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
      boostLevel: 0,
      features: ["Voice", "Streaming", "Clips"],
      hosting: localHosting("g-games", dataDir, port),
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
      boostLevel: 0,
      features: ["Forum", "Threads", "Roles", "Automations"],
      hosting: localHosting("g-builders", dataDir, port),
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

  return {
    meta: {
      schemaVersion: 1,
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
        accent: "#64d2b8"
      }
    ],
    guilds,
    directMessages: [],
    messages: [],
    events: [],
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
    const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
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
      accent: "#64d2b8"
    });
  }

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

  db.guilds = (db.guilds || []).map((guild) => ({
    ...guild,
    boostLevel: typeof guild.boostLevel === "number" ? guild.boostLevel : 0,
    features: (guild.features || []).filter((feature) => feature !== "Events" && feature !== "Verified Bots"),
    roles: (guild.roles || []).filter((role) => role.id !== "bot"),
    channels: (guild.channels || [])
      .filter((channel) => channel.type !== "stage")
      .map((channel) => ({
        ...channel,
        unread: undefined,
        participants: Array.isArray(channel.participants)
          ? channel.participants.filter((participantId) => !demoUserIds.has(participantId))
          : channel.participants
      }))
  }));
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
    boostLevel: 0,
    features:
      template === "gaming"
        ? ["Voice", "Clips", "Roles"]
        : template === "work"
          ? ["Threads", "Forums", "Roles", "Audit Log"]
          : ["Community", "Onboarding", "Moderation"],
    hosting: localHosting(id, dataDir, port),
    roles: [
      { id: "owner", name: "Owner", color: "#f6c85f", permissions: ["Administrator"] },
      { id: "mod", name: "Moderator", color: "#e66b75", permissions: ["Manage messages", "Timeout members"] },
      { id: "member", name: "Member", color: "#b7bcc9", permissions: ["Send messages", "Join voice"] }
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
    participants: type === "voice" ? [] : undefined
  };

  guild.channels.push(channel);
  persistDb(dataDir, db);
  broadcast({ type: "channel.created", guildId, channel });
  return channel;
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
  if (type === "rules" || type === "announcement") {
    return "Start Here";
  }
  return "Text Channels";
}

function createMessage(conversationId, body, db, dataDir) {
  const text = String(body.body || "").trim();
  if (!text) {
    const error = new Error("Message body is required.");
    error.statusCode = 400;
    throw error;
  }

  const message = {
    id: createId("m", text),
    channelId: conversationId,
    authorId: body.authorId || "u-you",
    body: text,
    timestamp: formatTime(),
    reactions: []
  };

  db.messages.push(message);
  persistDb(dataDir, db);
  broadcast({ type: "message.created", conversationId, message });
  return message;
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
