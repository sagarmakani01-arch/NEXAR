import { useState } from 'react';
import { Search } from 'lucide-react';

export default function SearchPanel() {
  const [query, setQuery] = useState('');
  return (
    <div className="flex flex-col h-full p-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search in files..."
        className="input mb-3"
      />
      <div className="flex-1 overflow-y-auto text-center text-gray-500 dark:text-gray-400 py-8">
        <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Search results will appear here</p>
        <p className="text-sm mt-1">Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-dark-bg rounded">⌘⇧F</kbd> to focus</p>
      </div>
    </div>
  );
}
