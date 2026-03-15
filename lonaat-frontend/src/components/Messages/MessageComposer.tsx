// MessageComposer.tsx
export default function MessageComposer() {
  return (
    <form className="bg-white shadow rounded p-4 flex flex-col gap-2 mt-4">
      <textarea className="border rounded px-3 py-2 min-h-[60px]" placeholder="Type your message..." />
      <div className="flex gap-2 justify-end">
        <button className="px-4 py-2 bg-blue-600 text-white rounded">Send</button>
        <button className="px-4 py-2 bg-gray-200 text-blue-700 rounded">Cancel</button>
      </div>
    </form>
  );
}
