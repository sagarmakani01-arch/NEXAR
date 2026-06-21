import { Puzzle } from 'lucide-react';

export default function ExtensionsPanel() {
  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium text-gray-900 dark:text-white">Extensions</span>
        <button className="btn-ghost p-1.5 text-xs">Install</button>
      </div>
      <div className="flex-1 overflow-y-auto text-center text-gray-500 dark:text-gray-400 py-8">
        <Puzzle className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No extensions installed</p>
        <p className="text-sm mt-1">Extensions marketplace coming soon</p>
      </div>
    </div>
  );
}
