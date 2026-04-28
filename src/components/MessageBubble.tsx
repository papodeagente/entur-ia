'use client';

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

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl w-full flex ${isUser ? 'justify-end' : 'justify-start'} gap-3`}>
        {!isUser && (
          <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-white/10 flex items-center justify-center text-xs font-bold">
            <span className={model ? `w-2.5 h-2.5 rounded-full ${model.badgeColor}` : ''} />
          </div>
        )}
        <div
          className={`${
            isUser
              ? 'bg-bg-tertiary px-4 py-2.5 rounded-2xl max-w-[80%]'
              : 'flex-1'
          }`}
        >
          {!isUser && model && (
            <div className="text-xs text-text-tertiary mb-1">{model.label}</div>
          )}
          <div className={`markdown-body ${streaming ? 'cursor-blink' : ''}`}>
            {isUser ? (
              <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {message.content || ''}
              </ReactMarkdown>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
