'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { mountToaster, toast as gooeyToast } from 'gooey-toast';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

function showToast(message: string, type: ToastType = 'success') {
  if (type === 'success') {
    gooeyToast.success({ title: message });
  } else if (type === 'error') {
    gooeyToast.error({ title: message });
  } else {
    gooeyToast.info({ title: message });
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    mountToaster({ position: 'top-right' });
  }, []);

  return (
    <ToastContext.Provider value={{ toast: showToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// Direct export for places that don't need context
export { showToast as toast };
