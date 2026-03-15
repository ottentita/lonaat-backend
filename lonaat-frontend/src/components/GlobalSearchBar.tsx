"use client";
import { useState } from "react";
import { Search } from "lucide-react";

interface GlobalSearchBarProps {
  onSearch: (query: string) => void;
}

export default function GlobalSearchBar({ onSearch }: GlobalSearchBarProps) {
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(query.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center w-full max-w-xl mx-auto bg-white border rounded shadow-sm px-3 py-2 gap-2">
      <Search className="w-5 h-5 text-gray-400" />
      <input
        type="text"
        className="flex-1 outline-none bg-transparent text-base placeholder-gray-400"
        placeholder="Search anything... (e.g. Toyota, House in Yaoundé, Affiliate product)"
        value={query}
        onChange={e => setQuery(e.target.value)}
        aria-label="Global search"
      />
      <button type="submit" className="ml-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Search</button>
    </form>
  );
}
