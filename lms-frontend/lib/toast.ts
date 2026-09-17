type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

type Listener = (toast: ToastItem) => void;
const listeners = new Set<Listener>();

function emit(item: ToastItem) {
  listeners.forEach((fn) => fn(item));
}

export const toast = {
  success: (message: string, duration = 3500) => {
    emit({ id: Math.random().toString(36).substring(2, 9), type: 'success', message, duration });
  },
  error: (message: string, duration = 4500) => {
    emit({ id: Math.random().toString(36).substring(2, 9), type: 'error', message, duration });
  },
  warning: (message: string, duration = 4000) => {
    emit({ id: Math.random().toString(36).substring(2, 9), type: 'warning', message, duration });
  },
  info: (message: string, duration = 3500) => {
    emit({ id: Math.random().toString(36).substring(2, 9), type: 'info', message, duration });
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
