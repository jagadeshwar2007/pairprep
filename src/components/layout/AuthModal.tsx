'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { LoginCard } from '@/components/auth/LoginCard';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const pathname = usePathname();
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sign in to Pairprep"
      description="Use your Google account. New here? Your account is created automatically."
      maxWidth="md"
    >
      {/* Come back to the page the student was on after Google sends them back. */}
      <LoginCard compact next={pathname} />
    </Modal>
  );
}
