import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ConfirmModal } from './ConfirmModal';

interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const useConfirm = () => {
  const [config, setConfig] = useState<(ConfirmOptions & { resolve: (val: boolean) => void }) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig({ ...options, resolve });
    });
  }, []);

  const handleConfirm = () => {
    if (config) {
      config.resolve(true);
      setConfig(null);
    }
  };

  const handleCancel = () => {
    if (config) {
      config.resolve(false);
      setConfig(null);
    }
  };

  const ConfirmComponent = config ? createPortal(
    <ConfirmModal
      isOpen={!!config}
      title={config.title}
      message={config.message}
      confirmText={config.confirmText}
      cancelText={config.cancelText}
      isDestructive={config.isDestructive}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />,
    document.body
  ) : null;

  return { confirm, ConfirmComponent };
};
