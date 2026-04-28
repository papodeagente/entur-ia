'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import SettingsModal from './SettingsModal';
import TemplatesModal from './TemplatesModal';
import ConversationSettingsModal from './ConversationSettingsModal';
import CompareView from './CompareView';
import { DEFAULT_MODEL } from '@/lib/models';

export interface ConversationListItem {
  id: string;
  title: string;
  updatedAt: string;
}

export interface ImageOutput {
  mimeType: string;
  b64: string;
}

export interface CitationItem {
  url: string;
  title?: string;
}

export interface MessageItem {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: any[];
  outputs?: { images?: ImageOutput[] } | null;
  thinking?: string | null;
  citations?: CitationItem[] | null;
  model?: string | null;
  provider?: string | null;
  toolCalls?: { tool: string; output?: string }[];
}

export interface ConversationDetail {
  id: string;
  title: string;
  systemPrompt: string | null;
  toolsConfig: any;
}

export default function ChatApp() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [convSettingsOpen, setConvSettingsOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/conversations');
    if (res.ok) setConversations(await res.json());
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setActiveId(id);
      setActiveConversation({
        id: data.id,
        title: data.title,
        systemPrompt: data.systemPrompt,
        toolsConfig: data.toolsConfig,
      });
      setMessages(
        data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          attachments: m.attachments,
          outputs: m.outputs,
          thinking: m.thinking,
          citations: m.citations,
          model: m.model,
          provider: m.provider,
        }))
      );
    }
  }, []);

  const newChat = useCallback(() => {
    setActiveId(null);
    setActiveConversation(null);
    setMessages([]);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (activeId === id) {
        setActiveId(null);
        setActiveConversation(null);
        setMessages([]);
      }
      await loadConversations();
    },
    [activeId, loadConversations]
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {sidebarOpen && (
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={loadConversation}
          onNew={newChat}
          onDelete={deleteConversation}
          onClose={() => setSidebarOpen(false)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenTemplates={() => setTemplatesOpen(true)}
          onOpenCompare={() => setCompareOpen(true)}
        />
      )}
      <ChatArea
        messages={messages}
        setMessages={setMessages}
        activeId={activeId}
        setActiveId={setActiveId}
        activeConversation={activeConversation}
        setActiveConversation={setActiveConversation}
        modelId={modelId}
        setModelId={setModelId}
        onNewChat={newChat}
        onAfterSend={loadConversations}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onOpenConvSettings={() => setConvSettingsOpen(true)}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <TemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onPick={(content) => {
          setTemplatesOpen(false);
          window.dispatchEvent(new CustomEvent('entur-ia:template', { detail: content }));
        }}
      />
      <ConversationSettingsModal
        open={convSettingsOpen}
        onClose={() => setConvSettingsOpen(false)}
        conversation={activeConversation}
        onSaved={(updated) => {
          setActiveConversation(updated);
        }}
      />
      <CompareView open={compareOpen} onClose={() => setCompareOpen(false)} />
    </div>
  );
}
