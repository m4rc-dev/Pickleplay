

// This file contains the main application logic, routing, and navigation components.
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
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
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  Settings,
  MoreHorizontal,
  Bell,
  UserCheck,
  Building2
} from 'lucide-react';

import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Booking from './components/Booking';
import Community from './components/Community';
import Rankings from './components/Rankings';
import AdminDashboard from './components/AdminDashboard';
import Tournaments from './components/Tournaments';
import News from './components/News';
import Shop from './components/Shop';
import Teams from './components/Teams';
import Academy from './components/Academy';
import Profile from './components/Profile';
import GuestBooking from './components/GuestBooking';
import UsernameSetupModal from './components/UsernameSetupModal';
import Login from './components/Login';
import Signup from './components/Signup';
import AuthCallback from './components/AuthCallback';
import NotFound from './components/NotFound';

// Professional Components
import Students from './components/coach/Students';
import Clinics from './components/coach/Clinics';
import Schedule from './components/coach/Schedule';
import Courts from './components/court-owner/Courts';
import BookingsAdmin from './components/court-owner/BookingsAdmin';
import Revenue from './components/court-owner/Revenue';
import TournamentsManager from './components/court-owner/TournamentsManager';
import CourtCalendar from './components/court-owner/CourtCalendar';
import Coaches from '@/components/Coaches';
import { supabase, createSession } from './services/supabase';
// Fix: Import UserRole from the centralized types.ts file.
import { ProfessionalApplication, UserRole, Notification, SocialPost, SocialComment, Product, CartItem } from './types';
import { INITIAL_APPLICATIONS, INITIAL_POSTS } from './data/mockData';

const NotificationPanel: React.FC<{
  notifications: Notification[],
  onClose: () => void,
  onNotificationClick: (notification: Notification) => void
}> = ({ notifications, onClose, onNotificationClick }) => {
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
            <img src={n.actor.avatar} className="w-8 h-8 rounded-full" />
            <div>
              <p className="text-sm text-slate-700 leading-tight group-hover:text-blue-600 transition-colors">
                <span className="font-bold">{n.actor.name}</span> {n.message}
              </p>
              <p className="text-xs text-slate-400 mt-1">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        )) : (
          <p className="text-sm text-slate-400 text-center py-8">No new notifications.</p>
        )}
      </div>
    </div>
  );
};


const NavItem: React.FC<{ to: string, icon: React.ReactNode, label: string, isCollapsed: boolean, themeColor: string, onClick?: () => void }> = ({ to, icon, label, isCollapsed, themeColor, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 group ${isActive
        ? 'bg-white/95 text-blue-600 shadow-lg'
        : 'text-white/80 hover:bg-white/10 hover:text-white'
        } ${isCollapsed ? 'justify-center' : ''}`}
    >
      <div className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      {!isCollapsed && (
        <span className="font-black text-[13px] uppercase tracking-widest animate-in fade-in slide-in-from-left-2 duration-300">
          {label}
        </span>
      )}
      {!isCollapsed && isActive && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
      )}
    </Link>
  );
};

const MobileBottomNav: React.FC<{ role: UserRole, themeColor: string }> = ({ role, themeColor }) => {
  const location = useLocation();
  const items = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Home' },
    { to: '/booking', icon: <Calendar size={20} />, label: 'Book' },
    { to: '/community', icon: <Globe size={20} />, label: 'Hub' },
    { to: '/shop', icon: <ShoppingBag size={20} />, label: 'Shop' },
    { to: '/profile', icon: <User size={20} />, label: 'Me' },
  ];

  if (role === 'guest') return null;

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
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/20 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white/80 p-12 rounded-[48px] shadow-2xl border border-white flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-blue-600 rounded-[32px] flex items-center justify-center text-white shadow-xl shadow-blue-200 animate-pulse">
          {targetRole === 'PLAYER' && <User size={40} />}
          {targetRole === 'COACH' && <GraduationCap size={40} />}
          {targetRole === 'COURT_OWNER' && <Building2 size={40} />}
          {targetRole === 'ADMIN' && <ShieldCheck size={40} />}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Activating {targetRole.replace('_', ' ')} Mode</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Syncing Intelligence...</p>
        </div>
        <div className="flex gap-1.5 pt-4">
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></div>
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
  currentUserId: string | null;
  isSwitchingRole: boolean;
  roleSwitchTarget: UserRole;
  handleRoleSwitch: (newRole: UserRole) => void;
  showUsernameModal: boolean;
  setShowUsernameModal: (show: boolean) => void;
  isUpdatingUsername: boolean;
  initialNameForModal: string;
  handleConfirmUsername: (newName: string) => Promise<void>;
}> = (props) => {
  const {
    role, setRole, isLoginModalOpen, setIsLoginModalOpen, handleLogout,
    applications, onApprove, onReject, onSubmitApplication,
    authorizedProRoles, setAuthorizedProRoles, followedUsers, handleFollow,
    notifications, setNotifications, handleMarkNotificationsRead, posts, setPosts,
    cartItems, onAddToCart, onUpdateCartQuantity, onRemoveFromCart,
    userName, userAvatar, currentUserId,
    isSwitchingRole, roleSwitchTarget, handleRoleSwitch,
    showUsernameModal, setShowUsernameModal, isUpdatingUsername,
    initialNameForModal, handleConfirmUsername
  } = props;

  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  const pendingCount = applications.filter(a => a.status === 'PENDING').length;
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;
  const hasUnreadNotifications = unreadNotificationsCount > 0;

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    const handleScroll = () => setIsScrolled(scrollContainer.scrollTop > 50);
    scrollContainer.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const headerActive = isScrolled || !isHomePage;

  const onLogoutClick = () => {
    handleLogout();
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const toggleNotifications = () => {
    if (isNotificationsOpen) {
      // Mark as read when closing
      handleMarkNotificationsRead();
    }
    setIsNotificationsOpen(prev => !prev);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.bookingId) {
      navigate('/bookings-admin');
    }
    // Add more navigation logic for other notification types if needed
    setIsNotificationsOpen(false); // Close panel after clicking
    handleMarkNotificationsRead(); // Mark all as read when interacting
  };

  const getThemeColor = () => {
    if (role === 'COACH') return 'rose';
    if (role === 'COURT_OWNER') return 'amber';
    if (role === 'ADMIN') return 'indigo';
    return 'blue';
  };
  const themeColor = getThemeColor();

  const isSimulating = (role === 'COACH' || role === 'COURT_OWNER') && authorizedProRoles.length === 0;
  const canSwitchRole = authorizedProRoles.length > 0 || isSimulating;


  return (
    <div className="min-h-screen h-full w-full flex flex-col md:flex-row relative text-slate-900 overflow-hidden" style={{ backgroundColor: '#F5F5F0' }}>
      {role !== 'guest' && !isAuthPage && (
        <aside className={`hidden md:flex flex-col sticky top-0 h-screen shadow-xl transition-all duration-300 ease-in-out relative ${isSidebarCollapsed ? 'w-20' : 'w-72'} z-50 rounded-r-3xl`} style={{ backgroundColor: '#1E40AF' }}>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 bottom-12 w-6 h-6 border rounded-full flex items-center justify-center shadow-md z-[60] transition-all hover:scale-110 active:scale-95 cursor-pointer bg-white border-slate-200 text-slate-600"
          >
            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <div className={`p-8 flex items-center mb-4 ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}>
            <Link to="/" className="flex items-center gap-3 font-black text-2xl tracking-tighter shrink-0 transition-all">
              <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="w-16 h-16 object-contain rounded-xl" />
              {!isSidebarCollapsed && (
                <div className="animate-in fade-in duration-500 text-white font-black flex flex-col leading-none">
                  <span className="text-2xl">PICKLEPLAY</span>
                  <span className="text-xs tracking-wider opacity-80">PHILIPPINES</span>
                </div>
              )}
            </Link>
          </div>

          <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-hide">
            <NavItem to="/dashboard" icon={<LayoutDashboard size={22} />} label="Overview" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
            {role === 'ADMIN' && (
              <div className="relative space-y-1.5">
                <NavItem to="/admin" icon={<ShieldCheck size={22} />} label="Admin Console" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                {pendingCount > 0 && <span className={`absolute ${isSidebarCollapsed ? 'top-1 right-2' : 'top-3 right-4'} w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse`}>{pendingCount}</span>}
                <NavItem to="/teams" icon={<UsersRound size={22} />} label="Manage Squads" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
              </div>
            )}
            {role === 'PLAYER' && (
              <>
                <NavItem to="/booking" icon={<Calendar size={22} />} label="Book Courts" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                <NavItem to="/tournaments" icon={<Trophy size={22} />} label="Tournaments" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                <NavItem to="/coaches" icon={<GraduationCap size={22} />} label="Find a Coach" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                <NavItem to="/community" icon={<Globe size={22} />} label="Community Hub" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                <NavItem to="/teams" icon={<UsersRound size={22} />} label="My Squads" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
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
                <NavItem to="/courts" icon={<Building2 size={22} />} label="Manage Courts" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                <NavItem to="/bookings-admin" icon={<Calendar size={22} />} label="Court Bookings" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                <NavItem to="/court-calendar" icon={<CalendarIcon size={22} />} label="Court Events" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                <NavItem to="/tournaments-admin" icon={<Trophy size={22} />} label="Manage Tournaments" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                <NavItem to="/revenue" icon={<BarChart3 size={22} />} label="Revenue Analytics" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
              </>
            )}
            <NavItem to="/news" icon={<Newspaper size={22} />} label="Newsfeed" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
            <div className={`pt-4 mt-4 border-t border-white/20 ${isSidebarCollapsed ? 'mx-auto w-8' : ''}`}>
              <p className={`text-[11px] font-black uppercase tracking-widest px-4 mb-2 ${isSidebarCollapsed ? 'hidden' : 'block'} text-white/60`}>Marketplace</p>
              <NavItem to="/shop" icon={<ShoppingBag size={22} />} label="Pro Shop" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
            </div>
          </nav>

          <div className="relative p-4 border-t space-y-3 border-white/20" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            {canSwitchRole && !isSidebarCollapsed && (
              <div className="relative">
                {/* 2 roles: Simple toggle button */}
                {authorizedProRoles.length === 1 && (
                  <button onClick={async () => {
                    const nextRole: UserRole = role === 'PLAYER' ? authorizedProRoles[0] : 'PLAYER';
                    handleRoleSwitch(nextRole);
                  }} className="w-full p-4 rounded-2xl flex items-center justify-between transition-all group border bg-slate-900 border-slate-800 text-white hover:bg-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-lime-400 text-slate-950 shadow-lg shadow-lime-900/20">
                        <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">
                          {isSimulating ? 'Simulation Active' : (role === 'PLAYER' ? 'Pro Mode' : `${role.replace('_', ' ')} Mode`)}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
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
                      className="w-full p-4 rounded-2xl flex items-center justify-between transition-all group border bg-slate-900 border-slate-800 text-white hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-lime-400 text-slate-950 shadow-lg shadow-lime-900/20">
                          <RefreshCw size={18} className={`transition-transform duration-500 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase tracking-widest leading-none">
                            {isSimulating ? 'Simulation Active' : (role === 'PLAYER' ? 'Player Mode' : `${role.replace('_', ' ')} Mode`)}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Switch Role
                          </p>
                        </div>
                      </div>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isRoleDropdownOpen && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
                        <div className="p-2 space-y-1">
                          {/* Player option */}
                          <button
                            onClick={() => {
                              handleRoleSwitch('PLAYER');
                              setIsRoleDropdownOpen(false);
                            }}
                            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left ${
                              role === 'PLAYER' 
                                ? 'bg-lime-400 text-slate-900' 
                                : 'text-white/80 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            <User size={16} />
                            <span className="text-[11px] font-black uppercase tracking-widest">Player</span>
                            {role === 'PLAYER' && <div className="ml-auto w-2 h-2 rounded-full bg-slate-900" />}
                          </button>

                          {/* Pro role options */}
                          {authorizedProRoles.map((proRole) => (
                            <button
                              key={proRole}
                              onClick={() => {
                                handleRoleSwitch(proRole);
                                setIsRoleDropdownOpen(false);
                              }}
                              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left ${
                                role === proRole 
                                  ? 'bg-lime-400 text-slate-900' 
                                  : 'text-white/80 hover:bg-slate-700 hover:text-white'
                              }`}
                            >
                              {proRole === 'COACH' ? <GraduationCap size={16} /> : <Building2 size={16} />}
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
                    handleRoleSwitch(nextRole);
                  }} className="w-full p-4 rounded-2xl flex items-center justify-between transition-all group border bg-slate-900 border-slate-800 text-white hover:bg-slate-800">
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

            <div className={`flex items-center gap-2 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
              <Link to="/profile" title={isSidebarCollapsed ? "Profile Settings" : ""} className={`flex-1 flex items-center gap-3 w-full p-2 transition-all duration-300 group ${isSidebarCollapsed ? 'justify-center' : "rounded-2xl bg-white/10 hover:bg-white/20 pr-4"}`}>
                <div className={`relative shrink-0 rounded-full p-0.5`}>
                  <img
                    src={userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName || role}`}
                    alt="User"
                    className="w-10 h-10 rounded-full bg-white border-2 border-white"
                  />
                </div>
                {!isSidebarCollapsed && (
                  <div className="overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300 flex-1">
                    <p className="text-sm font-black truncate leading-none capitalize text-white">{userName || role.replace('_', ' ').toLowerCase()}</p>
                    <p className="text-[10px] text-white/60 uppercase font-black tracking-widest mt-1 leading-none">{role}</p>
                  </div>
                )}
              </Link>
              {!isSidebarCollapsed && (
                <button onClick={toggleNotifications} className={`relative p-3 rounded-full transition-all duration-300 ${isNotificationsOpen ? 'bg-white text-blue-600 shadow-xl scale-110' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
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
            }} onNotificationClick={handleNotificationClick} />}

            <button onClick={onLogoutClick} className={`w-full flex items-center gap-3 py-4 rounded-2xl transition-all text-sm font-black uppercase tracking-widest ${isSidebarCollapsed ? 'justify-center' : 'px-6'} text-white/70 hover:text-white hover:bg-white/10`} title={isSidebarCollapsed ? "Logout" : ""}>
              <LogOut size={20} className="shrink-0" />
              {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">Log Out</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Mobile Top Header */}
      {!isAuthPage && (
        <header className={`md:hidden fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-50 transition-all duration-300 ${headerActive || role !== 'guest' ? 'bg-white/95 backdrop-blur-md border-b border-slate-100' : 'bg-transparent'}`}>
          <Link to="/" className={`flex items-center gap-2 font-black text-xl tracking-tighter ${headerActive || role !== 'guest' ? 'text-slate-900' : 'text-white'}`}>
            <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="w-8 h-8 object-contain rounded-lg" />
            <div className="flex flex-col leading-none">
              <span className="text-xl">PICKLEPLAY</span>
              <span className="text-[10px] tracking-wider opacity-70">PHILIPPINES</span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            {role === 'guest' ? (
              <Link to="/login" className={`p-2 rounded-xl border ${headerActive ? 'bg-slate-900 text-white border-slate-900' : 'bg-white/10 text-white border-white/20'}`}><LogIn size={20} /></Link>
            ) : (
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}
          </div>
        </header>
      )}

      {/* Mobile Sidebar/Menu Overlay */}
      {isMobileMenuOpen && role !== 'guest' && (
        <div className="md:hidden fixed inset-0 z-[60] bg-slate-950/20 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl animate-in slide-in-from-right duration-500 p-8 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Menu</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-900"><X size={24} /></button>
            </div>
            <nav className="flex-1 space-y-2">
              <NavItem to="/dashboard" icon={<LayoutDashboard size={22} />} label="Overview" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} />
              {role === 'ADMIN' && <NavItem to="/admin" icon={<ShieldCheck size={22} />} label="Admin Console" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} />}
              {role === 'PLAYER' && (
                <>
                  <NavItem to="/booking" icon={<Calendar size={22} />} label="Book Courts" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} />
                  <NavItem to="/tournaments" icon={<Trophy size={22} />} label="Tournaments" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} />
                  <NavItem to="/community" icon={<Globe size={22} />} label="Community Hub" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} />
                  <NavItem to="/teams" icon={<UsersRound size={22} />} label="My Squads" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} />
                </>
              )}
              {role === 'COACH' && (
                <>
                  <NavItem to="/students" icon={<GraduationCap size={22} />} label="My Students" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} />
                  <NavItem to="/clinics" icon={<Trophy size={22} />} label="Manage Clinics" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} />
                  <NavItem to="/schedule" icon={<Calendar size={22} />} label="Lesson Schedule" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} />
                </>
              )}
              {role === 'COURT_OWNER' && (
                <>
                  <NavItem to="/courts" icon={<Building2 size={22} />} label="Manage Courts" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} />
                  <NavItem to="/bookings-admin" icon={<Calendar size={22} />} label="Court Bookings" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} />
                  <NavItem to="/court-calendar" icon={<CalendarIcon size={22} />} label="Court Events" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} />
                  <NavItem to="/tournaments-admin" icon={<Trophy size={22} />} label="Manage Tournaments" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} />
                  <NavItem to="/revenue" icon={<BarChart3 size={22} />} label="Revenue Analytics" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} />
                </>
              )}
              <NavItem to="/news" icon={<Newspaper size={22} />} label="News" isCollapsed={false} themeColor={themeColor} onClick={() => setIsMobileMenuOpen(false)} />
              <div className="border-t border-slate-100 my-4" />
              
              // ...existing code...
            </nav>
            <button onClick={onLogoutClick} className="mt-auto flex items-center gap-3 py-4 text-rose-600 font-black uppercase text-xs tracking-widest"><LogOut size={20} /> Log Out</button>
          </div>
        </div>
      )}

      {/* Guest Desktop Header */}
      {role === 'guest' && !isAuthPage && (
        <header className={`hidden md:flex fixed top-4 left-4 right-4 md:left-12 md:right-12 h-20 z-50 transition-all duration-300 rounded-full border items-center px-12 justify-between ${headerActive ? 'bg-white/95 backdrop-blur-md border-slate-200 shadow-xl' : 'bg-transparent border-white/10'}`}>
          <Link to="/" className={`flex items-center gap-2 font-black text-2xl tracking-tighter transition-colors ${headerActive ? 'text-slate-950' : 'text-white'}`}>
            <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="w-10 h-10 object-contain rounded-xl" />
            <div className="flex flex-col leading-none">
              <span className="text-2xl">PICKLEPLAY</span>
              <span className="text-xs tracking-wider opacity-70">PHILIPPINES</span>
            </div>
          </Link>
          <nav className={`hidden md:flex items-center gap-8 font-black text-sm uppercase tracking-[0.2em] transition-colors ${headerActive ? 'text-slate-600' : 'text-white/80'}`}>
            <Link to="/academy" className={`transition-colors ${headerActive ? 'hover:text-blue-600' : 'hover:text-white'}`}>PLAY GUIDE</Link>
            <Link to="/shop" className={`transition-colors ${headerActive ? 'hover:text-blue-600' : 'hover:text-white'}`}>PRO SHOP</Link>
            <Link to="/news" className={`transition-colors ${headerActive ? 'hover:text-blue-600' : 'hover:text-white'}`}>NEWS</Link>
            <Link to="/login" className={`px-8 py-3.5 rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-2 font-black ${headerActive ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700' : 'bg-white text-slate-950 hover:bg-lime-400 shadow-black/20'}`}><LogIn size={18} /> CLIENT ACCESS</Link>
          </nav>
        </header>
      )}

      <main ref={scrollContainerRef} className={`flex-1 flex flex-col h-screen overflow-y-auto relative scroll-smooth transition-all ${role !== 'guest' && !isAuthPage ? 'pt-16 pb-20 md:pt-0 md:pb-0' : ''}`} style={{ backgroundColor: '#F5F5F0' }}>
        <div className={`${role === 'guest' ? '' : 'p-4 md:p-8 lg:p-14 max-w-[1920px] mx-auto w-full'} transition-colors duration-300`}>
          <div key={location.pathname} className="animate-route-transition">
            <Routes location={location}>
              <Route path="/" element={role === 'guest' ? <Home /> : <Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/shop" element={<Shop cartItems={cartItems} onAddToCart={onAddToCart} onUpdateCartQuantity={onUpdateCartQuantity} onRemoveFromCart={onRemoveFromCart} />} />
              <Route path="/news" element={<div className="p-4 md:p-8 pt-24 max-w-[1800px] mx-auto w-full"><News /></div>} />
              <Route path="/academy" element={<div className="p-4 md:p-8 pt-24 max-w-[1800px] mx-auto w-full"><Academy /></div>} />
              <Route path="/rankings" element={<div className="p-4 md:p-8 pt-24 max-w-[1800px] mx-auto w-full"><Rankings /></div>} />
              <Route path="/dashboard" element={role !== 'guest' ? <Dashboard userRole={role} onSubmitApplication={onSubmitApplication} setRole={setRole} applications={applications} isSidebarCollapsed={isSidebarCollapsed} userName={userName} authorizedProRoles={authorizedProRoles} currentUserId={currentUserId} /> : <Navigate to="/" />} />
              <Route path="/booking" element={role === 'guest' ? <GuestBooking /> : <Booking />} />
              <Route path="/tournaments" element={role !== 'guest' ? <Tournaments /> : <Navigate to="/" />} />
              <Route path="/coaches" element={role !== 'guest' ? <Coaches currentUserId={currentUserId} /> : <Navigate to="/" />} />
              <Route path="/community" element={role !== 'guest' ? <Community posts={posts} setPosts={setPosts} followedUsers={followedUsers} onFollow={handleFollow} /> : <Navigate to="/" />} />
              <Route path="/teams" element={role !== 'guest' ? <Teams userRole={role} isSidebarCollapsed={isSidebarCollapsed} /> : <Navigate to="/" />} />
              <Route path="/profile" element={role !== 'guest' ? <Profile userRole={role} authorizedProRoles={authorizedProRoles} currentUserId={currentUserId} followedUsers={followedUsers} onFollow={handleFollow} posts={posts} setPosts={setPosts} onRoleSwitch={handleRoleSwitch} /> : <Navigate to="/" />} />
              <Route path="/profile/:userId" element={role !== 'guest' ? <Profile userRole={role} authorizedProRoles={authorizedProRoles} currentUserId={currentUserId} followedUsers={followedUsers} onFollow={handleFollow} posts={posts} setPosts={setPosts} onRoleSwitch={handleRoleSwitch} /> : <Navigate to="/" />} />

              {/* Specialized Coach Routes */}
              <Route path="/students" element={role !== 'guest' ? <Students currentUserId={currentUserId} /> : <Navigate to="/" />} />
              <Route path="/clinics" element={role !== 'guest' ? <Clinics currentUserId={currentUserId} /> : <Navigate to="/" />} />
              <Route path="/schedule" element={role !== 'guest' ? <Schedule currentUserId={currentUserId} /> : <Navigate to="/" />} />

              {/* Specialized Court Owner Routes */}
              <Route path="/courts" element={role !== 'guest' ? <Courts /> : <Navigate to="/" />} />
              <Route path="/bookings-admin" element={role !== 'guest' ? <BookingsAdmin /> : <Navigate to="/" />} />
              <Route path="/court-calendar" element={role !== 'guest' ? <CourtCalendar /> : <Navigate to="/" />} />
              <Route path="/tournaments-admin" element={role !== 'guest' ? <TournamentsManager /> : <Navigate to="/" />} />
              <Route path="/revenue" element={role !== 'guest' ? <Revenue /> : <Navigate to="/" />} />

              <Route path="/admin" element={role === 'ADMIN' ? <AdminDashboard applications={applications} onApprove={onApprove} onReject={onReject} currentAdminRole={role} /> : <Navigate to="/" />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </main>

      <MobileBottomNav role={role} themeColor={themeColor} />

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
  const [authorizedProRoles, setAuthorizedProRoles] = useState<UserRole[]>([]);
  const [followedUsers, setFollowedUsers] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [roleSwitchTarget, setRoleSwitchTarget] = useState<UserRole>('PLAYER');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [initialNameForModal, setInitialNameForModal] = useState('');

  useEffect(() => {
    // 0. Test Connection
    import('./services/backend').then(({ backend }) => {
      backend.checkConnection().then(result => {
        if (result.success) {
          console.log('✅ System Backend Status: CONNECTED');
        } else {
          console.warn('❌ System Backend Status: DISCONNECTED -', result.message);
        }
      });
    });

    // 1. Robust Session Sync Logic
    const syncUserSession = async (session: any) => {
      if (!session?.user) {
        setRole('guest');
        setAuthorizedProRoles([]);
        setUserName(null);
        setUserAvatar(null);
        setCurrentUserId(null);
        return;
      }

      setCurrentUserId(session.user.id);

      // Initial state from session auth metadata
      const userRolesMeta = session.user.app_metadata?.roles as UserRole[] || [];
      const activeRoleMeta = session.user.app_metadata?.active_role as UserRole || 'PLAYER';

      // Set initial state immediately to allow login
      setRole(activeRoleMeta);
      setAuthorizedProRoles(userRolesMeta.filter(r => r === 'COACH' || r === 'COURT_OWNER'));

      try {
        // Parallel fetch for profile and professional applications
        const [profileRes, appsRes] = await Promise.all([
          supabase.from('profiles').select('full_name, username, active_role, roles, avatar_url').eq('id', session.user.id).single(),
          supabase.from('professional_applications')
            .select('requested_role')
            .eq('profile_id', session.user.id)
            .eq('status', 'APPROVED')
            .in('requested_role', ['COACH', 'COURT_OWNER'])
        ]);

        let consolidatedRoles: UserRole[] = [];
        let dbRoles: UserRole[] = [];

        // Update profile data if available
        if (profileRes.data) {
          setUserName(profileRes.data.full_name);
          setUserAvatar(profileRes.data.avatar_url);

          // Trigger onboarding modal if it's a social login and the username hasn't been set
          const isSocialLogin = session.user.app_metadata?.provider === 'google' || session.user.app_metadata?.provider === 'facebook';

          if (isSocialLogin && !profileRes.data.username) {
            setInitialNameForModal(profileRes.data.full_name || '');
            setShowUsernameModal(true);
          }

          const activeFromDB = profileRes.data.active_role as UserRole;
          if (activeFromDB) {
            setRole(activeFromDB);
          }
          dbRoles = (profileRes.data.roles as UserRole[]) || ['PLAYER'];
          consolidatedRoles = [...dbRoles];
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
          console.log('Self-healing triggered: Updating roles array in database...');
          await supabase
            .from('profiles')
            .update({ roles: allPossibleRoles })
            .eq('id', session.user.id);
          consolidatedRoles = allPossibleRoles;
        }

        const proRolesOnly = consolidatedRoles.filter(r => r === 'COACH' || r === 'COURT_OWNER' || r === 'ADMIN');
        setAuthorizedProRoles(proRolesOnly);

      } catch (err) {
        console.error('Error syncing user data:', err);
      }
    };

    // 2. Auth Initialization
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncUserSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUserSession(session);
    });

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
          profiles!profile_id (full_name, avatar_url, active_role),
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
            }))
        }));
        setPosts(mappedPosts);
      } else if (postsError) {
        console.error('Error fetching community posts:', postsError);
      }

      // 3. Fetch initial notifications
      if (session?.user) {
        const { data: notifs, error: notifError } = await supabase
          .from('notifications')
          .select('*, profiles!notifications_actor_id_fkey(full_name, avatar_url)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!notifError && notifs) {
          const mappedNotifs: Notification[] = notifs.map(n => ({
            id: n.id,
            type: n.type as any,
            message: n.message,
            actor: {
              name: n.profiles?.full_name || 'System',
              avatar: n.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor_id}`,
              id: n.actor_id
            },
            timestamp: n.created_at,
            isRead: n.is_read,
            bookingId: n.booking_id,
            metadata: n.metadata
          }));
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
  }, [currentUserId]);

  // Separate Effect for Community Feed Realtime
  useEffect(() => {
    const channel = supabase
      .channel('community-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, async (payload) => {
        const newPostRow = payload.new as any;

        // Fetch author info
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, active_role')
          .eq('id', newPostRow.profile_id)
          .single();

        const newPost: SocialPost = {
          id: newPostRow.id,
          authorId: newPostRow.profile_id,
          authorName: profile?.full_name || 'Anonymous',
          authorAvatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newPostRow.profile_id}`,
          authorRole: profile?.active_role as UserRole,
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
        // Note: DELETE payload only has 'old' and only if primary key is present
        // Since post_id, profile_id is PK, it should be there.
        setPosts(prev => prev.map(p => {
          if (p.id === oldLike.post_id) {
            return { ...p, likes: p.likes.filter(id => id !== oldLike.profile_id) };
          }
          return p;
        }));
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

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', newNotif.actor_id)
          .single();

        const mappedNewNotif: Notification = {
          id: newNotif.id,
          type: newNotif.type as any,
          message: newNotif.message,
          actor: {
            name: profile?.full_name || 'System',
            avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newNotif.actor_id}`,
            id: newNotif.actor_id
          },
          timestamp: newNotif.created_at,
          isRead: newNotif.is_read,
          bookingId: newNotif.booking_id
        };

        setNotifications(prev => [mappedNewNotif, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const handleRoleSwitch = async (newRole: UserRole) => {
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
      // Small delay to ensure state update is processed before navigation
      setTimeout(() => {
        window.location.hash = '#/dashboard';
      }, 100);
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
    await supabase.auth.signOut();
    setRole('guest');
    setAuthorizedProRoles([]);
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

        // Send notification (optional, can be done via DB trigger too)
        await supabase.from('notifications').insert({
          user_id: userId,
          actor_id: currentUserId,
          type: 'FOLLOW',
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

      // 4. Update UI State
      setApplications(apps => apps.map(a => a.id === id ? { ...a, status: 'APPROVED' } : a));
      alert(`Application approved! ${application.playerName} is now a ${newRole}.`);
    } catch (err: any) {
      console.error('Approval Error:', err.message);
      alert('Failed to approve application: ' + err.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('professional_applications')
        .update({ status: 'REJECTED', processed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

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


  return (
    <Router>
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
        currentUserId={currentUserId}
        isSwitchingRole={isSwitchingRole}
        roleSwitchTarget={roleSwitchTarget}
        handleRoleSwitch={handleRoleSwitch}
        showUsernameModal={showUsernameModal}
        setShowUsernameModal={setShowUsernameModal}
        isUpdatingUsername={isUpdatingUsername}
        initialNameForModal={initialNameForModal}
        handleConfirmUsername={handleConfirmUsername}
      />
      {isSwitchingRole && <RoleSwitchOverlay targetRole={roleSwitchTarget} />}
    </Router>
  );
};

export default App;