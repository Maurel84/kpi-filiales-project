import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  LogOut,
  Menu,
  X,
  BarChart3,
  Truck,
  FileText,
  Wrench,
  DollarSign,
  MapPin,
  Target,
  ClipboardList,
  ShieldCheck,
  Bell,
  Camera,
  ChevronDown,
  Loader2
} from 'lucide-react';
import logoUrl from '../../assets/tractafric-logo.svg';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  tone?: 'info' | 'success' | 'warning';
};

interface MainLayoutProps {
  children: ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export function MainLayout({ children, currentView, onViewChange, theme = 'light', onToggleTheme }: MainLayoutProps) {
  const { profile, user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'profil' | 'notifications'>('profil');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [filialeLabel, setFilialeLabel] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifyInApp, setNotifyInApp] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem('notify_in_app');
    return saved ? saved === 'true' : true;
  });
  const [notifyEmail, setNotifyEmail] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem('notify_email');
    return saved ? saved === 'true' : false;
  });
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarBucket = import.meta.env.VITE_AVATAR_BUCKET || 'avatars';

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['all'] },
    { id: 'kpis', label: 'KPIs & Reporting', icon: BarChart3, roles: ['all'] },
    { id: 'plan-actions', label: "Plan d'actions", icon: ClipboardList, roles: ['all'] },
    { id: 'pdm', label: 'Part de marche (PDM)', icon: Target, roles: ['manager_filiale', 'admin_siege'] },
    { id: 'forecasts', label: 'Prévisions (Forecasts)', icon: TrendingUp, roles: ['manager_filiale', 'admin_siege', 'commercial'] },
    { id: 'visites-clients', label: 'Visites & Opportunités', icon: Users, roles: ['commercial', 'manager_filiale', 'admin_siege'] },
    { id: 'stocks', label: 'Gestion des Stocks', icon: Package, roles: ['all'] },
    { id: 'commandes', label: 'Commandes Fournisseurs', icon: Truck, roles: ['all'] },
    { id: 'commandes-clients', label: 'Commandes Clients', icon: ShoppingCart, roles: ['commercial', 'manager_filiale', 'admin_siege'] },
    { id: 'ventes', label: 'Ventes', icon: ShoppingCart, roles: ['all'] },
    { id: 'ventes-perdues', label: 'Ventes Perdues', icon: TrendingUp, roles: ['commercial', 'manager_filiale', 'admin_siege'] },
    { id: 'parc-machines', label: 'Parc Machines', icon: MapPin, roles: ['all'] },
    { id: 'inspections', label: 'Inspections Techniques', icon: Wrench, roles: ['technicien', 'manager_filiale', 'admin_siege'] },
    { id: 'budgets', label: 'Budgets', icon: DollarSign, roles: ['manager_filiale', 'admin_siege'] },
    { id: 'sessions-inter', label: 'Sessions Interfiliales', icon: FileText, roles: ['manager_filiale', 'admin_siege'] },
    { id: 'documents-imports', label: 'Documents & Imports', icon: FileText, roles: ['admin_siege'] },
    { id: 'power-bi', label: 'Power BI', icon: BarChart3, roles: ['admin_siege', 'manager_filiale'] },
    { id: 'users', label: 'Utilisateurs', icon: ShieldCheck, roles: ['admin_siege'] },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (item.roles.includes('all')) return true;
    return profile && item.roles.includes(profile.role);
  });

  const getRoleBadge = (role: string) => {
    const badges = {
      admin_siege: { label: 'Admin Siège', color: 'bg-purple-100 text-purple-800' },
      manager_filiale: { label: 'Manager', color: 'bg-blue-100 text-blue-800' },
      commercial: { label: 'Commercial', color: 'bg-green-100 text-green-800' },
      technicien: { label: 'Technicien', color: 'bg-orange-100 text-orange-800' },
      saisie: { label: 'Saisie', color: 'bg-gray-100 text-gray-800' },
    };
    return badges[role as keyof typeof badges] || badges.saisie;
  };

  const roleBadge = profile ? getRoleBadge(profile.role) : null;
  const activeMenu = filteredMenuItems.find((item) => item.id === currentView);
  const displayName = useMemo(() => {
    const fromProfile = [profile?.prenom, profile?.nom].filter(Boolean).join(' ').trim();
    if (fromProfile) return fromProfile;
    if (profile?.email) return profile.email;
    if (user?.email) return user.email;
    return 'Utilisateur';
  }, [profile?.email, profile?.nom, profile?.prenom, user?.email]);

  const initials = useMemo(() => {
    const first = profile?.prenom?.trim()?.[0] || displayName.trim()?.[0] || '';
    const last = profile?.nom?.trim()?.[0] || '';
    const value = `${first}${last}`.trim().toUpperCase();
    return value || 'TE';
  }, [displayName, profile?.nom, profile?.prenom]);
  const unreadCount = useMemo(() => {
    if (!notifyInApp) return 0;
    return notifications.filter((item) => !item.read).length;
  }, [notifications, notifyInApp]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('notify_in_app', String(notifyInApp));
  }, [notifyInApp]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('notify_email', String(notifyEmail));
  }, [notifyEmail]);

  useEffect(() => {
    const nextUrl = (user?.user_metadata?.avatar_url as string | undefined) || null;
    setAvatarUrl(nextUrl);
  }, [user?.user_metadata?.avatar_url]);

  useEffect(() => {
    const filialeId = profile?.filiale_id;
    if (!filialeId) {
      setFilialeLabel(null);
      return;
    }
    let isMounted = true;
    const loadFiliale = async () => {
      const { data, error } = await supabase
        .from('filiales')
        .select('nom, code')
        .eq('id', filialeId)
        .maybeSingle();
      if (!isMounted) return;
      if (!error && data) {
        setFilialeLabel(data.nom || data.code || filialeId);
      } else {
        setFilialeLabel(filialeId);
      }
    };
    loadFiliale();
    return () => {
      isMounted = false;
    };
  }, [profile?.filiale_id]);

  useEffect(() => {
    if (!profile) return;
    setNotifications((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: 'welcome',
          title: 'Bienvenue',
          message: displayName ? `Bonjour ${displayName}, ravi de vous revoir.` : 'Votre espace est prêt.',
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'info',
        },
      ];
    });
  }, [displayName, profile]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [profileMenuOpen]);

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Veuillez sélectionner une image valide.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('La photo ne doit pas dépasser 2 Mo.');
      return;
    }
    setUploadError('');
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const filePath = `${user.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from(avatarBucket)
        .upload(filePath, file, { upsert: true });
      if (uploadError) {
        const message = uploadError.message || 'Impossible de téléverser la photo.';
        if (message.toLowerCase().includes('bucket') && message.toLowerCase().includes('not found')) {
          throw new Error(
            `Bucket "${avatarBucket}" introuvable. Créez-le dans Supabase Storage ou définissez VITE_AVATAR_BUCKET.`
          );
        }
        throw uploadError;
      }
      const { data } = supabase.storage.from(avatarBucket).getPublicUrl(filePath);
      if (!data?.publicUrl) {
        throw new Error('Impossible de récupérer l’URL publique de l’avatar.');
      }
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: data.publicUrl },
      });
      if (updateError) {
        throw updateError;
      }
      setAvatarUrl(data.publicUrl);
      setNotifications((prev) => [
        {
          id: `avatar-${Date.now()}`,
          title: 'Photo de profil mise à jour',
          message: 'Votre photo est maintenant visible par vos collaborateurs.',
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'success',
        },
        ...prev,
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de téléverser la photo.';
      setUploadError(message);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const formatNotificationDate = (value: string) => {
    const date = new Date(value);
    return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const profileEmail = profile?.email || user?.email || 'Non renseigné';

  const openProfileMenu = (tab: 'profil' | 'notifications') => {
    setActiveProfileTab(tab);
    setProfileMenuOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 surface-grid">

      <div className="relative flex min-h-screen">
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed lg:static lg:translate-x-0 inset-y-0 left-0 z-50 w-72 bg-white text-slate-900 transition-transform duration-300 ease-in-out shadow-2xl border-r border-slate-200`}
        >
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <img src={logoUrl} alt="Tractafric Equipment" className="h-9 w-auto" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-600/80">Pilotage</p>
                    <h1 className="text-2xl font-semibold text-gradient">Multi-Filiales</h1>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden text-slate-400 hover:text-white transition"
                  aria-label="Fermer le menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              {profile && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-700 font-semibold">
                        {profile.prenom} {profile.nom}
                      </p>
                      <p className="text-xs text-slate-500">{profile.email}</p>
                    </div>
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_0_6px_rgba(245,158,11,0.18)]" />
                  </div>
                  {roleBadge && (
                    <span className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${roleBadge.color} bg-opacity-80`}>
                      {roleBadge.label}
                    </span>
                  )}
                </div>
              )}
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onViewChange(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`group relative w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-left ${
                      isActive
                        ? 'bg-amber-50 text-amber-900 shadow border border-amber-200'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <span
                      className={`absolute inset-y-2 left-2 w-1 rounded-full transition-all ${
                        isActive ? 'bg-gradient-to-b from-amber-400 to-yellow-500' : 'bg-transparent group-hover:bg-slate-200'
                      }`}
                    />
                    <Icon className="w-5 h-5" />
                    <div className="flex flex-col">
                      <span className="font-semibold">{item.label}</span>
                      <span className="text-xs text-slate-400">
                        {isActive ? 'En cours' : 'Accéder'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200">
              <button
                onClick={signOut}
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-xl text-slate-200 hover:bg-red-500/15 hover:text-red-200 transition border border-white/5"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-semibold">Déconnexion</span>
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 bg-slate-100/90 backdrop-blur">
            <div className="mx-auto max-w-7xl px-6 lg:px-10 py-4">
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden text-slate-600 hover:text-slate-900 transition"
                    aria-label="Ouvrir le menu"
                  >
                    <Menu className="w-6 h-6" />
                  </button>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Vue courante</p>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {activeMenu?.label || 'Tableau de bord'}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {profile?.filiale_id && (
                    <span className="pill bg-amber-50 text-amber-700 border border-amber-100">
                      <MapPin className="w-3.5 h-3.5" />
                      {filialeLabel || 'Filiale active'}
                    </span>
                  )}
                  <button
                    onClick={onToggleTheme}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-amber-200 hover:text-amber-700 transition"
                  >
                    {theme === 'dark' ? 'Mode clair' : 'Mode nuit'}
                  </button>
                  {roleBadge && (
                    <span className="pill bg-slate-100 text-slate-700 border border-slate-200">
                      {roleBadge.label}
                    </span>
                  )}

                  <div ref={profileMenuRef} className="relative">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openProfileMenu('notifications')}
                        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:text-amber-700 transition"
                        aria-label="Voir les notifications"
                      >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                            {unreadCount}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => openProfileMenu('profil')}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-700 hover:border-amber-200 hover:text-amber-700 transition"
                        aria-label="Ouvrir le profil"
                      >
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={`Avatar de ${displayName}`}
                            className="h-9 w-9 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold border border-amber-200">
                            {initials}
                          </div>
                        )}
                        <div className="hidden sm:flex flex-col items-start leading-tight">
                          <span className="text-sm font-semibold text-slate-900">{displayName}</span>
                          <span className="text-[11px] text-slate-500">{roleBadge?.label || 'Profil'}</span>
                        </div>
                        <ChevronDown className="hidden sm:block w-4 h-4 text-slate-400" />
                      </button>
                    </div>

                    {profileMenuOpen && (
                      <div className="absolute right-0 mt-3 w-[22rem] max-w-[90vw] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden z-50">
                        <div className="p-4 border-b border-slate-200">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="relative"
                              aria-label="Changer la photo de profil"
                            >
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={`Avatar de ${displayName}`}
                                  className="h-14 w-14 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="h-14 w-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-base font-bold border border-amber-200">
                                  {initials}
                                </div>
                              )}
                              <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                                {uploadingAvatar ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Camera className="w-4 h-4" />
                                )}
                              </span>
                            </button>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                              <p className="text-xs text-slate-500">{profileEmail}</p>
                              {profile?.poste && (
                                <p className="text-xs text-slate-400">{profile.poste}</p>
                              )}
                            </div>
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                          />
                          {uploadError && (
                            <p className="mt-2 text-xs text-rose-600">{uploadError}</p>
                          )}
                          <p className="mt-2 text-[11px] text-slate-500">
                            Cliquez sur l’avatar pour changer la photo (PNG/JPG, 2 Mo max).
                          </p>
                        </div>

                        <div className="px-4 pt-3">
                          <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs font-semibold">
                            <button
                              onClick={() => setActiveProfileTab('profil')}
                              className={`px-3 py-1 rounded-full transition ${
                                activeProfileTab === 'profil'
                                  ? 'bg-white text-slate-900 shadow'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              Profil
                            </button>
                            <button
                              onClick={() => setActiveProfileTab('notifications')}
                              className={`px-3 py-1 rounded-full transition ${
                                activeProfileTab === 'notifications'
                                  ? 'bg-white text-slate-900 shadow'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              Notifications
                            </button>
                          </div>
                        </div>

                        {activeProfileTab === 'profil' ? (
                          <div className="p-4 space-y-4">
                            <div className="grid gap-3 text-sm">
                              <div className="rounded-lg bg-slate-50 p-3">
                                <p className="text-xs text-slate-500">Email</p>
                                <p className="font-semibold text-slate-900">{profileEmail}</p>
                              </div>
                              <div className="rounded-lg bg-slate-50 p-3">
                                <p className="text-xs text-slate-500">Filiale</p>
                                <p className="font-semibold text-slate-900">
                                  {filialeLabel || 'Non associée'}
                                </p>
                              </div>
                              <div className="rounded-lg bg-slate-50 p-3">
                                <p className="text-xs text-slate-500">Poste</p>
                                <p className="font-semibold text-slate-900">
                                  {profile?.poste || 'Non renseigné'}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={signOut}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100 transition"
                            >
                              <LogOut className="w-4 h-4" />
                              Déconnexion
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 space-y-4">
                            <div className="space-y-3">
                              <div className="rounded-xl border border-slate-200 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">Notifications in-app</p>
                                    <p className="text-xs text-slate-500">Recevoir les alertes dans l’application.</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setNotifyInApp((prev) => !prev)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                      notifyInApp ? 'bg-emerald-500' : 'bg-slate-200'
                                    }`}
                                    aria-pressed={notifyInApp}
                                  >
                                    <span
                                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                                        notifyInApp ? 'translate-x-5' : 'translate-x-1'
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>
                              <div className="rounded-xl border border-slate-200 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">Notifications email</p>
                                    <p className="text-xs text-slate-500">Recevoir un récapitulatif par email.</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setNotifyEmail((prev) => !prev)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                      notifyEmail ? 'bg-emerald-500' : 'bg-slate-200'
                                    }`}
                                    aria-pressed={notifyEmail}
                                  >
                                    <span
                                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                                        notifyEmail ? 'translate-x-5' : 'translate-x-1'
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>{unreadCount} non lue(s)</span>
                              <button
                                onClick={markAllNotificationsRead}
                                className="text-amber-600 hover:text-amber-700 font-semibold"
                              >
                                Tout marquer comme lu
                              </button>
                            </div>

                            {notifyInApp ? (
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {notifications.length === 0 && (
                                  <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                                    Aucune notification pour le moment.
                                  </div>
                                )}
                                {notifications.map((item) => {
                                  const tone =
                                    item.tone === 'success'
                                      ? 'bg-emerald-500'
                                      : item.tone === 'warning'
                                      ? 'bg-amber-500'
                                      : 'bg-blue-500';
                                  return (
                                    <button
                                      key={item.id}
                                      onClick={() => markNotificationRead(item.id)}
                                      className="w-full text-left rounded-lg border border-slate-200 p-3 hover:border-amber-200 hover:bg-amber-50/40 transition"
                                    >
                                      <div className="flex items-start gap-3">
                                        <span
                                          className={`mt-1 h-2.5 w-2.5 rounded-full ${item.read ? 'bg-slate-300' : tone}`}
                                        />
                                        <div className="flex-1">
                                          <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                            <span className="text-[10px] text-slate-400">
                                              {formatNotificationDate(item.createdAt)}
                                            </span>
                                          </div>
                                          <p className="text-xs text-slate-500">{item.message}</p>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                                Notifications désactivées.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 lg:px-10 pb-12">
            <div className="mx-auto max-w-7xl space-y-6">
              {children}
            </div>
          </main>
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
