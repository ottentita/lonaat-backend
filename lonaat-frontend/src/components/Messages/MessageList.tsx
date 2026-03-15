// MessageList.tsx
interface MessageListProps {
  messages: Array<{
    id: string;
    sender: string;
    subject: string;
    preview: string;
    time: string;
    unread: boolean;
  }>;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

export default function MessageList({ messages, onSelect, selectedId }: MessageListProps) {
  return (
    <aside className="w-full md:w-80 bg-white shadow rounded p-4 overflow-y-auto h-full">
      <h2 className="text-lg font-semibold mb-4">Inbox</h2>
      <ul className="divide-y divide-gray-100">
        {messages.map(m => (
          <li
            key={m.id}
            className={`py-3 px-2 cursor-pointer rounded ${selectedId === m.id ? 'bg-blue-100' : ''} ${m.unread ? 'font-bold' : ''}`}
            onClick={() => onSelect(m.id)}
          >
            <div className="flex justify-between text-sm">
              <span>{m.sender}</span>
              <span className="text-gray-400">{m.time}</span>
            </div>
            <div className="text-blue-700">{m.subject}</div>
            <div className="text-xs text-gray-500 truncate">{m.preview}</div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
