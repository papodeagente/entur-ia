'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { MessageItem } from './ChatApp';
import { getModel } from '@/lib/models';

interface Props {
  message: MessageItem;
  streaming?: boolean;
}

export default function MessageBubble({ message, streaming }: Props) {
  const isUser = message.role === 'user';
  const model = message.model ? getModel(message.model) : undefined;
  const [showThinking, setShowThinking] = useState(false);
  const images = message.outputs?.images || [];
  const citations = message.citations || [];
  const userAttachments = message.attachments || [];

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl w-full flex ${isUser ? 'justify-end' : 'justify-start'} gap-3`}>
        {!isUser && (
          <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-white/10 flex items-center justify-center text-xs font-bold">
            <span className={model ? `w-2.5 h-2.5 rounded-full ${model.badgeColor}` : ''} />
          </div>
        )}
        <div className={`${isUser ? 'bg-bg-tertiary px-4 py-2.5 rounded-2xl max-w-[80%]' : 'flex-1'}`}>
          {!isUser && model && (
            <div className="text-xs text-text-tertiary mb-1">{model.label}</div>
          )}

          {isUser && userAttachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
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
                  🔧 {t.tool}
                </span>
              ))}
            </div>
          )}

          <div className={`markdown-body ${streaming ? 'cursor-blink' : ''}`}>
            {isUser ? (
              <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {message.content || ''}
              </ReactMarkdown>
            )}
          </div>

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
        </div>
      </div>
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
