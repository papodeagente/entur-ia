'use client';

import { useEffect, useRef, useState } from 'react';
import { ConversationDetail, MessageItem } from './ChatApp';
import MessageBubble from './MessageBubble';
import ModelSelector from './ModelSelector';
import { getModel, modelHas, isImageModel } from '@/lib/models';

interface Props {
  messages: MessageItem[];
  setMessages: React.Dispatch<React.SetStateAction<MessageItem[]>>;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  activeConversation: ConversationDetail | null;
  setActiveConversation: (c: ConversationDetail | null) => void;
  modelId: string;
  setModelId: (id: string) => void;
  onNewChat: () => void;
  onAfterSend: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onOpenTemplates: () => void;
  onOpenConvSettings: () => void;
}

interface PendingAttachment {
  kind: 'image' | 'pdf' | 'text';
  mimeType: string;
  data: string;
  name: string;
}

async function fileToAttachment(file: File): Promise<PendingAttachment> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  let kind: 'image' | 'pdf' | 'text' = 'text';
  if (file.type.startsWith('image/')) kind = 'image';
  else if (file.type === 'application/pdf') kind = 'pdf';
  return { kind, mimeType: file.type || 'application/octet-stream', data: b64, name: file.name };
}

export default function ChatArea({
  messages,
  setMessages,
  activeId,
  setActiveId,
  activeConversation,
  setActiveConversation,
  modelId,
  setModelId,
  onNewChat,
  onAfterSend,
  sidebarOpen,
  onToggleSidebar,
  onOpenSettings,
  onOpenTemplates,
  onOpenConvSettings,
}: Props) {
  const [input, setInput] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [tools, setTools] = useState<{ webSearch: boolean; codeExec: boolean; thinking: boolean }>({
    webSearch: false,
    codeExec: false,
    thinking: false,
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const currentModel = getModel(modelId);
  const isImage = isImageModel(modelId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto';
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 240) + 'px';
    }
  }, [input]);

  useEffect(() => {
    function onTemplate(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      setInput((prev) => (prev ? prev + '\n\n' + detail : detail));
      taRef.current?.focus();
    }
    window.addEventListener('entur-ia:template', onTemplate);
    return () => window.removeEventListener('entur-ia:template', onTemplate);
  }, []);

  const onPickFiles = async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const converted = await Promise.all(arr.map(fileToAttachment));
    setPendingAttachments((prev) => [...prev, ...converted]);
  };

  const removeAttachment = (idx: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const exportConversation = () => {
    if (messages.length === 0) {
      alert('Conversa vazia');
      return;
    }
    const lines: string[] = [];
    lines.push(`# ${activeConversation?.title || 'Conversa Entur IA'}`);
    lines.push(`\n_Exportado em ${new Date().toLocaleString('pt-BR')}_\n`);
    for (const m of messages) {
      const who = m.role === 'user' ? '**Você**' : `**${getModel(m.model || '')?.label || 'Assistente'}**`;
      lines.push(`\n---\n\n### ${who}\n`);
      if (m.content) lines.push(m.content);
      if (m.outputs?.images?.length) {
        lines.push(`\n_(${m.outputs.images.length} imagem(ns) gerada(s))_`);
      }
      if (m.citations?.length) {
        lines.push('\n**Fontes:**');
        m.citations.forEach((c, i) => lines.push(`${i + 1}. [${c.title || c.url}](${c.url})`));
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeConversation?.title || 'entur-ia').replace(/[^a-z0-9]+/gi, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && pendingAttachments.length === 0) || isStreaming) return;

    setError(null);
    setInput('');
    setIsStreaming(true);

    const userMsg: MessageItem = {
      role: 'user',
      content: text,
      attachments: pendingAttachments.length ? pendingAttachments : undefined,
    };
    const placeholder: MessageItem = {
      role: 'assistant',
      content: '',
      model: modelId,
      provider: currentModel?.provider,
      toolCalls: [],
    };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    const sentAttachments = pendingAttachments;
    setPendingAttachments([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeId,
          modelId,
          message: text,
          attachments: sentAttachments,
          tools: {
            webSearch: tools.webSearch && modelHas(modelId, 'web-search'),
            codeExec: tools.codeExec && modelHas(modelId, 'code-exec'),
            thinking: tools.thinking && modelHas(modelId, 'thinking'),
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errBody = await res.text();
        throw new Error(errBody || 'Falha na requisição');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';
      let thinkingContent = '';
      const collectedImages: { mimeType: string; b64: string }[] = [];
      const collectedCitations: { url: string; title?: string }[] = [];
      const collectedTools: { tool: string; output?: string }[] = [];

      const updateLast = (patch: Partial<MessageItem>) => {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], ...patch };
          return copy;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const evt = JSON.parse(json);
            if (evt.type === 'meta') {
              if (evt.isNew && evt.conversationId) setActiveId(evt.conversationId);
            } else if (evt.type === 'delta') {
              assistantContent += evt.text;
              updateLast({ content: assistantContent });
            } else if (evt.type === 'thinking') {
              thinkingContent += evt.text;
              updateLast({ thinking: thinkingContent });
            } else if (evt.type === 'image') {
              collectedImages.push({ mimeType: evt.mimeType, b64: evt.b64 });
              updateLast({ outputs: { images: [...collectedImages] } });
            } else if (evt.type === 'citation') {
              collectedCitations.push({ url: evt.url, title: evt.title });
              updateLast({ citations: [...collectedCitations] });
            } else if (evt.type === 'tool_start') {
              collectedTools.push({ tool: evt.tool });
              updateLast({ toolCalls: [...collectedTools] });
            } else if (evt.type === 'error') {
              throw new Error(evt.message);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e;
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(msg);
      setMessages((prev) => {
        const copy = [...prev];
        if (
          copy[copy.length - 1]?.role === 'assistant' &&
          !copy[copy.length - 1].content &&
          !copy[copy.length - 1].outputs
        ) {
          copy.pop();
        }
        return copy;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      onAfterSend();
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const supportsAttach = currentModel
    ? currentModel.capabilities.includes('vision') ||
      currentModel.capabilities.includes('pdf') ||
      currentModel.capabilities.includes('image-edit')
    : false;

  return (
    <main className="flex-1 flex flex-col h-full bg-bg-primary">
      <header className="flex items-center gap-2 px-4 h-14 border-b border-white/5">
        {!sidebarOpen && (
          <button onClick={onToggleSidebar} className="p-2 rounded-lg hover:bg-white/5 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        )}
        <div className="font-semibold">{activeConversation?.title || 'Entur IA'}</div>
        <div className="ml-auto flex items-center gap-1">
          {activeId && (
            <>
              <button
                onClick={onOpenConvSettings}
                className="text-xs px-2 py-1.5 rounded-lg hover:bg-white/5 transition"
                title="System prompt da conversa"
              >
                ⚙️ Prompt
              </button>
              <button
                onClick={exportConversation}
                className="text-xs px-2 py-1.5 rounded-lg hover:bg-white/5 transition"
                title="Exportar markdown"
              >
                ⬇️ Export
              </button>
            </>
          )}
          <button
            onClick={onOpenTemplates}
            className="text-xs px-2 py-1.5 rounded-lg hover:bg-white/5 transition"
          >
            📋 Templates
          </button>
          <button
            onClick={onNewChat}
            className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition"
          >
            + Novo
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {messages.length === 0 ? (
            <Welcome />
          ) : (
            messages.map((m, i) => (
              <MessageBubble
                key={i}
                message={m}
                streaming={
                  isStreaming &&
                  i === messages.length - 1 &&
                  m.role === 'assistant' &&
                  !!m.content
                }
              />
            ))
          )}
          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg p-3">
              <div>Erro: {error}</div>
              {error.includes('não configurada') && (
                <button onClick={onOpenSettings} className="underline mt-1">
                  Abrir Configurações
                </button>
              )}
            </div>
          )}
          {isStreaming && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && !messages[messages.length - 1]?.outputs && (
            <div className="text-sm text-text-tertiary flex items-center gap-2">
              <span className="cursor-blink">{isImage ? 'Gerando imagem' : 'Pensando'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pendingAttachments.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-bg-input rounded-lg px-2 py-1 border border-white/10"
                >
                  {a.kind === 'image' ? (
                    <img
                      src={`data:${a.mimeType};base64,${a.data}`}
                      alt={a.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <span className="text-lg">📎</span>
                  )}
                  <span className="text-xs max-w-[150px] truncate">{a.name}</span>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="text-text-tertiary hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-bg-input rounded-2xl border border-white/10 p-3 focus-within:border-white/20 transition">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                isImage
                  ? 'Descreva a imagem que você quer gerar...'
                  : 'Pergunte algo ao Entur IA...'
              }
              rows={1}
              className="w-full bg-transparent outline-none resize-none placeholder:text-text-tertiary text-[15px] leading-6"
              disabled={isStreaming}
            />

            <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
              <div className="flex items-center gap-1 flex-wrap">
                <ModelSelector modelId={modelId} setModelId={setModelId} />

                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.txt,.md,.json,.csv"
                  className="hidden"
                  onChange={(e) => {
                    onPickFiles(e.target.files);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                />
                {(supportsAttach || isImage) && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    title="Anexar imagem ou PDF"
                    className="p-1.5 rounded-lg hover:bg-white/10 transition"
                  >
                    📎
                  </button>
                )}

                {modelHas(modelId, 'web-search') && (
                  <ToolToggle
                    label="🔎 Web"
                    active={tools.webSearch}
                    onClick={() => setTools((t) => ({ ...t, webSearch: !t.webSearch }))}
                    title="Web Search"
                  />
                )}
                {modelHas(modelId, 'code-exec') && (
                  <ToolToggle
                    label="🐍 Code"
                    active={tools.codeExec}
                    onClick={() => setTools((t) => ({ ...t, codeExec: !t.codeExec }))}
                    title="Code Execution"
                  />
                )}
                {modelHas(modelId, 'thinking') && (
                  <ToolToggle
                    label="💭 Think"
                    active={tools.thinking}
                    onClick={() => setTools((t) => ({ ...t, thinking: !t.thinking }))}
                    title="Extended Thinking"
                  />
                )}
              </div>

              {isStreaming ? (
                <button
                  onClick={stop}
                  className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 transition"
                  title="Parar"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={send}
                  disabled={!input.trim() && pendingAttachments.length === 0}
                  className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition"
                  title="Enviar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="text-xs text-text-tertiary text-center mt-2">
            Entur IA pode cometer erros. Verifique informações importantes.
          </div>
        </div>
      </div>
    </main>
  );
}

function ToolToggle({
  label,
  active,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`text-xs px-2 py-1 rounded-md transition border ${
        active
          ? 'bg-white/15 border-white/30 text-white'
          : 'bg-transparent border-white/10 text-text-secondary hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  );
}

function Welcome() {
  return (
    <div className="text-center mt-20">
      <h1 className="text-3xl font-semibold mb-3">Entur IA</h1>
      <p className="text-text-secondary">
        Converse com GPT, Gemini ou Claude. Anexe imagens, gere imagens, busque na web, execute
        código.
      </p>
      <div className="mt-8 text-sm text-text-tertiary">
        Selecione um modelo abaixo. Modelos com capacidades especiais habilitam toggles próprios.
      </div>
    </div>
  );
}
