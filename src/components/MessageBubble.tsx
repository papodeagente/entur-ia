'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { MessageItem } from './ChatApp';
import { getModel } from '@/lib/models';
import CopyButton from './CopyButton';

interface Props {
  message: MessageItem;
  streaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
  isLastAssistant?: boolean;
}

export default function MessageBubble({
  message,
  streaming,
  onRegenerate,
  onEdit,
  isLastAssistant,
}: Props) {
  const isUser = message.role === 'user';
  const model = message.model ? getModel(message.model) : undefined;
  const [showThinking, setShowThinking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);

  const images = message.outputs?.images || [];
  const citations = message.citations || [];
  const userAttachments = message.attachments || [];

  const submitEdit = () => {
    if (editValue.trim() && editValue !== message.content) {
      onEdit?.(editValue.trim());
    }
    setEditing(false);
  };

  return (
    <div className={`group flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-3xl w-full flex ${
          isUser ? 'flex-col items-end' : 'flex-row gap-3'
        }`}
      >
        {!isUser && (
          <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-white/10 flex items-center justify-center mt-1">
            <span className={model ? `w-2.5 h-2.5 rounded-full ${model.badgeColor}` : ''} />
          </div>
        )}

        <div className={`${isUser ? 'max-w-[85%]' : 'flex-1 min-w-0'}`}>
          {!isUser && model && (
            <div className="text-xs text-text-tertiary mb-1">{model.label}</div>
          )}

          {isUser && userAttachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2 justify-end">
              {userAttachments.map((a: any, idx: number) => (
                <AttachmentPreview key={idx} attachment={a} />
              ))}
            </div>
          )}

          {!isUser && message.thinking && (
            <div className="mb-3">
              <button
                onClick={() => setShowThinking((v) => !v)}
                className="text-xs text-text-tertiary hover:text-text-secondary flex items-center gap-1"
              >
                <span>{showThinking ? '▼' : '▶'}</span>
                <span>💭 Raciocínio interno ({message.thinking.length} chars)</span>
              </button>
              {showThinking && (
                <div className="mt-2 p-3 rounded-lg bg-bg-secondary border border-white/10 text-xs text-text-secondary whitespace-pre-wrap">
                  {message.thinking}
                </div>
              )}
            </div>
          )}

          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {message.toolCalls.map((t, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full bg-bg-secondary border border-white/10 text-text-tertiary"
                >
                  🔧 {t.tool === 'web_search' ? 'Buscando na web' : t.tool === 'code_execution' ? 'Executando código' : t.tool === 'image_generation' ? 'Gerando imagem' : t.tool}
                </span>
              ))}
            </div>
          )}

          {isUser && editing ? (
            <div className="bg-bg-input border border-white/20 rounded-2xl p-3 w-full">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitEdit();
                  if (e.key === 'Escape') {
                    setEditing(false);
                    setEditValue(message.content);
                  }
                }}
                rows={4}
                autoFocus
                className="w-full bg-transparent outline-none resize-none text-sm"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditValue(message.content);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitEdit}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white text-black hover:bg-white/90"
                >
                  Salvar e regerar
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`${
                isUser ? 'bg-bg-tertiary px-4 py-2.5 rounded-2xl' : ''
              } markdown-body ${streaming ? 'cursor-blink' : ''}`}
            >
              {isUser ? (
                <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    pre: ({ children, ...props }) => (
                      <CodeBlockWithCopy {...props}>{children}</CodeBlockWithCopy>
                    ),
                  }}
                >
                  {message.content || ''}
                </ReactMarkdown>
              )}
            </div>
          )}

          {!isUser && images.length > 0 && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {images.map((img, i) => (
                <a
                  key={i}
                  href={`data:${img.mimeType};base64,${img.b64}`}
                  download={`entur-ia-${Date.now()}-${i}.png`}
                  className="block rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition"
                  title="Clique para baixar"
                >
                  <img
                    src={`data:${img.mimeType};base64,${img.b64}`}
                    alt="Imagem gerada"
                    className="w-full h-auto"
                  />
                </a>
              ))}
            </div>
          )}

          {!isUser && citations.length > 0 && (
            <div className="mt-3 border-t border-white/10 pt-2">
              <div className="text-xs text-text-tertiary mb-1">Fontes consultadas:</div>
              <ul className="space-y-1">
                {citations.map((c, i) => (
                  <li key={i} className="text-xs">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener"
                      className="text-blue-300 hover:text-blue-200 underline"
                    >
                      {i + 1}. {c.title || c.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!streaming && (
            <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 mt-1.5">
              {isUser && onEdit && !editing && (
                <button
                  onClick={() => {
                    setEditing(true);
                    setEditValue(message.content);
                  }}
                  className="text-xs px-2 py-1 rounded hover:bg-white/10 text-text-tertiary hover:text-white"
                  title="Editar e regerar"
                >
                  ✏️ Editar
                </button>
              )}
              {message.content && (
                <CopyButton
                  text={message.content}
                  className="text-xs px-2 py-1 rounded hover:bg-white/10 text-text-tertiary hover:text-white"
                />
              )}
              {!isUser && isLastAssistant && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="text-xs px-2 py-1 rounded hover:bg-white/10 text-text-tertiary hover:text-white"
                  title="Regerar resposta"
                >
                  🔁 Regerar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CodeBlockWithCopy({ children, ...props }: any) {
  let codeText = '';
  try {
    const child = Array.isArray(children) ? children[0] : children;
    const inner = child?.props?.children;
    if (typeof inner === 'string') codeText = inner;
    else if (Array.isArray(inner)) codeText = inner.filter((x) => typeof x === 'string').join('');
  } catch {}

  return (
    <div className="relative group/code">
      <pre {...props}>{children}</pre>
      {codeText && (
        <div className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition">
          <CopyButton text={codeText} iconOnly className="text-xs px-2 py-1 rounded bg-black/40 hover:bg-black/60 backdrop-blur" />
        </div>
      )}
    </div>
  );
}

function AttachmentPreview({ attachment }: { attachment: any }) {
  if (attachment.kind === 'image') {
    return (
      <img
        src={`data:${attachment.mimeType};base64,${attachment.data}`}
        alt={attachment.name || 'anexo'}
        className="max-w-[200px] max-h-[200px] rounded-lg border border-white/10"
      />
    );
  }
  return (
    <div className="px-3 py-2 rounded-lg bg-bg-secondary border border-white/10 text-xs flex items-center gap-2">
      <span>📎</span>
      <span className="truncate max-w-[200px]">{attachment.name || attachment.kind}</span>
    </div>
  );
}
