

// This file contains the main application logic, routing, and navigation components.
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  Trophy,
  Calendar,
  Calendar as CalendarIcon,
  LayoutDashboard,
  Menu,
  X,
  BarChart3,
  LogIn,
  ShieldCheck,
  LogOut,
  ShoppingBag,
  Newspaper,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UsersRound,
  RefreshCw,
  ArrowRight,
  User,
  Globe,
  Mail,
  Lock,
  CreditCard,
  PhilippinePeso,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  Settings,
  MoreHorizontal,
  Bell,
  UserCheck,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Shield,
  MessageCircle,
  Users,
  Medal,
  UserPlus,
  UserMinus,
  MessageSquare,
  ClipboardCheck
} from 'lucide-react';
import ReactDOM from 'react-dom';

import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Booking from './components/Booking';
import Community, { GroupDetail, GroupManage } from './components/community';
import Groups from './components/community/Groups';
import Rankings from './components/Rankings';
import AdminDashboard from './components/admin/AdminDashboard';
import Tournaments from './components/Tournaments';
import News from './components/News';
import Shop from './components/Shop';
import { SquadsList, SquadDetail } from './components/squads';
import Academy from './components/Academy';
import MyBookings from './components/MyBookings';
import Profile from './components/Profile';
import GuestBooking from './components/GuestBooking';
import UsernameSetupModal from './components/UsernameSetupModal';
import Login from './components/Login';
import Signup from './components/Signup';
import TwoFactorVerify from './components/TwoFactorVerify';
import AuthCallback from './components/AuthCallback';
import UpdatePassword from './components/UpdatePassword';
import NotFound from './components/NotFound';
import CourtDetail from './components/CourtDetail';
import FAQ from './components/FAQ';
import MatchVerifyPage from './components/MatchVerifyPage';
import PosterPage from './components/PosterPage';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';

import FindPartners from './components/partners/FindPartners';
import DirectMessages from './components/partners/DirectMessages';
import { getTotalUnreadCount } from './services/directMessages';
import Others from './components/Others';

// Guides Components
import GuidesIndex from './components/guides/GuidesIndex';
import GuideReader from './components/guides/GuideReader';
import SkillRatingQuiz from './components/guides/SkillRatingQuiz';

// Professional Components
import Students from './components/coach/Students';
import Clinics from './components/coach/Clinics';
import Schedule from './components/coach/Schedule';
import BookingsAdmin from './components/court-owner/BookingsAdmin';
import Revenue from './components/court-owner/Revenue';
import Transactions from './components/court-owner/Transactions';
import TournamentsManager from './components/court-owner/TournamentsManager';
import TournamentHub from './components/court-owner/TournamentHub';
import TournamentPage from './components/tournaments/TournamentPage';
import CourtCalendar from './components/court-owner/CourtCalendar';
import LocationsList from './components/court-owner/location/LocationsList';
import LocationDetailPage from './components/court-owner/location/LocationDetailPage';
import LocationPolicies from './components/court-owner/LocationPolicies';
import CourtPricing from './components/court-owner/CourtPricing';
import ApplicationStatus from './components/court-owner/ApplicationStatus';
import ManagerInvitePage from './components/court-owner/ManagerInvitePage';
import {
  CourtManagerAssignedCourtPage,
  CourtManagerBookingsPage,
  CourtManagerLayout,
  CourtManagerOverviewPage,
  CourtManagerSchedulePage,
} from './components/court-manager';
import Achievements from './components/Achievements';
import AchievementsManager from './components/admin/AchievementsManager';
import Coaches from '@/components/Coaches';
import { supabase } from './services/supabase';
import { getMaintenanceStatus, getEnabledFeaturesForRole, isFeatureEnabled, ensureDefaultFeatures, DEFAULT_FEATURES_PER_ROLE } from './services/maintenance';
import { getTwoFactorStatus } from './services/twoFactorAuth';
import { isGoogleSession, shouldBlockUnverifiedEmailSession } from './services/authAccess';
import { approveCourtManager } from './lib/court-manager/actions';
import { COURT_MANAGER_ROUTES } from './lib/court-manager/constants';
import MaintenanceScreen from './components/MaintenanceScreen';
import SoftLaunchWelcome from './components/SoftLaunchWelcome';
import FeatureUnavailable from './components/FeatureUnavailable';
// Fix: Import UserRole from the centralized types.ts file.
import { ProfessionalApplication, UserRole, Notification, SocialPost, SocialComment, Product, CartItem } from './types';
import { INITIAL_APPLICATIONS, INITIAL_POSTS } from './data/mockData';

const NotificationPanel: React.FC<{
  notifications: Notification[],
  onClose: () => void,
  onNotificationClick: (notification: Notification) => void,
  onNotificationAction: (notification: Notification, action: 'approve' | 'view' | 'dismiss') => void,
  activeActionKey?: string | null
}> = ({ notifications, onClose, onNotificationClick, onNotificationAction, activeActionKey = null }) => {
  const isCourtManagerPendingApprovalNotification = (notification: Notification) =>
    notification.metadata?.kind === 'court_manager_pending_approval' && Boolean(notification.metadata?.assignmentId);

  const getNotifIcon = (notification: Notification) => {
    const type = notification.type as string;
    if (isCourtManagerPendingApprovalNotification(notification)) return <UserCheck size={16} className="text-blue-600" />;
    if (type === 'ACHIEVEMENT') return <span className="text-base">🏆</span>;
    if (type === 'player_invitation') return <span className="text-base">🎾</span>;
    if (type === 'invitation_accepted') return <span className="text-base">✅</span>;
    if (type === 'invitation_declined') return <span className="text-base">❌</span>;
    if (type === 'squad_join_request') return <UsersRound size={16} className="text-blue-600" />;
    if (type === 'squad_member_joined') return <UserPlus size={16} className="text-green-600" />;
    if (type === 'squad_member_left') return <UserMinus size={16} className="text-amber-600" />;
    if (type === 'squad_event_created') return <Calendar size={16} className="text-violet-600" />;
    if (type === 'squad_message') return <MessageSquare size={16} className="text-blue-600" />;
    if (type === 'SYSTEM' || type === 'system') return <Shield size={16} className="text-blue-600" />;
    return null;
  };
  const isSystemNotif = (type: string) =>
    ['ACHIEVEMENT', 'player_invitation', 'invitation_accepted', 'invitation_declined', 'SYSTEM', 'system',
      'squad_join_request', 'squad_member_joined', 'squad_member_left', 'squad_event_created', 'squad_message'].includes(type);

  return (
    <div className="absolute left-full ml-6 bottom-0 w-80 bg-white rounded-[32px] shadow-2xl border border-slate-100 p-6 animate-in slide-in-from-left-4 fade-in duration-300 z-[100]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-black text-slate-900 tracking-tight uppercase">Activity</h3>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900"><X size={16} /></button>
      </div>
      <div className="space-y-4 max-h-80 overflow-y-auto scrollbar-hide">
        {notifications.length > 0 ? notifications.map(n => (
          <div
            key={n.id}
            className="flex items-start gap-3 p-2 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors group"
            onClick={() => onNotificationClick(n)}
          >
            {!n.isRead && <div className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0 animate-pulse"></div>}
            {isSystemNotif(n.type) ? (
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                {getNotifIcon(n)}
              </div>
            ) : (
              <img src={n.actor.avatar} className="w-8 h-8 rounded-full" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 leading-tight group-hover:text-slate-950 transition-colors">
                {isSystemNotif(n.type) ? (
                  <>
                    <span className="font-bold">{n.actor.name}</span>
                    {' '}
                    <span>{n.message}</span>
                  </>
                ) : (
                  <><span className="font-bold">{n.actor.name}</span> {n.message}</>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-1">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              {(n.type === 'player_invitation') && (
                <span className="inline-block mt-1.5 px-2 py-0.5 bg-violet-100 text-violet-700 text-[9px] font-black uppercase tracking-widest rounded-lg">Tap to respond</span>
              )}
              {isCourtManagerPendingApprovalNotification(n) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onNotificationAction(n, 'approve');
                    }}
                    disabled={activeActionKey === `${n.id}:approve`}
                    className="rounded-xl bg-blue-600 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-700 disabled:opacity-60"
                  >
                    {activeActionKey === `${n.id}:approve` ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onNotificationAction(n, 'view');
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50"
                  >
                    View Manager
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onNotificationAction(n, 'dismiss');
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-600"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        )) : (
          <p className="text-sm text-slate-400 text-center py-8">No new notifications.</p>
        )}
      </div>
    </div>
  );
};


const NavItem: React.FC<{ to: string, icon: React.ReactNode, label: string, isCollapsed: boolean, themeColor: string, onClick?: () => void, isMobile?: boolean, badge?: number, ownerVariant?: boolean, showCollapsedActiveAccent?: boolean }> = ({ to, icon, label, isCollapsed, themeColor, onClick, isMobile = false, badge, ownerVariant = false, showCollapsedActiveAccent = false }) => {
  const location = useLocation();
  const hasQuery = to.includes('?');
  const [toPath, toSearch] = hasQuery ? to.split('?', 2).map((s, i) => i === 1 ? '?' + s : s) : [to, ''];
  const isActive = hasQuery
    ? location.pathname === toPath && location.search === toSearch
    : location.pathname === to;
  const isPrimaryBook = !isMobile && to === '/booking';
  const shouldUseOwnerVariant = ownerVariant && !isMobile;
  const iconSize = React.isValidElement(icon)
    ? ((icon as React.ReactElement<any>).props?.size ?? 22)
    : 22;
  const enhancedIcon = React.isValidElement(icon)
    ? React.cloneElement(icon as React.ReactElement<any>, {
      size: iconSize,
      strokeWidth: shouldUseOwnerVariant
        ? (isActive ? 2.2 : 1.95)
        : (icon as React.ReactElement<any>).props?.strokeWidth,
      ...(shouldUseOwnerVariant
        ? { fill: isActive ? 'currentColor' : 'none' }
        : {}),
    })
    : icon;
  const ownerActiveIcon = shouldUseOwnerVariant && isActive && React.isValidElement(icon)
    ? (
      <span className="relative block" style={{ width: iconSize, height: iconSize }}>
        {React.cloneElement(icon as React.ReactElement<any>, {
          size: iconSize,
          strokeWidth: 2.15,
          fill: '#16784D',
          stroke: '#16784D',
          className: 'absolute inset-0',
          'data-owner-icon-layer': 'shadow',
        })}
        {React.cloneElement(icon as React.ReactElement<any>, {
          size: iconSize,
          strokeWidth: 2.1,
          fill: 'currentColor',
          stroke: 'currentColor',
          className: 'absolute inset-0',
          'data-owner-icon-layer': 'base',
        })}
        {React.cloneElement(icon as React.ReactElement<any>, {
          size: iconSize,
          strokeWidth: 1.55,
          fill: 'none',
          stroke: '#B7D532',
          className: 'absolute inset-0',
          'data-owner-icon-layer': 'accent',
        })}
      </span>
    )
    : null;
  const renderedIcon = ownerActiveIcon ?? enhancedIcon;

  return (
    <Link
      to={to}
      onClick={onClick}
      data-owner-nav={shouldUseOwnerVariant ? 'true' : undefined}
      data-owner-active={shouldUseOwnerVariant && isActive ? 'true' : undefined}
      className={`flex items-center gap-3 ${isPrimaryBook ? 'p-5' : 'p-3.5'} rounded-2xl transition-colors duration-150 group ${isActive
        ? isMobile ? 'bg-slate-900 text-white shadow-lg' : 'bg-white/95 text-slate-900 shadow-lg'
        : isMobile ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900' : `${isPrimaryBook ? 'text-white/90 bg-white/5 hover:bg-white/10' : 'text-white/95 hover:bg-white/10 hover:text-white'}`
        } ${isCollapsed ? 'justify-center' : ''} ${isPrimaryBook && !isActive ? 'ring-1 ring-white/10' : ''} ${showCollapsedActiveAccent && isCollapsed && isActive && !isMobile ? 'ring-2 ring-white/35 shadow-[0_12px_24px_-12px_rgba(15,23,42,0.65)]' : ''}`}
    >
      <div
        data-owner-nav-icon={shouldUseOwnerVariant ? 'true' : undefined}
        data-owner-nav-icon-active={shouldUseOwnerVariant && isActive ? 'true' : undefined}
        className={`relative shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : isPrimaryBook ? 'scale-110 group-hover:scale-115' : 'group-hover:scale-110'} ${shouldUseOwnerVariant ? (isActive ? 'text-[#0B5D3B]' : 'text-white/90 group-hover:text-white') : ''}`}
      >
        {renderedIcon}
        {showCollapsedActiveAccent && isCollapsed && isActive && !isMobile && (
          <span className="absolute -bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-lime-400 shadow-[0_0_12px_rgba(163,230,53,0.9)]" />
        )}
        {badge != null && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-rose-500 rounded-full text-[9px] font-black text-white flex items-center justify-center px-0.5 leading-none">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      {!isCollapsed && (
        <span className={`font-black ${isPrimaryBook ? 'text-[14px]' : 'text-[13px]'} uppercase tracking-widest animate-in fade-in slide-in-from-left-2 duration-300`}>
          {label}
        </span>
      )}
      {!isCollapsed && badge != null && badge > 0 && (
        <span className="ml-auto bg-rose-500 text-white text-[9px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {!isCollapsed && isActive && !(badge != null && badge > 0) && (
        shouldUseOwnerVariant
          ? <div data-owner-active-marker="true" className="ml-auto h-8 w-1 rounded-full bg-[#B7D532] shadow-[0_0_0_1px_rgba(183,213,50,0.2)]" />
          : <div className={`ml-auto w-1.5 h-1.5 rounded-full ${isMobile ? 'bg-white' : 'bg-blue-600'}`} />
      )}
    </Link>
  );
};

const MobileBottomNav: React.FC<{ role: UserRole, themeColor: string }> = ({ role, themeColor }) => {
  const location = useLocation();

  // Build items based on role — court owners get "Bookings" (admin) instead of "Book"
  const items = role === 'COURT_OWNER'
    ? [
      { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Home' },
      { to: '/bookings-admin', icon: <Calendar size={20} />, label: 'Bookings' },
      { to: '/locations', icon: <MapPin size={20} />, label: 'Courts' },
      { to: '/revenue', icon: <BarChart3 size={20} />, label: 'Revenue' },
      { to: '/profile', icon: <User size={20} />, label: 'Me' },
    ]
    : role === 'COURT_MANAGER'
      ? [
        { to: COURT_MANAGER_ROUTES.overview, icon: <LayoutDashboard size={20} />, label: 'Home' },
        { to: COURT_MANAGER_ROUTES.assignedCourt, icon: <MapPin size={20} />, label: 'Court' },
        { to: COURT_MANAGER_ROUTES.bookings, icon: <Calendar size={20} />, label: 'Bookings' },
        { to: COURT_MANAGER_ROUTES.schedule, icon: <CalendarIcon size={20} />, label: 'Schedule' },
        { to: '/profile', icon: <User size={20} />, label: 'Me' },
      ]
    : [
      { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Home' },
      { to: '/booking', icon: <Calendar size={20} />, label: 'Book' },
      { to: '/community', icon: <Globe size={20} />, label: 'Hub' },
      { to: '/shop', icon: <ShoppingBag size={20} />, label: 'Shop' },
      { to: '/profile', icon: <User size={20} />, label: 'Me' },
    ];

  if (role === 'guest') return null;

  // Hide bottom nav on Booking page (it has its own mobile bottom bar)
  if (location.pathname === '/booking') return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-6 py-3 flex justify-between items-center z-[100] safe-area-bottom shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
      {items.map((item) => {
        const isActive = location.pathname === item.to;
        return (
          <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-1 transition-all ${isActive ? `text-${themeColor}-600` : 'text-slate-400'}`}>
            <div className={`p-2 rounded-xl transition-all ${isActive ? `bg-${themeColor}-50` : ''}`}>
              {item.icon}
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

const RoleSwitchOverlay: React.FC<{ targetRole: UserRole }> = ({ targetRole }) => {
  const isCourtOwnerTarget = targetRole === 'COURT_OWNER';
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/20 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white/80 p-12 rounded-[48px] shadow-2xl border border-white flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
        <div
          className={`w-24 h-24 rounded-[32px] flex items-center justify-center text-white shadow-xl animate-pulse ${isCourtOwnerTarget ? 'bg-[#0B5D3B] shadow-[#ECFCCB]' : 'bg-blue-600 shadow-blue-200'}`}
        >
          {targetRole === 'PLAYER' && <User size={40} />}
          {targetRole === 'COACH' && <GraduationCap size={40} />}
          {(targetRole === 'COURT_OWNER' || targetRole === 'COURT_MANAGER') && <Building2 size={40} />}
          {targetRole === 'ADMIN' && <ShieldCheck size={40} />}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Activating {targetRole.replace('_', ' ')} Mode</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Syncing Intelligence...</p>
        </div>
        <div className="flex gap-1.5 pt-4">
          <div className={`w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s] ${isCourtOwnerTarget ? 'bg-[#0B5D3B]' : 'bg-blue-600'}`}></div>
          <div className={`w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s] ${isCourtOwnerTarget ? 'bg-[#0B5D3B]' : 'bg-blue-600'}`}></div>
          <div className={`w-2 h-2 rounded-full animate-bounce ${isCourtOwnerTarget ? 'bg-[#0B5D3B]' : 'bg-blue-600'}`}></div>
        </div>
      </div>
    </div>
  );
};

const NavigationHandler: React.FC<{
  role: UserRole;
  setRole: (role: UserRole) => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  handleLogout: () => void;
  applications: ProfessionalApplication[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSubmitApplication: (app: Omit<ProfessionalApplication, 'id' | 'status' | 'submissionDate'>) => void;
  authorizedProRoles: UserRole[];
  setAuthorizedProRoles: (roles: UserRole[]) => void;
  followedUsers: string[];
  handleFollow: (userId: string, userName: string) => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  handleMarkNotificationsRead: () => void;
  posts: SocialPost[];
  setPosts: React.Dispatch<React.SetStateAction<SocialPost[]>>;
  cartItems: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateCartQuantity: (productId: string, newQuantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  userName: string | null;
  userAvatar: string | null;
  userPoints: number;
  currentUserId: string | null;
  isSwitchingRole: boolean;
  roleSwitchTarget: UserRole;
  handleRoleSwitch: (newRole: UserRole) => void;
  showUsernameModal: boolean;
  setShowUsernameModal: (show: boolean) => void;
  isUpdatingUsername: boolean;
  initialNameForModal: string;
  handleConfirmUsername: (newName: string) => Promise<void>;
  isMaintenanceMode: boolean;
  maintenanceChecked: boolean;
  maintenanceMessage: string;
  isSoftLaunchMode: boolean;
  enabledFeatures: Set<string>;
  featuresLoaded: boolean;
  isActualAdmin: boolean;
  isTwoFactorPending: boolean;
}> = (props) => {
  const {
    role: rawRole, setRole, isLoginModalOpen, setIsLoginModalOpen, handleLogout,
    applications, onApprove, onReject, onSubmitApplication,
    authorizedProRoles, setAuthorizedProRoles, followedUsers, handleFollow,
    notifications, setNotifications, handleMarkNotificationsRead, posts, setPosts,
    cartItems, onAddToCart, onUpdateCartQuantity, onRemoveFromCart,
    userName, userAvatar, userPoints, currentUserId,
    isSwitchingRole, roleSwitchTarget, handleRoleSwitch,
    showUsernameModal, setShowUsernameModal, isUpdatingUsername,
    initialNameForModal, handleConfirmUsername,
    isMaintenanceMode, maintenanceChecked, maintenanceMessage, isSoftLaunchMode, enabledFeatures, featuresLoaded, isActualAdmin,
    isTwoFactorPending
  } = props;

  const role = currentUserId ? rawRole : 'guest';
  const isCourtOwnerRole = role === 'COURT_OWNER';
  const isCourtManagerRole = role === 'COURT_MANAGER';
  const canOperateCourt = isCourtOwnerRole || isCourtManagerRole;

  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationActionKey, setNotificationActionKey] = useState<string | null>(null);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isOthersOpen, setIsOthersOpen] = useState(true);
  const [isCompeteOpen, setIsCompeteOpen] = useState(true);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const scrollContainerRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';
  const isPosterPage = location.pathname.startsWith('/p/');
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/verify-2fa' || location.pathname === '/update-password' || location.pathname === '/manager-invite';

  // ── PASSWORD_RECOVERY: Handle Supabase PKCE password reset flow ──
  // The early interceptor in supabase.ts stores 'password_recovery_pending' in
  // sessionStorage when PASSWORD_RECOVERY fires during Supabase initialization
  // (before React renders). We read it here on mount and redirect accordingly.
  useEffect(() => {
    const isPendingRecovery = sessionStorage.getItem('password_recovery_pending') === 'true';
    if (isPendingRecovery) {
      sessionStorage.removeItem('password_recovery_pending');
      navigate('/update-password', { replace: true });
      return;
    }

    // Also subscribe in case the event fires after React mounts (edge cases)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/update-password', { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load + poll unread message count
  useEffect(() => {
    if (!currentUserId) return;
    getTotalUnreadCount().then(setUnreadMessagesCount);
    const interval = setInterval(() => {
      getTotalUnreadCount().then(setUnreadMessagesCount);
    }, 5000); // poll every 5s
    return () => clearInterval(interval);
  }, [currentUserId]);

  // When user is on the messages page, clear badge faster
  const messagesPathActive = location.pathname === '/messages';
  useEffect(() => {
    if (!messagesPathActive || !currentUserId) return;
    // Immediate refresh
    getTotalUnreadCount().then(setUnreadMessagesCount);
    // Fast poll while on messages page
    const fast = setInterval(() => {
      getTotalUnreadCount().then(setUnreadMessagesCount);
    }, 2000);
    return () => clearInterval(fast);
  }, [messagesPathActive, currentUserId]);
  const pendingCount = applications.filter(a => a.status === 'PENDING').length;
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;
  const hasUnreadNotifications = unreadNotificationsCount > 0;

  // Pending court owner verification count for sidebar badge
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);
  useEffect(() => {
    if (role !== 'ADMIN') return;
    supabase
      .from('court_owner_verifications')
      .select('id', { count: 'exact', head: true })
      .in('status', ['PENDING', 'UNDER_REVIEW', 'RESUBMISSION_REQUESTED'])
      .then(({ count }) => { if (count !== null) setPendingVerificationCount(count); });
  }, [role]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;

      // Update isScrolled
      setIsScrolled(currentScrollY > 50);

      // Smart Header: Hide on scroll down, show on scroll up
      if (currentScrollY > 200) { // Don't hide immediately at the top
        if (currentScrollY > lastScrollY.current + 10) { // Use a threshold of 10px to avoid micro-jitters
          setIsVisible(false);
        } else if (currentScrollY < lastScrollY.current - 10) {
          setIsVisible(true);
        }
      } else {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const headerActive = isScrolled || !isHomePage;

  const onLogoutClick = async () => {
    setIsMobileMenuOpen(false);
    await handleLogout();
    window.location.href = '/login';
  };

  const toggleNotifications = () => {
    if (isNotificationsOpen) {
      // Mark as read when closing
      handleMarkNotificationsRead();
    }
    setIsNotificationsOpen(prev => !prev);
  };

  const markNotificationRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(notification => (
      notification.id === notificationId
        ? { ...notification, isRead: true }
        : notification
    )));

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    const invitationTypes = ['player_invitation', 'invitation_accepted', 'invitation_declined'];
    const squadTypes = ['squad_join_request', 'squad_member_joined', 'squad_member_left', 'squad_event_created', 'squad_message'];

    if (notification.type === 'FOLLOW' && notification.actor?.id) {
      navigate(`/profile/${notification.actor.id}`);
    } else if (invitationTypes.includes(notification.type as string)) {
      navigate('/my-bookings?tab=invitations');
    } else if (squadTypes.includes(notification.type as string) && notification.action_url) {
      navigate(notification.action_url);
    } else if (notification.type === 'BOOKING' && notification.bookingId) {
      if (role === 'COURT_OWNER' || role === 'ADMIN') {
        navigate('/bookings-admin');
      } else {
        navigate('/my-bookings');
      }
    } else if (notification.type === 'ACHIEVEMENT') {
      navigate('/achievements');
    } else if (notification.action_url) {
      navigate(notification.action_url);
    }
    setIsNotificationsOpen(false);
    markNotificationRead(notification.id);
  };

  const handleNotificationAction = async (notification: Notification, action: 'approve' | 'view' | 'dismiss') => {
    if (action === 'dismiss') {
      await markNotificationRead(notification.id);
      return;
    }

    if (action === 'view') {
      if (notification.action_url) {
        navigate(notification.action_url);
      }
      setIsNotificationsOpen(false);
      await markNotificationRead(notification.id);
      return;
    }

    const assignmentId = notification.metadata?.assignmentId as string | undefined;
    if (!assignmentId) return;

    setNotificationActionKey(`${notification.id}:approve`);
    try {
      await approveCourtManager(assignmentId);
      await markNotificationRead(notification.id);
      if (notification.action_url) {
        navigate(notification.action_url);
      } else {
        navigate('/locations');
      }
      setIsNotificationsOpen(false);
    } catch (error: any) {
      console.error('Failed to approve court manager from notification:', error);
      alert(error.message || 'Failed to approve court manager.');
    } finally {
      setNotificationActionKey(null);
    }
  };

  const getThemeColor = () => {
    // Unify all professional roles to use a consistent blue/lime theme
    if (role === 'COACH') return 'blue';
    if (role === 'COURT_OWNER') return 'blue';
    if (role === 'ADMIN') return 'blue';
    return 'blue';
  };
  const themeColor = getThemeColor();
  const isCourtOwnerShell = role === 'COURT_OWNER';
  const isCourtOwnerManagementRoute = isCourtOwnerShell && (
    location.pathname === '/dashboard' ||
    location.pathname === '/locations' ||
    location.pathname.startsWith('/locations/') ||
    location.pathname === '/bookings-admin' ||
    location.pathname === '/court-calendar' ||
    location.pathname === '/tournaments-admin' ||
    location.pathname.startsWith('/tournaments-admin/') ||
    location.pathname === '/revenue' ||
    location.pathname === '/transactions' ||
    location.pathname === '/court-pricing' ||
    location.pathname === '/court-policies'
  );
  const shellBackgroundColor = isCourtOwnerShell ? '#F4F8EC' : '#EBEBE6';
  const sidebarBackgroundColor = isCourtOwnerShell ? '#0B5D3B' : '#1E40AF';
  const roleDropdownBackgroundColor = isCourtOwnerShell ? '#397C61' : '#2563EB';
  const mainBackgroundColor = isAuthPage ? '#1E40AF' : shellBackgroundColor;

  // Distinguish maintenance bypass (account-level admin) from feature bypass (role-based)
  const isAdminForMaintenance = isActualAdmin || localStorage.getItem('is_actual_admin') === 'true';
  // Bypass features for actual admins even when they've switched to a non-admin role
  const isAdminForFeatures = role === 'ADMIN' || isActualAdmin;

  // Helper: check if a feature is accessible for the current user.
  const feat = (feature: string): boolean => {
    if (isAdminForFeatures) return true;
    if (!featuresLoaded) return true;
    const allowed = isFeatureEnabled(enabledFeatures, feature, role);
    // console.log(`[feat] ${feature} → ${allowed ? 'ALLOW' : 'DENY'} (role=${role}, enabledFeatures=[${[...enabledFeatures].join(',')}])`);
    return allowed;
  };

  // ── Feature Access Enforcement ──
  useEffect(() => {
    if (isAdminForFeatures || role === 'guest') return;
    if (!featuresLoaded) return;
    const PATH_FEATURE_MAP: Record<string, string> = {
      '/booking': 'booking', '/my-bookings': 'booking', '/court/': 'booking',
      '/messages': 'messages', '/tournaments': 'tournaments', '/guides': 'guides',
      '/teams': 'teams', '/partners': 'partners', '/coaches': 'coaches',
      '/community': 'community', '/dashboard': 'dashboard', '/news': 'news',
      '/shop': 'shop', '/profile': 'profile', '/rankings': 'rankings',
      '/academy': 'academy', '/students': 'students', '/clinics': 'clinics',
      '/court-manager/bookings': 'bookings-admin',
      '/court-manager/schedule': 'court-calendar',
      '/court-manager/assigned-court': 'locations',
      '/court-manager': 'locations',
      '/schedule': 'schedule', '/locations': 'locations',
      '/bookings-admin': 'bookings-admin', '/court-calendar': 'court-calendar',
      '/tournaments-admin': 'tournaments-admin', '/revenue': 'revenue',
      '/court-policies': 'court-policies',
      '/transactions': 'transactions',
      '/court-pricing': 'court-pricing',
    };
    const currentPath = location.pathname;
    const matchedFeature = Object.entries(PATH_FEATURE_MAP).find(([path]) =>
      currentPath === path || currentPath.startsWith(path + '/')
    )?.[1];
    // console.log('[FeatureGate] check', { role, currentPath, matchedFeature, enabledFeatures: [...enabledFeatures] });
    if (matchedFeature && !enabledFeatures.has(matchedFeature)) {
      // console.warn('[FeatureGate] BLOCK', { role, currentPath, matchedFeature, enabledFeatures: [...enabledFeatures] });
      // Route-level <FeatureUnavailable /> handles the blocked UI — no redirect needed.
    }
  }, [enabledFeatures, location.pathname, role, featuresLoaded, isAdminForFeatures]);

  const isSimulating = (role === 'COACH' || role === 'COURT_OWNER') && authorizedProRoles.length === 0;
  const canSwitchRole = authorizedProRoles.length > 0 || isSimulating;


  // ── RENDER-TIME LOGGING ──
  // console.log('[NavigationHandler RENDER]', { role, featuresLoaded, maintenanceChecked, enabledFeaturesArray: [...enabledFeatures], pathname: location.pathname });

  // ── Block render until maintenance checked AND features loaded ──
  if (role !== 'guest' && !isAuthPage) {
    if (!maintenanceChecked || !featuresLoaded) {
      return <div className="min-h-screen bg-slate-950" />;
    }
  }

  // ── Maintenance gate ──
  if (isMaintenanceMode && !isAdminForMaintenance && role !== 'guest' && !isAuthPage) {
    return <MaintenanceScreen message={maintenanceMessage} onLogout={onLogoutClick} />;
  }

  return (
    <div
      className="min-h-screen h-full w-full flex flex-col md:flex-row relative text-slate-900 overflow-hidden"
      data-role-shell={isCourtOwnerShell ? 'court-owner' : 'default'}
      style={{ backgroundColor: shellBackgroundColor }}
    >
      {role !== 'guest' && !isAuthPage && !isPosterPage && (
        <aside
          className={`hidden md:flex flex-col sticky top-0 h-screen shadow-xl transition-all duration-300 ease-in-out relative ${isSidebarCollapsed ? 'w-20' : 'w-72'} z-[60] animate-slide-in-left`}
          style={{ backgroundColor: sidebarBackgroundColor }}
        >
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-5 h-10 bg-white hover:bg-white/90 text-slate-700 rounded-full flex items-center justify-center shadow-md transition-colors duration-150 cursor-pointer"
          >
            {isSidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>

          <div className={`${isSidebarCollapsed ? 'p-4' : 'p-8'} flex items-center mb-4 ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`} style={{ transition: 'padding 200ms ease-in-out' }}>
            <Link to="/" className="flex items-center gap-3 font-black text-xl tracking-tighter shrink-0">
              <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className={`${isSidebarCollapsed ? 'w-12 h-12' : 'w-20 h-20'} object-contain rounded-xl`} style={{ transition: 'width 200ms ease-in-out, height 200ms ease-in-out' }} />
              {!isSidebarCollapsed && (
                <span className="text-white font-black leading-none animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="block">PICKLEPLAY</span>
                  <span>PHILIPPINES</span>
                </span>
              )}
            </Link>
          </div>

          <nav className="flex-1 min-h-0 px-4 py-2 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-hide">
            {role !== 'PLAYER' && feat('dashboard') && (
              <NavItem to={role === 'COURT_MANAGER' ? COURT_MANAGER_ROUTES.overview : '/dashboard'} icon={<LayoutDashboard size={22} />} label="Overview" isCollapsed={isSidebarCollapsed} themeColor={themeColor} ownerVariant={role === 'COURT_OWNER'} showCollapsedActiveAccent={role === 'COURT_MANAGER'} />
            )}
            {role === 'ADMIN' && (
              <div className="relative space-y-1.5">
                <NavItem to="/admin" icon={<ShieldCheck size={22} />} label="Admin Console" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                {pendingCount > 0 && <span className={`absolute ${isSidebarCollapsed ? 'top-1 right-2' : 'top-3 right-4'} w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse`}>{pendingCount}</span>}
                <NavItem to="/admin/verifications" icon={<ClipboardCheck size={22} />} label="Court Owner Apps" isCollapsed={isSidebarCollapsed} themeColor={themeColor} badge={pendingVerificationCount || undefined} />
                <NavItem to="/teams" icon={<UsersRound size={22} />} label="Manage Squads" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                <NavItem to="/achievements-admin" icon={<Medal size={22} />} label="Manage Achievements" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                <NavItem to="/achievements" icon={<Trophy size={22} />} label="Achievements" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
              </div>
            )}
            {role === 'PLAYER' && (
              <>
                {/* ── PRIMARY FEATURE: Book Courts ── */}
                {feat('booking') && (isSidebarCollapsed ? (
                  <Link to="/booking" className="flex justify-center items-center p-3 rounded-2xl bg-lime-400/20 hover:bg-lime-400/30 text-lime-300 transition-all duration-300 group">
                    <div className="transition-transform duration-300 group-hover:scale-110">
                      <Calendar size={24} />
                    </div>
                  </Link>
                ) : (
                  <Link
                    to="/booking"
                    className={`block rounded-2xl transition-all duration-300 group ${location.pathname === '/booking'
                      ? 'bg-lime-400 shadow-[0_8px_32px_-4px_rgba(163,230,53,0.55)]'
                      : 'bg-gradient-to-br from-lime-400/90 to-lime-500/80 hover:from-lime-400 hover:to-lime-500 shadow-[0_6px_24px_-4px_rgba(163,230,53,0.4)] hover:shadow-[0_8px_32px_-4px_rgba(163,230,53,0.55)]'
                      } active:scale-95`}
                  >
                    <div className="flex items-center gap-3.5 px-5 py-4">
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-white/25 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                        <Calendar size={22} className="text-slate-900" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[14px] uppercase tracking-widest text-slate-900 group-hover:text-white leading-none transition-colors duration-300">Book Courts</p>
                        <p className="text-[10px] font-semibold text-slate-700/80 group-hover:text-white/80 mt-0.5 transition-colors duration-300">Reserve your court now</p>
                      </div>
                      <ArrowRight size={16} className="text-slate-900/60 group-hover:text-white/80 shrink-0 transition-all duration-300 group-hover:translate-x-1" />
                    </div>
                  </Link>
                ))}
                {feat('messages') && <NavItem to="/messages" icon={<MessageCircle size={22} />} label="Messages" isCollapsed={isSidebarCollapsed} themeColor={themeColor} badge={unreadMessagesCount || undefined} />}
                {feat('dashboard') && <NavItem to={role === 'COURT_MANAGER' ? COURT_MANAGER_ROUTES.overview : '/dashboard'} icon={<LayoutDashboard size={22} />} label="Overview" isCollapsed={isSidebarCollapsed} themeColor={themeColor} showCollapsedActiveAccent={role === 'COURT_MANAGER'} />}

                {/* Others group (collapsible) */}
                <div className={`pt-4 mt-4 border-t border-white/20 ${isSidebarCollapsed ? 'mx-auto w-8' : ''}`}>
                  <div className={`${isSidebarCollapsed ? '' : 'rounded-2xl transition-colors'} ${isOthersOpen && !isSidebarCollapsed ? 'bg-white/5' : ''}`}>
                    <button
                      onClick={() => setIsOthersOpen(v => !v)}
                      className={`w-full flex items-center justify-between ${isSidebarCollapsed ? 'hidden' : 'px-4'} py-2 text-[11px] font-black uppercase tracking-widest ${isOthersOpen ? 'text-white/95' : 'text-white/80 hover:text-white'}`}
                      aria-expanded={isOthersOpen}
                      aria-controls="others-group"
                    >
                      <span>Others</span>
                      <ChevronDown size={14} className={`transition-transform duration-300 ${isOthersOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOthersOpen && (
                      <div id="others-group" className="mt-2 space-y-2 pl-2">
                        {feat('community') && <NavItem to="/community" icon={<Globe size={22} />} label="Community Hub" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}
                        {feat('partners') && <NavItem to="/partners" icon={<Users size={22} />} label="Find Partners" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}
                        {feat('coaches') && <NavItem to="/coaches" icon={<GraduationCap size={22} />} label="Find a Coach" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}
                        {feat('community') && <NavItem to="/groups" icon={<UsersRound size={22} />} label="Find Groups" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}
                      </div>
                    )}
                  </div>
                </div>
                {/* ── COMPETE section (collapsible) ── */}
                <div className={`pt-2 ${isSidebarCollapsed ? 'mx-auto w-8' : ''}`}>
                  <div className={`${isSidebarCollapsed ? '' : 'rounded-2xl transition-colors'} ${isCompeteOpen && !isSidebarCollapsed ? 'bg-white/5' : ''}`}>
                    <button
                      onClick={() => setIsCompeteOpen(v => !v)}
                      className={`w-full flex items-center justify-between ${isSidebarCollapsed ? 'hidden' : 'px-4'} py-2 text-[12px] font-black uppercase tracking-[0.22em] ${isCompeteOpen ? 'text-white/80' : 'text-white/40 hover:text-white/80'}`}
                      aria-expanded={isCompeteOpen}
                      aria-controls="compete-group"
                    >
                      <span>Compete</span>
                      <ChevronDown size={14} className={`transition-transform duration-300 ${isCompeteOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {(isCompeteOpen || isSidebarCollapsed) && (
                      <div id="compete-group" className={`${!isSidebarCollapsed ? 'mt-1 space-y-1 pl-2' : 'space-y-1'}`}>
                        {feat('tournaments') && <NavItem to="/tournaments" icon={<Trophy size={22} />} label="Tournaments" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}
                        {feat('teams') && <NavItem to="/teams" icon={<UsersRound size={22} />} label="Squads" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}
                        {feat('achievements') && <NavItem to="/achievements" icon={<Trophy size={22} />} label="Achievements" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}
                        {feat('guides') && <NavItem to="/guides" icon={<BookOpen size={22} />} label="Guides & Quizzes" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            {role === 'COACH' && (
              <>
                <NavItem to="/students" icon={<GraduationCap size={22} />} label="My Students" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                <NavItem to="/clinics" icon={<Trophy size={22} />} label="Manage Clinics" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                <NavItem to="/schedule" icon={<Calendar size={22} />} label="Lesson Schedule" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
              </>
            )}
            {role === 'COURT_OWNER' && (
              <>
                <NavItem to="/locations" icon={<MapPin size={22} />} label="My Courts" isCollapsed={isSidebarCollapsed} themeColor={themeColor} ownerVariant={true} />
                <NavItem to="/bookings-admin" icon={<Calendar size={22} />} label="Court Bookings" isCollapsed={isSidebarCollapsed} themeColor={themeColor} ownerVariant={true} />
                <NavItem to="/court-calendar" icon={<CalendarIcon size={22} />} label="Court Events" isCollapsed={isSidebarCollapsed} themeColor={themeColor} ownerVariant={true} />
                <NavItem to="/tournaments-admin" icon={<Trophy size={22} />} label="Manage Tournaments" isCollapsed={isSidebarCollapsed} themeColor={themeColor} ownerVariant={true} />
                <NavItem to="/revenue" icon={<BarChart3 size={22} />} label="Revenue Analytics" isCollapsed={isSidebarCollapsed} themeColor={themeColor} ownerVariant={true} />
                <NavItem to="/transactions" icon={<CreditCard size={22} />} label="Transactions" isCollapsed={isSidebarCollapsed} themeColor={themeColor} ownerVariant={true} />
                <NavItem to="/court-pricing" icon={<PhilippinePeso size={22} />} label="Court Pricing" isCollapsed={isSidebarCollapsed} themeColor={themeColor} ownerVariant={true} />
              </>
            )}
            {role === 'COURT_MANAGER' && (
              <>
                <NavItem to={COURT_MANAGER_ROUTES.assignedCourt} icon={<MapPin size={22} />} label="Assigned Court" isCollapsed={isSidebarCollapsed} themeColor={themeColor} showCollapsedActiveAccent={true} />
                <NavItem to={COURT_MANAGER_ROUTES.bookings} icon={<Calendar size={22} />} label="Court Bookings" isCollapsed={isSidebarCollapsed} themeColor={themeColor} showCollapsedActiveAccent={true} />
                <NavItem to={COURT_MANAGER_ROUTES.schedule} icon={<CalendarIcon size={22} />} label="Court Schedule" isCollapsed={isSidebarCollapsed} themeColor={themeColor} showCollapsedActiveAccent={true} />
              </>
            )}
            {feat('news') && <NavItem to="/news" icon={<Newspaper size={22} />} label="Newsfeed" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}
            <div className={`pt-4 mt-4 border-t border-white/20 ${isSidebarCollapsed ? 'mx-auto w-8' : ''}`}>
              <p className={`text-[11px] font-black uppercase tracking-widest px-4 mb-2 ${isSidebarCollapsed ? 'hidden' : 'block'} text-white/85`}>Marketplace</p>
              <NavItem to="/shop" icon={<ShoppingBag size={22} />} label="Pro Shop" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
            </div>
          </nav>

          <div className={`relative border-t border-white/20 space-y-3 ${role === 'COURT_MANAGER' ? 'shrink-0 overflow-visible p-3 md:p-4' : 'p-4'}`} style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            {canSwitchRole && !isSidebarCollapsed && (
              <div className="relative">
                {/* 2 roles: Simple toggle button */}
                {authorizedProRoles.length === 1 && (
                  <button onClick={async () => {
                    const nextRole: UserRole = role === 'PLAYER' ? authorizedProRoles[0] : 'PLAYER';
                    await handleRoleSwitch(nextRole);
                    // Navigation is handled via state change/Navigate in Routes or explicitly here
                    if (nextRole === 'PLAYER') navigate(isSoftLaunchMode ? '/' : '/booking');
                    else navigate('/dashboard');
                  }} className="w-full p-4 rounded-2xl flex items-center justify-between transition-all group border bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-lime-400 text-slate-950 shadow-lg shadow-lime-900/20">
                        <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">
                          {isSimulating ? 'Simulation Active' : (role === 'PLAYER' ? 'Pro Mode' : `${role.replace('_', ' ')} Mode`)}
                        </p>
                        <p className="text-[9px] font-bold text-blue-200 uppercase tracking-widest mt-1">
                          Switch to {role === 'PLAYER' ? authorizedProRoles[0].replace('_', ' ') : 'Player'}
                        </p>
                      </div>
                    </div>
                  </button>
                )}

                {/* 3+ roles: Dropdown selector */}
                {authorizedProRoles.length >= 2 && (
                  <>
                    <button
                      onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                      className="w-full p-4 rounded-2xl flex items-center justify-between transition-all group border bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-lime-400 text-slate-950 shadow-lg shadow-lime-900/20">
                          <RefreshCw size={22} className={`transition-transform duration-500 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] font-black uppercase tracking-widest leading-none">
                            {isSimulating ? 'Simulation Active' : (role === 'PLAYER' ? 'Player Mode' : `${role.replace('_', ' ')} Mode`)}
                          </p>
                          <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-1.5">
                            Switch Role
                          </p>
                        </div>
                      </div>
                      <ChevronDown size={18} className={`text-white/60 transition-transform duration-300 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isRoleDropdownOpen && (
                      <div
                        className="absolute bottom-full left-0 right-0 mb-3 border border-white/20 rounded-[28px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-200 z-50"
                        style={{ backgroundColor: roleDropdownBackgroundColor }}
                      >
                        <div className="p-2.5 space-y-1">
                          {/* Player option */}
                          <button
                            onClick={async () => {
                              await handleRoleSwitch('PLAYER');
                              setIsRoleDropdownOpen(false);
                              navigate(isSoftLaunchMode ? '/' : '/booking');
                            }}
                            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left ${role === 'PLAYER'
                              ? 'bg-lime-400 text-slate-900'
                              : 'text-white hover:bg-white/10 hover:text-white'
                              }`}
                          >
                            <User size={20} className={role === 'PLAYER' ? 'text-slate-900' : 'text-white/40'} />
                            <span className="text-[11px] font-black uppercase tracking-widest">Player</span>
                            {role === 'PLAYER' && <div className="ml-auto w-2 h-2 rounded-full bg-slate-900" />}
                          </button>

                          {/* Pro role options */}
                          {authorizedProRoles.map((proRole) => (
                            <button
                              key={proRole}
                              onClick={async () => {
                                await handleRoleSwitch(proRole);
                                setIsRoleDropdownOpen(false);
                                navigate('/dashboard');
                              }}
                              className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left ${role === proRole
                                ? 'bg-lime-400 text-slate-900'
                                : 'text-white hover:bg-white/10 hover:text-white'
                                }`}
                            >
                              {proRole === 'COACH' ?
                                <GraduationCap size={20} className={role === proRole ? 'text-slate-900' : 'text-white/40'} /> :
                                <Building2 size={20} className={role === proRole ? 'text-slate-900' : 'text-white/40'} />
                              }
                              <span className="text-[11px] font-black uppercase tracking-widest">{proRole.replace('_', ' ')}</span>
                              {role === proRole && <div className="ml-auto w-2 h-2 rounded-full bg-slate-900" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Fallback for simulation mode when no authorized roles */}
                {authorizedProRoles.length === 0 && isSimulating && (
                  <button onClick={async () => {
                    const nextRole: UserRole = role === 'PLAYER' ? 'COACH' : 'PLAYER';
                    await handleRoleSwitch(nextRole);
                    if (nextRole === 'PLAYER') navigate(isSoftLaunchMode ? '/' : '/booking');
                    else navigate('/dashboard');
                  }} className="w-full p-4 rounded-2xl flex items-center justify-between transition-all group border bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-lime-400 text-slate-950 shadow-lg shadow-lime-900/20">
                        <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Simulation Active</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Switch Role</p>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            )}

            {isSidebarCollapsed && role === 'COURT_MANAGER' && (
              <div className="flex justify-center">
                <div
                  title="Court Manager Mode"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-lime-300/30 bg-lime-400/15 text-lime-200 shadow-[0_10px_24px_-16px_rgba(163,230,53,0.85)]"
                >
                  <Building2 size={18} />
                </div>
              </div>
            )}

            <div className={`flex items-center gap-2 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
              <Link to="/profile" title={isSidebarCollapsed ? "Profile Settings" : ""} className={`flex-1 min-w-0 flex items-center gap-3 w-full p-2 transition-all duration-300 group ${isSidebarCollapsed ? `${role === 'COURT_MANAGER' ? 'justify-center rounded-2xl bg-white/10 hover:bg-white/20' : 'justify-center'}` : "rounded-2xl bg-white/10 hover:bg-white/20 pr-4"}`}>
                <div className={`relative shrink-0 rounded-full p-0.5`}>
                  <img
                    src={userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName || role}`}
                    alt="User"
                    className="w-10 h-10 rounded-full bg-white border-2 border-white"
                  />
                </div>
                {!isSidebarCollapsed && (
                  <div className="overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300 flex-1">
                    <div className="flex items-center gap-2 justify-between">
                      <p className="text-sm font-black truncate leading-none capitalize text-white">{userName || role.replace('_', ' ').toLowerCase()}</p>
                      {role === 'PLAYER' && (
                        <div className="flex items-center gap-1.5 bg-lime-500/30 px-3 py-1 rounded-full shrink-0 border border-lime-400/30">
                          <Sparkles size={14} className="text-lime-300" fill="currentColor" />
                          <span className="text-xs font-black text-lime-100">{userPoints}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-white/60 uppercase font-black tracking-widest mt-1 leading-none">{role}</p>
                  </div>
                )}
              </Link>
              {(!isSidebarCollapsed || role === 'COURT_MANAGER') && (
                <button
                  onClick={toggleNotifications}
                  title={isSidebarCollapsed ? 'Notifications' : ''}
                  className={`relative transition-all duration-300 ${isSidebarCollapsed
                    ? `${isNotificationsOpen ? 'bg-white text-blue-600 shadow-xl' : 'bg-white/10 text-white/85 hover:bg-white/20 hover:text-white'} w-full rounded-2xl p-3 flex items-center justify-center`
                    : `${isNotificationsOpen ? 'bg-white text-blue-600 shadow-xl scale-110' : 'text-white/80 hover:bg-white/10 hover:text-white'} p-3 rounded-full`
                    }`}
                >
                  <Bell size={20} />
                  {hasUnreadNotifications && (
                    <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center animate-bounce shadow-lg">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </div>
                  )}
                </button>
              )}
            </div>
            {isNotificationsOpen && <NotificationPanel notifications={notifications} onClose={() => {
              setIsNotificationsOpen(false);
              handleMarkNotificationsRead();
            }} onNotificationClick={handleNotificationClick} onNotificationAction={handleNotificationAction} activeActionKey={notificationActionKey} />}

            <button onClick={onLogoutClick} className={`w-full min-h-[48px] flex items-center gap-3 py-3.5 rounded-2xl transition-all text-sm font-black uppercase tracking-widest ${isSidebarCollapsed ? 'justify-center' : 'px-6'} text-white/70 hover:text-white hover:bg-white/10`} title={isSidebarCollapsed ? "Logout" : ""}>
              <LogOut size={20} className="shrink-0" />
              {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">Log Out</span>}
            </button>

          </div>
        </aside>
      )}

      {/* Mobile Top Header */}
      {!isAuthPage && !isPosterPage && (
        <header className={`md:hidden fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-50 transition-all duration-500 ease-in-out ${headerActive || role !== 'guest' ? 'bg-white/20 backdrop-blur-xl border-b border-white/20 shadow-lg' : 'bg-transparent'} ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
          <Link to="/" className={`flex items-center gap-2 font-black text-xl tracking-tighter ${headerActive || role !== 'guest' ? 'text-slate-900' : 'text-white'}`}>
            <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="w-8 h-8 object-contain rounded-lg" />
          </Link>
          <div className="flex items-center gap-4">
            {role === 'guest' ? (
              <>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`p-2 rounded-xl transition-all ${headerActive ? 'text-slate-600 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}>
                  {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </>
            ) : (
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}
          </div>
        </header>
      )}

      {/* Guest Mobile Menu Overlay */}
      {isMobileMenuOpen && role === 'guest' && (
        <div className="md:hidden fixed inset-0 z-[110] bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900 tracking-tighter uppercase">Menu</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl"><X size={22} /></button>
            </div>
            <nav className="flex flex-col gap-1 p-4 flex-1">
              <Link to="/academy" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all font-bold text-sm uppercase tracking-wider">
                <BookOpen size={20} />
                Play Guide
              </Link>
              <Link to="/shop" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all font-bold text-sm uppercase tracking-wider">
                <ShoppingBag size={20} />
                Pro Shop
              </Link>
              <Link to="/news" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all font-bold text-sm uppercase tracking-wider">
                <Newspaper size={20} />
                News
              </Link>
            </nav>
            <div className="p-4 border-t border-slate-100">
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl bg-blue-600 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all">
                Let's Pickle
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar/Menu Overlay */}
      {isMobileMenuOpen && role !== 'guest' && (
        <div className="md:hidden fixed inset-0 z-[110] bg-slate-950/20 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl animate-in slide-in-from-right duration-500 p-8 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Menu</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-900"><X size={24} /></button>
            </div>
            <nav className="flex-1 space-y-2 overflow-y-auto scrollbar-hide py-2">
              {role !== 'PLAYER' && (
                <NavItem to={role === 'COURT_MANAGER' ? COURT_MANAGER_ROUTES.overview : '/dashboard'} icon={<LayoutDashboard size={22} />} label="Overview" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
              )}
              {role === 'ADMIN' && <NavItem to="/admin" icon={<ShieldCheck size={22} />} label="Admin Console" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />}
              {role === 'ADMIN' && <NavItem to="/admin/verifications" icon={<ClipboardCheck size={22} />} label="Court Owner Apps" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} badge={pendingVerificationCount || undefined} />}
              {role === 'ADMIN' && <NavItem to="/achievements-admin" icon={<Medal size={22} />} label="Manage Achievements" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />}
              {role === 'ADMIN' && <NavItem to="/achievements" icon={<Trophy size={22} />} label="Achievements" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />}
              {role === 'PLAYER' && (
                <>
                  {feat('booking') && <NavItem to="/booking" icon={<Calendar size={22} />} label="Book Courts" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />}
                  {feat('messages') && <NavItem to="/messages" icon={<MessageCircle size={22} />} label="Messages" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />}
                  {feat('tournaments') && <NavItem to="/tournaments" icon={<Trophy size={22} />} label="Tournaments" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />}
                  <NavItem to="/guides" icon={<BookOpen size={22} />} label="Guides & Quizzes" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                  <NavItem to="/teams" icon={<UsersRound size={22} />} label="Squads" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                  <NavItem to="/achievements" icon={<Trophy size={22} />} label="Achievements" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                  <NavItem to={role === 'COURT_MANAGER' ? COURT_MANAGER_ROUTES.overview : '/dashboard'} icon={<LayoutDashboard size={22} />} label="Overview" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                  <NavItem to="/others" icon={<MoreHorizontal size={22} />} label="Others" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                  <NavItem to="/groups" icon={<UsersRound size={22} />} label="Find Groups" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                </>
              )}
              {role === 'COACH' && (
                <>
                  <NavItem to="/students" icon={<GraduationCap size={22} />} label="My Students" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                  <NavItem to="/clinics" icon={<Trophy size={22} />} label="Manage Clinics" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                  <NavItem to="/schedule" icon={<Calendar size={22} />} label="Lesson Schedule" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                </>
              )}
              {role === 'COURT_OWNER' && (
                <>
                  <NavItem to="/locations" icon={<MapPin size={22} />} label="My Courts" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                  <NavItem to="/bookings-admin" icon={<Calendar size={22} />} label="Court Bookings" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                  <NavItem to="/court-calendar" icon={<CalendarIcon size={22} />} label="Court Events" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                  <NavItem to="/tournaments-admin" icon={<Trophy size={22} />} label="Manage Tournaments" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                  <NavItem to="/revenue" icon={<BarChart3 size={22} />} label="Revenue Analytics" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                  <NavItem to="/transactions" icon={<CreditCard size={22} />} label="Transactions" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                  <NavItem to="/court-pricing" icon={<PhilippinePeso size={22} />} label="Court Pricing" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                </>
              )}
              {role === 'COURT_MANAGER' && (
                <>
                  <NavItem to={COURT_MANAGER_ROUTES.assignedCourt} icon={<MapPin size={22} />} label="Assigned Court" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                  <NavItem to={COURT_MANAGER_ROUTES.bookings} icon={<Calendar size={22} />} label="Court Bookings" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                  <NavItem to={COURT_MANAGER_ROUTES.schedule} icon={<CalendarIcon size={22} />} label="Court Schedule" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
                </>
              )}
              <NavItem to="/news" icon={<Newspaper size={22} />} label="News" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />
              <div className="border-t border-slate-100 my-4" />
              {feat('shop') && <NavItem to="/shop" icon={<ShoppingBag size={22} />} label="Pro Shop" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />}
              {feat('profile') && <NavItem to="/profile" icon={<User size={22} />} label="Profile" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} isMobile={true} />}
            </nav>
            <button onClick={onLogoutClick} className="mt-auto flex items-center gap-3 py-6 text-rose-600 hover:text-rose-700 transition-colors font-black uppercase text-xs tracking-widest border-t border-slate-50 -mx-8 px-8 shadow-[0_-1px_0_rgba(0,0,0,0.05)]">
              <LogOut size={20} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Guest Desktop Header */}
      {role === 'guest' && !isAuthPage && (
        <header className={`hidden md:flex fixed top-0 left-0 right-0 h-20 z-50 transition-all duration-500 ease-in-out items-center px-6 md:px-12 lg:px-24 justify-between animate-fade-in opacity-0 ${headerActive ? 'bg-white/20 backdrop-blur-xl shadow-lg border-b border-white/10' : 'bg-white/10 backdrop-blur-md border-b border-white/20'} ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
          <Link to="/" className={`flex items-center gap-2 font-black text-2xl tracking-tighter transition-colors ${headerActive ? 'text-slate-950' : 'text-white'}`}>
            <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="w-14 h-14 object-contain rounded-xl" />
          </Link>
          <nav className={`hidden md:flex items-center gap-8 font-black text-sm uppercase tracking-[0.2em] transition-colors ${headerActive ? 'text-slate-600' : 'text-white/80'}`}>
            <Link to="/academy" className={`transition-colors ${headerActive ? 'hover:text-lime-400' : 'hover:text-white'}`}>PLAY GUIDE</Link>
            <Link to="/shop" className={`transition-colors ${headerActive ? 'hover:text-lime-400' : 'hover:text-white'}`}>PRO SHOP</Link>
            <Link to="/news" className={`transition-colors ${headerActive ? 'hover:text-lime-400' : 'hover:text-white'}`}>NEWS</Link>
            <Link to="/login" className={`px-8 py-3.5 rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-2 font-black bg-blue-600 text-white shadow-blue-900/20`}>LET'S PICKLE</Link>
          </nav>
        </header>
      )}

      <main
        ref={scrollContainerRef}
        className={`flex-1 flex flex-col h-screen overflow-y-auto relative scroll-smooth transition-all ${role !== 'guest' && !isAuthPage ? 'pt-16 md:pt-0' : ''}`}
        data-page-theme={isCourtOwnerManagementRoute ? 'court-owner' : 'default'}
        style={{ backgroundColor: mainBackgroundColor }}
      >
        <div className={`${role === 'guest' || isAuthPage
          ? (location.pathname.startsWith('/court/') ? 'pt-20 md:pt-28 lg:pt-32 px-4 md:px-8 lg:px-14 max-w-[1920px] mx-auto w-full' : '')
          : (
            location.pathname.startsWith('/tournaments-admin/manage/') ||
              location.pathname.startsWith('/tournaments/') ||
              location.pathname.startsWith('/community/groups/') ||
              (location.pathname.startsWith('/teams/') && location.pathname !== '/teams') ||
              location.pathname === '/terms' ||
              location.pathname === '/policy' ||
              location.pathname === '/messages' ||
              location.pathname.startsWith('/groups')
              ? '' // full-bleed — these pages manage their own layout
              : 'p-4 md:p-8 lg:p-14 max-w-[1920px] mx-auto w-full'
          )
          } transition-colors duration-300`}>
          <div key={location.pathname} className={isAuthPage ? "" : "animate-route-transition"}>
            <Routes location={location}>
              <Route path="/" element={
                // Safety net: check if a password recovery is pending in sessionStorage.
                // This prevents a dashboard flash when the recovery flag is set but AuthCallback
                // hasn't had a chance to redirect yet. (Cleanup happens in UpdatePassword.tsx)
                sessionStorage.getItem('password_recovery_pending') === 'true'
                  ? <Navigate to="/update-password" replace />
                  // Check for password recovery flag in URL (hash or search)
                  : (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery'))
                    ? <Navigate to="/update-password" replace />
                    : isTwoFactorPending
                      ? <Navigate to="/verify-2fa" replace />
                      : role === 'guest'
                        ? <Home />
                        : role === 'PLAYER'
                          ? (isSoftLaunchMode ? <SoftLaunchWelcome userName={userName || undefined} /> : <Navigate to="/booking" replace />)
                          : role === 'ADMIN'
                            ? <Navigate to="/admin" replace />
                            : <Navigate to="/dashboard" replace />
              } />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/welcome" element={<SoftLaunchWelcome userName={userName || undefined} />} />
              <Route path="/verify-2fa" element={<TwoFactorVerify />} />
              <Route path="/auth/callback" element={
                // Render-time check (runs once, NOT doubled by StrictMode unlike useEffects).
                // If the HTML script in index.html captured 'type=recovery' from the URL hash
                // before Supabase cleared it, redirect immediately to update-password.
                sessionStorage.getItem('password_recovery_pending') === 'true'
                  ? <Navigate to="/update-password" replace />
                  : <AuthCallback />
              } />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/manager-invite" element={<ManagerInvitePage />} />
              <Route path="/shop" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('shop') ? <FeatureUnavailable featureName="shop" /> : <Shop cartItems={cartItems} onAddToCart={onAddToCart} onUpdateCartQuantity={onUpdateCartQuantity} onRemoveFromCart={onRemoveFromCart} />} />
              <Route path="/news" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('news') ? <FeatureUnavailable featureName="news" /> : role === 'guest' ? <div className="p-4 md:p-8 pt-20 md:pt-32 max-w-[1800px] mx-auto w-full"><News /></div> : <News />} />
              <Route path="/news/:slug" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('news') ? <FeatureUnavailable featureName="news" /> : role === 'guest' ? <div className="p-4 md:p-8 pt-20 md:pt-32 max-w-[1800px] mx-auto w-full"><News /></div> : <News />} />
              <Route path="/news/:legacyArticleId/:slug" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('news') ? <FeatureUnavailable featureName="news" /> : role === 'guest' ? <div className="p-4 md:p-8 pt-20 md:pt-32 max-w-[1800px] mx-auto w-full"><News /></div> : <News />} />
              <Route path="/academy" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('academy') ? <FeatureUnavailable featureName="academy" /> : <div className="p-4 md:p-8 pt-24 max-w-[1800px] mx-auto w-full"><Academy /></div>} />
              <Route path="/guides" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : <GuidesIndex isLoggedIn={role !== 'guest'} />} />
              <Route path="/guides/skill-rating" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('guides') ? <FeatureUnavailable featureName="guides" /> : <SkillRatingQuiz isLoggedIn={role !== 'guest'} />} />
              <Route path="/guides/:slug" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('guides') ? <FeatureUnavailable featureName="guides" /> : <GuideReader isLoggedIn={role !== 'guest'} />} />
              <Route path="/rankings" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('rankings') ? <FeatureUnavailable featureName="rankings" /> : <div className="p-4 md:p-8 pt-24 max-w-[1800px] mx-auto w-full"><Rankings /></div>} />
              <Route path="/dashboard" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('dashboard') ? <FeatureUnavailable featureName="dashboard" /> : role === 'COURT_MANAGER' ? <Navigate to={COURT_MANAGER_ROUTES.overview} replace /> : role !== 'guest' ? <Dashboard userRole={role} onSubmitApplication={onSubmitApplication} setRole={setRole} applications={applications} isSidebarCollapsed={isSidebarCollapsed} userName={userName} authorizedProRoles={authorizedProRoles} currentUserId={currentUserId} /> : <Navigate to="/" />} />
              <Route path="/faq" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : <FAQ />} />
              <Route path="/booking" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('booking') ? <FeatureUnavailable featureName="booking" /> : role === 'guest' ? <GuestBooking /> : <Booking />} />
              <Route path="/my-bookings" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('booking') ? <FeatureUnavailable featureName="booking" /> : role !== 'guest' ? <MyBookings /> : <Navigate to="/login" />} />
              <Route path="/court/:courtId" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('booking') ? <FeatureUnavailable featureName="booking" /> : <CourtDetail />} />
              <Route path="/tournaments" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('tournaments') ? <FeatureUnavailable featureName="tournaments" /> : <Tournaments userRole={role !== 'guest' ? role : undefined} />} />
              <Route path="/tournaments/:id" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('tournaments') ? <FeatureUnavailable featureName="tournaments" /> : <TournamentPage />} />
              <Route path="/coaches" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('coaches') ? <FeatureUnavailable featureName="coaches" /> : role !== 'guest' ? <Coaches currentUserId={currentUserId} /> : <Navigate to="/" />} />
              <Route path="/community" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('community') ? <FeatureUnavailable featureName="community" /> : role !== 'guest' ? <Community posts={posts} setPosts={setPosts} followedUsers={followedUsers} onFollow={handleFollow} /> : <Navigate to="/login" />} />
              <Route path="/groups" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('community') ? <FeatureUnavailable featureName="community" /> : role !== 'guest' ? <Groups /> : <Navigate to="/" />} />
              <Route path="/community/groups/:groupId" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('community') ? <FeatureUnavailable featureName="community" /> : role !== 'guest' ? <GroupDetail /> : <Navigate to="/" />} />
              <Route path="/community/groups/:groupId/manage" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('community') ? <FeatureUnavailable featureName="community" /> : role !== 'guest' ? <GroupManage /> : <Navigate to="/" />} />
              <Route path="/partners" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('partners') ? <FeatureUnavailable featureName="partners" /> : role !== 'guest' ? <FindPartners followedUsers={followedUsers} onFollow={handleFollow} /> : <Navigate to="/" />} />
              <Route path="/messages" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('messages') ? <FeatureUnavailable featureName="messages" /> : role !== 'guest' ? <DirectMessages onConversationRead={() => getTotalUnreadCount().then(setUnreadMessagesCount)} /> : <Navigate to="/" />} />
              <Route path="/others" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role !== 'guest' ? <Others /> : <Navigate to="/" />} />
              <Route path="/teams" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('teams') ? <FeatureUnavailable featureName="teams" /> : role !== 'guest' ? <SquadsList userRole={role} isSidebarCollapsed={isSidebarCollapsed} /> : <Navigate to={`/login?redirect=${encodeURIComponent('/teams')}`} replace />} />
              <Route path="/teams/:squadId" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('teams') ? <FeatureUnavailable featureName="teams" /> : role !== 'guest' ? <SquadDetail /> : <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />} />
              <Route path="/teams/:squadId/invite/:inviteCode" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('teams') ? <FeatureUnavailable featureName="teams" /> : role !== 'guest' ? <SquadDetail /> : <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />} />
              <Route path="/achievements" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role !== 'guest' ? <Achievements userRole={role} isSidebarCollapsed={isSidebarCollapsed} /> : <Navigate to="/" />} />
              <Route path="/profile" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('profile') ? <FeatureUnavailable featureName="profile" /> : role !== 'guest' ? <Profile userRole={role} authorizedProRoles={authorizedProRoles} currentUserId={currentUserId} followedUsers={followedUsers} onFollow={handleFollow} posts={posts} setPosts={setPosts} onRoleSwitch={handleRoleSwitch} /> : <Navigate to="/" />} />
              <Route path="/profile/:userId" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('profile') ? <FeatureUnavailable featureName="profile" /> : role !== 'guest' ? <Profile userRole={role} authorizedProRoles={authorizedProRoles} currentUserId={currentUserId} followedUsers={followedUsers} onFollow={handleFollow} posts={posts} setPosts={setPosts} onRoleSwitch={handleRoleSwitch} /> : <Navigate to="/" />} />

              {/* Specialized Coach Routes */}
              <Route path="/students" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role !== 'guest' ? <Students currentUserId={currentUserId} /> : <Navigate to="/login" />} />
              <Route path="/clinics" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role !== 'guest' ? <Clinics currentUserId={currentUserId} /> : <Navigate to="/login" />} />
              <Route path="/schedule" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role !== 'guest' ? <Schedule currentUserId={currentUserId} /> : <Navigate to="/login" />} />

              <Route path="/court-manager" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role !== 'guest' ? <CourtManagerLayout /> : <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />}>
                <Route index element={!feat('locations') ? <FeatureUnavailable featureName="locations" /> : <CourtManagerOverviewPage />} />
                <Route path="assigned-court" element={!feat('locations') ? <FeatureUnavailable featureName="locations" /> : <CourtManagerAssignedCourtPage />} />
                <Route path="bookings" element={!feat('bookings-admin') ? <FeatureUnavailable featureName="bookings-admin" /> : <CourtManagerBookingsPage />} />
                <Route path="schedule" element={!feat('court-calendar') ? <FeatureUnavailable featureName="court-calendar" /> : <CourtManagerSchedulePage />} />
              </Route>

              {/* Specialized Court Owner Routes */}
              <Route path="/locations" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('locations') ? <FeatureUnavailable featureName="locations" /> : isCourtManagerRole ? <Navigate to={COURT_MANAGER_ROUTES.assignedCourt} replace /> : canOperateCourt ? <LocationsList /> : <Navigate to="/" />} />
              <Route path="/locations/:locationId" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('locations') ? <FeatureUnavailable featureName="locations" /> : isCourtOwnerRole ? <LocationDetailPage /> : isCourtManagerRole ? <Navigate to={COURT_MANAGER_ROUTES.assignedCourt} replace /> : canOperateCourt ? <Navigate to="/locations" replace /> : <Navigate to="/" />} />
              <Route path="/courts" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : isCourtManagerRole ? <Navigate to={COURT_MANAGER_ROUTES.assignedCourt} replace /> : canOperateCourt ? <Navigate to="/locations" replace /> : <Navigate to="/" />} />
              <Route path="/bookings-admin" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('bookings-admin') ? <FeatureUnavailable featureName="bookings-admin" /> : isCourtManagerRole ? <Navigate to={COURT_MANAGER_ROUTES.bookings} replace /> : canOperateCourt ? <BookingsAdmin /> : <Navigate to="/" />} />
              <Route path="/court-calendar" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('court-calendar') ? <FeatureUnavailable featureName="court-calendar" /> : isCourtManagerRole ? <Navigate to={COURT_MANAGER_ROUTES.schedule} replace /> : canOperateCourt ? <CourtCalendar /> : <Navigate to="/" />} />
              <Route path="/tournaments-admin" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('tournaments-admin') ? <FeatureUnavailable featureName="tournaments-admin" /> : isCourtOwnerRole ? <TournamentsManager userRole={role} /> : <Navigate to="/" />} />
              <Route path="/tournaments-admin/manage/:tournamentId" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : (isCourtOwnerRole || role === 'ADMIN') ? <TournamentHub /> : <Navigate to="/" />} />
              <Route path="/revenue" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('revenue') ? <FeatureUnavailable featureName="revenue" /> : isCourtOwnerRole ? <Revenue /> : <Navigate to="/" />} />
              <Route path="/transactions" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : isCourtOwnerRole ? <Transactions /> : <Navigate to="/" />} />
              <Route path="/court-pricing" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : isCourtOwnerRole ? <CourtPricing /> : <Navigate to="/" />} />
              <Route path="/court-policies" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('court-policies') ? <FeatureUnavailable featureName="court-policies" /> : isCourtOwnerRole ? <LocationPolicies /> : <Navigate to="/" />} />
              <Route path="/application-status" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role !== 'guest' ? <ApplicationStatus /> : <Navigate to="/login" />} />

              <Route path="/admin" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role === 'ADMIN' ? <AdminDashboard applications={applications} onApprove={onApprove} onReject={onReject} currentAdminRole={role} /> : <Navigate to="/login" />} />
              <Route path="/admin/verifications" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role === 'ADMIN' ? <AdminDashboard applications={applications} onApprove={onApprove} onReject={onReject} currentAdminRole={role} initialTab="verifications" /> : <Navigate to="/login" />} />
              <Route path="/p/:username/:bookingId" element={<PosterPage />} />
              <Route path="/achievements-admin" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role === 'ADMIN' ? <AchievementsManager /> : <Navigate to="/login" />} />
              <Route path="/match-verify" element={<MatchVerifyPage />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/policy" element={<PrivacyPolicy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </main>



      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] md:rounded-[48px] p-8 md:p-10 shadow-2xl relative animate-in slide-in-from-bottom-8 duration-500">
            <button onClick={() => setIsLoginModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-950"><X size={20} /></button>
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tighter uppercase mb-2">Login.</h2>
              <p className="text-slate-500 font-medium text-sm">Select your testing persona below.</p>
            </div>
            <div className="space-y-3">
              {(['PLAYER', 'COACH', 'COURT_OWNER', 'ADMIN'] as UserRole[]).map((r) => (
                <button key={r} onClick={() => { setRole(r); if (r === 'COACH' || r === 'COURT_OWNER') setAuthorizedProRoles([r]); setIsLoginModalOpen(false); }} className="w-full py-4 md:py-5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all flex items-center justify-between px-8">
                  {r.replace('_', ' ')} <ArrowRight size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showUsernameModal && (
        <UsernameSetupModal
          initialName={initialNameForModal}
          onConfirm={handleConfirmUsername}
          isLoading={isUpdatingUsername}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>('guest');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [applications, setApplications] = useState<ProfessionalApplication[]>([]);
  const [activeApplication, setActiveApplication] = useState<ProfessionalApplication | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<{ show: boolean, type: 'success' | 'error', title: string, message: string }>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });
  const [authorizedProRoles, setAuthorizedProRoles] = useState<UserRole[]>([]);
  const [followedUsers, setFollowedUsers] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [roleSwitchTarget, setRoleSwitchTarget] = useState<UserRole>('PLAYER');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [initialNameForModal, setInitialNameForModal] = useState('');

  // Maintenance & feature access
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isSoftLaunchMode, setIsSoftLaunchMode] = useState(false);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(new Set());
  const [featuresLoaded, setFeaturesLoaded] = useState(false);
  const [isActualAdmin, setIsActualAdmin] = useState(() => localStorage.getItem('is_actual_admin') === 'true');
  const [authLoading, setAuthLoading] = useState(true);
  const [twoFactorPending, setTwoFactorPending] = useState(false);
  const twoFactorStatusRequestRef = useRef<Promise<{ pending: boolean }> | null>(null);
  const twoFactorStatusKeyRef = useRef<string | null>(null);

  const hasAdminRole = (roles: (string | UserRole)[] | null | undefined) =>
    Array.isArray(roles) && roles.some(r => (r || '').toString().toUpperCase() === 'ADMIN');

  useEffect(() => {
    // 0. Test Connection
    import('./services/backend').then(({ backend }) => {
      backend.checkConnection().then(result => {
        if (result.success) {
          // console.log('✅ System Backend Status: CONNECTED');
        } else {
          // console.warn('❌ System Backend Status: DISCONNECTED -', result.message);
        }
      });
    });

    // Refetch maintenance + features on tab focus, and proactively refresh the Supabase session
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Proactively refresh the access token so inactivity doesn't cause a SIGNED_OUT flash
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            // Session still alive — silently refresh the token
            supabase.auth.refreshSession().then(({ data: { session: refreshed } }) => {
              const activeSession = refreshed || session;
              if (activeSession) {
                refreshTwoFactorGate(activeSession).catch(() => setTwoFactorPending(true));
              }
            });
          } else {
            setTwoFactorPending(false);
          }
          // If session is null here the user genuinely logged out elsewhere — let onAuthStateChange handle it
        });
        getMaintenanceStatus().then(m => {
          if (m) { setIsMaintenanceMode(m.enabled); setMaintenanceMessage(m.message || ''); setIsSoftLaunchMode(m.soft_launch_enabled ?? false); }
        });
        const r = (localStorage.getItem('active_role') as UserRole) || 'PLAYER';
        if (r !== 'guest') {
          getEnabledFeaturesForRole(r as UserRole).then(f => { setEnabledFeatures(f); setFeaturesLoaded(true); });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const pollMaintenance = () => {
      getMaintenanceStatus().then(m => {
        if (m) { setIsMaintenanceMode(m.enabled); setMaintenanceMessage(m.message || ''); setIsSoftLaunchMode(m.soft_launch_enabled ?? false); }
      });
    };
    const pollInterval = setInterval(pollMaintenance, 15000);

    const pollFeatures = async () => {
      const r = (localStorage.getItem('active_role') as UserRole) || 'PLAYER';
      if (r !== 'guest') {
        await ensureDefaultFeatures(r); // seed any missing feature rows (e.g. achievements)
        const features = await getEnabledFeaturesForRole(r as UserRole);
        // console.log('[Features] pollFeatures loaded', r, [...features]);
        setEnabledFeatures(features);
        setFeaturesLoaded(true);
      } else {
        setEnabledFeatures(new Set(['*']));
        setFeaturesLoaded(true);
      }
    };
    const featurePollInterval = setInterval(pollFeatures, 5000);
    pollFeatures();

    const featureChannel = supabase
      .channel('feature-access-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_feature_access' }, () => {
        const r = (localStorage.getItem('active_role') as UserRole) || 'PLAYER';
        if (r !== 'guest') {
          getEnabledFeaturesForRole(r as UserRole).then(f => { setEnabledFeatures(f); setFeaturesLoaded(true); });
        }
      })
      .subscribe();

    const refreshTwoFactorGate = async (session: any, options?: { force?: boolean }) => {
      if (!session?.user) {
        twoFactorStatusRequestRef.current = null;
        twoFactorStatusKeyRef.current = null;
        setTwoFactorPending(false);
        return { pending: false };
      }

      if (isGoogleSession(session.user)) {
        twoFactorStatusRequestRef.current = null;
        twoFactorStatusKeyRef.current = null;
        setTwoFactorPending(false);
        return {
          pending: false,
          verified: true,
          requiresTwoFactor: false,
          authProvider: 'google',
        };
      }

      const requestKey = `${session.user.id}:${session.access_token || 'no-token'}`;
      if (!options?.force && twoFactorStatusRequestRef.current && twoFactorStatusKeyRef.current === requestKey) {
        return twoFactorStatusRequestRef.current;
      }

      const requestPromise = getTwoFactorStatus(session.access_token)
        .then((status) => {
          setTwoFactorPending(status.pending);
          return status;
        })
        .finally(() => {
          if (twoFactorStatusKeyRef.current === requestKey) {
            twoFactorStatusRequestRef.current = null;
          }
        });

      twoFactorStatusKeyRef.current = requestKey;
      twoFactorStatusRequestRef.current = requestPromise;

      const status = await requestPromise;
      return status;
    };

    // 1. Robust Session Sync Logic
    const syncUserSession = async (session: any) => {
      if (!session?.user) {
        setRole('guest');
        setAuthorizedProRoles([]);
        setUserName(null);
        setUserAvatar(null);
        setCurrentUserId(null);
        setTwoFactorPending(false);
        localStorage.removeItem('active_role');
        return;
      }

      if (shouldBlockUnverifiedEmailSession(session.user)) {
        await supabase.auth.signOut();
        setRole('guest');
        setAuthorizedProRoles([]);
        setUserName(null);
        setUserAvatar(null);
        setCurrentUserId(null);
        setTwoFactorPending(false);
        localStorage.removeItem('active_role');
        localStorage.removeItem('auth_redirect');

        if (!window.location.search.includes('error=verify_email_required') || window.location.pathname !== '/login') {
          window.location.replace('/login?error=verify_email_required');
        }
        return;
      }

      setCurrentUserId(session.user.id);

      const metaRoles: UserRole[] = (session.user.app_metadata?.roles as UserRole[]) || [];
      const metaActiveRole: UserRole = (session.user.app_metadata?.active_role as UserRole) || 'PLAYER';
      const metaIsAdminFlag = session.user.app_metadata?.is_admin === true;

      try {
        // Single parallel fetch: profile (full), approved apps, and maintenance status
        const [profileRes, appsRes, maintenanceResult, twoFactorStatus] = await Promise.all([
          supabase.from('profiles').select('full_name, username, active_role, roles, avatar_url, referred_by_id, email, points').eq('id', session.user.id).single(),
          supabase.from('professional_applications')
            .select('requested_role')
            .eq('profile_id', session.user.id)
            .eq('status', 'APPROVED')
            .in('requested_role', ['COACH', 'COURT_OWNER']),
          getMaintenanceStatus(),
          refreshTwoFactorGate(session),
        ]);

        setTwoFactorPending(twoFactorStatus.pending);

        // --- Referral Capture Logic ---
        // console.log('🔍 App.tsx: Checking for pending referral code...');
        const pendingRefCode = localStorage.getItem('referral_code');
        // console.log('🔍 App.tsx: localStorage referral_code:', pendingRefCode);
        // console.log('🔍 App.tsx: Profile data:', profileRes.data);
        // console.log('🔍 App.tsx: Current referred_by_id:', profileRes.data?.referred_by_id);

        if (pendingRefCode && profileRes.data && !profileRes.data.referred_by_id) {
          // console.log('🔄 Processing pending referral code:', pendingRefCode);

          // 1. Resolve Referrer 
          // console.log('🔍 Looking up referrer with code:', pendingRefCode);
          const { data: referrer, error: referrerError } = await supabase
            .from('profiles')
            .select('id, full_name, referral_code')
            .eq('referral_code', pendingRefCode)
            .single();

          // console.log('🔍 Referrer lookup result:', { referrer, error: referrerError });

          if (referrer && referrer.id !== session.user.id) {
            // console.log('✅ Found referrer:', referrer.id, 'Name:', referrer.full_name);
            // 2. Link User
            // console.log('🔄 Linking user', session.user.id, 'to referrer', referrer.id);
            const { error: linkError } = await supabase
              .from('profiles')
              .update({ referred_by_id: referrer.id })
              .eq('id', session.user.id);

            if (!linkError) {
              // console.log('🎉 Successfully linked referral!');
              // console.log('🎉 Points should be awarded by database trigger');
              localStorage.removeItem('referral_code');

              // If this is a court-owner referral, award bonus points to the referrer
              const pendingRefType = localStorage.getItem('referral_type');
              if (pendingRefType === 'court-owner') {
                // Award 25 bonus points for court owner referral
                const { data: referrerProfile } = await supabase
                  .from('profiles')
                  .select('points')
                  .eq('id', referrer.id)
                  .single();
                if (referrerProfile) {
                  await supabase
                    .from('profiles')
                    .update({ points: (referrerProfile.points || 0) + 25 })
                    .eq('id', referrer.id);
                }
                // Keep referral_type in localStorage — Dashboard will read it to auto-open modal
              }

              // console.log('✅ Removed referral_code from localStorage');
            } else {
              console.error('❌ Failed to link referral:', linkError);
            }
          } else if (referrer && referrer.id === session.user.id) {
            // console.warn('⚠️ Self-referral detected - user tried to refer themselves');
            localStorage.removeItem('referral_code');
          } else {
            // console.warn('⚠️ Invalid referral code - referrer not found:', pendingRefCode);
            localStorage.removeItem('referral_code'); // Clean up invalid code
          }
        } else {
          if (!pendingRefCode) {
            // console.log('ℹ️ No pending referral code in localStorage');
          } else if (!profileRes.data) {
            // console.log('ℹ️ No profile data available yet');
          } else if (profileRes.data.referred_by_id) {
            // console.log('ℹ️ User already has a referrer:', profileRes.data.referred_by_id);
          }
        }
        // ------------------------------

        let consolidatedRoles: UserRole[] = [];
        let dbRoles: UserRole[] = [];

        // Update profile data if available
        if (profileRes.data) {
          setUserName(profileRes.data.full_name);
          setUserAvatar(profileRes.data.avatar_url);
          setUserPoints(profileRes.data.points || 0);

          // Trigger onboarding modal if it's a social login and the username hasn't been set
          const isSocialLogin = session.user.app_metadata?.provider === 'google' || session.user.app_metadata?.provider === 'facebook';

          if (isSocialLogin && !profileRes.data.username) {
            setInitialNameForModal(profileRes.data.full_name || '');
            setShowUsernameModal(true);
          }

          // Update profile with auth metadata if missing
          if (!profileRes.data.email || !profileRes.data.full_name || !profileRes.data.avatar_url || !profileRes.data.username) {
            const resolvedName = profileRes.data.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
            const resolvedEmail = profileRes.data.email || session.user.email;
            const usernameSource = profileRes.data.username || resolvedName || session.user.email?.split('@')[0] || 'player';
            const resolvedUsername = usernameSource
              .toLowerCase()
              .trim()
              .replace(/\s+/g, '_')
              .replace(/[^a-z0-9_]/g, '')
              .slice(0, 30) || 'player';

            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                email: resolvedEmail,
                full_name: resolvedName,
                username: resolvedUsername,
                avatar_url: profileRes.data.avatar_url || session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || ''
              })
              .eq('id', session.user.id);

            if (!updateError) {
              const resolvedAvatar = profileRes.data.avatar_url || session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '';
              setUserName(resolvedName);
              setUserAvatar(resolvedAvatar);
            } else {
              console.error('❌ Failed to update profile:', updateError);
            }
          }

          dbRoles = (profileRes.data.roles as UserRole[]) || ['PLAYER'];
          consolidatedRoles = [...dbRoles];
        } else if (session.user) {
          // Block profile creation for users without an email (e.g. anonymous auth or Facebook without email)
          if (!session.user.email) {
            console.warn('⚠️ No email on authenticated user — skipping profile creation. Signing out.');
            await supabase.auth.signOut();
            setRole('guest');
            return;
          }
          // Fallback: Create profile if missing
          const baseUsername = ((session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'player') as string)
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '')
            .slice(0, 22) || 'player';

          let profileCreated = false;
          for (let attempt = 0; attempt < 5; attempt++) {
            const candidateUsername = attempt === 0 ? baseUsername.slice(0, 30) : `${baseUsername}_${Math.random().toString(36).slice(2, 7)}`;
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                email: session.user.email || null,
                full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
                username: candidateUsername,
                avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
                active_role: 'PLAYER',
                roles: ['PLAYER']
              })
              .select()
              .single();

            if (!createError && newProfile) {
              // console.log('✅ Fallback profile created successfully');
              setUserName(newProfile.full_name);
              setUserAvatar(newProfile.avatar_url);
              consolidatedRoles = ['PLAYER'];
              profileCreated = true;
              break;
            } else if (createError?.code === '23505') {
              // Username conflict — retry with random suffix
              console.warn(`⚠️ Username "${candidateUsername}" taken, retrying...`);
              continue;
            } else {
              console.error('❌ Failed to create fallback profile:', createError);
              break;
            }
          }

          // If insert kept failing due to conflict, the profile might already exist
          // (e.g. created by server but not returned by initial query due to timing)
          if (!profileCreated) {
            const { data: retryProfile } = await supabase
              .from('profiles')
              .select('full_name, username, active_role, roles, avatar_url, email, points')
              .eq('id', session.user.id)
              .maybeSingle();
            if (retryProfile) {
              setUserName(retryProfile.full_name);
              setUserAvatar(retryProfile.avatar_url);
              dbRoles = (retryProfile.roles as UserRole[]) || ['PLAYER'];
              consolidatedRoles = [...dbRoles];
            } else {
              consolidatedRoles = ['PLAYER'];
            }
          }
        }

        // Add roles from approved applications
        if (appsRes.data && appsRes.data.length > 0) {
          const approvedRoles = appsRes.data.map(app => app.requested_role as UserRole);
          consolidatedRoles = Array.from(new Set([...consolidatedRoles, ...approvedRoles]));
        }

        // Auto-include COURT_OWNER for ADMINS
        if (consolidatedRoles.includes('ADMIN') && !consolidatedRoles.includes('COURT_OWNER')) {
          consolidatedRoles.push('COURT_OWNER');
        }

        // Self-Healing Logic:
        // If the current role (from profile) or approved apps roles are missing from the 'roles' array, repair it.
        const currentActive = profileRes.data?.active_role as UserRole;
        const allPossibleRoles = Array.from(new Set([...consolidatedRoles, currentActive || 'PLAYER', 'PLAYER'])) as UserRole[];

        if (allPossibleRoles.length > dbRoles.length) {
          // console.log('Self-healing triggered: Updating roles array in database...');
          try {
            await supabase
              .from('profiles')
              .update({ roles: allPossibleRoles })
              .eq('id', session.user.id);
          } catch {
            // Ignore — profile may not be fully set up yet
          }
          consolidatedRoles = allPossibleRoles;
        }

        const proRolesOnly = consolidatedRoles.filter(r => r === 'COACH' || r === 'COURT_OWNER' || r === 'COURT_MANAGER' || r === 'ADMIN');
        setAuthorizedProRoles(proRolesOnly);

        // Determine active role with complete data
        const dbActiveRole = (profileRes.data?.active_role as UserRole) || metaActiveRole || 'PLAYER';
        const isAdmin = hasAdminRole(consolidatedRoles) || hasAdminRole(metaRoles)
          || (dbActiveRole?.toUpperCase?.() === 'ADMIN') || (metaActiveRole?.toUpperCase?.() === 'ADMIN') || metaIsAdminFlag;

        if (isAdmin) { localStorage.setItem('is_actual_admin', 'true'); setIsActualAdmin(true); }
        else { localStorage.removeItem('is_actual_admin'); }

        if (maintenanceResult) { setIsMaintenanceMode(maintenanceResult.enabled); setMaintenanceMessage(maintenanceResult.message || ''); setIsSoftLaunchMode(maintenanceResult.soft_launch_enabled ?? false); }
        setMaintenanceChecked(true);

        setRole(dbActiveRole);
        localStorage.setItem('active_role', dbActiveRole);

        await ensureDefaultFeatures(dbActiveRole);
        const features = await getEnabledFeaturesForRole(dbActiveRole);
        setEnabledFeatures(features);
        setFeaturesLoaded(true);

      } catch (err) {
        console.error('Error syncing user data:', err);
        setTwoFactorPending(Boolean(session?.user));
        // Fallback to allow app to load even if sync fails
        setMaintenanceChecked(true);
        setFeaturesLoaded(true);
      }
    };

    // 2. Auth Initialization
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncUserSession(session).finally(() => setAuthLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Genuine sign-out — clear everything
        syncUserSession(null);
      } else if (event === 'TOKEN_REFRESHED') {
        // Token silently refreshed — session is still valid, no need to re-sync UI
        // Just make sure currentUserId is set in case this is the first load
        if (session?.user) {
          setCurrentUserId(session.user.id);
          refreshTwoFactorGate(session).catch(() => setTwoFactorPending(true));
        }
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        syncUserSession(session);
      }
    });

    const handleTwoFactorStateChanged = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        refreshTwoFactorGate(session, { force: true }).catch(() => setTwoFactorPending(Boolean(session?.user)));
      });
    };
    window.addEventListener('pickleplay:2fa-status-changed', handleTwoFactorStateChanged);

    // 3. Fetch initial data
    const fetchInitialData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: apps, error } = await supabase
          .from('professional_applications')
          .select('*, profiles!professional_applications_profile_id_fkey(full_name)')
          .order('submitted_at', { ascending: false });

        if (!error && apps) {
          const mappedApps: ProfessionalApplication[] = apps.map((app: any) => ({
            id: app.id,
            playerId: app.profile_id,
            playerName: app.profiles?.full_name || 'Unknown Player',
            requestedRole: app.requested_role,
            status: app.status,
            submissionDate: app.submitted_at,
            experienceSummary: app.experience_summary || '',
            documentName: app.document_url || 'No Document'
          }));
          setApplications(mappedApps);
        }
      }

      // 4. Fetch dynamic social posts
      const { data: dbPosts, error: postsError } = await supabase
        .from('community_posts')
        .select(`
          *,
          profiles!profile_id (
            full_name,
            avatar_url,
            active_role,
            availability_status,
            availability_start,
            availability_end,
            availability_note,
            preferred_skill_min,
            preferred_skill_max,
            preferred_location_ids,
            preferred_court_ids,
            preferred_court_type,
            preferred_location_mode
          ),
          community_post_likes (profile_id),
          community_post_comments (
            *,
            profiles!profile_id (full_name, avatar_url),
            community_comment_likes (profile_id)
          )
        `)
        .order('created_at', { ascending: false });

      if (!postsError && dbPosts) {
        const mappedPosts: SocialPost[] = dbPosts.map((p: any) => ({
          id: p.id,
          authorId: p.profile_id,
          authorName: p.profiles?.full_name || 'Anonymous',
          authorAvatar: p.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.profile_id}`,
          authorRole: p.profiles?.active_role as UserRole,
          authorAvailabilityStatus: p.profiles?.availability_status || 'offline',
          authorAvailabilityStart: p.profiles?.availability_start,
          authorAvailabilityEnd: p.profiles?.availability_end,
          authorAvailabilityNote: p.profiles?.availability_note,
          authorPreferredSkillMin: p.profiles?.preferred_skill_min,
          authorPreferredSkillMax: p.profiles?.preferred_skill_max,
          authorPreferredLocationIds: p.profiles?.preferred_location_ids || [],
          authorPreferredCourtIds: p.profiles?.preferred_court_ids || [],
          authorPreferredCourtType: p.profiles?.preferred_court_type || 'Both',
          authorPreferredLocationMode: p.profiles?.preferred_location_mode || 'auto',
          content: p.content,
          image: p.image_url,
          tags: p.tags || [],
          likes: p.community_post_likes?.map((l: any) => l.profile_id) || [],
          timestamp: p.created_at,
          comments: (p.community_post_comments || [])
            .filter((c: any) => !c.parent_id) // Get top-level comments
            .map((c: any) => ({
              id: c.id,
              authorName: c.profiles?.full_name || 'Anonymous',
              authorAvatar: c.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.profile_id}`,
              content: c.content,
              timestamp: c.created_at,
              likes: c.community_comment_likes?.map((l: any) => l.profile_id) || [],
              replies: (p.community_post_comments || [])
                .filter((r: any) => r.parent_id === c.id)
                .map((r: any) => ({
                  id: r.id,
                  authorName: r.profiles?.full_name || 'Anonymous',
                  authorAvatar: r.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.profile_id}`,
                  content: r.content,
                  likes: r.community_comment_likes?.map((l: any) => l.profile_id) || [],
                  timestamp: r.created_at,
                  replies: []
                }))
            })),
          isEdited: p.is_edited || false
        }));
        setPosts(mappedPosts);
      } else if (postsError) {
        console.error('Error fetching community posts:', postsError);
      }

      // 3. Fetch initial notifications
      if (session?.user) {
        const { data: notifs, error: notifError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        // Debug logging removed: notifications fetch result

        if (notifError) {
          console.error('Notification fetch error:', notifError);
        }

        if (!notifError && notifs) {
          // Fetch actor profiles separately
          const actorIds = [...new Set(notifs.map(n => n.actor_id).filter(Boolean))];
          let profilesMap: Record<string, { full_name: string; avatar_url: string }> = {};
          if (actorIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .in('id', actorIds);
            if (profiles) {
              profilesMap = Object.fromEntries(profiles.map(p => [p.id, p]));
            }
          }

          const mappedNotifs: Notification[] = notifs.map(n => {
            const actorProfile = profilesMap[n.actor_id];
            return {
              id: n.id,
              type: n.type as any,
              message: n.message,
              actor: {
                name: actorProfile?.full_name || n.title || 'System',
                avatar: actorProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor_id}`,
                id: n.actor_id
              },
              timestamp: n.created_at,
              isRead: n.is_read,
              bookingId: n.booking_id,
              action_url: n.action_url,
              metadata: n.metadata
            };
          });
          setNotifications(mappedNotifs);
        }
      }
      // 5. Fetch initial social posts
      // ... already fetched above ...

      // 6. Fetch initial follows
      if (session?.user) {
        const { data: follows, error: followError } = await supabase
          .from('user_follows')
          .select('followed_id')
          .eq('follower_id', session.user.id);

        if (!followError && follows) {
          setFollowedUsers(follows.map(f => f.followed_id));
        }
      }
    };

    fetchInitialData();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pickleplay:2fa-status-changed', handleTwoFactorStateChanged);
      clearInterval(pollInterval);
      clearInterval(featurePollInterval);
      supabase.removeChannel(featureChannel);
    };
  }, [currentUserId]);

  // Dedicated effect: maintenance realtime subscription
  useEffect(() => {
    const maintenanceSub = supabase
      .channel('maintenance_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_settings' }, (payload: any) => {
        const row = payload.new as { enabled: boolean; message: string; soft_launch_enabled?: boolean };
        if (row && row.enabled !== undefined) { setIsMaintenanceMode(row.enabled); setMaintenanceMessage(row.message || ''); setIsSoftLaunchMode(row.soft_launch_enabled ?? false); }
      })
      .subscribe();
    return () => { supabase.removeChannel(maintenanceSub); };
  }, []);

  // Separate Effect for Community Feed Realtime
  useEffect(() => {
    const channel = supabase
      .channel('community-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, async (payload) => {
        const newPostRow = payload.new as any;

        // Fetch author info
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, active_role, availability_status, availability_start, availability_end, availability_note, preferred_skill_min, preferred_skill_max, preferred_location_ids, preferred_court_ids, preferred_court_type, preferred_location_mode')
          .eq('id', newPostRow.profile_id)
          .single();

        const newPost: SocialPost = {
          id: newPostRow.id,
          authorId: newPostRow.profile_id,
          authorName: profile?.full_name || 'Anonymous',
          authorAvatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newPostRow.profile_id}`,
          authorRole: profile?.active_role as UserRole,
          authorAvailabilityStatus: profile?.availability_status || 'offline',
          authorAvailabilityStart: profile?.availability_start,
          authorAvailabilityEnd: profile?.availability_end,
          authorAvailabilityNote: profile?.availability_note,
          authorPreferredSkillMin: profile?.preferred_skill_min,
          authorPreferredSkillMax: profile?.preferred_skill_max,
          authorPreferredLocationIds: profile?.preferred_location_ids || [],
          authorPreferredCourtIds: profile?.preferred_court_ids || [],
          authorPreferredCourtType: profile?.preferred_court_type || 'Both',
          authorPreferredLocationMode: profile?.preferred_location_mode || 'auto',
          content: newPostRow.content,
          image: newPostRow.image_url,
          tags: newPostRow.tags || [],
          likes: [],
          comments: [],
          timestamp: newPostRow.created_at
        };

        setPosts(prev => {
          // Prevent duplicates if the user is the one who posted (already added via handlePost)
          if (prev.some(p => p.id === newPost.id)) return prev;
          return [newPost, ...prev];
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_post_comments' }, async (payload) => {
        const newCommentRow = payload.new as any;

        // Fetch profile info
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', newCommentRow.profile_id)
          .single();

        const newComment: SocialComment = {
          id: newCommentRow.id,
          authorName: profile?.full_name || 'Anonymous',
          authorAvatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newCommentRow.profile_id}`,
          content: newCommentRow.content,
          timestamp: newCommentRow.created_at,
          likes: [],
          replies: []
        };

        setPosts(prev => prev.map(p => {
          if (p.id !== newCommentRow.post_id) return p;

          // Check if already exists (optimistic sync)
          if (p.comments.some(c => c.id === newComment.id)) return p;

          // Handle nested replies if parent_id exists
          if (newCommentRow.parent_id) {
            return {
              ...p,
              comments: p.comments.map(c => {
                if (c.id === newCommentRow.parent_id) {
                  return { ...c, replies: [...(c.replies || []), newComment] };
                }
                return c;
              })
            };
          }

          return { ...p, comments: [...p.comments, newComment] };
        }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_post_likes' }, (payload) => {
        const newLike = payload.new as any;
        setPosts(prev => prev.map(p => {
          if (p.id === newLike.post_id) {
            if (p.likes.includes(newLike.profile_id)) return p;
            return { ...p, likes: [...p.likes, newLike.profile_id] };
          }
          return p;
        }));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_post_likes' }, (payload) => {
        const oldLike = payload.old as any;
        setPosts(prev => prev.map(p => {
          if (p.id === oldLike.post_id) {
            return { ...p, likes: p.likes.filter(id => id !== oldLike.profile_id) };
          }
          return p;
        }));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_posts' }, (payload) => {
        const updatedPost = payload.new as any;
        setPosts(prev => prev.map(p => {
          if (p.id === updatedPost.id) {
            return {
              ...p,
              content: updatedPost.content,
              isEdited: updatedPost.is_edited || true
            };
          }
          return p;
        }));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_posts' }, (payload) => {
        const deletedId = payload.old.id;
        setPosts(prev => prev.filter(p => p.id !== deletedId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Separate Effect for Notifications Subscription
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`user-notifications-${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUserId}`
      }, async (payload) => {
        const newNotif = payload.new as any;
        let profile = null;
        if (newNotif.actor_id) {
          const { data } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', newNotif.actor_id)
            .single();
          profile = data;
        }

        const mappedNewNotif: Notification = {
          id: newNotif.id,
          type: newNotif.type as any,
          message: newNotif.message,
          actor: {
            name: profile?.full_name || newNotif.title || 'System',
            avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newNotif.actor_id || newNotif.id}`,
            id: newNotif.actor_id
          },
          timestamp: newNotif.created_at,
          isRead: newNotif.is_read,
          bookingId: newNotif.booking_id,
          action_url: newNotif.action_url,
          metadata: newNotif.metadata
        };

        setNotifications(prev => [mappedNewNotif, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`user-profile-role-${currentUserId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${currentUserId}`
      }, async (payload) => {
        const profile = payload.new as any;
        const nextRoles = (profile?.roles as UserRole[]) || ['PLAYER'];
        const nextActiveRole = (profile?.active_role as UserRole) || 'PLAYER';
        const nextAuthorizedProRoles = nextRoles.filter((item) =>
          item === 'COACH' || item === 'COURT_OWNER' || item === 'COURT_MANAGER' || item === 'ADMIN'
        );
        const nextIsActualAdmin = nextRoles.some((item) => (item || '').toString().toUpperCase() === 'ADMIN');

        setAuthorizedProRoles(nextAuthorizedProRoles);
        setRole(nextActiveRole);
        setIsActualAdmin(nextIsActualAdmin);
        localStorage.setItem('active_role', nextActiveRole);

        await ensureDefaultFeatures(nextActiveRole);
        const nextFeatures = await getEnabledFeaturesForRole(nextActiveRole);
        setEnabledFeatures(nextFeatures);
        setFeaturesLoaded(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Realtime: Profile points updates (achievements, referrals, etc.)
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`user-points-${currentUserId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${currentUserId}`
      }, (payload) => {
        const updated = payload.new as any;
        if (typeof updated.points === 'number') {
          setUserPoints(updated.points);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const handleRoleSwitch = async (newRole: UserRole) => {
    // Security: Only allow switching to PLAYER or roles the user is authorized for
    if (newRole !== 'PLAYER' && !authorizedProRoles.includes(newRole)) {
      console.error(`Unauthorized role switch attempt: ${newRole}`);
      alert('You are not authorized for this role. Please apply and get approved first.');
      return;
    }

    setIsSwitchingRole(true);
    setRoleSwitchTarget(newRole);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('profiles')
        .update({ active_role: newRole })
        .eq('id', session.user.id);

      if (error) throw error;

      // Small delay for the "feeling" of switching
      await new Promise(resolve => setTimeout(resolve, 800));

      setRole(newRole);
      localStorage.setItem('active_role', newRole);

      // Re-load features for the new role so guards update immediately
      await ensureDefaultFeatures(newRole);
      const features = await getEnabledFeaturesForRole(newRole);
      setEnabledFeatures(features);
      setFeaturesLoaded(true);
    } catch (err) {
      console.error('Role switch error:', err);
      alert('Failed to switch role');
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const handleConfirmUsername = async (newName: string) => {
    if (!currentUserId) return;
    setIsUpdatingUsername(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: newName,
          username: newName.toLowerCase().replace(/\s+/g, '_') // Slugified username
        })
        .eq('id', currentUserId);

      if (error) throw error;
      setUserName(newName);
      setShowUsernameModal(false);
    } catch (err: any) {
      console.error('Error updating profile name:', err.message);
      alert('Failed to update name: ' + err.message);
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('two_factor_pending');
    localStorage.removeItem('auth_redirect');
    localStorage.removeItem('active_role');
    localStorage.setItem('came_from_logout', 'true');
    // Removed immediate state update to avoid reactive flicker before page reload
    await supabase.auth.signOut();
  };

  const handleFollow = async (userId: string, userName: string) => {
    if (!currentUserId) return;
    const isCurrentlyFollowing = followedUsers.includes(userId);

    try {
      if (isCurrentlyFollowing) {
        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('followed_id', userId);
        setFollowedUsers(prev => prev.filter(id => id !== userId));
      } else {
        await supabase
          .from('user_follows')
          .insert({ follower_id: currentUserId, followed_id: userId });
        setFollowedUsers(prev => [...prev, userId]);

        // Send notification to the followed user
        await supabase.from('notifications').insert({
          user_id: userId,
          actor_id: currentUserId,
          related_user_id: currentUserId,
          type: 'system',
          title: userName || 'Someone',
          message: 'started following you.'
        });
      }
    } catch (err) {
      console.error('Error following user:', err);
    }
  };

  const handleMarkNotificationsRead = async () => {
    if (!currentUserId) return;

    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUserId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Get the application
      const application = applications.find(a => a.id === id);
      if (!application) throw new Error('Application not found');

      // 2. Process Approval in DB
      const { error: appError } = await supabase
        .from('professional_applications')
        .update({
          status: 'APPROVED',
          processed_at: new Date().toISOString(),
          processed_by: session.user.id
        })
        .eq('id', id);

      if (appError) throw appError;

      // 3. Robust Role Merging
      // Fetch latest roles to ensure we don't overwrite concurrent changes
      const { data: profile } = await supabase
        .from('profiles')
        .select('roles, active_role')
        .eq('id', application.playerId)
        .single();

      const existingRoles = (profile?.roles as UserRole[]) || ['PLAYER'];
      const newRole = application.requestedRole as UserRole;

      // Use Set to ensure uniqueness and preserve 'ADMIN' if present
      const distinctRoles = Array.from(new Set([...existingRoles, newRole, 'PLAYER'])) as UserRole[];

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          active_role: newRole,
          roles: distinctRoles
        })
        .eq('id', application.playerId);

      if (profileError) throw profileError;

      // 4. Create Notification for the user
      await supabase.from('notifications').insert({
        user_id: application.playerId,
        type: 'SYSTEM',
        message: `Your professional application has been approved! You are now a ${newRole}.`,
        actor_id: session.user.id
      });

      // 5. If Court Owner, initialize trial
      if (newRole === 'COURT_OWNER') {
        const { createTrialSubscription } = await import('./services/subscriptions');
        await createTrialSubscription(application.playerId);
      }

      // 6. Update UI State
      setApplications(apps => apps.map(a => a.id === id ? { ...a, status: 'APPROVED' } : a));
      setShowStatusModal({
        show: true,
        type: 'success',
        title: 'Application Approved!',
        message: `${application.playerName} is now a ${newRole}. The user has been notified.`
      });
    } catch (err: any) {
      console.error('Approval Error:', err.message);
      setShowStatusModal({
        show: true,
        type: 'error',
        title: 'Approval Failed',
        message: `Failed to approve application: ${err.message}`
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const application = applications.find(a => a.id === id);
      if (!application) throw new Error('Application not found');

      const { error } = await supabase
        .from('professional_applications')
        .update({ status: 'REJECTED', processed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Create Notification for the user
      await supabase.from('notifications').insert({
        user_id: application.playerId,
        type: 'SYSTEM',
        message: `Your professional application for ${application.requestedRole} has been declined.`,
        actor_id: session.user.id
      });

      setApplications(apps => apps.map(a => a.id === id ? { ...a, status: 'REJECTED' } : a));
    } catch (err: any) {
      console.error('Rejection Error:', err.message);
    }
  };

  const handleSubmitApplication = async (app: Omit<ProfessionalApplication, 'id' | 'status' | 'submissionDate'>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const { data, error } = await supabase
        .from('professional_applications')
        .insert({
          profile_id: session.user.id,
          requested_role: app.requestedRole,
          experience_summary: app.experienceSummary,
          document_url: app.documentName || null
        })
        .select('*, profiles!professional_applications_profile_id_fkey(full_name)')
        .single();

      if (error) throw error;

      const newApp: ProfessionalApplication = {
        ...app,
        id: data.id,
        playerName: data.profiles?.full_name || 'Me',
        status: 'PENDING',
        submissionDate: data.submitted_at,
        documentName: app.documentName
      };
      setApplications(prev => [...prev, newApp]);
    } catch (err: any) {
      console.error('Submission Error:', err.message);
      alert('Failed to submit application: ' + err.message);
    }
  };

  const handleAddToCart = (product: Product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };


  if (authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#EBEBE6' }}>
        <div className="flex flex-col items-center gap-4">
          <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="w-16 h-16 rounded-2xl object-contain animate-pulse" />
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <>
        <NavigationHandler
          role={role} setRole={setRole} isLoginModalOpen={isLoginModalOpen} setIsLoginModalOpen={setIsLoginModalOpen}
          handleLogout={handleLogout} applications={applications} onApprove={handleApprove} onReject={handleReject}
          onSubmitApplication={handleSubmitApplication} authorizedProRoles={authorizedProRoles} setAuthorizedProRoles={setAuthorizedProRoles}
          followedUsers={followedUsers} handleFollow={handleFollow}
          notifications={notifications} setNotifications={setNotifications}
          handleMarkNotificationsRead={handleMarkNotificationsRead}
          posts={posts} setPosts={setPosts}
          cartItems={cartItems}
          onAddToCart={handleAddToCart}
          onUpdateCartQuantity={handleUpdateCartQuantity}
          onRemoveFromCart={handleRemoveFromCart}
          userName={userName}
          userAvatar={userAvatar}
          userPoints={userPoints}
          currentUserId={currentUserId}
          isSwitchingRole={isSwitchingRole}
          roleSwitchTarget={roleSwitchTarget}
          handleRoleSwitch={handleRoleSwitch}
          showUsernameModal={showUsernameModal}
          setShowUsernameModal={setShowUsernameModal}
          isUpdatingUsername={isUpdatingUsername}
          initialNameForModal={initialNameForModal}
          handleConfirmUsername={handleConfirmUsername}
          isMaintenanceMode={isMaintenanceMode}
          maintenanceChecked={maintenanceChecked}
          maintenanceMessage={maintenanceMessage}
          isSoftLaunchMode={isSoftLaunchMode}
          enabledFeatures={enabledFeatures}
          featuresLoaded={featuresLoaded}
          isActualAdmin={isActualAdmin}
          isTwoFactorPending={twoFactorPending}
        />
        {isSwitchingRole && <RoleSwitchOverlay targetRole={roleSwitchTarget} />}
      </>
      {/* Custom Status Modal (Success/Error) */}
      {showStatusModal.show && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className={`p-8 text-center ${showStatusModal.type === 'success' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 ${showStatusModal.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {showStatusModal.type === 'success' ? <CheckCircle2 size={40} /> : <AlertCircle size={40} />}
              </div>
              <h3 className={`text-2xl font-black uppercase tracking-tighter mb-2 ${showStatusModal.type === 'success' ? 'text-emerald-900' : 'text-rose-900'}`}>
                {showStatusModal.title}
              </h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                {showStatusModal.message}
              </p>
            </div>
            <div className="p-6 bg-white">
              <button
                onClick={() => setShowStatusModal({ ...showStatusModal, show: false })}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all
                  ${showStatusModal.type === 'success'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:shadow-emerald-200'
                    : 'bg-rose-600 text-white shadow-lg shadow-rose-100 hover:bg-rose-700 hover:shadow-rose-200'
                  }`}
              >
                GOT IT
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </Router>
  );
};

export default App;
