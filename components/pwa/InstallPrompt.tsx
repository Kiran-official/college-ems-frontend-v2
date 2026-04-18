'use client';

import { useState, useEffect } from 'react';
import { Download, X, MoreVertical, Share2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type BrowserType = 'chrome' | 'samsung' | 'firefox' | 'safari' | 'other';

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('samsungbrowser')) return 'samsung';
  if (ua.includes('firefox')) return 'firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  if (ua.includes('chrome') || ua.includes('crios')) return 'chrome';
  return 'other';
}

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);
  const [browser, setBrowser] = useState<BrowserType>('other');

  useEffect(() => {
    // Don't show if already installed as standalone
    if (isStandalone()) return;

    const dismissed = localStorage.getItem('pwa_install_dismissed');
    const installed = localStorage.getItem('pwa_installed');
    if (dismissed || installed) return;

    setBrowser(detectBrowser());

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa_installed', 'true');
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For browsers that don't fire beforeinstallprompt (Samsung Internet, Firefox, etc.),
    // show the manual install prompt after a delay
    const fallbackTimer = setTimeout(() => {
      if (!deferredPrompt && (isAndroid() || isIOS())) {
        setIsVisible(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(fallbackTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Native install prompt available (Chrome, Edge)
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setIsVisible(false);
    } else {
      // Show manual installation steps
      setShowManualSteps(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    setShowManualSteps(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  if (!isVisible || isDismissed) return null;

  const getManualSteps = () => {
    if (isIOS()) {
      return {
        icon: <Share2 className="w-5 h-5" />,
        steps: [
          'Tap the Share button in the toolbar',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" to install'
        ]
      };
    }

    switch (browser) {
      case 'samsung':
        return {
          icon: <MoreVertical className="w-5 h-5" />,
          steps: [
            'Tap the menu icon (⋮) at the bottom right',
            'Tap "Add page to" → "Home screen"',
            'Tap "Add" to install'
          ]
        };
      case 'firefox':
        return {
          icon: <MoreVertical className="w-5 h-5" />,
          steps: [
            'Tap the menu icon (⋮) at the top right',
            'Tap "Install"',
            'If "Install" isn\'t visible, tap "Add to Home screen"'
          ]
        };
      default:
        return {
          icon: <MoreVertical className="w-5 h-5" />,
          steps: [
            'Tap the menu icon (⋮) at the top right',
            'Tap "Add to Home screen" or "Install app"',
            'Tap "Install" or "Add" to confirm'
          ]
        };
    }
  };

  if (showManualSteps) {
    const manual = getManualSteps();
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm">
        <div className="border-2 shadow-2xl rounded-2xl p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-glass)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-bold text-sm" style={{ color: 'var(--text-primary)' }}>How to Install</h3>
            <button 
              onClick={handleDismiss}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ol className="space-y-2.5">
            {manual.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5" 
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                >
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          <button 
            onClick={handleDismiss}
            className="w-full mt-4 px-4 py-2.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--bg-void)' }}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

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
