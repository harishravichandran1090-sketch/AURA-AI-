import React from 'react';
import {WifiOff} from 'lucide-react';
import {useOnlineStatus} from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/90 px-3 py-2 text-xs font-medium text-amber-200 shadow-lg backdrop-blur-md lg:bottom-4"
    >
      <WifiOff className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
      <span>Offline Mode — Local tasks and chat history remain available.</span>
    </div>
  );
};
