'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import SettingsModal from './SettingsModal';
import TemplatesModal from './TemplatesModal';
import ConversationSettingsModal from './ConversationSettingsModal';
import CompareView from './CompareView';
import OnboardingModal from './OnboardingModal';
import MemoryToast from './MemoryToast';
import { DEFAULT_MODEL } from '@/lib/models';

export interface ConversationListItem {
  id: string;
  title: string;
  pinned?: boolean;
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
  pinned?: boolean;
}

export interface UserProfile {
  name: string | null;
  role: string | null;
  context: string | null;
  customInstructions: string | null;
  onboarded: boolean;
}

export default function ChatApp() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'api' | 'memories'>('profile');
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [convSettingsOpen, setConvSettingsOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [memoryToasts, setMemoryToasts] = useState<{ id: string; content: string }[]>([]);

  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/conversations');
    if (res.ok) setConversations(await res.json());
  }, []);

  const loadProfile = useCallback(async () => {
    const res = await fetch('/api/profile');
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      if (!data.onboarded) setShowOnboarding(true);
    }
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
        pinned: data.pinned,
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

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (activeId === id && activeConversation) {
        setActiveConversation({ ...activeConversation, title });
      }
      await loadConversations();
    },
    [activeId, activeConversation, loadConversations]
  );

  const togglePin = useCallback(
    async (id: string, pinned: boolean) => {
      await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned }),
      });
      await loadConversations();
    },
    [loadConversations]
  );

  const showMemoryToast = useCallback((content: string) => {
    const id = Math.random().toString(36).slice(2);
    setMemoryToasts((prev) => [...prev, { id, content }]);
    setTimeout(() => {
      setMemoryToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  useEffect(() => {
    loadConversations();
    loadProfile();
  }, [loadConversations, loadProfile]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {sidebarOpen && (
        <div className="hidden md:flex">
          <Sidebar
            conversations={conversations}
            activeId={activeId}
            onSelect={loadConversation}
            onNew={newChat}
            onDelete={deleteConversation}
            onClose={() => setSidebarOpen(false)}
            onOpenSettings={() => {
              setSettingsTab('profile');
              setSettingsOpen(true);
            }}
            onOpenTemplates={() => setTemplatesOpen(true)}
            onOpenCompare={() => setCompareOpen(true)}
            onRename={renameConversation}
            onTogglePin={togglePin}
            userName={profile?.name}
          />
        </div>
      )}

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-y-0 left-0 w-72" onClick={(e) => e.stopPropagation()}>
            <Sidebar
              conversations={conversations}
              activeId={activeId}
              onSelect={(id) => {
                loadConversation(id);
                setSidebarOpen(false);
              }}
              onNew={() => {
                newChat();
                setSidebarOpen(false);
              }}
              onDelete={deleteConversation}
              onClose={() => setSidebarOpen(false)}
              onOpenSettings={() => {
                setSettingsTab('profile');
                setSettingsOpen(true);
                setSidebarOpen(false);
              }}
              onOpenTemplates={() => {
                setTemplatesOpen(true);
                setSidebarOpen(false);
              }}
              onOpenCompare={() => {
                setCompareOpen(true);
                setSidebarOpen(false);
              }}
              onRename={renameConversation}
              onTogglePin={togglePin}
              userName={profile?.name}
            />
          </div>
        </div>
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
        onOpenSettings={(tab) => {
          if (tab) setSettingsTab(tab);
          setSettingsOpen(true);
        }}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onOpenConvSettings={() => setConvSettingsOpen(true)}
        profile={profile}
        onMemoryAdded={showMemoryToast}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab={settingsTab}
        onProfileChange={(p) => setProfile(p)}
      />
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
        onSaved={(updated) => setActiveConversation(updated)}
      />
      <CompareView open={compareOpen} onClose={() => setCompareOpen(false)} />

      <OnboardingModal
        open={showOnboarding}
        onComplete={async ({ name, role, context }) => {
          const res = await fetch('/api/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, role, context, onboarded: true }),
          });
          if (res.ok) setProfile(await res.json());
          setShowOnboarding(false);
        }}
        onSkip={async () => {
          await fetch('/api/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ onboarded: true }),
          });
          setShowOnboarding(false);
        }}
      />

      <div className="fixed bottom-4 right-4 z-40 space-y-2">
        {memoryToasts.map((t) => (
          <MemoryToast key={t.id} content={t.content} />
        ))}
      </div>
    </div>
  );
}
