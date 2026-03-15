// EmptyState.tsx
export default function EmptyState({ message = "No data found." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <svg className="h-10 w-10 mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 018 0v2m-4-4V7a4 4 0 10-8 0v6a4 4 0 008 0z" />
      </svg>
      <div className="text-lg font-medium">{message}</div>
    </div>
  );
}
