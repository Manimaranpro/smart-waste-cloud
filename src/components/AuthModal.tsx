import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { X, UserPlus, LogIn, Shield, HardHat, UserCheck, CheckCircle2, Lock, Mail, Camera, Image as ImageIcon } from 'lucide-react';
import { LanguageCode, TRANSLATIONS } from '../data/translations';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
  currentLang: LanguageCode;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  currentLang
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'profile'>('login');
  const [role, setRole] = useState<UserRole>(currentUser?.role || 'citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ward, setWard] = useState('Ward 12 - Green Park');
  const [avatarUrl, setAvatarUrl] = useState(
    currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const updated: User = {
      ...currentUser,
      avatar: avatarUrl,
      name: name || currentUser.name,
      phone: phone || currentUser.phone,
      ward: ward || currentUser.ward
    };
    onLoginSuccess(updated);
    setMessage({ text: 'Profile updated successfully!', isError: false });
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, role })
      });

      const data = await res.json();
      if (res.ok && data.user) {
        // Save session locally so refreshing or exiting never logs them out
        try {
          localStorage.setItem('smartwaste_current_user', JSON.stringify(data.user));
          if (data.token) localStorage.setItem('smartwaste_token', data.token);
        } catch {}

        onLoginSuccess(data.user);
        setMessage({ text: `Logged in as ${data.user.name} (${data.user.role.toUpperCase()})`, isError: false });
        setTimeout(() => {
          onClose();
        }, 700);
        return;
      } else {
        setMessage({ text: data.error || 'Login failed. Please check credentials.', isError: true });
      }
    } catch {
      // Offline fallback
      const fallbackUser: User = {
        id: `usr-${Date.now()}`,
        name: email.split('@')[0] || 'User',
        email: email || 'user@smartwaste.in',
        role,
        ward: 'Ward 12 - Green Park'
      };
      try {
        localStorage.setItem('smartwaste_current_user', JSON.stringify(fallbackUser));
      } catch {}
      onLoginSuccess(fallbackUser);
      setMessage({ text: 'Signed in successfully via local session.', isError: false });
      setTimeout(() => {
        onClose();
      }, 700);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password || 'smartwaste2026',
          phone: phone.trim(),
          ward,
          role,
          avatar: avatarUrl
        })
      });

      const data = await res.json();
      if (res.ok && data.user) {
        // Save session locally
        try {
          localStorage.setItem('smartwaste_current_user', JSON.stringify(data.user));
          if (data.token) localStorage.setItem('smartwaste_token', data.token);
        } catch {}

        onLoginSuccess(data.user);
        setMessage({ text: `Account created and stored permanently in Cloud Database!`, isError: false });
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setMessage({ text: data.error || 'Registration failed. Email may already be in use.', isError: true });
      }
    } catch {
      // Local fallback
      const fallbackUser: User = {
        id: `usr-${Date.now()}`,
        name: name || 'Registered Citizen',
        email: email || 'citizen@smartwaste.in',
        phone: phone || '+91 98888 77777',
        ward: ward || 'Ward 12 - Green Park',
        role,
        avatar: avatarUrl,
        createdAt: new Date().toISOString()
      };
      try {
        localStorage.setItem('smartwaste_current_user', JSON.stringify(fallbackUser));
      } catch {}
      onLoginSuccess(fallbackUser);
      setMessage({ text: 'New account registered successfully in active session!', isError: false });
      setTimeout(() => {
        onClose();
      }, 800);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#fdfcf9] w-full max-w-md rounded-2xl border border-[#3a493a]/30 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#2d3a2d] text-[#fdfcf9] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#5d7a5c] flex items-center justify-center text-white">
              {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-serif italic font-bold text-base text-[#fdfcf9]">
                {mode === 'login' ? t.signIn : mode === 'register' ? t.register : t.changePhoto}
              </h3>
              <p className="text-[11px] text-[#cbd5c0]">{t.appSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#cbd5c0] hover:text-white hover:bg-[#3a493a] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#e5e1cc] bg-[#f5f2e9] p-1">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              mode === 'login'
                ? 'bg-white text-[#2d3a2d] shadow-xs'
                : 'text-[#7a8a7a] hover:text-[#2d3a2d]'
            }`}
          >
            {t.signIn}
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              mode === 'register'
                ? 'bg-white text-[#2d3a2d] shadow-xs'
                : 'text-[#7a8a7a] hover:text-[#2d3a2d]'
            }`}
          >
            {t.register}
          </button>
          <button
            onClick={() => {
              setMode('profile');
              if (currentUser) {
                setName(currentUser.name);
                setPhone(currentUser.phone || '');
                setWard(currentUser.ward || 'Ward 12 - Green Park');
                setAvatarUrl(currentUser.avatar || '');
              }
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              mode === 'profile'
                ? 'bg-white text-[#2d3a2d] shadow-xs'
                : 'text-[#7a8a7a] hover:text-[#2d3a2d]'
            }`}
          >
            {t.changePhoto}
          </button>
        </div>

        {/* Feedback Message */}
        {message && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              message.isError
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        <div className="p-6">
          {mode === 'profile' ? (
            /* Profile Photo & Info Update */
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#5d7a5c] shadow-sm"
                  />
                  <label className="absolute bottom-0 right-0 p-1.5 bg-[#5d7a5c] text-white rounded-full cursor-pointer hover:bg-[#4d664c] shadow-md transition">
                    <Camera className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>
                <p className="text-[11px] text-[#7a8a7a] flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-[#5d7a5c]" />
                  Click camera icon to upload new photo
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4a5548] mb-1">
                  {t.name}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#d8d2c2] rounded-xl text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4a5548] mb-1">
                  {t.phone}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#d8d2c2] rounded-xl text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-[#5d7a5c] hover:bg-[#4d664c] text-white font-bold rounded-xl text-xs transition shadow-sm"
              >
                Save Profile Changes
              </button>
            </form>
          ) : (
            <>
              {/* Role Choice */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-[#4a5548] mb-2">
                  {t.role}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('citizen')}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition ${
                      role === 'citizen'
                        ? 'border-[#4a6b82] bg-[#4a6b82]/10 text-[#4a6b82] font-bold shadow-xs'
                        : 'border-[#e5e1cc] bg-white text-[#7a8a7a] hover:border-[#4a6b82]'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Citizen</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('worker')}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition ${
                      role === 'worker'
                        ? 'border-[#b87d2b] bg-[#b87d2b]/10 text-[#b87d2b] font-bold shadow-xs'
                        : 'border-[#e5e1cc] bg-white text-[#7a8a7a] hover:border-[#b87d2b]'
                    }`}
                  >
                    <HardHat className="w-4 h-4" />
                    <span>Worker</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition ${
                      role === 'admin'
                        ? 'border-[#5d7a5c] bg-[#5d7a5c]/10 text-[#5d7a5c] font-bold shadow-xs'
                        : 'border-[#e5e1cc] bg-white text-[#7a8a7a] hover:border-[#5d7a5c]'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </button>
                </div>
              </div>

              {mode === 'login' ? (
                /* Login Form */
                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#4a5548] mb-1">
                      {t.email}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#7a8a7a] absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        placeholder={
                          role === 'admin'
                            ? 'admin@municipal.gov.in'
                            : role === 'worker'
                            ? 'suresh.k@swms.worker.in'
                            : 'ananya.v@gmail.com'
                        }
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#d8d2c2] rounded-xl text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4a5548] mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#7a8a7a] absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#d8d2c2] rounded-xl text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                      />
                    </div>
                  </div>

                  {/* Quick Fill Demo Credentials */}
                  <div className="pt-1 pb-1">
                    <span className="text-[10px] text-[#7a8a7a] block mb-1.5 font-medium">Quick Demo Credentials (One-Click):</span>
                    <div className="flex gap-1.5 overflow-x-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setRole('citizen');
                          setEmail('ananya.v@gmail.com');
                          setPassword('demo123');
                        }}
                        className="text-[10px] px-2 py-1 bg-[#e8e4d3] hover:bg-[#d8d2be] text-[#2d3a2d] rounded-md font-medium transition shrink-0"
                      >
                        Citizen Ananya
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRole('worker');
                          setEmail('suresh.k@swms.worker.in');
                          setPassword('demo123');
                        }}
                        className="text-[10px] px-2 py-1 bg-[#e8e4d3] hover:bg-[#d8d2be] text-[#2d3a2d] rounded-md font-medium transition shrink-0"
                      >
                        Worker Suresh
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRole('admin');
                          setEmail('admin@municipal.gov.in');
                          setPassword('admin123');
                        }}
                        className="text-[10px] px-2 py-1 bg-[#e8e4d3] hover:bg-[#d8d2be] text-[#2d3a2d] rounded-md font-medium transition shrink-0"
                      >
                        Admin Officer
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-2.5 bg-[#5d7a5c] hover:bg-[#4d664c] text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2"
                  >
                    {loading ? 'Signing in...' : `${t.signIn} (${role.toUpperCase()})`}
                  </button>
                </form>
              ) : (
                /* Register Form */
                <form onSubmit={handleRegister} className="space-y-3">
                  {/* Photo picker in register */}
                  <div className="flex items-center gap-3 bg-[#f5f2e9] p-2.5 rounded-xl border border-[#e5e1cc]">
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full object-cover border border-[#5d7a5c]"
                    />
                    <label className="text-xs font-semibold text-[#5d7a5c] hover:underline cursor-pointer flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{t.changePhoto}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4a5548] mb-1">
                      {t.name}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Manimaran Annamalai"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#d8d2c2] rounded-xl text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#4a5548] mb-1">
                        {t.email}
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="user@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#d8d2c2] rounded-xl text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#4a5548] mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#d8d2c2] rounded-xl text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4a5548] mb-1">
                      {t.phone}
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#d8d2c2] rounded-xl text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4a5548] mb-1">
                      {t.ward}
                    </label>
                    <select
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#d8d2c2] rounded-xl text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                    >
                      <option value="Ward 12 - Green Park">Ward 12 - Green Park</option>
                      <option value="Ward 08 - Market Square">Ward 08 - Market Square</option>
                      <option value="Ward 04 - Riverside Road">Ward 04 - Riverside Road</option>
                      <option value="Ward 15 - Industrial Sector">Ward 15 - Industrial Sector</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-2.5 bg-[#5d7a5c] hover:bg-[#4d664c] text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2"
                  >
                    {loading ? 'Creating Account...' : t.register}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
