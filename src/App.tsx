import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AtSign,
  BadgeCheck,
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Circle,
  Command,
  Compass,
  Crown,
  File,
  Flag,
  Globe2,
  Hash,
  Headphones,
  Inbox,
  Layers,
  Lock,
  Megaphone,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  MoreHorizontal,
  Palette,
  Phone,
  Pin,
  Plus,
  Radio,
  Search,
  Send,
  Settings,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Upload,
  UserPlus,
  Users,
  Video,
  Volume2,
  Wrench,
  X,
  Zap
} from "lucide-react";
import {
  directMessages as fallbackDirectMessages,
  events as fallbackEvents,
  guilds as fallbackGuilds,
  seedMessages,
  users as fallbackUsers
} from "./data";
import {
  createLocalChannel,
  createLocalGuild,
  createModerationReport,
  deleteModeratedMessage,
  fetchLocalState,
  resolveApiBaseUrl,
  sendLocalMessage,
  updateAutoMod,
  updateLocalSettings,
  updateModerationReport,
  type CreateChannelInput,
  type CreateGuildInput,
  type LocalHostingState
} from "./localApi";
import type {
  AppSettings,
  AutoModSettings,
  Channel,
  ChannelType,
  EventItem,
  Guild,
  Message,
  ModerationReportReason,
  ModerationState,
  Presence,
  User
} from "./types";

type InspectorView = "activity" | "roles" | "moderation" | "apps" | "settings";

type SettingsKey = keyof AppSettings;

const currentUserId = "u-you";
const defaultAppSettings: AppSettings = {
  streamerMode: false,
  compactMode: false,
  reduceMotion: false,
  pushToTalk: true,
  desktopNotifications: true,
  soundEffects: true,
  showUnreadBadges: true,
  developerMode: false
};
const defaultModerationState: ModerationState = {
  reports: [],
  auditLog: [],
  automod: {
    spamFilter: true,
    linkFilter: false,
    inviteFilter: false,
    capsFilter: false
  }
};

const commandHints = [
  { command: "/poll", detail: "Create a poll in the current channel" },
  { command: "/thread", detail: "Start a thread from the next message" },
  { command: "/mod", detail: "Open the moderation queue" },
  { command: "/shrug", detail: "Send a small text reaction" }
];

const quickActions = [
  { label: "Start voice", icon: Phone },
  { label: "Invite", icon: UserPlus },
  { label: "Server discovery", icon: Compass },
  { label: "Notifications", icon: Bell }
];

const integrations = [
  { id: "bot", title: "Verified Bots", detail: "Slash commands, OAuth scopes, webhooks" },
  { id: "bridge", title: "Federation Bridge", detail: "Self-hosted guild discovery and transport" },
  { id: "theme", title: "Theme Marketplace", detail: "Open CSS themes with scoped permissions" },
  { id: "storage", title: "Attachment Storage", detail: "S3-compatible file and media uploads" }
];

function App() {
  const [guildList, setGuildList] = useState<Guild[]>(fallbackGuilds);
  const [userList, setUserList] = useState<User[]>(fallbackUsers);
  const [dmList, setDmList] = useState(fallbackDirectMessages);
  const [eventList, setEventList] = useState(fallbackEvents);
  const [selectedGuildId, setSelectedGuildId] = useState(fallbackGuilds[0].id);
  const [selectedChannelId, setSelectedChannelId] = useState("c-general");
  const [activeDmId, setActiveDmId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(seedMessages);
  const [draft, setDraft] = useState("");
  const [inspector, setInspector] = useState<InspectorView>("activity");
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [version, setVersion] = useState("dev");
  const [apiBaseUrl, setApiBaseUrl] = useState("http://127.0.0.1:4783");
  const [apiOnline, setApiOnline] = useState(false);
  const [localHosting, setLocalHosting] = useState<LocalHostingState | null>(null);
  const [localNotice, setLocalNotice] = useState("Local host starting");
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState<{ category: string } | null>(null);
  const [settingsSaveState, setSettingsSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [moderation, setModeration] = useState<ModerationState>(defaultModerationState);
  const [moderationNotice, setModerationNotice] = useState("Moderation queue is ready");

  useEffect(() => {
    window.openGuild?.getVersion().then(setVersion).catch(() => setVersion("dev"));
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadLocalHost() {
      const baseUrl = await resolveApiBaseUrl();
      if (!mounted) {
        return;
      }

      setApiBaseUrl(baseUrl);
      try {
        const state = await fetchLocalState(baseUrl);
        if (!mounted) {
          return;
        }

        setGuildList(state.guilds);
        setUserList(state.users);
        setDmList(state.directMessages);
        setEventList(state.events);
        setMessages(state.messages);
        setSettings({
          ...defaultAppSettings,
          ...(state.settings || {})
        });
        setModeration({
          ...defaultModerationState,
          ...(state.moderation || {}),
          automod: {
            ...defaultModerationState.automod,
            ...(state.moderation?.automod || {})
          }
        });
        setLocalHosting(state.hosting);
        setApiOnline(true);
        setLocalNotice("Local host online");

        if (!state.guilds.some((guild) => guild.id === selectedGuildId)) {
          const firstGuild = state.guilds[0];
          setSelectedGuildId(firstGuild.id);
          setSelectedChannelId(firstGuild.channels[0]?.id ?? "");
          setActiveDmId(null);
        }
      } catch (error) {
        setApiOnline(false);
        setLocalNotice(error instanceof Error ? error.message : "Local host unavailable");
      }
    }

    void loadLocalHost();
    return () => {
      mounted = false;
    };
  }, [selectedGuildId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setShowCommandPalette(true);
      }
      if (event.key === "Escape") {
        setShowCommandPalette(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const currentGuild = useMemo(
    () => guildList.find((guild) => guild.id === selectedGuildId) ?? guildList[0] ?? fallbackGuilds[0],
    [guildList, selectedGuildId]
  );

  const activeDm = useMemo(
    () => dmList.find((dm) => dm.id === activeDmId) ?? null,
    [activeDmId, dmList]
  );

  const activeDmUser = activeDm ? userList.find((user) => user.id === activeDm.userId) ?? null : null;

  const currentChannel = useMemo(() => {
    if (activeDmId) {
      return null;
    }
    return (
      currentGuild.channels.find((channel) => channel.id === selectedChannelId) ??
      currentGuild.channels[0]
    );
  }, [activeDmId, currentGuild, selectedChannelId]);

  const activeConversationId = activeDmId ?? currentChannel?.id ?? selectedChannelId;
  const activeMessages = messages.filter((message) => message.channelId === activeConversationId);
  const visibleEvents = eventList.filter((event) =>
    currentGuild.channels.some((channel) => channel.id === event.channelId)
  );

  const groupedChannels = useMemo(() => groupChannels(currentGuild.channels), [currentGuild]);

  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    void submitMessage();
  };

  const submitMessage = async () => {
    const body = draft.trim();
    if (!body) {
      return;
    }

    const messageBody = body === "/shrug" ? "*shrugs*" : body;
    const fallbackMessage: Message = {
      id: `m-${Date.now()}`,
      channelId: activeConversationId,
      authorId: currentUserId,
      body: messageBody,
      timestamp: new Intl.DateTimeFormat([], {
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date()),
      reactions: []
    };

    setDraft("");

    if (apiOnline) {
      try {
        const { message } = await sendLocalMessage(apiBaseUrl, activeConversationId, currentUserId, messageBody);
        setMessages((items) => [...items, message]);
      } catch (error) {
        setApiOnline(false);
        setLocalNotice(error instanceof Error ? error.message : "Local message send failed");
        setMessages((items) => [...items, fallbackMessage]);
      }
    } else {
      setMessages((items) => [...items, fallbackMessage]);
    }

    if (body.startsWith("/mod")) {
      setInspector("moderation");
    }
  };

  const selectGuild = (guild: Guild) => {
    setSelectedGuildId(guild.id);
    setActiveDmId(null);
    const firstTextChannel =
      guild.channels.find((channel) => channel.type === "text") ?? guild.channels[0];
    setSelectedChannelId(firstTextChannel.id);
  };

  const selectChannel = (channel: Channel) => {
    setSelectedChannelId(channel.id);
    setActiveDmId(null);
  };

  const selectDm = (dmId: string) => {
    setActiveDmId(dmId);
  };

  const createServer = async (input: CreateGuildInput) => {
    if (apiOnline) {
      const { guild } = await createLocalGuild(apiBaseUrl, input);
      setGuildList((items) => [...items, guild]);
      selectGuild(guild);
      setShowCreateServer(false);
      setLocalNotice(`${guild.name} hosted locally`);
      return;
    }

    const guild = createFallbackGuild(input.name);
    setGuildList((items) => [...items, guild]);
    selectGuild(guild);
    setShowCreateServer(false);
    setLocalNotice("Created in memory because local host is offline");
  };

  const createChannel = async (input: CreateChannelInput) => {
    if (apiOnline) {
      const { channel } = await createLocalChannel(apiBaseUrl, currentGuild.id, input);
      setGuildList((items) => addChannelToGuild(items, currentGuild.id, channel));
      selectChannel(channel);
      setShowCreateChannel(null);
      setLocalNotice(`#${channel.name} created locally`);
      return;
    }

    const channel = createFallbackChannel(input);
    setGuildList((items) => addChannelToGuild(items, currentGuild.id, channel));
    selectChannel(channel);
    setShowCreateChannel(null);
    setLocalNotice("Channel created in memory because local host is offline");
  };

  const updateSetting = (key: SettingsKey) => {
    const nextSettings = {
      ...settings,
      [key]: !settings[key]
    };

    setSettings(nextSettings);
    if (!apiOnline) {
      setSettingsSaveState("idle");
      return;
    }

    setSettingsSaveState("saving");
    updateLocalSettings(apiBaseUrl, nextSettings)
      .then(({ settings: savedSettings }) => {
        setSettings({
          ...defaultAppSettings,
          ...savedSettings
        });
        setSettingsSaveState("saved");
      })
      .catch((error) => {
        setSettingsSaveState("error");
        setLocalNotice(error instanceof Error ? error.message : "Unable to save settings");
      });
  };

  const reportMessage = async (message: Message, reason: ModerationReportReason = "other") => {
    const reportInput = {
      guildId: currentGuild.id,
      channelId: message.channelId,
      messageId: message.id,
      reporterId: currentUserId,
      targetUserId: message.authorId,
      reason,
      details: `Flagged from #${currentChannel?.name ?? message.channelId}`
    };

    if (apiOnline) {
      try {
        const { moderation: nextModeration } = await createModerationReport(apiBaseUrl, reportInput);
        setModeration(nextModeration);
        setInspector("moderation");
        setModerationNotice("Report added to moderation queue");
        return;
      } catch (error) {
        setModerationNotice(error instanceof Error ? error.message : "Unable to create report");
      }
    }

    const fallbackReport = {
      id: `r-local-${Date.now()}`,
      ...reportInput,
      status: "open" as const,
      createdAt: new Date().toISOString()
    };
    setModeration((value) => ({
      ...value,
      reports: [fallbackReport, ...value.reports]
    }));
    setInspector("moderation");
    setModerationNotice("Report created in memory because local host is offline");
  };

  const deleteMessage = async (messageId: string) => {
    if (apiOnline) {
      try {
        const { messages: nextMessages, moderation: nextModeration } = await deleteModeratedMessage(
          apiBaseUrl,
          messageId,
          currentUserId
        );
        setMessages(nextMessages);
        setModeration(nextModeration);
        setModerationNotice("Message removed and audit log updated");
        return;
      } catch (error) {
        setModerationNotice(error instanceof Error ? error.message : "Unable to delete message");
      }
    }

    setMessages((items) => items.filter((message) => message.id !== messageId));
    setModerationNotice("Message removed locally");
  };

  const updateReport = async (reportId: string, status: "resolved" | "dismissed") => {
    if (apiOnline) {
      try {
        const { moderation: nextModeration } = await updateModerationReport(apiBaseUrl, reportId, status, currentUserId);
        setModeration(nextModeration);
        setModerationNotice(`Report ${status}`);
        return;
      } catch (error) {
        setModerationNotice(error instanceof Error ? error.message : "Unable to update report");
      }
    }

    setModeration((value) => ({
      ...value,
      reports: value.reports.map((report) =>
        report.id === reportId
          ? {
              ...report,
              status,
              resolvedAt: new Date().toISOString(),
              resolvedBy: currentUserId
            }
          : report
      )
    }));
  };

  const toggleAutoMod = async (key: keyof AutoModSettings) => {
    const nextAutomod = {
      ...moderation.automod,
      [key]: !moderation.automod[key]
    };

    setModeration((value) => ({
      ...value,
      automod: nextAutomod
    }));

    if (!apiOnline) {
      setModerationNotice("AutoMod changed in memory because local host is offline");
      return;
    }

    try {
      const { moderation: nextModeration } = await updateAutoMod(apiBaseUrl, nextAutomod, currentUserId);
      setModeration(nextModeration);
      setModerationNotice("AutoMod settings saved locally");
    } catch (error) {
      setModerationNotice(error instanceof Error ? error.message : "Unable to update AutoMod");
    }
  };

  return (
    <div className={classNames("app-shell", settings.compactMode && "compact")}>
      {showCreateServer && (
        <CreateServerDialog
          apiOnline={apiOnline}
          apiBaseUrl={apiBaseUrl}
          onClose={() => setShowCreateServer(false)}
          onCreate={createServer}
        />
      )}
      {showCreateChannel && (
        <CreateChannelDialog
          category={showCreateChannel.category}
          guildName={currentGuild.name}
          apiOnline={apiOnline}
          onClose={() => setShowCreateChannel(null)}
          onCreate={createChannel}
        />
      )}
      {showCommandPalette && (
        <CommandPalette
          guild={currentGuild}
          onClose={() => setShowCommandPalette(false)}
          onSelectChannel={(channel) => {
            selectChannel(channel);
            setShowCommandPalette(false);
          }}
          onSelectInspector={(view) => {
            setInspector(view);
            setShowCommandPalette(false);
          }}
        />
      )}

      <aside className="guild-rail" aria-label="Servers">
        <button className="home-button active" title="Home" aria-label="Home">
          <MessageCircle size={21} />
        </button>
        <div className="rail-divider" />
        {guildList.map((guild) => (
          <button
            key={guild.id}
            className={classNames("guild-button", guild.id === currentGuild.id && "selected")}
            style={{ "--guild-color": guild.accent } as React.CSSProperties}
            onClick={() => selectGuild(guild)}
            title={guild.name}
            aria-label={guild.name}
          >
            <span>{guild.initials}</span>
          </button>
        ))}
        <button className="guild-action" title="Add local server" aria-label="Add local server" onClick={() => setShowCreateServer(true)}>
          <Plus size={20} />
        </button>
        <button className="guild-action" title="Explore public servers" aria-label="Explore public servers">
          <Compass size={20} />
        </button>
      </aside>

      <aside className="server-sidebar">
        <header className="server-header">
          <div>
            <strong>{currentGuild.name}</strong>
            <span>{apiOnline ? "Hosted locally" : "Offline fallback"} / Boost level {currentGuild.boostLevel}</span>
          </div>
          <button className="icon-button" title="Server menu" aria-label="Server menu">
            <ChevronDown size={18} />
          </button>
        </header>

        <div className="sidebar-search">
          <Search size={16} />
          <button onClick={() => setShowCommandPalette(true)}>Search or jump</button>
        </div>

        <nav className="channel-list" aria-label="Channels">
          {Object.entries(groupedChannels).map(([category, channels]) => (
            <section className="channel-category" key={category}>
              <div className="category-title">
                <ChevronDown size={13} />
                <span>{category}</span>
                <button
                  title={`Add channel to ${category}`}
                  aria-label={`Add channel to ${category}`}
                  onClick={() => setShowCreateChannel({ category })}
                >
                  <Plus size={13} />
                </button>
              </div>
              {channels.map((channel) => (
                <ChannelButton
                  key={channel.id}
                  channel={channel}
                  selected={!activeDmId && selectedChannelId === channel.id}
                  onClick={() => selectChannel(channel)}
                />
              ))}
            </section>
          ))}
        </nav>

        <section className="dm-section">
          <div className="category-title">
            <AtSign size={13} />
            <span>Direct Messages</span>
            <button title="New direct message" aria-label="New direct message">
              <Plus size={13} />
            </button>
          </div>
          {dmList.length === 0 ? <div className="empty-sidebar-note">No direct messages yet</div> : null}
          {dmList.map((dm) => {
            const user = userList.find((candidate) => candidate.id === dm.userId);
            if (!user) {
              return null;
            }
            return (
              <button
                key={dm.id}
                className={classNames("dm-button", activeDmId === dm.id && "selected")}
                onClick={() => selectDm(dm.id)}
              >
                <Avatar user={user} size="sm" />
                <span>{user.name}</span>
                {dm.unread ? <b>{dm.unread}</b> : null}
              </button>
            );
          })}
        </section>

        <VoiceDock
          connected={voiceConnected}
          muted={muted}
          deafened={deafened}
          onToggleConnected={() => setVoiceConnected((value) => !value)}
          onToggleMuted={() => setMuted((value) => !value)}
          onToggleDeafened={() => setDeafened((value) => !value)}
        />
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="conversation-title">
            {activeDmUser ? (
              <Avatar user={activeDmUser} size="sm" />
            ) : (
              <ChannelGlyph type={currentChannel?.type ?? "text"} />
            )}
            <div>
              <strong>{activeDmUser ? activeDmUser.name : currentChannel?.name}</strong>
              <span>{activeDmUser ? activeDmUser.handle : currentChannel?.topic}</span>
            </div>
          </div>
          <div className="topbar-actions">
            {quickActions.map((action) => (
              <button key={action.label} className="icon-button" title={action.label} aria-label={action.label}>
                <action.icon size={18} />
              </button>
            ))}
            <button className="command-button" onClick={() => setShowCommandPalette(true)}>
              <Command size={16} />
              <span>Ctrl K</span>
            </button>
          </div>
        </header>

        <section className="content-grid">
          <section className="chat-pane" aria-label="Messages">
            <ChatHero
              channel={currentChannel}
              dmUser={activeDmUser}
              guild={currentGuild}
              eventCount={visibleEvents.length}
              memberCount={userList.length}
            />
            <div className="message-list">
              {activeMessages.length === 0 ? (
                <div className="empty-chat-state">
                  <MessageCircle size={28} />
                  <strong>No messages yet</strong>
                  <span>Start the conversation in this local channel.</span>
                </div>
              ) : null}
              {activeMessages.map((message) => {
                const author = userList.find((user) => user.id === message.authorId) ?? userList[0];
                return (
                  <MessageRow
                    key={message.id}
                    message={message}
                    author={author}
                    onReport={() => reportMessage(message, "other")}
                    onDelete={() => deleteMessage(message.id)}
                    onReact={(emoji) =>
                      setMessages((items) =>
                        items.map((item) =>
                          item.id === message.id
                            ? {
                                ...item,
                                reactions: toggleReaction(item.reactions, emoji)
                              }
                            : item
                        )
                      )
                    }
                  />
                );
              })}
            </div>

            <form className="composer" onSubmit={sendMessage}>
              <div className="composer-tools">
                <button type="button" title="Upload file" aria-label="Upload file">
                  <Upload size={18} />
                </button>
                <button type="button" title="Open emoji picker" aria-label="Open emoji picker">
                  <Smile size={18} />
                </button>
                <button type="button" title="Create poll" aria-label="Create poll">
                  <Activity size={18} />
                </button>
              </div>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Message ${activeDmUser ? activeDmUser.name : `#${currentChannel?.name ?? "channel"}`}`}
              />
              <button className="send-button" type="submit" title="Send message" aria-label="Send message">
                <Send size={18} />
              </button>
              {draft.startsWith("/") && (
                <div className="slash-menu">
                  {commandHints
                    .filter((hint) => hint.command.startsWith(draft.split(" ")[0]))
                    .map((hint) => (
                      <button key={hint.command} type="button" onClick={() => setDraft(`${hint.command} `)}>
                        <strong>{hint.command}</strong>
                        <span>{hint.detail}</span>
                      </button>
                    ))}
                </div>
              )}
            </form>
          </section>

          <aside className="inspector" aria-label="Server tools">
            <div className="inspector-tabs">
              <InspectorTab current={inspector} view="activity" onClick={setInspector} icon={Activity} label="Activity" />
              <InspectorTab current={inspector} view="roles" onClick={setInspector} icon={Crown} label="Roles" />
              <InspectorTab current={inspector} view="moderation" onClick={setInspector} icon={Shield} label="Mod" />
              <InspectorTab current={inspector} view="apps" onClick={setInspector} icon={Bot} label="Apps" />
              <InspectorTab current={inspector} view="settings" onClick={setInspector} icon={Settings} label="Settings" />
            </div>
            <InspectorBody
              view={inspector}
              guild={currentGuild}
              channel={currentChannel}
              events={visibleEvents}
              members={userList}
              settings={settings}
              apiOnline={apiOnline}
              apiBaseUrl={apiBaseUrl}
              localNotice={localNotice}
              localHosting={localHosting}
              settingsSaveState={settingsSaveState}
              moderation={moderation}
              messages={messages}
              moderationNotice={moderationNotice}
              onReportStatusChange={updateReport}
              onDeleteMessage={deleteMessage}
              onToggleAutoMod={toggleAutoMod}
              onSettingChange={updateSetting}
              version={version}
            />
          </aside>
        </section>
      </main>
    </div>
  );
}

function ChannelButton({
  channel,
  selected,
  onClick
}: {
  channel: Channel;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button className={classNames("channel-button", selected && "selected")} onClick={onClick}>
      <ChannelGlyph type={channel.type} />
      <span>{channel.name}</span>
      {channel.locked ? <Lock size={13} /> : null}
      {channel.unread ? <b>{channel.unread}</b> : null}
      {channel.participants?.length ? <small>{channel.participants.length}</small> : null}
    </button>
  );
}

function ChatHero({
  channel,
  dmUser,
  guild,
  eventCount,
  memberCount
}: {
  channel: Channel | null;
  dmUser: User | null;
  guild: Guild;
  eventCount: number;
  memberCount: number;
}) {
  if (dmUser) {
    return (
      <section className="chat-hero dm-hero">
        <Avatar user={dmUser} size="lg" />
        <div>
          <strong>{dmUser.name}</strong>
          <span>{dmUser.bio}</span>
        </div>
        <div className="hero-actions">
          <button title="Start voice call" aria-label="Start voice call">
            <Phone size={18} />
          </button>
          <button title="Start video call" aria-label="Start video call">
            <Video size={18} />
          </button>
          <button title="Pin conversation" aria-label="Pin conversation">
            <Pin size={18} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="chat-hero">
      <div className="hero-mark" style={{ "--guild-color": guild.accent } as React.CSSProperties}>
        <ChannelGlyph type={channel?.type ?? "text"} />
      </div>
      <div>
        <strong>#{channel?.name}</strong>
        <span>{channel?.topic}</span>
      </div>
      <div className="hero-stats">
        <span>
          <Users size={15} /> {memberCount} members
        </span>
        {eventCount > 0 ? (
          <span>
            <CalendarDays size={15} /> {eventCount} events
          </span>
        ) : null}
        <span>
          <Sparkles size={15} /> {guild.features.length} features
        </span>
      </div>
    </section>
  );
}

function MessageRow({
  message,
  author,
  onReport,
  onDelete,
  onReact
}: {
  message: Message;
  author: User;
  onReport: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}) {
  return (
    <article className="message-row">
      <Avatar user={author} size="md" />
      <div className="message-body">
        <header>
          <strong>{author.name}</strong>
          {author.bot ? <span className="bot-pill">BOT</span> : null}
          <time>{message.timestamp}</time>
          {message.edited ? <span>edited</span> : null}
          {message.pinned ? <Pin size={14} /> : null}
        </header>
        <p>{message.body}</p>
        {message.attachments?.length ? (
          <div className="attachments">
            {message.attachments.map((attachment) => (
              <button key={attachment.name}>
                <File size={18} />
                <span>{attachment.name}</span>
                <small>{attachment.size}</small>
              </button>
            ))}
          </div>
        ) : null}
        <footer>
          {message.reactions.map((reaction) => (
            <button
              key={reaction.emoji}
              className={classNames("reaction", reaction.reacted && "reacted")}
              onClick={() => onReact(reaction.emoji)}
            >
              <span>{reaction.emoji}</span>
              <b>{reaction.count}</b>
            </button>
          ))}
          <button className="reaction add" onClick={() => onReact("spark")}>
            <Plus size={13} />
          </button>
          {message.threadCount ? (
            <button className="thread-link">
              <MessageCircle size={14} />
              {message.threadCount} replies
            </button>
          ) : null}
        </footer>
      </div>
      <div className="message-actions">
        <button title="Reply" aria-label="Reply">
          <MessageCircle size={15} />
        </button>
        <button title="Report message" aria-label="Report message" onClick={onReport}>
          <Flag size={15} />
        </button>
        <button title="Delete message" aria-label="Delete message" onClick={onDelete}>
          <X size={15} />
        </button>
      </div>
    </article>
  );
}

function InspectorBody({
  view,
  guild,
  channel,
  events: visibleEvents,
  members,
  settings,
  apiOnline,
  apiBaseUrl,
  localNotice,
  localHosting,
  settingsSaveState,
  moderation,
  messages,
  moderationNotice,
  onReportStatusChange,
  onDeleteMessage,
  onToggleAutoMod,
  onSettingChange,
  version
}: {
  view: InspectorView;
  guild: Guild;
  channel: Channel | null;
  events: EventItem[];
  members: User[];
  settings: AppSettings;
  apiOnline: boolean;
  apiBaseUrl: string;
  localNotice: string;
  localHosting: LocalHostingState | null;
  settingsSaveState: "idle" | "saving" | "saved" | "error";
  moderation: ModerationState;
  messages: Message[];
  moderationNotice: string;
  onReportStatusChange: (reportId: string, status: "resolved" | "dismissed") => void;
  onDeleteMessage: (messageId: string) => void;
  onToggleAutoMod: (key: keyof AutoModSettings) => void;
  onSettingChange: (key: SettingsKey) => void;
  version: string;
}) {
  if (view === "roles") {
    return (
      <div className="inspector-body">
        <PanelHeader icon={Crown} title="Roles" actionIcon={Plus} />
        <div className="role-list">
          {guild.roles.map((role) => (
            <section key={role.id} className="role-row">
              <span style={{ background: role.color }} />
              <div>
                <strong>{role.name}</strong>
                <small>{role.permissions.join(", ")}</small>
              </div>
            </section>
          ))}
        </div>
        <PanelHeader icon={Users} title="Members" />
        <div className="member-list">
          {members.map((user) => (
            <section key={user.id} className="member-row">
              <Avatar user={user} size="sm" />
              <div>
                <strong>{user.name}</strong>
                <small>{user.roleIds[0]}</small>
              </div>
              <PresenceDot status={user.status} />
            </section>
          ))}
        </div>
      </div>
    );
  }

  if (view === "moderation") {
    const openReports = moderation.reports.filter((report) => report.status === "open");
    const resolvedReports = moderation.reports.filter((report) => report.status !== "open");
    const activeAutoModCount = Object.values(moderation.automod).filter(Boolean).length;

    return (
      <div className="inspector-body">
        <PanelHeader icon={ShieldAlert} title="Moderation" actionIcon={Flag} />
        <div className="metric-grid">
          <Metric icon={Flag} label="Open" value={String(openReports.length)} />
          <Metric icon={Zap} label="AutoMod" value={`${activeAutoModCount}/4`} />
          <Metric icon={BadgeCheck} label="Closed" value={String(resolvedReports.length)} />
        </div>
        <div className="settings-status">{moderationNotice}</div>
        <PanelHeader icon={Zap} title="AutoMod" />
        <div className="settings-list">
          <ToggleRow
            icon={Shield}
            label="Spam filter"
            checked={moderation.automod.spamFilter}
            onClick={() => onToggleAutoMod("spamFilter")}
          />
          <ToggleRow
            icon={Globe2}
            label="Link filter"
            checked={moderation.automod.linkFilter}
            onClick={() => onToggleAutoMod("linkFilter")}
          />
          <ToggleRow
            icon={Compass}
            label="Invite filter"
            checked={moderation.automod.inviteFilter}
            onClick={() => onToggleAutoMod("inviteFilter")}
          />
          <ToggleRow
            icon={AtSign}
            label="Caps filter"
            checked={moderation.automod.capsFilter}
            onClick={() => onToggleAutoMod("capsFilter")}
          />
        </div>
        <PanelHeader icon={Flag} title="Report Queue" />
        <div className="queue-list">
          {openReports.length === 0 ? (
            <div className="empty-panel-state">
              <Shield size={22} />
              <strong>No open reports</strong>
              <span>Reported messages will appear here.</span>
            </div>
          ) : null}
          {openReports.map((report) => {
            const reportedMessage = messages.find((message) => message.id === report.messageId);
            const targetUser = members.find((member) => member.id === report.targetUserId);
            const channelName = guild.channels.find((candidate) => candidate.id === report.channelId)?.name ?? "unknown";
            return (
              <section key={report.id} className="queue-item moderation-report">
                <div>
                  <strong>{report.reason}</strong>
                  <span>#{channelName} / {targetUser?.name ?? report.targetUserId}</span>
                  <small>{reportedMessage?.body ?? "Message unavailable"}</small>
                </div>
                <div className="moderation-actions">
                  <button onClick={() => onReportStatusChange(report.id, "resolved")}>Resolve</button>
                  <button onClick={() => onReportStatusChange(report.id, "dismissed")}>Dismiss</button>
                  {reportedMessage ? <button onClick={() => onDeleteMessage(reportedMessage.id)}>Delete</button> : null}
                </div>
              </section>
            );
          })}
        </div>
        <PanelHeader icon={Inbox} title="Audit Log" />
        <div className="audit-list">
          {moderation.auditLog.length === 0 ? (
            <div className="empty-panel-state">
              <Inbox size={22} />
              <strong>No audit entries</strong>
              <span>Moderation actions will be recorded locally.</span>
            </div>
          ) : null}
          {moderation.auditLog.slice(0, 8).map((entry) => (
            <section key={entry.id} className="audit-row">
              <div>
                <strong>{entry.action}</strong>
                <span>{entry.detail}</span>
              </div>
              <small>{formatShortDate(entry.createdAt)}</small>
            </section>
          ))}
        </div>
      </div>
    );
  }

  if (view === "apps") {
    return (
      <div className="inspector-body">
        <PanelHeader icon={Bot} title="Apps" actionIcon={Plus} />
        <div className="integration-list">
          {integrations.map((integration) => (
            <section key={integration.id} className="integration-row">
              <Bot size={18} />
              <div>
                <strong>{integration.title}</strong>
                <span>{integration.detail}</span>
              </div>
              <button title={`Configure ${integration.title}`} aria-label={`Configure ${integration.title}`}>
                <Wrench size={15} />
              </button>
            </section>
          ))}
        </div>
      </div>
    );
  }

  if (view === "settings") {
    return (
      <div className="inspector-body">
        <PanelHeader icon={Settings} title="Settings" />
        <PanelHeader icon={Palette} title="Appearance" />
        <div className="settings-list">
          <ToggleRow
            icon={Layers}
            label="Compact mode"
            checked={settings.compactMode}
            onClick={() => onSettingChange("compactMode")}
          />
          <ToggleRow
            icon={Palette}
            label="Reduce motion"
            checked={settings.reduceMotion}
            onClick={() => onSettingChange("reduceMotion")}
          />
          <ToggleRow
            icon={Bell}
            label="Unread badges"
            checked={settings.showUnreadBadges}
            onClick={() => onSettingChange("showUnreadBadges")}
          />
        </div>
        <PanelHeader icon={Bell} title="Notifications" />
        <div className="settings-list">
          <ToggleRow
            icon={Bell}
            label="Desktop notifications"
            checked={settings.desktopNotifications}
            onClick={() => onSettingChange("desktopNotifications")}
          />
          <ToggleRow
            icon={Radio}
            label="Sound effects"
            checked={settings.soundEffects}
            onClick={() => onSettingChange("soundEffects")}
          />
        </div>
        <PanelHeader icon={Mic} title="Voice" />
        <div className="settings-list">
          <ToggleRow
            icon={Mic}
            label="Push to talk"
            checked={settings.pushToTalk}
            onClick={() => onSettingChange("pushToTalk")}
          />
        </div>
        <PanelHeader icon={Shield} title="Privacy & Local Host" />
        <div className="settings-list">
          <ToggleRow
            icon={Radio}
            label="Streamer mode"
            checked={settings.streamerMode}
            onClick={() => onSettingChange("streamerMode")}
          />
          <ToggleRow
            icon={Wrench}
            label="Developer mode"
            checked={settings.developerMode}
            onClick={() => onSettingChange("developerMode")}
          />
        </div>
        <div className={classNames("settings-status", settingsSaveState)}>
          {settingsSaveState === "saving" ? "Saving settings" : null}
          {settingsSaveState === "saved" ? "Settings saved locally" : null}
          {settingsSaveState === "error" ? "Settings could not be saved" : null}
          {settingsSaveState === "idle" ? (apiOnline ? "Settings are saved to the local host" : "Settings are local until host reconnects") : null}
        </div>
        <div className="settings-card">
          <Globe2 size={19} />
          <div>
            <strong>OpenGuild desktop</strong>
            <span>Version {version}</span>
          </div>
        </div>
        <div className="settings-card">
          {apiOnline ? <CheckCircle2 size={19} /> : <Circle size={19} />}
          <div>
            <strong>{apiOnline ? "Local host online" : "Local host offline"}</strong>
            <span>{localNotice}</span>
          </div>
        </div>
        <div className="settings-card">
          <Globe2 size={19} />
          <div>
            <strong>{apiBaseUrl}</strong>
            <span>{localHosting?.dataDir ?? "Using bundled seed data"}</span>
          </div>
        </div>
        {guild.hosting ? (
          <div className="settings-card">
            <Shield size={19} />
            <div>
              <strong>{guild.name} data</strong>
              <span>{guild.hosting.dataPath}</span>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="inspector-body">
      <PanelHeader icon={Activity} title="Activity" actionIcon={MoreHorizontal} />
      <div className="metric-grid">
        <Metric icon={Users} label="Online" value={String(members.filter((member) => member.status !== "offline").length)} />
        <Metric icon={MessageCircle} label="Threads" value="12" />
        <Metric icon={Volume2} label="Voice" value={String(channel?.participants?.length ?? 0)} />
      </div>
      {visibleEvents.length > 0 ? (
        <>
          <PanelHeader icon={CalendarDays} title="Events" />
          <div className="event-list">
            {visibleEvents.map((event) => (
              <section key={event.id} className="event-row">
                <CalendarDays size={18} />
                <div>
                  <strong>{event.title}</strong>
                  <span>{event.startsAt}</span>
                </div>
                <b>{event.attendees}</b>
              </section>
            ))}
          </div>
        </>
      ) : null}
      <PanelHeader icon={Inbox} title="Inbox" />
      <div className="inbox-list">
        <section>
          <Pin size={17} />
          <span>Pinned release notes</span>
        </section>
        <section>
          <Bell size={17} />
          <span>Mention digest</span>
        </section>
      </div>
    </div>
  );
}

function CreateServerDialog({
  apiOnline,
  apiBaseUrl,
  onClose,
  onCreate
}: {
  apiOnline: boolean;
  apiBaseUrl: string;
  onClose: () => void;
  onCreate: (input: CreateGuildInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<CreateGuildInput["template"]>("community");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setError("Use at least 2 characters.");
      return;
    }

    setSaving(true);
    try {
      await onCreate({ name: trimmedName, template });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create local server.");
      setSaving(false);
    }
  };

  return (
    <div className="palette-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="server-dialog" onSubmit={submit} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <strong>Create Local Server</strong>
            <span>{apiOnline ? `Hosting on ${apiBaseUrl}` : "Local host is offline; this will use memory fallback."}</span>
          </div>
          <button type="button" onClick={onClose} title="Close" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <label className="field-label">
          <span>Server name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="My local community" autoFocus />
        </label>

        <div className="template-grid">
          <TemplateButton
            active={template === "community"}
            icon={Users}
            title="Community"
            detail="Welcome, announcements, general, showcase, lounge"
            onClick={() => setTemplate("community")}
          />
          <TemplateButton
            active={template === "gaming"}
            icon={Video}
            title="Gaming"
            detail="Clips, party voice, roles"
            onClick={() => setTemplate("gaming")}
          />
          <TemplateButton
            active={template === "work"}
            icon={Layers}
            title="Work"
            detail="Roadmap, threads, audit log, project channels"
            onClick={() => setTemplate("work")}
          />
        </div>

        {error ? <p className="dialog-error">{error}</p> : null}

        <footer>
          <button type="button" className="secondary-action" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-action" disabled={saving}>
            <Plus size={17} />
            {saving ? "Creating" : "Create local server"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function TemplateButton({
  active,
  icon: Icon,
  title,
  detail,
  onClick
}: {
  active: boolean;
  icon: typeof Activity;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={classNames("template-button", active && "selected")} onClick={onClick}>
      <Icon size={20} />
      <strong>{title}</strong>
      <span>{detail}</span>
    </button>
  );
}

function CreateChannelDialog({
  category,
  guildName,
  apiOnline,
  onClose,
  onCreate
}: {
  category: string;
  guildName: string;
  apiOnline: boolean;
  onClose: () => void;
  onCreate: (input: CreateChannelInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [type, setType] = useState<CreateChannelInput["type"]>(defaultChannelTypeForCategory(category));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const trimmedName = name.trim();
    const trimmedCategory = selectedCategory.trim();

    if (trimmedName.length < 2) {
      setError("Use at least 2 characters for the channel name.");
      return;
    }

    if (!trimmedCategory) {
      setError("Choose a channel category.");
      return;
    }

    setSaving(true);
    try {
      await onCreate({
        name: trimmedName,
        type,
        category: trimmedCategory,
        topic: topic.trim() || defaultTopicForChannel(type, trimmedName)
      });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create channel.");
      setSaving(false);
    }
  };

  return (
    <div className="palette-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="server-dialog" onSubmit={submit} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <strong>Create Channel</strong>
            <span>{apiOnline ? `${guildName} / saved locally` : `${guildName} / memory fallback`}</span>
          </div>
          <button type="button" onClick={onClose} title="Close" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <label className="field-label">
          <span>Channel name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="project-chat" autoFocus />
        </label>

        <label className="field-label">
          <span>Category</span>
          <input value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} placeholder="Text Channels" />
        </label>

        <div className="template-grid channel-type-grid">
          <ChannelTypeButton active={type === "text"} icon={Hash} title="Text" detail="Messages and threads" onClick={() => setType("text")} />
          <ChannelTypeButton active={type === "voice"} icon={Volume2} title="Voice" detail="Local voice room" onClick={() => setType("voice")} />
          <ChannelTypeButton active={type === "forum"} icon={MessageCircle} title="Forum" detail="Topic posts" onClick={() => setType("forum")} />
          <ChannelTypeButton active={type === "announcement"} icon={Megaphone} title="Announcement" detail="Read-only updates" onClick={() => setType("announcement")} />
          <ChannelTypeButton active={type === "rules"} icon={Shield} title="Rules" detail="Guidelines page" onClick={() => setType("rules")} />
        </div>

        <label className="field-label">
          <span>Topic</span>
          <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder={defaultTopicForChannel(type, name || "channel")} />
        </label>

        {error ? <p className="dialog-error">{error}</p> : null}

        <footer>
          <button type="button" className="secondary-action" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-action" disabled={saving}>
            <Plus size={17} />
            {saving ? "Creating" : "Create channel"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function ChannelTypeButton({
  active,
  icon: Icon,
  title,
  detail,
  onClick
}: {
  active: boolean;
  icon: typeof Activity;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={classNames("template-button", active && "selected")} onClick={onClick}>
      <Icon size={20} />
      <strong>{title}</strong>
      <span>{detail}</span>
    </button>
  );
}

function CommandPalette({
  guild,
  onClose,
  onSelectChannel,
  onSelectInspector
}: {
  guild: Guild;
  onClose: () => void;
  onSelectChannel: (channel: Channel) => void;
  onSelectInspector: (view: InspectorView) => void;
}) {
  const [query, setQuery] = useState("");
  const filteredChannels = guild.channels.filter((channel) =>
    channel.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="palette-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="command-palette" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <Search size={18} />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search channels, tools, commands" />
          <button onClick={onClose} title="Close" aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="palette-results">
          {filteredChannels.slice(0, 5).map((channel) => (
            <button key={channel.id} onClick={() => onSelectChannel(channel)}>
              <ChannelGlyph type={channel.type} />
              <span>#{channel.name}</span>
            </button>
          ))}
          {(["activity", "roles", "moderation", "apps", "settings"] as InspectorView[]).map((view) => (
            <button key={view} onClick={() => onSelectInspector(view)}>
              <SlidersHorizontal size={16} />
              <span>{capitalize(view)}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function VoiceDock({
  connected,
  muted,
  deafened,
  onToggleConnected,
  onToggleMuted,
  onToggleDeafened
}: {
  connected: boolean;
  muted: boolean;
  deafened: boolean;
  onToggleConnected: () => void;
  onToggleMuted: () => void;
  onToggleDeafened: () => void;
}) {
  return (
    <section className="voice-dock">
      <div className="voice-status">
        <Radio size={17} />
        <div>
          <strong>{connected ? "Voice connected" : "Voice idle"}</strong>
          <span>{connected ? "Lounge / 32 ms" : "No active room"}</span>
        </div>
      </div>
      <div className="voice-controls">
        <button className={classNames(muted && "active")} onClick={onToggleMuted} title="Mute" aria-label="Mute">
          {muted ? <MicOff size={17} /> : <Mic size={17} />}
        </button>
        <button className={classNames(deafened && "active")} onClick={onToggleDeafened} title="Deafen" aria-label="Deafen">
          <Headphones size={17} />
        </button>
        <button title="Share screen" aria-label="Share screen">
          <MonitorUp size={17} />
        </button>
        <button className="disconnect" onClick={onToggleConnected} title="Disconnect" aria-label="Disconnect">
          <Phone size={17} />
        </button>
      </div>
    </section>
  );
}

function InspectorTab({
  current,
  view,
  onClick,
  icon: Icon,
  label
}: {
  current: InspectorView;
  view: InspectorView;
  onClick: (view: InspectorView) => void;
  icon: typeof Activity;
  label: string;
}) {
  return (
    <button
      className={classNames(current === view && "selected")}
      onClick={() => onClick(view)}
      title={label}
      aria-label={label}
    >
      <Icon size={17} />
      <span>{label}</span>
    </button>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  actionIcon: ActionIcon
}: {
  icon: typeof Activity;
  title: string;
  actionIcon?: typeof Activity;
}) {
  return (
    <header className="panel-header">
      <div>
        <Icon size={17} />
        <strong>{title}</strong>
      </div>
      {ActionIcon ? (
        <button title={`${title} action`} aria-label={`${title} action`}>
          <ActionIcon size={15} />
        </button>
      ) : null}
    </header>
  );
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <section className="metric">
      <Icon size={17} />
      <strong>{value}</strong>
      <span>{label}</span>
    </section>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  checked,
  onClick
}: {
  icon: typeof Activity;
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button className="toggle-row" onClick={onClick}>
      <Icon size={17} />
      <span>{label}</span>
      <b className={classNames("toggle", checked && "checked")}>
        <i />
      </b>
    </button>
  );
}

function ChannelGlyph({ type }: { type: ChannelType }) {
  const Icon = getChannelIcon(type);
  return <Icon className="channel-glyph" size={18} />;
}

function Avatar({ user, size }: { user: User; size: "sm" | "md" | "lg" }) {
  return (
    <span className={classNames("avatar", `avatar-${size}`)} style={{ "--avatar-color": user.accent } as React.CSSProperties}>
      {user.avatar}
      <PresenceDot status={user.status} />
    </span>
  );
}

function PresenceDot({ status }: { status: Presence }) {
  return <i className={classNames("presence-dot", status)} title={status} />;
}

function getChannelIcon(type: ChannelType) {
  switch (type) {
    case "voice":
      return Volume2;
    case "stage":
      return Radio;
    case "forum":
      return MessageCircle;
    case "announcement":
      return Megaphone;
    case "rules":
      return Shield;
    default:
      return Hash;
  }
}

function groupChannels(channels: Channel[]) {
  return channels.reduce<Record<string, Channel[]>>((groups, channel) => {
    groups[channel.category] = groups[channel.category] ?? [];
    groups[channel.category].push(channel);
    return groups;
  }, {});
}

function toggleReaction(reactions: Message["reactions"], emoji: string) {
  const existing = reactions.find((reaction) => reaction.emoji === emoji);
  if (!existing) {
    return [...reactions, { emoji, count: 1, reacted: true }];
  }
  return reactions.map((reaction) =>
    reaction.emoji === emoji
      ? {
          ...reaction,
          count: reaction.reacted ? Math.max(0, reaction.count - 1) : reaction.count + 1,
          reacted: !reaction.reacted
        }
      : reaction
  );
}

function createFallbackGuild(name: string): Guild {
  const id = `g-local-${Date.now()}`;
  return {
    id,
    name,
    initials: initialsFor(name),
    accent: "#64d2b8",
    boostLevel: 0,
    features: ["Community", "Local", "Offline"],
    roles: [
      { id: "owner", name: "Owner", color: "#f6c85f", permissions: ["Administrator"] },
      { id: "member", name: "Member", color: "#b7bcc9", permissions: ["Send messages", "Join voice"] }
    ],
    channels: [
      {
        id: `c-local-welcome-${Date.now()}`,
        name: "welcome",
        type: "rules",
        category: "Start Here",
        topic: `${name} is available in memory until the local host comes online.`
      },
      {
        id: `c-local-general-${Date.now()}`,
        name: "general",
        type: "text",
        category: "Text Channels",
        topic: `General chat for ${name}.`
      },
      {
        id: `c-local-lounge-${Date.now()}`,
        name: "Lounge",
        type: "voice",
        category: "Voice Channels",
        topic: "Voice placeholder.",
        participants: []
      }
    ]
  };
}

function createFallbackChannel(input: CreateChannelInput): Channel {
  const name = slugify(input.name) || "new-channel";
  return {
    id: `c-local-${name}-${Date.now()}`,
    name,
    type: input.type,
    category: input.category,
    topic: input.topic || defaultTopicForChannel(input.type, name),
    participants: input.type === "voice" ? [] : undefined
  };
}

function addChannelToGuild(guilds: Guild[], guildId: string, channel: Channel) {
  return guilds.map((guild) =>
    guild.id === guildId
      ? {
          ...guild,
          channels: [...guild.channels, channel]
        }
      : guild
  );
}

function defaultChannelTypeForCategory(category: string): CreateChannelInput["type"] {
  const normalized = category.toLowerCase();
  if (normalized.includes("voice")) {
    return "voice";
  }
  if (normalized.includes("start") || normalized.includes("rules")) {
    return "rules";
  }
  return "text";
}

function defaultTopicForChannel(type: CreateChannelInput["type"], name: string) {
  const channelName = slugify(name) || "channel";
  if (type === "voice") {
    return `Voice room for ${channelName}.`;
  }
  if (type === "forum") {
    return `Forum posts for ${channelName}.`;
  }
  if (type === "announcement") {
    return `Announcements for ${channelName}.`;
  }
  if (type === "rules") {
    return `Guidelines for ${channelName}.`;
  }
  return `Discussion for ${channelName}.`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function initialsFor(value: string) {
  const initials = value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "LG";
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default App;
