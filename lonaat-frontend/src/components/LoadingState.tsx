// LoadingState.tsx
export default function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <svg className="animate-spin h-8 w-8 mb-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <div className="text-lg font-medium">{message}</div>
    </div>
  );
}
