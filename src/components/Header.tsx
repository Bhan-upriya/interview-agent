import { useRouter } from 'next/navigation';

export function Header({ onFinishInterview }: { onFinishInterview: () => void }) {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between p-4 border-b">
      
      {/* 1. PASTE THIS ON THE LEFT SIDE (Back Button) */}
      <button 
        onClick={() => router.push('/domain-selection')}
        className="text-sm text-gray-500 hover:text-black flex items-center gap-1"
      >
        ← Back to Domains
      </button>

      {/* Your existing title / agent name */}
      <h1 className="font-bold">AI Technical Interview</h1>

      {/* 2. PASTE THIS ON THE RIGHT SIDE (Finish Interview Button) */}
      <button 
        onClick={onFinishInterview}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
      >
        Finish Interview
      </button>

    </header>
  );
}