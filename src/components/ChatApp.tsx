'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import SettingsModal from './SettingsModal';
import { DEFAULT_MODEL } from '@/lib/models';

export interface ConversationListItem {
  id: string;
  title: string;
  updatedAt: string;
}

export interface MessageItem {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string | null;
  provider?: string | null;
}

export default function ChatApp() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/conversations');
    if (res.ok) {
      const data = await res.json();
      setConversations(data);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setActiveId(id);
      setMessages(
        data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          model: m.model,
          provider: m.provider,
        }))
      );
    }
  }, []);

  const newChat = useCallback(() => {
    setActiveId(null);
    setMessages([]);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (activeId === id) {
        setActiveId(null);
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
        />
      )}
      <ChatArea
        messages={messages}
        setMessages={setMessages}
        activeId={activeId}
        setActiveId={setActiveId}
        modelId={modelId}
        setModelId={setModelId}
        onNewChat={newChat}
        onAfterSend={loadConversations}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
