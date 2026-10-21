'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Feedback';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Placeholder until authentication exists. It deliberately has no email/password fields,
 * so nobody is invited to type credentials into a form that does nothing.
 */
export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sign in"
      description="Accounts are not available yet."
      maxWidth="md"
    >
      <div className="space-y-4">
        <Notice title="Coming in a later release">
          Sign-in with an institute email will let you contribute resources and keep bookmarks. For now, everything on
          PairPrep works without an account.
        </Notice>
        <Button variant="primary" className="w-full" onClick={onClose}>
          Continue browsing
        </Button>
      </div>
    </Modal>
  );
}
