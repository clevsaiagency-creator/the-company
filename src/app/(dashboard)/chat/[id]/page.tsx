"use client";

import { use } from "react";
import Link from "next/link";
import { getAgent } from "@/lib/ai/agents";
import { Badge } from "@/components/ui/badge";
import ChatWindow from "@/components/chat/ChatWindow";

export default function AgentChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const agent = getAgent(id);

  if (!agent) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Agent negăsit: {id}</p>
          <Link href="/chat" className="text-primary hover:underline">
            &larr; Înapoi la Chat
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
        <Link
          href="/chat"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Înapoi
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-lg">{agent.emoji}</span>
          <h1 className="font-semibold">{agent.name}</h1>
        </div>
        <Badge variant="secondary" className="ml-auto">
          {agent.department}
        </Badge>
      </div>
      <ChatWindow
        agentSlug={agent.slug}
        agentName={agent.name}
        agentEmoji={agent.emoji}
        conversationType="one_on_one"
        placeholder={`Scrie un mesaj pentru ${agent.name}...`}
      />
    </div>
  );
}
