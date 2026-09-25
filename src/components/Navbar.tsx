import React from 'react';
import { UserRole, User } from '../types';
import { Shield, HardHat, UserCheck, Bell, Sparkles, LogOut, Globe } from 'lucide-react';
import { LanguageCode, SUPPORTED_LANGUAGES, TRANSLATIONS } from '../data/translations';

interface NavbarProps {
  currentRole: UserRole;
  currentUser: User;
  onRoleChange: (role: UserRole) => void;
  unreadCount: number;
  onOpenNotifs: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  currentLang: LanguageCode;
  onLangChange: (lang: LanguageCode) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  currentUser,
  onRoleChange,
  unreadCount,
  onOpenNotifs,
  onOpenAuth,
  onLogout,
  currentLang,
  onLangChange
}) => {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  return (
    <header className="bg-[#2d3a2d] border-b border-[#3a493a] text-[#fdfcf9] sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5d7a5c] flex items-center justify-center text-white font-bold shadow-sm border border-[#7a8a7a]/40">
              <Sparkles className="w-5 h-5 fill-current text-[#fdfcf9]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-serif italic font-bold tracking-tight text-[#fdfcf9] leading-none">
                  {t.appTitle}
                </h1>
                <span className="text-[10px] font-semibold bg-[#5d7a5c]/30 text-[#cbd5c0] border border-[#5d7a5c]/50 px-2 py-0.5 rounded-full">
                  SWMS
                </span>
              </div>
              <p className="text-[11px] text-[#cbd5c0] hidden sm:block">{t.appSubtitle}</p>
            </div>
          </div>

          {/* Core Portal Navigation Tabs with Clear Icons & Simple Labels */}
          <nav className="flex items-center bg-[#232f23] p-1.5 rounded-2xl border border-[#3a493a] gap-1">
            <button
              onClick={() => onRoleChange('citizen')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'citizen'
                  ? 'bg-[#5d7a5c] text-white shadow-sm font-bold'
                  : 'text-[#cbd5c0] hover:text-white hover:bg-[#3a493a]/60'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>{t.citizenPortal}</span>
            </button>
            <button
              onClick={() => onRoleChange('worker')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'worker'
                  ? 'bg-[#5d7a5c] text-white shadow-sm font-bold'
                  : 'text-[#cbd5c0] hover:text-white hover:bg-[#3a493a]/60'
              }`}
            >
              <HardHat className="w-4 h-4" />
              <span>{t.workerPortal}</span>
            </button>
            <button
              onClick={() => onRoleChange('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'admin'
                  ? 'bg-[#5d7a5c] text-white shadow-sm font-bold'
                  : 'text-[#cbd5c0] hover:text-white hover:bg-[#3a493a]/60'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>{t.adminCommand}</span>
            </button>
          </nav>

          {/* Right Area: Language Selector, Notification Bell & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Selector Dropdown */}
            <div className="relative flex items-center bg-[#232f23] border border-[#3a493a] rounded-xl px-2 py-1 text-xs">
              <Globe className="w-3.5 h-3.5 text-[#5d7a5c] mr-1 shrink-0" />
              <select
                value={currentLang}
                onChange={(e) => onLangChange(e.target.value as LanguageCode)}
                className="bg-transparent text-xs font-semibold text-[#fdfcf9] focus:outline-none cursor-pointer pr-1"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-[#2d3a2d] text-white">
                    {lang.flag} {lang.nativeName}
                  </option>
                ))}
              </select>
            </div>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifs}
              className="relative p-2 rounded-xl bg-[#232f23] border border-[#3a493a] text-[#cbd5c0] hover:text-white hover:bg-[#3a493a] transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#d97706] text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Current User Info & Profile Picture Click to Edit */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#3a493a]">
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 hover:opacity-90 transition text-left group"
                title="Click to change photo or switch user"
              >
                <div className="relative">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full border-2 border-[#5d7a5c] object-cover group-hover:border-white transition"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-[#2d3a2d]"></span>
                </div>
                <div className="hidden md:block text-left text-xs">
                  <p className="font-serif italic font-semibold text-[#fdfcf9] truncate max-w-[100px] leading-tight">
                    {currentUser.name.split(' ')[0]}
                  </p>
                  <span className="text-[10px] capitalize font-medium text-[#cbd5c0] block">
                    {currentUser.role}
                  </span>
                </div>
              </button>

              <button
                onClick={onLogout}
                className="p-1.5 text-[#cbd5c0] hover:text-white hover:bg-[#3a493a] rounded-lg transition"
                title={t.logout}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
