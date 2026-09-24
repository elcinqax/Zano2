import React from 'react';
import { Bell, Moon, Sun, Lock, Smartphone, Monitor } from 'lucide-react';
import { AppNotification } from '../types';

interface TopBarProps {
  storeName: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onLockApp: () => void;
  isPinEnabled: boolean;
  notifications: AppNotification[];
  onOpenNotifications: () => void;
  isMobileFrame: boolean;
  onToggleMobileFrame: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenInstallModal?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  storeName,
  isDark,
  onToggleTheme,
  onLockApp,
  isPinEnabled,
  notifications,
  onOpenNotifications,
  isMobileFrame,
  onToggleMobileFrame,
  activeTab,
  onTabChange,
  onOpenInstallModal,
}) => {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onTabChange('dashboard')}
            className="flex items-center gap-2 text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
              M
            </div>
            <div className="leading-tight">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                MobilSatış
              </span>
              <span className="hidden sm:inline-block text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                · {storeName}
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (hidden on compact mobile thumb zone, visible on desktop/tablet) */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={() => onTabChange('pos')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap ${
              activeTab === 'pos' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''
            }`}
          >
            1. Satış
          </button>
          <button
            type="button"
            onClick={() => onTabChange('customers')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap ${
              activeTab === 'customers' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''
            }`}
          >
            2. Müşteriler
          </button>
          <button
            type="button"
            onClick={() => onTabChange('products')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap ${
              activeTab === 'products' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''
            }`}
          >
            3. Ürünler
          </button>
          <button
            type="button"
            onClick={() => onTabChange('stock')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap ${
              activeTab === 'stock' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''
            }`}
          >
            4. Stok
          </button>
          <button
            type="button"
            onClick={() => onTabChange('reports')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap ${
              activeTab === 'reports' || activeTab === 'dashboard' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''
            }`}
          >
            5. Raporlar
          </button>
          <button
            type="button"
            onClick={() => onTabChange('settings')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 ${
              activeTab === 'settings' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''
            }`}
          >
            Yedek & Ayarlar
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Desktop Frame View Toggle */}
          <button
            type="button"
            onClick={onToggleMobileFrame}
            className="hidden lg:flex min-w-[36px] h-9 px-2.5 items-center gap-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800"
            title="Telefon / Masaüstü Görünümünü Değiştir"
          >
            {isMobileFrame ? (
              <>
                <Monitor className="w-3.5 h-3.5" />
                <span>Geniş Ekran</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android Önizleme</span>
              </>
            )}
          </button>

          {/* Telefona Yükle / APK */}
          {onOpenInstallModal && (
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
              title="Uygulamayı Telefona Yükle / APK"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Telefona Yükle</span>
            </button>
          )}

          {/* Notifications */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Bildirimler"
            aria-label="Bildirimler"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white px-1 shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDark ? 'Açık Mod' : 'Karanlık Mod'}
            aria-label="Tema Değiştir"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>

          {/* Lock App */}
          {isPinEnabled && (
            <button
              type="button"
              onClick={onLockApp}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Uygulamayı Kilitle"
              aria-label="Kilitle"
            >
              <Lock className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
