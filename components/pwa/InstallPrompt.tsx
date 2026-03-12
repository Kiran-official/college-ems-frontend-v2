'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Only show if not previously dismissed
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      const installed = localStorage.getItem('pwa_installed');
      
      if (!dismissed && !installed) {
        setIsVisible(true);
      }
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa_installed', 'true');
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-3rem)] max-w-sm">
      <div className="glass border-2 shadow-2xl rounded-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ background: 'var(--bg-glass)', borderColor: 'var(--border-glass)' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-dim)' }}>
          <Download className="w-6 h-6" style={{ color: 'var(--accent)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Install App</h3>
          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>Add to home screen for quick access</p>
        </div>
        <div className="flex items-center gap-2">
            <button 
            onClick={handleInstallClick}
            className="px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
            style={{ background: 'var(--accent)', color: 'var(--bg-void)' }}
            >
            Install
            </button>
            <button 
            onClick={handleDismiss}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Dismiss"
            >
            <X className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  );
}
