'use client';
import { useState } from 'react';
import { Header } from '@/components/Header';
import { EvaluationModal } from '@/components/EvaluationModal';

export default function InterviewPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex flex-col h-screen">
      {/* Header with Back & Finish buttons */}
      <Header onFinishInterview={() => setShowModal(true)} />

      {/* Main Chat / Interview Body */}
      <main className="flex-1">
        {/* Your chat history and input box */}
      </main>

      {/* Pop-up modal shows when showModal is true */}
      {showModal && (
        <EvaluationModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}