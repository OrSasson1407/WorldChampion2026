import React, { useEffect } from 'react';

interface Props {
  message: string;
  success: boolean;
  onClose: () => void;
}

export const Toast: React.FC<Props> = ({ message, success, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded shadow-lg text-white ${success ? 'bg-green-600' : 'bg-red-600'}`}>
      {message}
    </div>
  );
};
