"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, RotateCcw, History, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useProject } from "@/lib/project-context";
import {
  createConversation,
  getLatestConversation,
  getConversationHistory,
  getMessages,
  saveMessage,
  touchConversation,
  updateConversationTitle,
  addConversationUsage,
} from "@/lib/db/conversations";
import type { DbConversation } from "@/lib/supabase";

interface Message {
  id: string;
  role: "user" | "agent" | "system" | "routing" | "delegation" | "lateral" | "tool";
  agentSlug?: string;
  agentName?: string;
  agentEmoji?: string;
  content: string;
  timestamp: number;
  parentAgentSlug?: string;
  isDelegated?: boolean;
  toolName?: string;
  toolArgs?: string[];
  toolExitCode?: number;
  toolDone?: boolean;
}

/** Strip [MEMORY: ...] and [TOOL: ...] tags from visible text */
function stripAgentTags(text: string): string {
  return text
    .replace(/\[MEMORY:\s*.+?\]/g, "")
    .replace(/\[TOOL:\s*.+?\]/g, "")
    .trimEnd();
}

interface ChatWindowProps {
  agentSlug: string;
  agentName: string;
  agentEmoji: string;
  conversationType?: "one_on_one" | "department" | "board_meeting" | "brief" | "orchestrated";
  placeholder?: string;
}

export default function ChatWindow({
  agentSlug,
  agentName,
  agentEmoji,
  conversationType = "one_on_one",
  placeholder = "Scrie mesajul tău...",
}: ChatWindowProps) {
  const { projectSlug } = useProject();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [sessionUsage, setSessionUsage] = useState({ tokens: 0, costUsd: 0 });
  const [historyList, setHistoryList] = useState<DbConversation[]>([]);
  const [currentAgent, setCurrentAgent] = useState<{
    name: string;
    emoji: string;
    slug: string;
  } | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load existing conversation on mount
  useEffect(() => {
    async function loadHistory() {
      setIsLoadingHistory(true);
      const conversation = await getLatestConversation(
        agentSlug,
        conversationType,
        projectSlug
      );
      if (conversation) {
        conversationIdRef.current = conversation.id;
        const dbMessages = await getMessages(conversation.id);
        const loaded: Message[] = dbMessages.map((m) => ({
          id: m.id,
          role: m.role,
          agentSlug: m.agent_slug || undefined,
          agentName: m.agent_name || undefined,
          agentEmoji: m.agent_emoji || undefined,
          content: m.content,
          timestamp: m.timestamp,
        }));
        setMessages(loaded);
      }
      setIsLoadingHistory(false);
    }
    loadHistory();
  }, [agentSlug, conversationType, projectSlug]);

  const getOrCreateConversation = async (): Promise<string | null> => {
    if (conversationIdRef.current) return conversationIdRef.current;
    const conversation = await createConversation({
      agentSlug,
      agentName,
      agentEmoji,
      conversationType,
      projectSlug,
    });
    if (conversation) {
      conversationIdRef.current = conversation.id;
      return conversation.id;
    }
    return null;
  };

  const startNewConversation = async () => {
    conversationIdRef.current = null;
    setMessages([]);
  };

  const openHistory = async () => {
    const list = await getConversationHistory(agentSlug, conversationType, projectSlug);
    setHistoryList(list);
    setShowHistory(true);
  };

  const loadConversation = async (conv: DbConversation) => {
    conversationIdRef.current = conv.id;
    const dbMessages = await getMessages(conv.id);
    const loaded: Message[] = dbMessages.map((m) => ({
      id: m.id,
      role: m.role,
      agentSlug: m.agent_slug || undefined,
      agentName: m.agent_name || undefined,
      agentEmoji: m.agent_emoji || undefined,
      content: m.content,
      timestamp: m.timestamp,
    }));
    setMessages(loaded);
    setShowHistory(false);
  };

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return `acum`;
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}z`;
  }

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    // Ensure conversation exists
    const convId = await getOrCreateConversation();

    // Save user message
    if (convId) {
      await saveMessage({
        conversationId: convId,
        role: "user",
        content: userMessage.content,
        timestamp: userMessage.timestamp,
      });

      // Auto-title on first message
      if (messages.length === 0) {
        const title = userMessage.content.slice(0, 60);
        await updateConversationTitle(convId, title);
      }
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          agentSlug,
          conversationType,
          projectSlug,
        }),
      });

      if (!response.ok) throw new Error("Eroare la server");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let currentContent = "";
      let activeAgentSlug = agentSlug;
      let activeAgentName = agentName;
      let activeAgentEmoji = agentEmoji;
      let streamMessageId = `stream-${agentSlug}-${Date.now()}`;
      let activeIsDelegated = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          switch (data.type) {
            case "routing":
              if (data.routingInfo) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `routing-${Date.now()}`,
                    role: "routing",
                    content: `${data.routingInfo.primaryAgentEmoji} Routing → **${data.routingInfo.primaryAgentName}**${data.routingInfo.secondaryAgents?.length > 0 ? ` + ${data.routingInfo.secondaryAgents.length} departament(e)` : ""}${data.routingInfo.delegationDepth === "deep" ? " (cu echipa)" : ""}`,
                    timestamp: Date.now(),
                  },
                ]);
              }
              break;

            case "delegation_start":
              setMessages((prev) => [
                ...prev,
                {
                  id: `deleg-start-${Date.now()}`,
                  role: "delegation",
                  agentSlug: data.agentSlug,
                  agentName: data.agentName,
                  agentEmoji: data.agentEmoji,
                  content: `${data.agentEmoji} **${data.agentName}** deleghează la echipă...`,
                  timestamp: Date.now(),
                },
              ]);
              break;

            case "delegation_end":
              break;

            case "lateral_start":
              setMessages((prev) => [
                ...prev,
                {
                  id: `lateral-${Date.now()}`,
                  role: "lateral",
                  content: `💬 Echipa dezbate între ei...`,
                  timestamp: Date.now(),
                },
              ]);
              break;

            case "lateral_end":
              break;

            case "agent_start":
              activeAgentSlug = data.agentSlug;
              activeAgentName = data.agentName;
              activeAgentEmoji = data.agentEmoji;
              activeIsDelegated = !!data.parentAgentSlug;
              currentContent = "";
              streamMessageId = `stream-${data.agentSlug}-${Date.now()}`;
              setCurrentAgent({
                name: data.agentName,
                emoji: data.agentEmoji,
                slug: data.agentSlug,
              });
              break;

            case "text":
              currentContent += data.content || "";
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "agent" && last?.id === streamMessageId) {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, content: currentContent },
                  ];
                }
                return [
                  ...prev,
                  {
                    id: streamMessageId,
                    role: "agent",
                    agentSlug: activeAgentSlug,
                    agentName: activeAgentName,
                    agentEmoji: activeAgentEmoji,
                    content: currentContent,
                    timestamp: Date.now(),
                    isDelegated: activeIsDelegated,
                  },
                ];
              });
              break;

            case "tool_start":
              setMessages((prev) => [
                ...prev,
                {
                  id: `tool-${data.toolName}-${Date.now()}`,
                  role: "tool",
                  agentSlug: data.agentSlug,
                  toolName: data.toolName,
                  toolArgs: data.toolArgs || [],
                  content: "",
                  toolDone: false,
                  timestamp: Date.now(),
                },
              ]);
              break;

            case "tool_output":
              setMessages((prev) => {
                const lastTool = [...prev].reverse().find((m) => m.role === "tool" && !m.toolDone);
                if (!lastTool) return prev;
                return prev.map((m) =>
                  m.id === lastTool.id
                    ? { ...m, content: m.content + (m.content ? "\n" : "") + data.content }
                    : m
                );
              });
              break;

            case "tool_done":
              setMessages((prev) => {
                const lastTool = [...prev].reverse().find((m) => m.role === "tool" && !m.toolDone);
                if (!lastTool) return prev;
                return prev.map((m) =>
                  m.id === lastTool.id ? { ...m, toolDone: true, toolExitCode: data.exitCode } : m
                );
              });
              break;

            case "agent_end":
              // Save completed agent message to Supabase
              if (convId && currentContent) {
                const savedMsg = await saveMessage({
                  conversationId: convId,
                  role: "agent",
                  agentSlug: activeAgentSlug,
                  agentName: activeAgentName,
                  agentEmoji: activeAgentEmoji,
                  content: currentContent,
                  timestamp: Date.now(),
                });
                // Replace temp stream ID with real DB id
                if (savedMsg) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === streamMessageId ? { ...m, id: savedMsg.id } : m
                    )
                  );
                }
              }
              setCurrentAgent(null);
              currentContent = "";
              break;

            case "usage":
              if (data.usage) {
                setSessionUsage((prev) => ({
                  tokens: prev.tokens + data.usage.inputTokens + data.usage.outputTokens,
                  costUsd: parseFloat((prev.costUsd + data.usage.costUsd).toFixed(6)),
                }));
                if (convId) {
                  addConversationUsage(convId, data.usage.inputTokens, data.usage.outputTokens, data.usage.costUsd).catch(() => {});
                }
              }
              break;

            case "done":
              if (convId) await touchConversation(convId);
              break;
          }
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "system",
          content: `Eroare: ${error instanceof Error ? error.message : "necunoscută"}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsStreaming(false);
      setCurrentAgent(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* History Drawer */}
      {showHistory && (
        <div className="absolute inset-0 z-20 flex">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative ml-auto w-full max-w-sm h-full bg-card border-l border-border flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
              <h2 className="font-semibold text-sm">Conversații anterioare</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowHistory(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {historyList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center pt-8">Nicio conversație salvată</p>
              ) : (
                historyList.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-colors",
                      conv.id === conversationIdRef.current
                        ? "border-primary/50 bg-primary/5"
                        : "border-border bg-background hover:border-primary/30 hover:bg-accent"
                    )}
                  >
                    <p className="text-sm font-medium truncate">
                      {conv.title || "Conversație fără titlu"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {timeAgo(conv.updated_at)}
                    </p>
                  </button>
                ))
              )}
            </div>
            <div className="p-3 border-t border-border">
              <Button
                variant="outline"
                className="w-full text-sm"
                onClick={() => { startNewConversation(); setShowHistory(false); }}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-2" />
                Conversație nouă
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Messages area */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4">
        <div className="max-w-3xl mx-auto py-6 space-y-6">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center pt-20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 text-center">
              <span className="text-5xl mb-4">{agentEmoji}</span>
              <h2 className="text-xl font-semibold mb-2">{agentName}</h2>
              <p className="text-muted-foreground text-sm max-w-md">
                {conversationType === "board_meeting"
                  ? "Board Meeting — toți directorii vor delibera la mesajul tău."
                  : conversationType === "orchestrated"
                    ? "Smart Chat — scrie orice, iar compania se organizează automat."
                    : `Conversație 1-on-1. Scrie un mesaj pentru a începe.`}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              // Routing info pill
              if (msg.role === "routing") {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      {msg.content}
                    </div>
                  </div>
                );
              }

              // Lateral debate status
              if (msg.role === "lateral") {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/5 border border-amber-500/10 text-xs text-amber-400/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {msg.content}
                    </div>
                  </div>
                );
              }

              // Delegation status line
              if (msg.role === "delegation") {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground/70">
                      <div className="h-px w-8 bg-border" />
                      {msg.content}
                      <div className="h-px w-8 bg-border" />
                    </div>
                  </div>
                );
              }

              // Tool execution block
              if (msg.role === "tool") {
                return (
                  <div key={msg.id} className="rounded-xl border border-border bg-black/90 overflow-hidden text-xs font-mono">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-black/40">
                      <span className="text-green-400">⚙</span>
                      <span className="text-green-400 font-semibold">{msg.toolName}</span>
                      {msg.toolArgs && msg.toolArgs.length > 0 && (
                        <span className="text-muted-foreground">{msg.toolArgs.join(" ")}</span>
                      )}
                      <div className="ml-auto">
                        {!msg.toolDone ? (
                          <Loader2 className="h-3 w-3 animate-spin text-yellow-400" />
                        ) : msg.toolExitCode === 0 ? (
                          <span className="text-green-400">✓ exit 0</span>
                        ) : (
                          <span className="text-red-400">✗ exit {msg.toolExitCode}</span>
                        )}
                      </div>
                    </div>
                    {msg.content && (
                      <div className="px-3 py-2 max-h-48 overflow-y-auto">
                        {msg.content.split("\n").map((line, i) => (
                          <div key={i} className={line.startsWith("Eroare") || line.startsWith("Error") ? "text-red-400" : "text-green-300"}>
                            {line}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" && "flex-row-reverse",
                  msg.isDelegated && "ml-6 pl-4 border-l-2 border-primary/10"
                )}
              >
                {msg.role !== "user" && (
                  <Avatar className={cn("shrink-0 mt-0.5", msg.isDelegated ? "h-6 w-6" : "h-8 w-8")}>
                    <AvatarFallback className={cn(msg.isDelegated ? "text-xs bg-primary/5" : "text-sm bg-primary/10")}>
                      {msg.agentEmoji || "🤖"}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={cn(
                    "flex flex-col gap-1 max-w-[85%]",
                    msg.role === "user" && "items-end"
                  )}
                >
                  {msg.role === "agent" && msg.agentName && (
                    <span className={cn("font-medium", msg.isDelegated ? "text-[10px] text-muted-foreground/70" : "text-xs text-muted-foreground")}>
                      {msg.agentName}
                    </span>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap"
                        : msg.role === "system"
                          ? "bg-destructive/10 text-destructive whitespace-pre-wrap"
                          : msg.isDelegated
                            ? "bg-card/50 border border-border/40 rounded-bl-md text-muted-foreground text-[13px]"
                            : "bg-card border border-border rounded-bl-md"
                    )}
                  >
                    {msg.role === "agent" ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 mt-3 first:mt-0">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
                          code: ({ children, className }) =>
                            className ? (
                              <code className="block bg-muted/60 rounded px-3 py-2 text-xs font-mono my-2 overflow-x-auto">{children}</code>
                            ) : (
                              <code className="bg-muted/60 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
                            ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-primary/30 pl-3 italic text-muted-foreground my-2">{children}</blockquote>
                          ),
                          a: ({ href, children }) => (
                            <a href={href} className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer">{children}</a>
                          ),
                          hr: () => <hr className="border-border my-3" />,
                        }}
                      >
                        {stripAgentTags(msg.content)}
                      </ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              </div>
              );
            })
          )}

          {isStreaming && currentAgent && messages[messages.length - 1]?.role !== "agent" && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-sm bg-primary/10">
                  {currentAgent.emoji}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {currentAgent.name} gândește...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t border-border p-4 bg-card/50 space-y-2">
        {sessionUsage.tokens > 0 && (
          <div className="max-w-3xl mx-auto flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{sessionUsage.tokens.toLocaleString()} tokens</span>
            <span>·</span>
            <span>${sessionUsage.costUsd.toFixed(4)}</span>
          </div>
        )}
        <div className="max-w-3xl mx-auto flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={openHistory}
            disabled={isStreaming}
            title="Conversații anterioare"
            className="h-[44px] w-[44px] shrink-0 text-muted-foreground"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={startNewConversation}
            disabled={isStreaming || messages.length === 0}
            title="Conversație nouă"
            className="h-[44px] w-[44px] shrink-0 text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="resize-none min-h-[44px] max-h-[120px] bg-background"
            disabled={isStreaming}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            size="icon"
            className="h-[44px] w-[44px] shrink-0"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
