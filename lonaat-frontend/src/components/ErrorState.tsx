// ErrorState.tsx
export default function ErrorState({ message = "Something went wrong." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-red-500">
      <svg className="h-10 w-10 mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="text-lg font-medium">{message}</div>
    </div>
  );
}
