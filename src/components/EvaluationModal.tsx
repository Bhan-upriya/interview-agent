import { useRouter } from 'next/navigation';

export function EvaluationModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  const handleCloseAndExit = () => {
    // 1. Close the modal
    onClose();
    // 2. Go back to the domain selection page
    router.push('/domain-selection'); // Adjust path if your route is named differently
  };

  return (
    <div>
      {/* Your existing modal content */}
      
      {/* UPDATE THIS BUTTON */}
      <button 
        onClick={handleCloseAndExit}
        className="px-4 py-2 bg-black text-white rounded-lg"
      >
        Close Report & Pick New Domain
      </button>
    </div>
  );
}
