import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FilialeContext } from '../../contexts/FilialeContext';
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
  view?: string;
};

interface MainLayoutProps {
  children: ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  modulePermissions?: Record<string, boolean> | null;
}

export function MainLayout({
  children,
  currentView,
  onViewChange,
  theme = 'light',
  onToggleTheme,
  modulePermissions,
}: MainLayoutProps) {
  const { profile, user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'profil' | 'notifications'>('profil');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [filialeLabel, setFilialeLabel] = useState<string | null>(null);
  const [filiales, setFiliales] = useState<Array<{ id: string; nom: string | null; code: string | null }>>([]);
  const [activeFilialeId, setActiveFilialeId] = useState<string | null>(null);
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

  const menuItems = useMemo(() => [
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
    { id: 'auth-events', label: 'Journal des connexions', icon: FileText, roles: ['admin_siege', 'manager_filiale'] },
    { id: 'data-exports', label: 'Exports', icon: FileText, roles: ['admin_siege'] },
  ], []);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (item.roles.includes('all')) return true;
      return profile && item.roles.includes(profile.role);
    });
  }, [menuItems, profile]);
  const filteredModuleItems = useMemo(() => {
    if (!modulePermissions || profile?.role === 'admin_siege') return filteredMenuItems;
    return filteredMenuItems.filter((item) => modulePermissions[item.id] !== false);
  }, [filteredMenuItems, modulePermissions, profile?.role]);
  const allowedViewIds = useMemo(() => new Set(filteredModuleItems.map((item) => item.id)), [filteredModuleItems]);
  const isAdmin = profile?.role === 'admin_siege';
  const effectiveFilialeId = isAdmin ? activeFilialeId : profile?.filiale_id || null;
  const filialeContextValue = useMemo(
    () => ({
      filialeId: effectiveFilialeId,
      setFilialeId: setActiveFilialeId,
      isAdmin: Boolean(isAdmin),
      filiales,
    }),
    [effectiveFilialeId, filiales, isAdmin]
  );

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
  const activeMenu = filteredModuleItems.find((item) => item.id === currentView);
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
    if (!profile) return;
    if (!isAdmin) {
      setActiveFilialeId(profile.filiale_id || null);
      return;
    }
    let isMounted = true;
    const loadFiliales = async () => {
      const { data, error } = await supabase
        .from('filiales')
        .select('id, nom, code')
        .order('nom');
      if (!isMounted) return;
      if (!error && data) {
        setFiliales(data as Array<{ id: string; nom: string | null; code: string | null }>);
        if (typeof window !== 'undefined') {
          const saved = window.localStorage.getItem('active_filiale_id');
          if (saved && data.some((f) => f.id === saved)) {
            setActiveFilialeId(saved);
          } else if (data.length === 1) {
            setActiveFilialeId(data[0].id);
          }
        }
      }
    };
    loadFiliales();
    return () => {
      isMounted = false;
    };
  }, [isAdmin, profile, profile?.filiale_id]);

  useEffect(() => {
    if (!isAdmin) return;
    if (typeof window === 'undefined') return;
    if (activeFilialeId) {
      window.localStorage.setItem('active_filiale_id', activeFilialeId);
    } else {
      window.localStorage.removeItem('active_filiale_id');
    }
  }, [activeFilialeId, isAdmin]);

  useEffect(() => {
    const filialeId = effectiveFilialeId;
    if (!filialeId) {
      setFilialeLabel(isAdmin ? 'Selectionnez une filiale' : null);
      return;
    }
    let isMounted = true;
    const loadFiliale = async () => {
      const match = filiales.find((filiale) => filiale.id === filialeId);
      if (match) {
        setFilialeLabel(match.nom || match.code || filialeId);
        return;
      }
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
  }, [effectiveFilialeId, filiales, isAdmin]);

  useEffect(() => {
    if (!profile) return;
    let isMounted = true;

    const loadNotifications = async () => {
      const canSee = (viewId: string) => allowedViewIds.has(viewId);
      const filialeFilter = effectiveFilialeId ? { filiale_id: effectiveFilialeId } : {};
      const filialeVendeurFilter = effectiveFilialeId ? { filiale_vendeur_id: effectiveFilialeId } : {};
      const now = new Date();
      const currentYear = now.getFullYear();

      const kpisPromise = canSee('kpis')
        ? supabase
            .from('kpis_reporting')
            .select('id', { count: 'exact', head: true })
            .in('status', ['Draft', 'Submitted'])
            .match(filialeFilter)
        : Promise.resolve({ count: 0, error: null });
      const actionsLatePromise = canSee('plan-actions')
        ? supabase
            .from('plan_actions')
            .select('id', { count: 'exact', head: true })
            .match(filialeFilter)
            .eq('statut', 'Retard')
        : Promise.resolve({ count: 0, error: null });
      const actionsOpenPromise = canSee('plan-actions')
        ? supabase
            .from('plan_actions')
            .select('id', { count: 'exact', head: true })
            .match(filialeFilter)
            .eq('statut', 'En_cours')
        : Promise.resolve({ count: 0, error: null });
      const stockObsoletePromise = canSee('stocks')
        ? supabase
            .from('stock_items')
            .select('id', { count: 'exact', head: true })
            .match(filialeFilter)
            .eq('statut', 'Obsolete')
        : Promise.resolve({ count: 0, error: null });
      const stockReservePromise = canSee('stocks')
        ? supabase
            .from('stock_items')
            .select('id', { count: 'exact', head: true })
            .match(filialeFilter)
            .in('statut', ['Reserve', 'Transfert'])
        : Promise.resolve({ count: 0, error: null });
      const stockIncompletePromise = canSee('stocks')
        ? supabase
            .from('stock_items')
            .select('id', { count: 'exact', head: true })
            .match(filialeFilter)
            .or('gamme.is.null,pays.is.null')
        : Promise.resolve({ count: 0, error: null });
      const ventesMissingPromise = canSee('ventes')
        ? supabase
            .from('ventes')
            .select('id', { count: 'exact', head: true })
            .match(filialeFilter)
            .or('vendeur.is.null,marque.is.null')
        : Promise.resolve({ count: 0, error: null });
      const commandesClientsMissingPromise = canSee('commandes-clients')
        ? supabase
            .from('commandes_clients')
            .select('id', { count: 'exact', head: true })
            .match(filialeFilter)
            .is('prevision_facturation', null)
        : Promise.resolve({ count: 0, error: null });
      const commandesFournisseursEtaMissingPromise = canSee('commandes')
        ? supabase
            .from('commandes_fournisseurs')
            .select('id', { count: 'exact', head: true })
            .match(filialeFilter)
            .is('eta', null)
        : Promise.resolve({ count: 0, error: null });
      const commandesFournisseursPrixMissingPromise = canSee('commandes')
        ? supabase
            .from('commandes_fournisseurs')
            .select('id', { count: 'exact', head: true })
            .match(filialeFilter)
            .is('prix_achat_ht', null)
        : Promise.resolve({ count: 0, error: null });
      const ventesPerduesMissingPromise = canSee('ventes-perdues')
        ? supabase
            .from('ventes_perdues')
            .select('id', { count: 'exact', head: true })
            .match(filialeFilter)
            .or('marque_concurrent.is.null,modele_concurrent.is.null,prix_concurrent.is.null')
        : Promise.resolve({ count: 0, error: null });
      const visitesIncompletePromise = canSee('visites-clients')
        ? supabase
            .from('visites_clients')
            .select('id', { count: 'exact', head: true })
            .match(filialeFilter)
            .or('email_client.is.null,telephone_client.is.null')
        : Promise.resolve({ count: 0, error: null });
      const opportunitesOpenPromise = canSee('visites-clients')
        ? supabase
            .from('opportunites')
            .select('id', { count: 'exact', head: true })
            .match(filialeFilter)
            .in('statut', ['En_cours', 'Reporte'])
        : Promise.resolve({ count: 0, error: null });
      const opportunitesMissingDatePromise = canSee('visites-clients')
        ? supabase
            .from('opportunites')
            .select('id', { count: 'exact', head: true })
            .match(filialeFilter)
            .is('date_closing_prevue', null)
        : Promise.resolve({ count: 0, error: null });
      const parcMachinesDownPromise = canSee('parc-machines')
        ? supabase
            .from('parc_machines')
            .select('id', { count: 'exact', head: true })
            .match(filialeVendeurFilter)
            .in('statut', ['Inactif', 'Hors_service'])
        : Promise.resolve({ count: 0, error: null });
      const parcMachinesInspectionMissingPromise = canSee('parc-machines')
        ? supabase
            .from('parc_machines')
            .select('id', { count: 'exact', head: true })
            .match(filialeVendeurFilter)
            .is('date_derniere_inspection', null)
        : Promise.resolve({ count: 0, error: null });
      const inspectionsPendingPromise = canSee('inspections')
        ? supabase
            .from('inspections_techniques')
            .select('id', { count: 'exact', head: true })
            .match(filialeFilter)
            .eq('statut_devis', 'A_etablir')
        : Promise.resolve({ count: 0, error: null });
      const sessionsPendingPromise = canSee('sessions-inter')
        ? (effectiveFilialeId
            ? supabase
                .from('sessions_interfiliales')
                .select('id', { count: 'exact', head: true })
                .or(`filiale_origine_id.eq.${effectiveFilialeId},filiale_destination_id.eq.${effectiveFilialeId}`)
                .eq('statut', 'En_attente')
            : supabase
                .from('sessions_interfiliales')
                .select('id', { count: 'exact', head: true })
                .eq('statut', 'En_attente'))
        : Promise.resolve({ count: 0, error: null });
      const budgetsMissingPromise = canSee('budgets')
        ? supabase
            .from('budgets')
            .select('id', { count: 'exact', head: true })
            .match(filialeFilter)
            .eq('annee', currentYear)
        : Promise.resolve({ count: 0, error: null });
      const forecastsMissingPromise = canSee('forecasts')
        ? supabase
            .from('previsions_ventes_modeles')
            .select('id', { count: 'exact', head: true })
            .match(filialeFilter)
            .or('quantite_prevue.is.null,quantite_prevue.lte.0')
        : Promise.resolve({ count: 0, error: null });
      const pdmMissingPromise = canSee('pdm')
        ? supabase
            .from('pdm_entries')
            .select('id', { count: 'exact', head: true })
            .match(filialeFilter)
            .is('source_industrie_type', null)
        : Promise.resolve({ count: 0, error: null });
      const powerBiMissingPromise = canSee('power-bi')
        ? supabase
            .from('powerbi_configs')
            .select('id', { count: 'exact', head: true })
            .is('embed_url', null)
        : Promise.resolve({ count: 0, error: null });

      const [
        kpisRes,
        actionsLateRes,
        actionsOpenRes,
        stockObsoleteRes,
        stockReserveRes,
        stockIncompleteRes,
        ventesMissingRes,
        commandesClientsMissingRes,
        commandesFournisseursEtaMissingRes,
        commandesFournisseursPrixMissingRes,
        ventesPerduesMissingRes,
        visitesIncompleteRes,
        opportunitesOpenRes,
        opportunitesMissingDateRes,
        parcMachinesDownRes,
        parcMachinesInspectionMissingRes,
        inspectionsPendingRes,
        sessionsPendingRes,
        budgetsMissingRes,
        forecastsMissingRes,
        pdmMissingRes,
        powerBiMissingRes,
      ] = await Promise.all([
        kpisPromise,
        actionsLatePromise,
        actionsOpenPromise,
        stockObsoletePromise,
        stockReservePromise,
        stockIncompletePromise,
        ventesMissingPromise,
        commandesClientsMissingPromise,
        commandesFournisseursEtaMissingPromise,
        commandesFournisseursPrixMissingPromise,
        ventesPerduesMissingPromise,
        visitesIncompletePromise,
        opportunitesOpenPromise,
        opportunitesMissingDatePromise,
        parcMachinesDownPromise,
        parcMachinesInspectionMissingPromise,
        inspectionsPendingPromise,
        sessionsPendingPromise,
        budgetsMissingPromise,
        forecastsMissingPromise,
        pdmMissingPromise,
        powerBiMissingPromise,
      ]);

      if (!isMounted) return;

      const resolveCount = (res: { count: number | null; error: unknown } | null) => {
        if (!res || res.error || typeof res.count !== 'number') return 0;
        return res.count || 0;
      };

      const notificationsList: NotificationItem[] = [];
      const kpisPending = resolveCount(kpisRes);
      const actionsLate = resolveCount(actionsLateRes);
      const actionsOpen = resolveCount(actionsOpenRes);
      const stockObsolete = resolveCount(stockObsoleteRes);
      const stockReserve = resolveCount(stockReserveRes);
      const stockIncomplete = resolveCount(stockIncompleteRes);
      const ventesMissing = resolveCount(ventesMissingRes);
      const commandesClientsMissing = resolveCount(commandesClientsMissingRes);
      const commandesFournisseursEtaMissing = resolveCount(commandesFournisseursEtaMissingRes);
      const commandesFournisseursPrixMissing = resolveCount(commandesFournisseursPrixMissingRes);
      const ventesPerduesMissing = resolveCount(ventesPerduesMissingRes);
      const visitesIncomplete = resolveCount(visitesIncompleteRes);
      const opportunitesOpen = resolveCount(opportunitesOpenRes);
      const opportunitesMissingDate = resolveCount(opportunitesMissingDateRes);
      const parcMachinesDown = resolveCount(parcMachinesDownRes);
      const parcMachinesInspectionMissing = resolveCount(parcMachinesInspectionMissingRes);
      const inspectionsPending = resolveCount(inspectionsPendingRes);
      const sessionsPending = resolveCount(sessionsPendingRes);
      const budgetsCount =
        budgetsMissingRes && !budgetsMissingRes.error && typeof budgetsMissingRes.count === 'number'
          ? budgetsMissingRes.count
          : null;
      const forecastsMissing = resolveCount(forecastsMissingRes);
      const pdmMissing = resolveCount(pdmMissingRes);
      const powerBiMissing = resolveCount(powerBiMissingRes);

      if (kpisPending > 0) {
        notificationsList.push({
          id: `kpis-${kpisPending}`,
          title: 'KPIs en attente',
          message: `${kpisPending} KPI(s) a valider.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'warning',
          view: 'kpis',
        });
      }

      if (actionsLate > 0) {
        notificationsList.push({
          id: `actions-retard-${actionsLate}`,
          title: 'Actions en retard',
          message: `${actionsLate} action(s) en retard.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'warning',
          view: 'plan-actions',
        });
      }

      if (actionsOpen > 0) {
        notificationsList.push({
          id: `actions-ouvertes-${actionsOpen}`,
          title: 'Actions en cours',
          message: `${actionsOpen} action(s) ouvertes.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'info',
          view: 'plan-actions',
        });
      }

      if (stockObsolete > 0) {
        notificationsList.push({
          id: `stock-obsolete-${stockObsolete}`,
          title: 'Stock obsolete',
          message: `${stockObsolete} article(s) en obsolete.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'warning',
          view: 'stocks',
        });
      }

      if (stockReserve > 0) {
        notificationsList.push({
          id: `stock-reserve-${stockReserve}`,
          title: 'Stock reserve/transfert',
          message: `${stockReserve} article(s) reserves ou en transfert.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'info',
          view: 'stocks',
        });
      }

      if (stockIncomplete > 0) {
        notificationsList.push({
          id: `stock-incomplete-${stockIncomplete}`,
          title: 'Stock incomplet',
          message: `${stockIncomplete} article(s) sans gamme ou pays.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'info',
          view: 'stocks',
        });
      }

      if (commandesFournisseursEtaMissing > 0) {
        notificationsList.push({
          id: `cmd-fournisseurs-eta-${commandesFournisseursEtaMissing}`,
          title: 'Commandes fournisseurs sans ETA',
          message: `${commandesFournisseursEtaMissing} commande(s) sans ETA.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'warning',
          view: 'commandes',
        });
      }

      if (commandesFournisseursPrixMissing > 0) {
        notificationsList.push({
          id: `cmd-fournisseurs-prix-${commandesFournisseursPrixMissing}`,
          title: 'Commandes fournisseurs sans prix',
          message: `${commandesFournisseursPrixMissing} commande(s) sans prix achat.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'info',
          view: 'commandes',
        });
      }

      if (commandesClientsMissing > 0) {
        notificationsList.push({
          id: `cmd-clients-${commandesClientsMissing}`,
          title: 'Commandes clients incompletes',
          message: `${commandesClientsMissing} commande(s) sans date de facturation.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'warning',
          view: 'commandes-clients',
        });
      }

      if (ventesMissing > 0) {
        notificationsList.push({
          id: `ventes-missing-${ventesMissing}`,
          title: 'Ventes a completer',
          message: `${ventesMissing} vente(s) sans vendeur ou marque.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'warning',
          view: 'ventes',
        });
      }

      if (ventesPerduesMissing > 0) {
        notificationsList.push({
          id: `ventes-perdues-${ventesPerduesMissing}`,
          title: 'Ventes perdues incompletes',
          message: `${ventesPerduesMissing} vente(s) perdues sans details concurrence.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'warning',
          view: 'ventes-perdues',
        });
      }

      if (visitesIncomplete > 0) {
        notificationsList.push({
          id: `visites-incomplete-${visitesIncomplete}`,
          title: 'Visites a enrichir',
          message: `${visitesIncomplete} visite(s) sans contact complet.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'info',
          view: 'visites-clients',
        });
      }

      if (opportunitesOpen > 0) {
        notificationsList.push({
          id: `opportunites-${opportunitesOpen}`,
          title: 'Opportunites ouvertes',
          message: `${opportunitesOpen} opportunite(s) ouvertes a suivre.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'info',
          view: 'visites-clients',
        });
      }

      if (opportunitesMissingDate > 0) {
        notificationsList.push({
          id: `opportunites-dates-${opportunitesMissingDate}`,
          title: 'Opportunites sans date',
          message: `${opportunitesMissingDate} opportunite(s) sans date de closing.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'warning',
          view: 'visites-clients',
        });
      }

      if (parcMachinesDown > 0) {
        notificationsList.push({
          id: `parc-machines-${parcMachinesDown}`,
          title: 'Parc machines a risque',
          message: `${parcMachinesDown} machine(s) inactives ou hors service.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'warning',
          view: 'parc-machines',
        });
      }

      if (parcMachinesInspectionMissing > 0) {
        notificationsList.push({
          id: `parc-machines-inspections-${parcMachinesInspectionMissing}`,
          title: 'Parc machines sans inspection',
          message: `${parcMachinesInspectionMissing} machine(s) sans derniere inspection.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'info',
          view: 'parc-machines',
        });
      }

      if (inspectionsPending > 0) {
        notificationsList.push({
          id: `inspections-${inspectionsPending}`,
          title: 'Devis SAV en attente',
          message: `${inspectionsPending} inspection(s) avec devis a etablir.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'warning',
          view: 'inspections',
        });
      }

      if (sessionsPending > 0) {
        notificationsList.push({
          id: `sessions-${sessionsPending}`,
          title: 'Sessions interfiliales a traiter',
          message: `${sessionsPending} session(s) en attente de validation.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'info',
          view: 'sessions-inter',
        });
      }

      if (budgetsCount === 0 && canSee('budgets')) {
        notificationsList.push({
          id: 'budgets-empty',
          title: 'Budget manquant',
          message: `Aucun budget ${currentYear} enregistre.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'warning',
          view: 'budgets',
        });
      }

      if (forecastsMissing > 0) {
        notificationsList.push({
          id: `forecasts-${forecastsMissing}`,
          title: 'Previsions a completer',
          message: `${forecastsMissing} prevision(s) avec quantite a zero.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'info',
          view: 'forecasts',
        });
      }

      if (pdmMissing > 0) {
        notificationsList.push({
          id: `pdm-${pdmMissing}`,
          title: 'PDM a documenter',
          message: `${pdmMissing} entree(s) sans source renseignee.`,
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'info',
          view: 'pdm',
        });
      }

      if (powerBiMissing > 0) {
        notificationsList.push({
          id: `powerbi-${powerBiMissing}`,
          title: 'Power BI non configure',
          message: 'Ajoutez un embed Power BI pour activer le reporting.',
          createdAt: new Date().toISOString(),
          read: false,
          tone: 'warning',
          view: 'power-bi',
        });
      }

      setNotifications((prev) => {
        const existingRead = new Map(prev.map((item) => [item.id, item.read]));
        return notificationsList.map((item) => ({
          ...item,
          read: existingRead.get(item.id) ?? false,
        }));
      });
    };

    loadNotifications();
    const interval = typeof window === 'undefined' ? null : window.setInterval(loadNotifications, 5 * 60 * 1000);
    return () => {
      isMounted = false;
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [effectiveFilialeId, allowedViewIds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

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

  const handleNotificationAction = (item: NotificationItem) => {
    markNotificationRead(item.id);
    if (item.view && onViewChange) {
      onViewChange(item.view);
      setProfileMenuOpen(false);
    }
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
    <FilialeContext.Provider value={filialeContextValue}>
      <div className="relative app-shell surface-grid">

      <div className="relative flex min-h-screen">
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed lg:static lg:translate-x-0 inset-y-0 left-0 z-50 w-72 app-sidebar transition-transform duration-300 ease-in-out shadow-2xl border-r border-white/10`}
        >
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <img src={logoUrl} alt="Tractafric Equipment" className="h-9 w-auto" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-300/80">Pilotage</p>
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
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-100 font-semibold">
                        {profile.prenom} {profile.nom}
                      </p>
                      <p className="text-xs text-slate-300">{profile.email}</p>
                    </div>
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_0_6px_rgba(245,179,1,0.18)]" />
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
              {filteredModuleItems.map((item) => {
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
                        ? 'bg-amber-400/15 text-amber-100 shadow border border-amber-300/30'
                        : 'text-slate-200/80 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    <span
                      className={`absolute inset-y-2 left-2 w-1 rounded-full transition-all ${
                        isActive ? 'bg-gradient-to-b from-amber-300 to-amber-500' : 'bg-transparent group-hover:bg-white/30'
                      }`}
                    />
                    <Icon className="w-5 h-5" />
                    <div className="flex flex-col">
                      <span className="font-semibold">{item.label}</span>
                      <span className="text-xs text-slate-400">
                        {isActive ? 'En cours' : 'Acceder'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-white/10">
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
          <header className="sticky top-0 z-30 app-header backdrop-blur">
            <div className="mx-auto max-w-7xl px-6 lg:px-10 py-4">
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-200/80 bg-white/90 shadow-lg shadow-slate-900/10">
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
                  {(isAdmin || profile?.filiale_id) && (
                    <span className="pill bg-amber-50 text-amber-700 border border-amber-100">
                      <MapPin className="w-3.5 h-3.5" />
                      {filialeLabel || (isAdmin ? 'Selectionnez une filiale' : 'Filiale active')}
                    </span>
                  )}
                  {isAdmin && filiales.length > 0 && (
                    <div>
                      <select
                        value={activeFilialeId || ''}
                        onChange={(e) => setActiveFilialeId(e.target.value || null)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      >
                        <option value="">Selectionner une filiale</option>
                        {filiales.map((filiale) => (
                          <option key={filiale.id} value={filiale.id}>
                            {filiale.nom || filiale.code || filiale.id}
                          </option>
                        ))}
                      </select>
                    </div>
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
                                      onClick={() => handleNotificationAction(item)}
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
              <div key={currentView} className="animate-fade-up">
                {children}
              </div>
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
    </FilialeContext.Provider>
  );
}
