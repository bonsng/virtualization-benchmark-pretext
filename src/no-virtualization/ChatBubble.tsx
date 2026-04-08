import type { MessageData } from '@shared/types'

interface ChatBubbleProps {
  message: MessageData
}

export function ChatBubble({ message }: ChatBubbleProps) {
  return (
    <div
      className={`chat-bubble ${message.role}`}
      dangerouslySetInnerHTML={{ __html: message.html }}
    />
  )
}
