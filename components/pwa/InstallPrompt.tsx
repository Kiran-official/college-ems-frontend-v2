'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);
  const [browser, setBrowser] = useState<BrowserType>('other');

  // Handle browser install events
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

  // Handle visibility based on route and state
  useEffect(() => {
    // Determine if we're currently running AS an installed standalone app
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone === true);
    
    if (isStandalone) {
      setIsVisible(false); // Never show if they are already inside the PWA!
      return;
    }

    const isLoginPage = pathname === '/login' || pathname === '/';
    
    if (isLoginPage) {
      // If we are in the regular browser, always show the prompt on the login page as a fallback
      setIsVisible(true);
      setIsDismissed(false);
    } else {
      // On other pages, only show if we received the browser prompt AND user hasn't dismissed it
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      // If they installed it in the past but opened the browser, we won't show it except on login
      if (!dismissed && deferredPrompt) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    }
  }, [pathname, deferredPrompt]);

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
    <div 
        className="notification-banner"
        style={{ top: 104 }} // Offset to stack below notification banner (base 20px + ~84px height)
    >
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--r-lg)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--border-glass)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--accent-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Download size={18} style={{ color: 'var(--accent)' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            Download App
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', lineHeight: 1.4, marginTop: 2 }}>
            Add to home screen
          </div>
        </div>

        <button
          onClick={handleInstallClick}
          style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--r-sm)',
            padding: '6px 14px',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'opacity 0.15s',
          }}
        >
          Install
        </button>

        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 'var(--r-sm)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s',
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
