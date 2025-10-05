import React from 'react';
import { useToast } from '../contexts/ToastContext';
import { ToastSuccessIcon, ToastErrorIcon, XIcon } from './icons/Icons';

const Toasts: React.FC = () => {
  const { toasts } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto
            flex ring-1 ring-black ring-opacity-5 animate-fade-in-right
            ${toast.type === 'success' ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}
          `}
        >
          <div className="w-0 flex-1 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                {toast.type === 'success' ? <ToastSuccessIcon /> : <ToastErrorIcon />}
              </div>
              <div className="ml-3 w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {toast.type === 'success' ? 'Sukses' : 'Error'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {toast.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Toasts;