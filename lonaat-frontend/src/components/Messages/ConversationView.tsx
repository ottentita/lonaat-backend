// ConversationView.tsx
interface ConversationViewProps {
  message: {
    id: string;
    sender: string;
    subject: string;
    body: string;
    time: string;
  } | null;
}

export default function ConversationView({ message }: ConversationViewProps) {
  if (!message) return <div className="flex-1 flex items-center justify-center text-gray-400">Select a message</div>;
  return (
    <section className="flex-1 bg-white shadow rounded p-6 flex flex-col">
      <div className="mb-2 text-xs text-gray-400">{message.time}</div>
      <div className="mb-2 text-blue-700 font-semibold">{message.subject}</div>
      <div className="mb-4 text-gray-700">{message.body}</div>
      <div className="mt-auto flex gap-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded">Reply</button>
        <button className="px-4 py-2 bg-gray-200 text-blue-700 rounded">Archive</button>
      </div>
    </section>
  );
}
