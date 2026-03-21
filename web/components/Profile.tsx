import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getOrCreateConversation, checkMutualFollow } from '../services/directMessages';
import {
  User,
  MapPin,
  Save,
  Sparkles,
  UserPlus,
  UserCheck,
  Lock,
  Shield,
  Bell,
  Eye,
  Globe,
  CreditCard,
  BarChart3,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  LogOut,
  Loader2,
  ArrowLeft,
  ArrowLeftRight,
  ChevronDown,
  Clock,
  Move,
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Calendar,
  ShoppingBag,
  Star,
  QrCode,
  Smartphone,
  Trophy,
  MessageCircle,
  Building2,
  Copy,
  Share2,
  ExternalLink,
  Users,
  Mail
} from 'lucide-react';
import QRCodeLib from 'qrcode';
import { UserRole, SocialPost } from '../types';
import { supabase, getActiveSessions, revokeSession, revokeAllSessions, getSecuritySettings } from '../services/supabase';
import { disableTwoFactorAuth, sendTwoFactorCode, verifyTwoFactorCode } from '../services/twoFactorAuth';
import { getAuthCallbackUrl } from '../services/authRedirects';
import {
  isSecurityTrustStillValid,
  startSecurityReauth,
  type SecurityReauthAction,
  updateEmailWithTrust,
  updatePasswordWithReauth,
  verifySecurityTrust,
} from '../services/securityReauth';
import { getReceivedRatings } from '../services/matches';
import { Skeleton } from './ui/Skeleton';
import NotFound from './NotFound';
import { PostCard } from './community';
import SecurityReauthModal from './SecurityReauthModal';

interface ProfileProps {
  userRole: UserRole;
  authorizedProRoles: UserRole[];
  currentUserId: string | null;
  followedUsers: string[];
  onFollow: (userId: string, userName: string) => void;
  posts: SocialPost[];
  setPosts: React.Dispatch<React.SetStateAction<SocialPost[]>>;
  onRoleSwitch?: (newRole: UserRole) => void;
}

const PlayerIDCard: React.FC<{
  profileData: any;
  avatarUrl: string;
  isCurrentUser: boolean;
  onUploadClick: () => void;
  qrCodeDataUrl: string | null;
}> = ({ profileData, avatarUrl, isCurrentUser, onUploadClick, qrCodeDataUrl }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Format Member Since
  const memberSince = profileData?.created_at
    ? new Date(profileData.created_at).getFullYear()
    : new Date().getFullYear();

  const playerId = `PP${(profileData?.id || '000000').slice(0, 8).toUpperCase()}`;
  const skillLevel = profileData?.dupr_rating
    ? profileData.dupr_rating >= 5.0 ? 'ELITE PRO' : profileData.dupr_rating >= 4.0 ? 'ADVANCED' : profileData.dupr_rating >= 3.0 ? 'INTERMEDIATE' : 'BEGINNER'
    : 'INTERMEDIATE';

  return (
    <div className="flex flex-col items-center gap-5 py-8 w-full px-4">
      <div
        className="relative w-full max-w-[480px] cursor-pointer group select-none"
        style={{ perspective: '2000px' }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* ═══ FLIP CONTAINER ═══ */}
        <div
          className={`relative w-full transition-all duration-1000 preserve-3d shadow-[0_16px_50px_rgba(0,0,0,0.35)] rounded-[20px] ${isFlipped ? 'rotate-y-180' : ''}`}
          style={{ aspectRatio: '1.55 / 1' }}
        >
          {/* ═══════════ FRONT ═══════════ */}
          <div className="absolute inset-0 backface-hidden bg-slate-950 rounded-[20px] overflow-hidden border border-white/10 ring-1 ring-white/10">
            {/* Background glow effects */}
            <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[140%] bg-blue-600/15 rounded-full blur-[80px] pointer-events-none animate-pulse" />
            <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[100%] bg-lime-400/10 rounded-full blur-[60px] pointer-events-none" />

            {/* Ball.png background decorations */}
            <img src="/images/Ball.png" alt="" className="absolute -top-5 -right-5 w-[35%] opacity-[0.06] pointer-events-none select-none" draggable={false} />
            <img src="/images/Ball.png" alt="" className="absolute -bottom-3 right-[15%] w-[18%] opacity-[0.04] pointer-events-none select-none rotate-45" draggable={false} />
            <img src="/images/Ball.png" alt="" className="absolute top-1/2 -translate-y-1/2 left-[45%] w-[42%] opacity-[0.03] pointer-events-none select-none" draggable={false} />

            {/* Glass Overlay */}
            <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[1px] rounded-[20px]" />

            <div className="relative h-full flex flex-col p-[5%] z-10">
              {/* ── Header Row ── */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-[2.5%]">
                  <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay Logo" className="w-[11%] min-w-[32px] aspect-square rounded-xl object-cover shadow-lg" />
                  <div>
                    <span className="text-[clamp(12px,3.5vw,20px)] font-black text-white italic tracking-tighter uppercase leading-none block">PicklePlay<span className="text-lime-400">.ph</span></span>
                    <span className="text-[clamp(5px,1.5vw,7px)] font-black text-white/30 uppercase tracking-[0.25em] mt-0.5 block">Official Player ID</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-full border border-white/10 flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                  <span className="text-[clamp(5px,1.5vw,8px)] font-black text-white uppercase tracking-widest">Digital Auth</span>
                </div>
              </div>

              {/* ── Middle Section: Avatar + Player Info ── */}
              <div className="flex items-center gap-[4%] mt-[3%] flex-1">
                {/* Avatar */}
                <div className="relative group/avatar flex-shrink-0">
                  <div className="w-[27%] min-w-[72px] aspect-square rounded-[18px] overflow-hidden border-2 border-lime-400/50 shadow-2xl bg-slate-900 ring-2 ring-white/5"
                    style={{ width: 'clamp(72px, 22vw, 110px)' }}
                  >
                    <img
                      src={avatarUrl || profileData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData?.full_name}`}
                      className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-500"
                      alt="Player Photo"
                    />
                  </div>
                  {isCurrentUser && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onUploadClick(); }}
                      className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-2xl hover:bg-blue-500 transition-all border-2 border-slate-950 z-10 hover:scale-110 active:scale-95"
                      title="Change Photo"
                    >
                      <Camera size={15} />
                    </button>
                  )}
                </div>

                {/* Player info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-[clamp(14px,4vw,24px)] font-black text-white uppercase tracking-tight leading-tight drop-shadow-md" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                    {profileData?.full_name || 'Player Name'}
                  </h4>
                  <div className="flex flex-col gap-0.5 mt-[4%]">
                    <div className="flex items-center gap-2">
                      <span className="text-[clamp(7px,2vw,11px)] font-black text-white/40 uppercase tracking-widest">ID NO.</span>
                      <span className="text-[clamp(8px,2.2vw,12px)] font-black text-lime-400 tracking-wider">{playerId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[clamp(7px,2vw,11px)] font-black text-white/40 uppercase tracking-widest">ISSUED</span>
                      <span className="text-[clamp(8px,2.2vw,12px)] font-black text-white/80 tracking-wider">{memberSince}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Bottom Bar ── */}
              <div className="flex items-end justify-between border-t border-white/10 pt-[2.5%] mt-[2%]">
                <div className="flex flex-col">
                  <span className="text-[clamp(5px,1.3vw,8px)] font-black text-white/30 uppercase tracking-[0.15em] mb-0.5">Skill Classification</span>
                  <span className="text-[clamp(10px,2.8vw,14px)] font-black text-lime-400 uppercase tracking-[0.05em]">{skillLevel}</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="px-2.5 h-[clamp(24px,7vw,32px)] bg-white/5 rounded-xl flex items-center gap-1.5 border border-white/10 hover:bg-white/10 transition-colors">
                    <Star size={12} className="text-lime-400 fill-lime-400" />
                    <span className="text-[clamp(10px,2.8vw,14px)] font-black text-white italic">{profileData?.dupr_rating?.toFixed(2) || '4.00'}</span>
                  </div>
                  <div className="aspect-square h-[clamp(24px,7vw,32px)] bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30 group-hover:bg-lime-400/20 transition-all group-hover:border-lime-400/50">
                    <QrCode size={15} className="text-blue-400 group-hover:text-lime-400 transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ BACK ═══════════ */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-950 rounded-[20px] overflow-hidden border border-white/10 flex flex-col items-center justify-between shadow-2xl">
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-blue-600/10 rounded-full blur-[60px] pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-lime-400/10 rounded-full blur-[60px] pointer-events-none" />

            {/* Ball.png background decorations on back */}
            <img src="/images/Ball.png" alt="" className="absolute top-[5%] left-[3%] w-[25%] opacity-[0.05] pointer-events-none select-none" draggable={false} />
            <img src="/images/Ball.png" alt="" className="absolute bottom-[5%] right-[3%] w-[20%] opacity-[0.04] pointer-events-none select-none rotate-12" draggable={false} />

            {/* Header */}
            <div className="w-full flex justify-between items-center px-[5%] pt-[5%] relative z-10">
              <span className="text-[clamp(6px,1.7vw,9px)] font-black text-white/25 uppercase tracking-[0.35em]">Player Validation System</span>
              <span className="text-[clamp(6px,1.7vw,9px)] font-black text-blue-400 uppercase tracking-widest px-2 py-1 bg-blue-400/10 rounded-md border border-blue-400/20">Active v2.5</span>
            </div>

            {/* QR Center */}
            <div className="flex flex-col items-center gap-[3%] flex-1 justify-center relative z-10 px-4">
              <div className="bg-white p-[2.5%] rounded-2xl shadow-[0_0_50px_rgba(163,230,53,0.15)] relative group/qr">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} className="w-[clamp(100px,28vw,160px)] h-[clamp(100px,28vw,160px)]" alt="QR ID" />
                ) : (
                  <div className="w-[clamp(100px,28vw,160px)] h-[clamp(100px,28vw,160px)] bg-slate-100 animate-pulse rounded-xl" />
                )}
                <div className="absolute -inset-1.5 border border-lime-400/30 rounded-[20px] pointer-events-none group-hover/qr:scale-105 transition-transform" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-[clamp(10px,2.5vw,14px)] font-black text-white tracking-[0.4em] uppercase border-y border-white/5 py-2">{playerId}</p>
                <p className="text-[clamp(6px,1.5vw,9px)] font-medium text-slate-500 uppercase tracking-widest pt-0.5">Scan to access verified match history & player stats</p>
              </div>
            </div>

            {/* Footer with logo */}
            <div className="w-full flex items-center justify-center gap-2 px-[5%] pb-[4%] relative z-10">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
              <div className="flex items-center gap-1.5">
                <img src="/images/PicklePlayLogo.jpg" alt="Logo" className="w-5 h-5 rounded-md object-cover opacity-50" />
                <span className="text-[clamp(7px,1.8vw,10px)] font-black text-white/40 tracking-widest uppercase italic">PicklePlay<span className="text-white/20">.ph</span></span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 animate-bounce mt-3">
        <p className="text-[clamp(8px,2vw,10px)] text-slate-500 font-bold uppercase tracking-[0.25em] flex items-center gap-2">
          Tap to Flip Card <ArrowLeftRight size={13} className="text-lime-400" />
        </p>
      </div>
    </div>
  );
};

const Profile: React.FC<ProfileProps> = ({ userRole, authorizedProRoles, currentUserId, followedUsers, onFollow, posts, setPosts, onRoleSwitch }) => {
  const MAX_NAME = 40;
  const MAX_LOCATION = 60;
  const MAX_BIO = 160;
  const { userId } = useParams<{ userId?: string }>();
  const isCurrentUser = !userId || userId === 'player-current';
  const profileId = isCurrentUser ? 'player-current' : userId;

  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMessaging, setIsMessaging] = useState(false);
  const [isMutualFollow, setIsMutualFollow] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Editable fields
  const [editedName, setEditedName] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState<'looking' | 'busy' | 'offline'>('offline');
  const [availabilityStart, setAvailabilityStart] = useState('');
  const [availabilityEnd, setAvailabilityEnd] = useState('');
  const [availabilityNote, setAvailabilityNote] = useState('');
  const [preferredSkillMin, setPreferredSkillMin] = useState('');
  const [preferredSkillMax, setPreferredSkillMax] = useState('');
  const [preferredLocationIds, setPreferredLocationIds] = useState<string[]>([]);
  const [preferredCourtIds, setPreferredCourtIds] = useState<string[]>([]);
  const [preferredLocationMode, setPreferredLocationMode] = useState<'auto' | 'manual'>('auto');
  const [preferredCourtType, setPreferredCourtType] = useState<'Indoor' | 'Outdoor' | 'Both'>('Both');
  const [availableLocations, setAvailableLocations] = useState<{ id: string; name: string; city?: string | null }[]>([]);
  const [availableCourts, setAvailableCourts] = useState<{ id: string; name: string; locationId?: string | null; courtType?: string | null }[]>([]);

  // Settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [tempVisibility, setTempVisibility] = useState('public');
  const [savedVisibility, setSavedVisibility] = useState('public');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'privacy' | 'security' | 'preferences' | 'billing' | 'stats'>('profile');
  const location = useLocation();
  const [selectedLanguage, setSelectedLanguage] = useState(localStorage.getItem('preferredLanguage') || 'en');
  const [isTranslating, setIsTranslating] = useState(false);

  // Security-specific state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [currentAuthEmail, setCurrentAuthEmail] = useState('');
  const [pendingEmailChange, setPendingEmailChange] = useState('');
  const [newEmailAddress, setNewEmailAddress] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isResendingEmailChange, setIsResendingEmailChange] = useState(false);
  const [emailChangeMessage, setEmailChangeMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSecurityReauthModal, setShowSecurityReauthModal] = useState(false);
  const [securityReauthAction, setSecurityReauthAction] = useState<SecurityReauthAction | null>(null);
  const [securityReauthCode, setSecurityReauthCode] = useState('');
  const [securityReauthMaskedEmail, setSecurityReauthMaskedEmail] = useState('');
  const [securityReauthCodeExpiresAt, setSecurityReauthCodeExpiresAt] = useState<string | null>(null);
  const [securityReauthResendCooldown, setSecurityReauthResendCooldown] = useState(0);
  const [securityReauthMessage, setSecurityReauthMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [isStartingSecurityReauth, setIsStartingSecurityReauth] = useState(false);
  const [isSubmittingSecurityReauth, setIsSubmittingSecurityReauth] = useState(false);
  const [emailChangeTrust, setEmailChangeTrust] = useState<{ token: string; expiresAt: string } | null>(null);

  // Auto-select tab from URL query param (e.g. /profile?tab=referral)
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab as any);
    }
  }, [location.search]);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isRevokingAllSessions, setIsRevokingAllSessions] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 2FA Configuration State
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [codeSent, setCodeSent] = useState(false); // Track if code was sent
  const [verificationCode, setVerificationCode] = useState('');
  const [isSending2FACode, setIsSending2FACode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [setupMaskedEmail, setSetupMaskedEmail] = useState('');
  const [setupResendCooldown, setSetupResendCooldown] = useState(0);
  const [setupCodeExpiresAt, setSetupCodeExpiresAt] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Confirmation Dialog State
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [profileSections, setProfileSections] = useState({
    identity: true,
    availability: false,
    matchmaking: false
  });

  // Profile message state
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (setupResendCooldown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSetupResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [setupResendCooldown]);

  useEffect(() => {
    if (securityReauthResendCooldown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSecurityReauthResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [securityReauthResendCooldown]);

  // QR Code state (for mobile app deep link)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Court Owner Referral QR Code state
  const [courtOwnerQrDataUrl, setCourtOwnerQrDataUrl] = useState<string | null>(null);
  const [showCourtOwnerQrModal, setShowCourtOwnerQrModal] = useState(false);

  // Player Referral QR Code state (with PicklePlayLogo overlay)
  const [playerQrDataUrl, setPlayerQrDataUrl] = useState<string | null>(null);

  // Referral tab mode toggle & share
  const [referralMode, setReferralMode] = useState<'player' | 'court-owner'>('player');
  const [showQrEnlargeModal, setShowQrEnlargeModal] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');

  // Image Cropper state
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropImageNaturalSize, setCropImageNaturalSize] = useState({ w: 0, h: 0 });
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);

  // Avatar Viewer state
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);

  // Background Editor state
  const [showBgEditor, setShowBgEditor] = useState(false);
  const [selectedBg, setSelectedBg] = useState<string>('gradient-1');
  const [bgOverlayImage, setBgOverlayImage] = useState<string | null>(null);
  const [bgOverlayPosition, setBgOverlayPosition] = useState({ x: 0, y: 0 });
  const [bgOverlayScale, setBgOverlayScale] = useState(1);
  const [isDraggingOverlay, setIsDraggingOverlay] = useState(false);
  const [overlayDragStart, setOverlayDragStart] = useState({ x: 0, y: 0 });
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgPreviewRef = useRef<HTMLDivElement>(null);

  // Predefined background options
  const backgroundOptions = [
    { id: 'gradient-1', label: 'Ocean', style: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'gradient-2', label: 'Sunset', style: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: 'gradient-3', label: 'Forest', style: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { id: 'gradient-4', label: 'Lime', style: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)' },
    { id: 'gradient-5', label: 'Night', style: 'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d2d6b 100%)' },
    { id: 'gradient-6', label: 'Gold', style: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)' },
    { id: 'gradient-7', label: 'Rose', style: 'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)' },
    { id: 'gradient-8', label: 'Arctic', style: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)' },
    { id: 'solid-1', label: 'White', style: '#ffffff' },
    { id: 'solid-2', label: 'Black', style: '#000000' },
    { id: 'solid-3', label: 'Blue', style: '#3b82f6' },
    { id: 'solid-4', label: 'Red', style: '#ef4444' },
  ];

  // Privacy message state
  const [privacyMessage, setPrivacyMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Auth provider detection (Google-only users can't use 2FA)
  const [hasPasswordAuth, setHasPasswordAuth] = useState(true);

  // Activity stats state
  const [activityStats, setActivityStats] = useState({
    totalBookings: 0,
    courtsVisited: 0,
    totalHours: 0,
    memberSince: ''
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Received ratings state
  const [receivedRatings, setReceivedRatings] = useState<any[]>([]);

  // Password strength calculator
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return Math.min(strength, 100);
  };

  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    setPasswordStrength(calculatePasswordStrength(value));
  };

  const normalizeEmailAddress = (value: string) => value.trim().toLowerCase();

  const getEmailChangeRedirectUrl = () => {
    return getAuthCallbackUrl({
      redirect: '/profile?tab=security&emailChange=confirmed',
    });
  };

  const getEmailUpdateErrorMessage = (message?: string) => {
    const normalizedMessage = message?.toLowerCase() || '';

    if (!normalizedMessage) {
      return 'Unable to update your email address right now. Please try again.';
    }

    if (normalizedMessage.includes('session') || normalizedMessage.includes('jwt') || normalizedMessage.includes('sign in')) {
      return 'Your session expired. Please sign in again to change your email address.';
    }

    if (
      normalizedMessage.includes('invalid email') ||
      normalizedMessage.includes('email address is invalid') ||
      normalizedMessage.includes('unable to validate email')
    ) {
      return 'Enter a valid email address.';
    }

    if (
      normalizedMessage.includes('already registered') ||
      normalizedMessage.includes('already in use') ||
      normalizedMessage.includes('already been registered') ||
      normalizedMessage.includes('email exists')
    ) {
      return 'That email address is already in use. Try a different one.';
    }

    return message || 'Unable to update your email address right now. Please try again.';
  };

  const getPasswordUpdateErrorMessage = (message?: string, code?: string) => {
    const normalizedCode = String(code || '').toLowerCase();
    const normalizedMessage = message?.toLowerCase() || '';

    if (
      normalizedCode === 'invalid_code' ||
      normalizedCode === 'reauthentication_not_valid' ||
      normalizedMessage.includes('security code') ||
      normalizedMessage.includes('reauthentication')
    ) {
      return 'That security code is invalid or has expired. Request a new one and try again.';
    }

    if (normalizedCode === 'current_password_mismatch') {
      return 'Your current password is incorrect.';
    }

    if (normalizedCode === 'current_password_required') {
      return 'Enter your current password to continue.';
    }

    if (normalizedCode === 'same_password') {
      return 'Your new password must be different from your current password.';
    }

    if (normalizedCode === 'weak_password') {
      return message || 'Your new password is too weak. Use a stronger password and try again.';
    }

    if (normalizedMessage.includes('session') || normalizedMessage.includes('sign in') || normalizedMessage.includes('token')) {
      return 'Your session expired. Please sign in again to continue.';
    }

    return message || 'Unable to update your password right now. Please try again.';
  };

  const getSecurityReauthErrorMessage = (message?: string, code?: string) => {
    const normalizedCode = String(code || '').toLowerCase();
    const normalizedMessage = message?.toLowerCase() || '';

    if (
      normalizedCode === 'invalid_code' ||
      normalizedCode === 'expired_code' ||
      normalizedCode === 'reauthentication_not_valid'
    ) {
      return normalizedCode === 'expired_code'
        ? 'That security code expired. Request a new one to continue.'
        : 'That security code is invalid. Check the latest email and try again.';
    }

    if (normalizedCode.startsWith('trust_')) {
      if (normalizedCode === 'trust_action_mismatch') {
        return 'That security approval belongs to a different action. Please verify again.';
      }

      if (normalizedCode === 'trust_expired') {
        return 'Your security approval expired. Please verify again to continue.';
      }

      if (normalizedCode === 'trust_already_used') {
        return 'That security approval was already used. Please verify again.';
      }

      return 'For your security, please verify again before continuing.';
    }

    if (normalizedCode === 'email_not_confirmed') {
      return 'Please verify your email address before requesting a security code.';
    }

    if (normalizedMessage.includes('session') || normalizedMessage.includes('sign in') || normalizedMessage.includes('token')) {
      return 'Your session expired. Please sign in again to continue.';
    }

    return message || 'We could not verify this secure action. Please try again.';
  };

  const closeSecurityReauthModal = () => {
    setShowSecurityReauthModal(false);
    setSecurityReauthAction(null);
    setSecurityReauthCode('');
    setSecurityReauthMaskedEmail('');
    setSecurityReauthCodeExpiresAt(null);
    setSecurityReauthResendCooldown(0);
    setSecurityReauthMessage(null);
    setIsStartingSecurityReauth(false);
    setIsSubmittingSecurityReauth(false);
  };

  const openSecurityReauthFlow = async (
    action: SecurityReauthAction,
    forceResend = false,
    initialMessage: { type: 'success' | 'error' | 'info', text: string } | null = null
  ) => {
    setShowSecurityReauthModal(true);
    setSecurityReauthAction(action);
    setSecurityReauthMessage(initialMessage);
    setSecurityReauthMaskedEmail('');
    setSecurityReauthCodeExpiresAt(null);
    setSecurityReauthResendCooldown(0);
    if (!forceResend) {
      setSecurityReauthCode('');
    }

    setIsStartingSecurityReauth(true);

    try {
      const result = await startSecurityReauth(action, forceResend);
      setSecurityReauthMaskedEmail(result.maskedEmail);
      setSecurityReauthCodeExpiresAt(result.codeExpiresAt);
      setSecurityReauthResendCooldown(result.resendCooldownSeconds || 0);
      setSecurityReauthMessage({
        type: forceResend || !result.alreadySent ? 'success' : 'info',
        text: result.message,
      });
    } catch (err: any) {
      setSecurityReauthMessage({
        type: 'error',
        text: getSecurityReauthErrorMessage(err?.message, err?.code),
      });
    } finally {
      setIsStartingSecurityReauth(false);
    }
  };

  const syncSecurityAuthState = useCallback(async () => {
    if (!isCurrentUser) return;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setCurrentAuthEmail('');
      setPendingEmailChange('');
      setHasPasswordAuth(false);
      setEmailChangeTrust(null);
      return;
    }

    setCurrentAuthEmail(user.email || '');
    setPendingEmailChange(user.new_email || '');
    setProfileData((prev: any) => prev ? { ...prev, email: user.email || prev.email } : prev);

    const hasPassword = user.identities?.some((id: any) => id.provider === 'email') ?? false;
    const { data: settings } = await getSecuritySettings(user.id);
    const hasSetPassword = settings?.password_set_at != null;
    setHasPasswordAuth(hasPassword || hasSetPassword);
  }, [isCurrentUser]);

  const handleOpenEmailModal = () => {
    setEmailChangeMessage(null);
    setSecurityMessage(null);
    setNewEmailAddress(pendingEmailChange || '');
    setEmailChangeTrust(null);
    setShowEmailModal(true);
  };

  const handleCloseEmailModal = () => {
    setShowEmailModal(false);
    setNewEmailAddress('');
    setEmailChangeMessage(null);
    setEmailChangeTrust(null);
    if (securityReauthAction === 'change_email') {
      closeSecurityReauthModal();
    }
  };

  const submitEmailChangeWithTrust = async (trustToken: string) => {
    const normalizedNewEmail = normalizeEmailAddress(newEmailAddress);

    setIsUpdatingEmail(true);
    setEmailChangeMessage(null);

    try {
      const result = await updateEmailWithTrust({
        email: normalizedNewEmail,
        trustToken,
      });

      setPendingEmailChange(result.pendingEmail || normalizedNewEmail);
      setEmailChangeTrust(null);
      setNewEmailAddress('');
      setEmailChangeMessage({
        type: 'success',
        text: result.message || 'We sent a confirmation link to your new email address. Your current sign-in email stays active until you verify the change.',
      });
      setSecurityMessage({
        type: 'success',
        text: 'Email change started. Check your new inbox to confirm the update.',
      });
      window.setTimeout(() => setSecurityMessage(null), 5000);
    } catch (err: any) {
      const errorCode = String(err?.code || '').toLowerCase();

      if (errorCode.startsWith('trust_')) {
        setEmailChangeTrust(null);
        setEmailChangeMessage({
          type: 'error',
          text: getSecurityReauthErrorMessage(err?.message, err?.code),
        });
        await openSecurityReauthFlow('change_email', false, {
          type: 'info',
          text: 'For your security, please verify again before we submit the email change.',
        });
        return;
      }

      setEmailChangeMessage({ type: 'error', text: getEmailUpdateErrorMessage(err?.message) });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdateEmailAddress = async () => {
    const normalizedCurrentEmail = normalizeEmailAddress(currentAuthEmail);
    const normalizedNewEmail = normalizeEmailAddress(newEmailAddress);

    if (!normalizedCurrentEmail) {
      setEmailChangeMessage({ type: 'error', text: 'Unable to load your current email. Please refresh and try again.' });
      return;
    }

    if (!normalizedNewEmail) {
      setEmailChangeMessage({ type: 'error', text: 'Enter a new email address.' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedNewEmail)) {
      setEmailChangeMessage({ type: 'error', text: 'Enter a valid email address.' });
      return;
    }

    if (normalizedNewEmail === normalizedCurrentEmail) {
      setEmailChangeMessage({ type: 'error', text: 'Your new email must be different from your current email address.' });
      return;
    }

    if (pendingEmailChange && normalizedNewEmail === normalizeEmailAddress(pendingEmailChange)) {
      setEmailChangeMessage({ type: 'error', text: 'That email change is already pending confirmation. You can resend the confirmation email below.' });
      return;
    }

    setEmailChangeMessage(null);
    setSecurityMessage(null);

    if (emailChangeTrust && !isSecurityTrustStillValid(emailChangeTrust.expiresAt)) {
      setEmailChangeTrust(null);
    }

    if (emailChangeTrust && isSecurityTrustStillValid(emailChangeTrust.expiresAt)) {
      await submitEmailChangeWithTrust(emailChangeTrust.token);
      return;
    }

    await openSecurityReauthFlow('change_email', false, {
      type: 'info',
      text: 'For your security, please verify before we request the email change.',
    });
  };

  const handleResendEmailChange = async () => {
    const emailToResend = normalizeEmailAddress(pendingEmailChange);

    if (!emailToResend) {
      setEmailChangeMessage({ type: 'error', text: 'There is no pending email change to resend.' });
      return;
    }

    setIsResendingEmailChange(true);
    setEmailChangeMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'email_change',
        email: emailToResend,
        options: {
          emailRedirectTo: getEmailChangeRedirectUrl(),
        },
      });

      if (error) throw error;

      setEmailChangeMessage({
        type: 'success',
        text: `We sent another confirmation link to ${emailToResend}.`,
      });
    } catch (err: any) {
      setEmailChangeMessage({ type: 'error', text: getEmailUpdateErrorMessage(err?.message) });
    } finally {
      setIsResendingEmailChange(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (passwordStrength < 50) {
      setSecurityMessage({ type: 'error', text: 'Password is too weak. Use uppercase, numbers, and symbols' });
      return;
    }

    setSecurityMessage(null);
    await openSecurityReauthFlow('change_password', false, {
      type: 'info',
      text: 'For your security, we’ll send a verification code before updating your password.',
    });
  };

  const loadActiveSessions = async () => {
    if (!currentUserId || !isCurrentUser) return;

    setIsLoadingSessions(true);
    try {
      const result = await getActiveSessions(currentUserId);
      if (result.success) {
        // Sort by last_activity, most recent first
        const sorted = result.data.sort((a: any, b: any) => {
          return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
        });
        setActiveSessions(sorted);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const result = await revokeSession(sessionId);
      if (result.success) {
        setActiveSessions(activeSessions.filter(s => s.id !== sessionId));
        setSecurityMessage({ type: 'success', text: 'Session revoked successfully' });
        setTimeout(() => setSecurityMessage(null), 3000);
      } else {
        setSecurityMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      setSecurityMessage({ type: 'error', text: 'Failed to revoke session' });
    }
  };

  const handleRevokeSessionGroup = async (sessionIds: string[]) => {
    if (sessionIds.length === 0) return;

    try {
      await Promise.all(sessionIds.map((id) => revokeSession(id)));
      setActiveSessions(activeSessions.filter((s) => !sessionIds.includes(s.id)));
      setSecurityMessage({ type: 'success', text: 'Sessions revoked successfully' });
      setTimeout(() => setSecurityMessage(null), 3000);
    } catch (err) {
      setSecurityMessage({ type: 'error', text: 'Failed to revoke sessions' });
    }
  };

  const getBrowserLabel = (userAgent?: string) => {
    if (!userAgent) return 'Unknown Browser';
    if (/Edg\//.test(userAgent)) return 'Edge';
    if (/Chrome\//.test(userAgent) && !/Edg\//.test(userAgent)) return 'Chrome';
    if (/Firefox\//.test(userAgent)) return 'Firefox';
    if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return 'Safari';
    return 'Unknown Browser';
  };

  const getDeviceLabel = (userAgent?: string, fallbackName?: string) => {
    if (!userAgent) return fallbackName || 'Unknown Device';
    if (/iPhone/.test(userAgent)) return 'iPhone';
    if (/iPad/.test(userAgent)) return 'iPad';
    if (/Android/.test(userAgent)) return /Mobile/.test(userAgent) ? 'Android Phone' : 'Android Tablet';
    if (/Windows/.test(userAgent)) return 'Windows PC';
    if (/Mac/.test(userAgent)) return 'Mac';
    if (/Linux/.test(userAgent)) return 'Linux PC';
    return fallbackName || 'Unknown Device';
  };

  const handleRevokeAllSessions = async () => {
    if (!currentUserId || !isCurrentUser) return;
    if (!confirm('Sign out of all devices? This will log you out here too.')) return;

    setIsRevokingAllSessions(true);
    try {
      const result = await revokeAllSessions(currentUserId);
      if (!result.success) throw new Error(result.message);

      await supabase.auth.signOut({ scope: 'global' });
      localStorage.removeItem('two_factor_pending');
      localStorage.removeItem('auth_redirect');
      setActiveSessions([]);
      setSecurityMessage({ type: 'success', text: 'Signed out of all devices' });
      setTimeout(() => setSecurityMessage(null), 3000);
    } catch (err) {
      setSecurityMessage({ type: 'error', text: 'Failed to sign out of all devices' });
    } finally {
      setIsRevokingAllSessions(false);
    }
  };

  const handleSetup2FA = async () => {
    if (!currentUserId || !isCurrentUser) return;

    setIsSending2FACode(true);
    try {
      const result = await sendTwoFactorCode('setup', codeSent);
      setCodeSent(true);
      setSetupMaskedEmail(result.maskedEmail);
      setSetupResendCooldown(result.resendCooldownSeconds || 0);
      setSetupCodeExpiresAt(result.codeExpiresAt);
      setSecurityMessage({ type: 'success', text: result.message || `Code sent to ${result.maskedEmail}` });
    } catch (err: any) {
      setSecurityMessage({ type: 'error', text: err.message || 'Failed to send code' });
      if (typeof err.cooldownSeconds === 'number') {
        setSetupResendCooldown(err.cooldownSeconds);
      }
    } finally {
      setIsSending2FACode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!currentUserId || !isCurrentUser) return;
    if (!verificationCode || verificationCode.length !== 6) {
      setSecurityMessage({ type: 'error', text: 'Please enter a valid 6-digit code' });
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verifyTwoFactorCode(verificationCode, 'setup');
      setSecurityMessage({ type: 'success', text: result.message });
      setBackupCodes(result.backupCodes || []);
      setTwoFactorEnabled(true);
      setSetupCodeExpiresAt(null);
      setSetupResendCooldown(0);
    } catch (err: any) {
      setSecurityMessage({ type: 'error', text: err.message || 'Verification failed' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!currentUserId || !isCurrentUser) return;

    setSecurityMessage(null);
    await openSecurityReauthFlow('disable_2fa', false, {
      type: 'info',
      text: 'For your security, confirm it’s you before disabling two-factor authentication.',
    });
  };

  const handleResendSecurityReauth = async () => {
    if (!securityReauthAction) {
      return;
    }

    await openSecurityReauthFlow(securityReauthAction, true);
  };

  const handleSubmitSecurityReauth = async () => {
    if (!securityReauthAction) {
      return;
    }

    const normalizedCode = securityReauthCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!normalizedCode) {
      setSecurityReauthMessage({
        type: 'error',
        text: 'Enter the security code from your email to continue.',
      });
      return;
    }

    setIsSubmittingSecurityReauth(true);
    setSecurityReauthMessage(null);

    try {
      if (securityReauthAction === 'change_password') {
        const result = await updatePasswordWithReauth({
          password: newPassword,
          nonce: normalizedCode,
          ...(hasPasswordAuth && currentPassword ? { currentPassword } : {}),
        });

        const isSettingNewPassword = !hasPasswordAuth;

        if (isSettingNewPassword && currentUserId) {
          await supabase
            .from('security_settings')
            .upsert({
              user_id: currentUserId,
              password_set_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
        }

        closeSecurityReauthModal();
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordModal(false);
        if (isSettingNewPassword) {
          setHasPasswordAuth(true);
        }
        setSecurityMessage({
          type: 'success',
          text: isSettingNewPassword
            ? 'Password set successfully. You can now enable 2FA.'
            : result.message || 'Password updated successfully.',
        });
        setTimeout(() => setSecurityMessage(null), 4000);
        return;
      }

      const trustVerification = await verifySecurityTrust(
        securityReauthAction as 'change_email' | 'disable_2fa',
        normalizedCode
      );

      if (securityReauthAction === 'change_email') {
        setEmailChangeTrust({
          token: trustVerification.trustToken,
          expiresAt: trustVerification.trustExpiresAt,
        });
        closeSecurityReauthModal();
        await submitEmailChangeWithTrust(trustVerification.trustToken);
        return;
      }

      const result = await disableTwoFactorAuth(trustVerification.trustToken);
      closeSecurityReauthModal();
      setTwoFactorEnabled(false);
      setShow2FASetup(false);
      setCodeSent(false);
      setVerificationCode('');
      setBackupCodes([]);
      setSetupMaskedEmail('');
      setSetupResendCooldown(0);
      setSetupCodeExpiresAt(null);
      setSecurityMessage({ type: 'success', text: result.message });
      setTimeout(() => setSecurityMessage(null), 3000);
    } catch (err: any) {
      const errorCode = String(err?.code || '').toLowerCase();

      if (
        securityReauthAction === 'change_password' &&
        ['current_password_mismatch', 'current_password_required', 'same_password', 'weak_password'].includes(errorCode)
      ) {
        closeSecurityReauthModal();
        setSecurityMessage({
          type: 'error',
          text: getPasswordUpdateErrorMessage(err?.message, err?.code),
        });
        return;
      }

      setSecurityReauthMessage({
        type: 'error',
        text: securityReauthAction === 'change_password'
          ? getPasswordUpdateErrorMessage(err?.message, err?.code)
          : getSecurityReauthErrorMessage(err?.message, err?.code),
      });
    } finally {
      setIsSubmittingSecurityReauth(false);
    }
  };

  const downloadBackupCodes = () => {
    if (backupCodes.length === 0) return;

    const content = `PicklePlay 2FA Backup Codes
Generated: ${new Date().toLocaleString()}

⚠️ IMPORTANT: Store these codes in a safe place. Each code can only be used once.
If you lose access to your email, use these codes to recover your account.

${'─'.repeat(50)}

${backupCodes.map((code, idx) => `${idx + 1}. ${code}`).join('\n')}

${'─'.repeat(50)}

These backup codes were generated for your PicklePlay account.
Never share them with anyone.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pickleplay-backup-codes-${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  useEffect(() => {
    if (isCurrentUser && activeTab === 'security') {
      loadActiveSessions();
      void syncSecurityAuthState();
    }
  }, [activeTab, isCurrentUser, syncSecurityAuthState]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailChangeStatus = params.get('emailChange');

    if (!isCurrentUser || emailChangeStatus !== 'confirmed') {
      return;
    }

    setActiveTab('security');
    setEmailChangeTrust(null);
    setSecurityMessage({
      type: 'success',
      text: 'Your email address has been updated successfully.',
    });
    window.setTimeout(() => setSecurityMessage(null), 5000);
    void syncSecurityAuthState();

    params.delete('emailChange');
    const nextSearch = params.toString();
    navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
  }, [isCurrentUser, location.pathname, location.search, navigate, syncSecurityAuthState]);

  const groupedSessions = activeSessions.reduce((acc: any[], session: any) => {
    const deviceLabel = getDeviceLabel(session.user_agent, session.device_name);
    const browserLabel = getBrowserLabel(session.user_agent);
    const groupKey = `${deviceLabel}||${browserLabel}`;
    const existing = acc.find((item) => item.key === groupKey);
    const lastActivity = new Date(session.last_activity).getTime();

    if (existing) {
      existing.sessionIds.push(session.id);
      existing.count += 1;
      existing.lastActivity = Math.max(existing.lastActivity, lastActivity);
      if (session.ip_address) existing.ipAddresses.add(session.ip_address);
      return acc;
    }

    const ipSet = new Set<string>();
    if (session.ip_address) ipSet.add(session.ip_address);

    acc.push({
      key: groupKey,
      deviceLabel,
      browserLabel,
      sessionIds: [session.id],
      count: 1,
      lastActivity,
      ipAddresses: ipSet,
    });

    return acc;
  }, [] as any[]);

  groupedSessions.sort((a, b) => b.lastActivity - a.lastActivity);

  useEffect(() => {
    const loadActivityStats = async () => {
      if (!profileId || activeTab !== 'stats') return;

      setIsLoadingStats(true);
      try {
        let targetId = profileId;

        if (profileId === 'player-current') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            targetId = session.user.id;
          }
        }

        // Get all bookings for the user
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, court_id, start_time, end_time, status')
          .eq('player_id', targetId);

        if (bookingsError) throw bookingsError;

        // Calculate total bookings (all statuses)
        const totalBookings = bookings?.length || 0;

        // Calculate unique courts visited
        const uniqueCourts = new Set(bookings?.map(b => b.court_id) || []);
        const courtsVisited = uniqueCourts.size;

        // Calculate total hours (only completed bookings)
        let totalHours = 0;
        bookings?.forEach(booking => {
          if (booking.start_time && booking.end_time) {
            const start = new Date(`2000-01-01T${booking.start_time}`);
            const end = new Date(`2000-01-01T${booking.end_time}`);
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            totalHours += hours;
          }
        });

        // Get member since date from profile
        const memberSince = profileData?.created_at
          ? new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : '';

        setActivityStats({
          totalBookings,
          courtsVisited,
          totalHours: Math.round(totalHours),
          memberSince
        });

        // Fetch received ratings
        const { data: ratings } = await getReceivedRatings(targetId);
        setReceivedRatings(ratings || []);
      } catch (err) {
        console.error('Error loading activity stats:', err);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadActivityStats();
  }, [activeTab, profileId, profileData]);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        let targetId = userId;

        // If no userId in URL, get current session
        if (!targetId || targetId === 'player-current') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            targetId = session.user.id;
          }
        }

        if (targetId) {
          // Support both UUID and username slug
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
          let query = supabase.from('profiles').select('*');
          query = isUuid ? query.eq('id', targetId) : query.eq('username', targetId);
          const { data, error } = await query.single();

          // If username lookup succeeded, update targetId to the real UUID
          if (!error && data && !isUuid) {
            targetId = data.id;
          }

          if (!error && data) {
            let resolvedFullName = data.full_name || '';

            if (!resolvedFullName && isCurrentUser) {
              const { data: authUserData } = await supabase.auth.getUser();
              resolvedFullName = authUserData.user?.user_metadata?.full_name || authUserData.user?.user_metadata?.name || '';

              if (resolvedFullName) {
                await supabase
                  .from('profiles')
                  .update({ full_name: resolvedFullName })
                  .eq('id', targetId);
              }
            }

            const normalizedProfileData = {
              ...data,
              full_name: resolvedFullName
            };

            setProfileData(normalizedProfileData);
            // Initialize editable fields
            setEditedName(resolvedFullName);
            setEditedLocation(data.location || '');
            setEditedBio(data.bio || '');
            setAvatarUrl(data.avatar_url || '');
            setAvailabilityStatus((data.availability_status || 'offline') as 'looking' | 'busy' | 'offline');
            setAvailabilityStart(data.availability_start || '');
            setAvailabilityEnd(data.availability_end || '');
            setAvailabilityNote(data.availability_note || '');
            setPreferredSkillMin(data.preferred_skill_min != null ? String(data.preferred_skill_min) : '');
            setPreferredSkillMax(data.preferred_skill_max != null ? String(data.preferred_skill_max) : '');
            setPreferredLocationIds(data.preferred_location_ids || []);
            setPreferredCourtIds(data.preferred_court_ids || []);
            setPreferredLocationMode((data.preferred_location_mode || 'auto') as 'auto' | 'manual');
            setPreferredCourtType((data.preferred_court_type || 'Both') as 'Indoor' | 'Outdoor' | 'Both');
            // Set language preference from database
            if (data.preferred_language) {
              setSelectedLanguage(data.preferred_language);
            }
            // Load privacy settings
            if (data.profile_visibility) {
              setProfileVisibility(data.profile_visibility);
              setTempVisibility(data.profile_visibility);
              setSavedVisibility(data.profile_visibility);
            }

            // Load security settings for current user
            if (isCurrentUser) {
              const securityResult = await getSecuritySettings(targetId);
              if (securityResult.success && securityResult.data) {
                setTwoFactorEnabled(securityResult.data.two_factor_enabled || false);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  // Check mutual follow whenever viewing another user's profile
  useEffect(() => {
    if (!profileData?.id || isCurrentUser) { setIsMutualFollow(null); return; }
    checkMutualFollow(profileData.id).then(setIsMutualFollow);
  }, [profileData?.id, isCurrentUser]);

  // Realtime: profile points updates
  useEffect(() => {
    if (!profileData?.id) return;

    const channel = supabase
      .channel(`profile-points-${profileData.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${profileData.id}`
      }, (payload) => {
        const updated = payload.new as any;
        if (typeof updated.points === 'number') {
          setProfileData((prev: any) => prev ? { ...prev, points: updated.points } : prev);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileData?.id]);

  // Generate QR code for mobile app deep link
  useEffect(() => {
    const generateProfileQR = async () => {
      if (!profileId) return;
      try {
        // Build deep link data for the mobile app
        // The mobile app uses the "pickleplay://" scheme
        const qrPayload = JSON.stringify({
          type: 'profile',
          userId: profileId,
          deepLink: `pickleplay://profile/${profileId}`,
          webUrl: `${'https://www.pickleplay.ph'}/#/profile${profileId !== 'player-current' ? `/${profileId}` : ''}`,
          generatedAt: new Date().toISOString()
        });

        const dataUrl = await QRCodeLib.toDataURL(qrPayload, {
          width: 280,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        });
        setQrCodeDataUrl(dataUrl);
      } catch (error) {
        console.error('Error generating profile QR code:', error);
      }
    };

    generateProfileQR();
  }, [profileId]);

  // Generate Court Owner Referral QR code with PicklePlayLogo overlay
  useEffect(() => {
    const generateCourtOwnerQR = async () => {
      if (!profileData?.referral_code) return;
      try {
        const referralLink = `${'https://www.pickleplay.ph'}/signup?ref=${profileData.referral_code}&type=court-owner`;

        // Generate base QR code
        const qrDataUrl = await QRCodeLib.toDataURL(referralLink, {
          width: 400,
          margin: 3,
          color: { dark: '#0f172a', light: '#ffffff' },
          errorCorrectionLevel: 'H'
        });

        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw QR code
        const qrImg = new Image();
        qrImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          qrImg.onload = () => resolve();
          qrImg.onerror = reject;
          qrImg.src = qrDataUrl;
        });
        ctx.drawImage(qrImg, 0, 0, 400, 400);

        // Overlay PicklePlayLogo at center
        const centerX = 200;
        const centerY = 200;
        const logoSize = 80;
        try {
          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            logoImg.onload = () => resolve();
            logoImg.onerror = reject;
            logoImg.src = '/images/PicklePlayLogo.jpg';
          });
          // White circle background
          ctx.beginPath();
          ctx.arc(centerX, centerY, logoSize / 2 + 6, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          // Clip circle and draw logo
          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, centerY, logoSize / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(logoImg, centerX - logoSize / 2, centerY - logoSize / 2, logoSize, logoSize);
          ctx.restore();
        } catch {
          // Fallback: blue circle with PP
          ctx.beginPath();
          ctx.arc(centerX, centerY, logoSize / 2 + 6, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(centerX, centerY, logoSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = '#155DFC';
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 28px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('PP', centerX, centerY);
        }

        setCourtOwnerQrDataUrl(canvas.toDataURL('image/png'));
      } catch (error) {
        console.error('Error generating court owner referral QR:', error);
      }
    };

    generateCourtOwnerQR();
  }, [profileData?.referral_code]);

  // Generate Player Referral QR code with PicklePlayLogo.jpg overlay
  useEffect(() => {
    const generatePlayerQR = async () => {
      if (!profileData?.referral_code) return;
      try {
        const referralLink = `https://www.pickleplay.ph/signup?ref=${profileData.referral_code}`;
        const qrDataUrl = await QRCodeLib.toDataURL(referralLink, {
          width: 400,
          margin: 3,
          color: { dark: '#0f172a', light: '#ffffff' },
          errorCorrectionLevel: 'H'
        });

        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw QR code
        const qrImg = new Image();
        qrImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          qrImg.onload = () => resolve();
          qrImg.onerror = reject;
          qrImg.src = qrDataUrl;
        });
        ctx.drawImage(qrImg, 0, 0, 400, 400);

        // Overlay PicklePlayLogo.jpg at center
        const centerX = 200;
        const centerY = 200;
        const logoSize = 80;
        try {
          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            logoImg.onload = () => resolve();
            logoImg.onerror = reject;
            logoImg.src = '/images/PicklePlayLogo.jpg';
          });
          // White circle background
          ctx.beginPath();
          ctx.arc(centerX, centerY, logoSize / 2 + 6, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          // Clip circle and draw logo
          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, centerY, logoSize / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(logoImg, centerX - logoSize / 2, centerY - logoSize / 2, logoSize, logoSize);
          ctx.restore();
        } catch {
          // Fallback: blue circle with PP
          ctx.beginPath();
          ctx.arc(centerX, centerY, logoSize / 2 + 6, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(centerX, centerY, logoSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = '#155DFC';
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 28px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('PP', centerX, centerY);
        }

        setPlayerQrDataUrl(canvas.toDataURL('image/png'));
      } catch (error) {
        console.error('Error generating player referral QR:', error);
      }
    };

    generatePlayerQR();
  }, [profileData?.referral_code]);

  // Generate a beautiful share story image (1080x1920 = 9:16 for stories)
  const generateShareImage = useCallback(async (mode: 'player' | 'court-owner') => {
    setIsGeneratingShare(true);
    try {
      const qrSrc = mode === 'court-owner' ? courtOwnerQrDataUrl : playerQrDataUrl;
      if (!qrSrc) return;

      const W = 1080;
      const H = 1920;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // ─── BACKGROUND: PLAYER_002.jpg (already 9:16) ───
      try {
        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          bgImg.onload = () => resolve();
          bgImg.onerror = reject;
          bgImg.src = '/images/PLAYER_002.jpg';
        });
        const scale = Math.max(W / bgImg.width, H / bgImg.height);
        const sw = bgImg.width * scale;
        const sh = bgImg.height * scale;
        ctx.drawImage(bgImg, (W - sw) / 2, (H - sh) / 2, sw, sh);
      } catch {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.5, '#1e293b');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // ─── GRADIENT OVERLAY: bottom-heavy for text readability ───
      const overlay = ctx.createLinearGradient(0, 0, 0, H);
      overlay.addColorStop(0, 'rgba(15, 23, 42, 0.30)');
      overlay.addColorStop(0.3, 'rgba(15, 23, 42, 0.20)');
      overlay.addColorStop(0.5, 'rgba(15, 23, 42, 0.50)');
      overlay.addColorStop(1, 'rgba(15, 23, 42, 0.93)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, W, H);

      // ─── ACCENT LINE at very top ───
      const accentGrad = ctx.createLinearGradient(0, 0, W, 0);
      accentGrad.addColorStop(0, '#155DFC');
      accentGrad.addColorStop(1, '#84cc16');
      ctx.fillStyle = accentGrad;
      ctx.fillRect(0, 0, W, 6);

      // ─── LOGO at top center ───
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = reject;
          logoImg.src = '/images/PicklePlayLogo.jpg';
        });
        const logoS = 110;
        const logoY = 160;
        // Glow
        ctx.save();
        ctx.shadowColor = 'rgba(255,255,255,0.3)';
        ctx.shadowBlur = 35;
        ctx.beginPath();
        ctx.arc(W / 2, logoY, logoS / 2 + 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
        // Logo clipped circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(W / 2, logoY, logoS / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImg, W / 2 - logoS / 2, logoY - logoS / 2, logoS, logoS);
        ctx.restore();
      } catch {}

      // ─── "PICKLEPLAY" brand text ───
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '900 26px system-ui, -apple-system, sans-serif';
      ctx.letterSpacing = '10px';
      ctx.fillText('PICKLEPLAY', W / 2, 248);
      ctx.letterSpacing = '0px';

      // ─── BADGE ───
      const badgeY = 310;
      const badgeText = mode === 'court-owner' ? 'COURT OWNER INVITE' : 'PLAYER INVITE';
      ctx.font = '900 20px system-ui, -apple-system, sans-serif';
      ctx.letterSpacing = '4px';
      const badgeW = ctx.measureText(badgeText).width + 60;
      ctx.letterSpacing = '0px';
      // Glass badge bg
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      roundRect(ctx, (W - badgeW) / 2, badgeY, badgeW, 44, 22);
      ctx.fill();
      ctx.strokeStyle = mode === 'court-owner' ? 'rgba(132,204,22,0.5)' : 'rgba(21,93,252,0.5)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, (W - badgeW) / 2, badgeY, badgeW, 44, 22);
      ctx.stroke();
      ctx.fillStyle = mode === 'court-owner' ? '#84cc16' : '#60a5fa';
      ctx.font = '900 18px system-ui, -apple-system, sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillText(badgeText, W / 2, badgeY + 22);
      ctx.letterSpacing = '0px';

      // ─── MAIN HEADLINE (FAQ style: bold, uppercase, tight tracking) ───
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 52px system-ui, -apple-system, sans-serif';
      if (mode === 'court-owner') {
        ctx.fillText('ARE YOU A', W / 2, 440);
        ctx.fillText('COURT OWNER?', W / 2, 505);
        // Highlight line in lime
        ctx.fillStyle = '#84cc16';
        ctx.font = '900 48px system-ui, -apple-system, sans-serif';
        ctx.fillText('I\u0027D LIKE TO INVITE YOU', W / 2, 585);
      } else {
        ctx.fillText('ARE YOU A', W / 2, 440);
        ctx.fillText('PICKLEBALL PLAYER?', W / 2, 505);
        // Highlight line in blue
        ctx.fillStyle = '#60a5fa';
        ctx.font = '900 48px system-ui, -apple-system, sans-serif';
        ctx.fillText('I\u0027D LOVE YOU TO JOIN', W / 2, 585);
      }

      // ─── SUB TEXT ───
      ctx.fillStyle = 'rgba(255,255,255,0.50)';
      ctx.font = '400 26px system-ui, -apple-system, sans-serif';
      if (mode === 'court-owner') {
        ctx.fillText('Get instant access on PicklePlay', W / 2, 660);
      } else {
        ctx.fillText('Join the PH pickleball community', W / 2, 660);
      }

      // ─── LARGE QR CODE with white card ───
      const qrSize = 480;
      const cardPadX = 40;
      const cardPadTop = 36;
      const cardPadBot = 80;
      const cardW = qrSize + cardPadX * 2;
      const cardH = qrSize + cardPadTop + cardPadBot;
      const cardX = (W - cardW) / 2;
      const cardY = 730;

      // Glass card background
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      roundRect(ctx, cardX, cardY, cardW, cardH, 36);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, cardX, cardY, cardW, cardH, 36);
      ctx.stroke();
      ctx.restore();

      // White inner container for QR
      const innerPad = 14;
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, (W - qrSize - innerPad * 2) / 2, cardY + cardPadTop - 6, qrSize + innerPad * 2, qrSize + innerPad * 2, 24);
      ctx.fill();

      // Draw QR code
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = reject;
        qrImg.src = qrSrc;
      });
      ctx.drawImage(qrImg, (W - qrSize) / 2, cardY + cardPadTop, qrSize, qrSize);

      // "Scan to join" inside card
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '700 22px system-ui, -apple-system, sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText('SCAN TO JOIN PICKLEPLAY', W / 2, cardY + cardPadTop + qrSize + 46);
      ctx.letterSpacing = '0px';

      // ─── DECORATIVE DOTS (blue & lime) ───
      [[120, 750, 7, '#155DFC'], [960, 800, 5, '#84cc16'], [150, 1300, 4, '#84cc16'], [930, 1270, 6, '#155DFC'], [100, 440, 3, '#60a5fa'], [980, 490, 4, '#84cc16']].forEach(([dx, dy, dr, c]) => {
        ctx.fillStyle = (c as string) + '40';
        ctx.beginPath();
        ctx.arc(dx as number, dy as number, dr as number, 0, Math.PI * 2);
        ctx.fill();
      });

      // ─── BOTTOM SECTION ───
      // Separator
      const sepGrad = ctx.createLinearGradient(140, 0, W - 140, 0);
      sepGrad.addColorStop(0, 'rgba(21,93,252,0.0)');
      sepGrad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
      sepGrad.addColorStop(1, 'rgba(132,204,22,0.0)');
      ctx.fillStyle = sepGrad;
      ctx.fillRect(140, H - 260, W - 280, 1);

      // Tagline
      ctx.fillStyle = 'rgba(255,255,255,0.40)';
      ctx.font = '700 22px system-ui, -apple-system, sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('PHILIPPINE PICKLEBALL COMMUNITY', W / 2, H - 190);
      ctx.letterSpacing = '0px';

      // Brand mark
      ctx.fillStyle = 'rgba(255,255,255,0.20)';
      ctx.font = '600 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('www.pickleplay.ph', W / 2, H - 130);

      const dataUrl = canvas.toDataURL('image/png');
      setShareImageUrl(dataUrl);
      setShowShareModal(true);
    } catch (error) {
      console.error('Error generating share image:', error);
    } finally {
      setIsGeneratingShare(false);
    }
  }, [courtOwnerQrDataUrl, playerQrDataUrl, profileData]);

  // Helper: rounded rectangle
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Share to Facebook/Instagram story
  const handleShareStory = useCallback(async (platform: 'facebook' | 'instagram') => {
    if (!shareImageUrl) return;
    try {
      // Convert data URL to blob
      const response = await fetch(shareImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'pickleplay-invite.png', { type: 'image/png' });

      // Try Web Share API first (works great on mobile)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Join PicklePlay!',
          text: referralMode === 'court-owner'
            ? "I'd love to invite you to join PicklePlay as a Court Owner! Scan the QR code or use the link sticker."
            : "I'd love to invite you to join PicklePlay! Scan the QR code or use the link sticker.",
        });
        return;
      }

      // Fallback: Download image then open platform
      const a = document.createElement('a');
      a.href = shareImageUrl;
      a.download = 'pickleplay-invite.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => {
        if (platform === 'facebook') {
          window.open('https://www.facebook.com/stories/create', '_blank');
        } else {
          window.open('https://www.instagram.com/', '_blank');
        }
        setProfileMessage({ type: 'success', text: 'Image downloaded! Upload to your story & add a link sticker.' });
        setTimeout(() => setProfileMessage(null), 5000);
      }, 500);
    } catch (error) {
      console.error('Share error:', error);
      // Final fallback: just download
      const a = document.createElement('a');
      a.href = shareImageUrl;
      a.download = 'pickleplay-invite.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setProfileMessage({ type: 'success', text: 'Image saved! Share it to your story.' });
      setTimeout(() => setProfileMessage(null), 3000);
    }
  }, [shareImageUrl, referralMode, profileData]);

  useEffect(() => {
    const fetchPreferenceOptions = async () => {
      try {
        const [{ data: locations }, { data: courts }] = await Promise.all([
          supabase.from('locations').select('id, name, city').order('name', { ascending: true }),
          supabase.from('courts').select('id, name, location_id, court_type, surface_type').order('name', { ascending: true })
        ]);

        setAvailableLocations((locations || []).map((l: any) => ({ id: l.id, name: l.name, city: l.city })));
        setAvailableCourts((courts || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          locationId: c.location_id,
          courtType: c.court_type || c.surface_type || null
        })));
      } catch (err) {
        console.error('Error loading preference options:', err);
      }
    };

    fetchPreferenceOptions();
  }, []);

  const handlePrivacyChange = async () => {
    if (!currentUserId || !isCurrentUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ profile_visibility: tempVisibility })
        .eq('id', currentUserId);

      if (error) throw error;

      setProfileVisibility(tempVisibility);
      setSavedVisibility(tempVisibility);
      setPrivacyMessage({ type: 'success', text: 'Privacy settings updated!' });
      setTimeout(() => setPrivacyMessage(null), 3000);
    } catch (err: any) {
      console.error('Error updating privacy settings:', err);
      setPrivacyMessage({ type: 'error', text: 'Failed to update settings' });
    }
  };

  // Open crop modal when user selects image
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUserId || !isCurrentUser || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropPosition({ x: 0, y: 0 });
      setCropZoom(1);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  // Upload cropped avatar blob
  const uploadCroppedAvatar = async (blob: Blob) => {
    if (!currentUserId) return;
    const fileName = `${currentUserId}-${Date.now()}.jpg`;
    setIsUploadingAvatar(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUserId);
      if (updateError) throw updateError;
      setAvatarUrl(publicUrl);
      setProfileData((prev: any) => ({ ...prev, avatar_url: publicUrl }));
      setProfileMessage({ type: 'success', text: 'Avatar updated successfully!' });
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      setProfileMessage({ type: 'error', text: `Failed to upload avatar: ${err.message}` });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Perform the square crop on canvas and upload
  const handleCropConfirm = useCallback(() => {
    if (!cropImageSrc) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const outputSize = 512; // final square size
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d')!;

      // Calculate source crop area
      const minDim = Math.min(img.width, img.height);
      const cropSize = minDim / cropZoom;
      // Center offset adjusted by user drag
      const cx = (img.width / 2) - (cropPosition.x * (minDim / outputSize));
      const cy = (img.height / 2) - (cropPosition.y * (minDim / outputSize));
      const sx = Math.max(0, Math.min(cx - cropSize / 2, img.width - cropSize));
      const sy = Math.max(0, Math.min(cy - cropSize / 2, img.height - cropSize));

      ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, outputSize, outputSize);

      canvas.toBlob((blob) => {
        if (blob) {
          uploadCroppedAvatar(blob);
          setShowCropModal(false);
          setCropImageSrc(null);
        }
      }, 'image/jpeg', 0.92);
    };
    img.src = cropImageSrc;
  }, [cropImageSrc, cropZoom, cropPosition]);

  // Crop drag handlers
  const handleCropMouseDown = (e: React.MouseEvent) => {
    setIsDraggingCrop(true);
    setDragStart({ x: e.clientX - cropPosition.x, y: e.clientY - cropPosition.y });
  };
  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCrop) return;
    setCropPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleCropMouseUp = () => setIsDraggingCrop(false);

  // Touch support for crop
  const handleCropTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setIsDraggingCrop(true);
    setDragStart({ x: t.clientX - cropPosition.x, y: t.clientY - cropPosition.y });
  };
  const handleCropTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingCrop) return;
    const t = e.touches[0];
    setCropPosition({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y });
  };

  // Background overlay drag handlers
  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    setIsDraggingOverlay(true);
    setOverlayDragStart({ x: e.clientX - bgOverlayPosition.x, y: e.clientY - bgOverlayPosition.y });
  };
  const handleOverlayMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingOverlay) return;
    setBgOverlayPosition({ x: e.clientX - overlayDragStart.x, y: e.clientY - overlayDragStart.y });
  };
  const handleOverlayMouseUp = () => setIsDraggingOverlay(false);

  // Touch support for overlay
  const handleOverlayTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setIsDraggingOverlay(true);
    setOverlayDragStart({ x: t.clientX - bgOverlayPosition.x, y: t.clientY - bgOverlayPosition.y });
  };
  const handleOverlayTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingOverlay) return;
    const t = e.touches[0];
    setBgOverlayPosition({ x: t.clientX - overlayDragStart.x, y: t.clientY - overlayDragStart.y });
  };

  // Handle background overlay image upload
  const handleBgOverlayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setBgOverlayImage(reader.result as string);
      setBgOverlayPosition({ x: 0, y: 0 });
      setBgOverlayScale(1);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Render background editor result to canvas and upload
  const handleBgEditorConfirm = useCallback(() => {
    const size = 512;
    const previewSize = 300; // matches the CSS preview size
    const ratio = size / previewSize;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Draw background
    const bg = backgroundOptions.find(b => b.id === selectedBg);
    if (bg) {
      if (bg.style.startsWith('linear-gradient')) {
        const colorMatches = bg.style.match(/#[0-9a-fA-F]{6}/g) || ['#667eea', '#764ba2'];
        const grad = ctx.createLinearGradient(0, 0, size, size);
        colorMatches.forEach((color, i) => {
          grad.addColorStop(i / (colorMatches.length - 1), color);
        });
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
      } else {
        ctx.fillStyle = bg.style;
        ctx.fillRect(0, 0, size, size);
      }
    }

    // Helper to clip to circle and export
    const clipAndExport = () => {
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = size;
      finalCanvas.height = size;
      const fCtx = finalCanvas.getContext('2d')!;
      fCtx.beginPath();
      fCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      fCtx.closePath();
      fCtx.clip();
      fCtx.drawImage(canvas, 0, 0);
      finalCanvas.toBlob((blob) => {
        if (blob) {
          uploadCroppedAvatar(blob);
          setShowBgEditor(false);
          setBgOverlayImage(null);
        }
      }, 'image/jpeg', 0.92);
    };

    // Draw overlay image if present
    if (bgOverlayImage) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Replicate CSS object-fit:contain within the 300×300 preview box
        const imgAspect = img.naturalWidth / img.naturalHeight;
        let fitW: number, fitH: number;
        if (imgAspect > 1) {
          // landscape: width fills 300, height shrinks
          fitW = previewSize;
          fitH = previewSize / imgAspect;
        } else {
          // portrait or square: height fills 300, width shrinks
          fitH = previewSize;
          fitW = previewSize * imgAspect;
        }

        // In the preview CSS the image is placed at:
        //   left:50%, top:50%, margin: -150px, width:300px, height:300px, object-fit:contain
        //   then transformed by translate(pos.x, pos.y) scale(scale)
        // The object-fit:contain draws the image centered inside the 300×300 element
        // so the effective drawn origin (top-left of the fitted image) in preview coords is:
        const fitOffX = (previewSize - fitW) / 2; // within the 300×300 element
        const fitOffY = (previewSize - fitH) / 2;

        // The element itself is centered: its top-left in preview coords is at (0,0)
        // because margin -150 + left 50% of 300 = 0
        // So the drawn image top-left in preview coords =
        //   element_topLeft + fitOffset, then scaled & translated:
        //   finalX = (fitOffX - 150 + 150) * scale + posX + 150 - (fitW*scale)/2
        // Actually, let's just replicate the transform exactly:

        // The CSS transform-origin is "center center" of the element (which is 300×300)
        // Element center in preview space = (150, 150) because element is at (0,0) in preview
        // transform: translate(pos.x, pos.y) scale(scale)
        // This means: first scale around center, then translate.

        // The fitted image rect before transform (in preview space):
        const rectX = fitOffX; // within the 300×300 element at (0,0)
        const rectY = fitOffY;

        // After scale around element center (150,150):
        const scaledRectX = 150 + (rectX - 150) * bgOverlayScale;
        const scaledRectY = 150 + (rectY - 150) * bgOverlayScale;
        const scaledW = fitW * bgOverlayScale;
        const scaledH = fitH * bgOverlayScale;

        // After translate:
        const finalX = scaledRectX + bgOverlayPosition.x;
        const finalY = scaledRectY + bgOverlayPosition.y;

        // Scale everything up to the 512 canvas
        ctx.drawImage(
          img,
          finalX * ratio,
          finalY * ratio,
          scaledW * ratio,
          scaledH * ratio
        );

        clipAndExport();
      };
      img.src = bgOverlayImage;
    } else {
      clipAndExport();
    }
  }, [selectedBg, bgOverlayImage, bgOverlayPosition, bgOverlayScale, backgroundOptions]);

  const handleSave = async () => {
    if (!currentUserId || !isCurrentUser) return;

    const trimmedName = editedName.trim();
    const trimmedLocation = editedLocation.trim();
    const trimmedBio = editedBio.trim();
    const trimmedNote = availabilityNote.trim();
    const skillMinValue = preferredSkillMin ? Number(preferredSkillMin) : null;
    const skillMaxValue = preferredSkillMax ? Number(preferredSkillMax) : null;

    if (availabilityStatus === 'looking') {
      if (!availabilityStart || !availabilityEnd) {
        setProfileMessage({ type: 'error', text: 'Set your availability time window.' });
        return;
      }
      if (availabilityStart >= availabilityEnd) {
        setProfileMessage({ type: 'error', text: 'End time must be after start time.' });
        return;
      }
    }

    if (skillMinValue != null && Number.isNaN(skillMinValue)) {
      setProfileMessage({ type: 'error', text: 'Preferred skill min must be a number.' });
      return;
    }

    if (skillMaxValue != null && Number.isNaN(skillMaxValue)) {
      setProfileMessage({ type: 'error', text: 'Preferred skill max must be a number.' });
      return;
    }

    if (skillMinValue != null && skillMaxValue != null && skillMinValue > skillMaxValue) {
      setProfileMessage({ type: 'error', text: 'Preferred skill min cannot exceed max.' });
      return;
    }

    if (trimmedName.length < 2) {
      setProfileMessage({ type: 'error', text: 'Display name must be at least 2 characters.' });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: trimmedName,
          location: trimmedLocation,
          bio: trimmedBio,
          availability_status: availabilityStatus,
          availability_start: availabilityStatus === 'looking' ? (availabilityStart || null) : null,
          availability_end: availabilityStatus === 'looking' ? (availabilityEnd || null) : null,
          availability_note: trimmedNote || null,
          preferred_skill_min: skillMinValue,
          preferred_skill_max: skillMaxValue,
          preferred_location_ids: preferredLocationIds,
          preferred_court_ids: preferredCourtIds,
          preferred_location_mode: preferredLocationMode,
          preferred_court_type: preferredCourtType
        })
        .eq('id', currentUserId);

      if (error) throw error;

      // Update local state
      setProfileData((prev: any) => ({
        ...prev,
        full_name: trimmedName,
        location: trimmedLocation,
        bio: trimmedBio,
        availability_status: availabilityStatus,
        availability_start: availabilityStatus === 'looking' ? (availabilityStart || null) : null,
        availability_end: availabilityStatus === 'looking' ? (availabilityEnd || null) : null,
        availability_note: trimmedNote || null,
        preferred_skill_min: skillMinValue,
        preferred_skill_max: skillMaxValue,
        preferred_location_ids: preferredLocationIds,
        preferred_court_ids: preferredCourtIds,
        preferred_location_mode: preferredLocationMode,
        preferred_court_type: preferredCourtType
      }));

      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setProfileMessage({ type: 'error', text: `Failed to save changes: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const togglePreferredLocation = (id: string) => {
    setPreferredLocationIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const togglePreferredCourt = (id: string) => {
    setPreferredCourtIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleProfileSection = (section: 'identity' | 'availability' | 'matchmaking') => {
    setProfileSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const computeAutoPreferences = useCallback(() => {
    const query = editedLocation.trim().toLowerCase();
    if (!query) {
      setPreferredLocationIds([]);
      setPreferredCourtIds([]);
      return;
    }

    const matchedLocations = availableLocations.filter((loc) => {
      const name = (loc.name || '').toLowerCase();
      const city = (loc.city || '').toLowerCase();
      return name.includes(query) || city.includes(query);
    });

    const matchedLocationIds = matchedLocations.map((loc) => loc.id);

    const normalizeCourtType = (value?: string | null) => (value || '').toLowerCase();
    const preferredType = preferredCourtType.toLowerCase();

    const matchedCourts = availableCourts.filter((court) => {
      if (!matchedLocationIds.includes(court.locationId || '')) return false;
      if (preferredType === 'both') return true;
      const courtType = normalizeCourtType(court.courtType);
      return courtType.includes(preferredType);
    });

    setPreferredLocationIds(matchedLocationIds);
    setPreferredCourtIds(matchedCourts.map((court) => court.id));
  }, [editedLocation, availableLocations, availableCourts, preferredCourtType]);

  useEffect(() => {
    if (preferredLocationMode === 'auto') {
      computeAutoPreferences();
    }
  }, [preferredLocationMode, computeAutoPreferences]);

  const handleLike = (postId: string) => {
    setPosts(currentPosts => currentPosts.map(p => {
      if (p.id === postId) {
        const isLiked = p.likes.includes('player-current');
        const newLikes = isLiked ? p.likes.filter(id => id !== 'player-current') : [...p.likes, 'player-current'];
        return { ...p, likes: newLikes };
      }
      return p;
    }));
  };

  const handleLanguageChange = async (language: string) => {
    setIsTranslating(true);
    try {
      if (!currentUserId || !isCurrentUser) return;

      // Update database
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: language })
        .eq('id', currentUserId);

      if (error) throw error;

      // Update local state
      setSelectedLanguage(language);
      localStorage.setItem('preferredLanguage', language);

      alert('✅ Language preference saved successfully!');
    } catch (err: any) {
      console.error('Error saving language preference:', err);
      alert(`❌ Failed to save language: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  if (isLoading) {
    return <div className="max-w-7xl mx-auto"><Skeleton className="w-full h-96" /></div>;
  }

  if (!profileData) {
    return <NotFound />;
  }

  const themeColor = profileData.active_role === 'COACH' ? 'rose' : profileData.active_role === 'ADMIN' ? 'indigo' : 'blue';
  // Use profileData?.id (resolved UUID) — profileId may be a username slug
  const resolvedProfileId = profileData?.id ?? profileId;
  const isFollowing = resolvedProfileId && resolvedProfileId !== 'player-current' ? followedUsers.includes(resolvedProfileId) : false;

  const handleOpenMessage = async () => {
    // Use profileData?.id (resolved UUID) — profileId may be a username slug
    const targetId = profileData?.id;
    if (!targetId || isCurrentUser) return;
    if (isMutualFollow === false) return; // blocked — buttons already show locked state
    setIsMessaging(true);
    try {
      const conversationId = await getOrCreateConversation(targetId);
      navigate(`/messages?conversation=${conversationId}`);
    } catch (err) {
      console.error('Error opening message thread:', err);
    } finally {
      setIsMessaging(false);
    }
  };
  const userPosts = posts.filter(post => post.authorId === profileId);
  const displayRole = profileData.active_role || 'PLAYER';
  const displayName = profileData.full_name || 'Player';
  const savedName = profileData.full_name || '';
  const savedLocation = profileData.location || '';
  const savedBio = profileData.bio || '';
  const savedAvailabilityStatus = (profileData.availability_status || 'offline') as 'looking' | 'busy' | 'offline';
  const savedAvailabilityStart = profileData.availability_start || '';
  const savedAvailabilityEnd = profileData.availability_end || '';
  const savedAvailabilityNote = profileData.availability_note || '';
  const savedPreferredSkillMin = profileData.preferred_skill_min != null ? String(profileData.preferred_skill_min) : '';
  const savedPreferredSkillMax = profileData.preferred_skill_max != null ? String(profileData.preferred_skill_max) : '';
  const savedPreferredLocationIds = profileData.preferred_location_ids || [];
  const savedPreferredCourtIds = profileData.preferred_court_ids || [];
  const savedPreferredLocationMode = (profileData.preferred_location_mode || 'auto') as 'auto' | 'manual';
  const savedPreferredCourtType = (profileData.preferred_court_type || 'Both') as 'Indoor' | 'Outdoor' | 'Both';
  const trimmedName = editedName.trim();
  const trimmedLocation = editedLocation.trim();
  const trimmedBio = editedBio.trim();
  const locationNameMap = new Map(availableLocations.map((loc) => [loc.id, loc.name]));
  const courtNameMap = new Map(availableCourts.map((court) => [court.id, court.name]));
  const preferredLocationNames = preferredLocationIds.map((id) => locationNameMap.get(id)).filter(Boolean) as string[];
  const preferredCourtNames = preferredCourtIds.map((id) => courtNameMap.get(id)).filter(Boolean) as string[];
  const isProfileDirty = trimmedName !== savedName
    || trimmedLocation !== savedLocation
    || trimmedBio !== savedBio
    || availabilityStatus !== savedAvailabilityStatus
    || availabilityStart !== savedAvailabilityStart
    || availabilityEnd !== savedAvailabilityEnd
    || availabilityNote.trim() !== savedAvailabilityNote
    || preferredSkillMin !== savedPreferredSkillMin
    || preferredSkillMax !== savedPreferredSkillMax
    || preferredLocationIds.join(',') !== savedPreferredLocationIds.join(',')
    || preferredCourtIds.join(',') !== savedPreferredCourtIds.join(',')
    || preferredLocationMode !== savedPreferredLocationMode
    || preferredCourtType !== savedPreferredCourtType;
  const isNameValid = trimmedName.length >= 2 && trimmedName.length <= MAX_NAME;

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col gap-4">
        {/* Mobile Profile Header - Matches Reference Design */}
        <div className="md:hidden">
          <div className="flex items-start gap-5">
            {/* Avatar with Gradient Ring */}
            <div className="shrink-0">
              <div className={`w-24 h-24 rounded-full p-[3px] bg-gradient-to-tr from-${themeColor}-400 to-lime-300 shadow-xl`}>
                <div className="w-full h-full rounded-full bg-white p-1 relative group">
                  <img
                    src={avatarUrl || profileData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
                    alt="Profile"
                    className="w-full h-full rounded-full bg-slate-50 object-cover cursor-pointer overflow-hidden"
                    onClick={() => setShowAvatarDropdown(!showAvatarDropdown)}
                  />
                  {isCurrentUser && (
                    <>
                      <input
                        type="file"
                        id="avatar-upload-mobile"
                        accept="image/*"
                        onChange={(e) => { handleAvatarUpload(e); setShowAvatarDropdown(false); }}
                        className="hidden"
                      />
                      <button
                        onClick={() => setShowBgEditor(true)}
                        className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all z-10"
                        title="Edit with Background"
                      >
                        <ImageIcon size={12} />
                      </button>
                    </>
                  )}

                  {/* Mobile Avatar Dropdown */}
                  {showAvatarDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowAvatarDropdown(false)} />
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden min-w-[180px]">
                        <div className="p-1.5">
                          <button
                            onClick={() => { setShowAvatarViewer(true); setShowAvatarDropdown(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                              <Eye size={14} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">View Profile</p>
                              <p className="text-[9px] text-slate-400 font-medium">See full photo</p>
                            </div>
                          </button>
                          {isCurrentUser && (
                            <label
                              htmlFor="avatar-upload-mobile"
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer"
                            >
                              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <Camera size={14} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">Upload Photo</p>
                                <p className="text-[9px] text-slate-400 font-medium">Change your avatar</p>
                              </div>
                            </label>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Identity + Stats + Button Stacked */}
            <div className="flex-1 space-y-4 pt-1">
              {/* Identity */}
              <div>
                {!isCurrentUser && (
                  <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest mb-2 transition-all shadow-sm"
                  >
                    <ArrowLeft size={12} />
                    Back
                  </button>
                )}
                <p className={`text-[10px] font-black text-${themeColor}-600 uppercase tracking-[0.3em] mb-1`}>
                  User Identity / {displayRole.replace('_', ' ')}
                </p>
                <h1 className="text-[26px] font-black text-slate-950 tracking-tight uppercase leading-none">{displayName}.</h1>
              </div>

              {/* Stats Row + Button */}
              <div className="flex items-center gap-4">
                {/* Stats */}
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Matches</p>
                    <p className="font-black text-slate-950 text-base leading-none">{profileData.matches_played || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Rating</p>
                    <p className="font-black text-slate-950 text-base leading-none">{profileData.dupr_rating?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-slate-200" />

                {/* Role Switcher - Only visible when user has authorized pro roles */}
                {isCurrentUser && authorizedProRoles.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                      className="h-10 px-4 rounded-full bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-all"
                    >
                      <Sparkles size={12} className="text-lime-400" />
                      <span>{displayRole.replace('_', ' ')} Mode</span>
                    </button>

                    {/* Dropdown Menu */}
                    {showRoleDropdown && (
                      <>
                        {/* Backdrop */}
                        <div className="fixed inset-0 z-40" onClick={() => setShowRoleDropdown(false)} />

                        {/* Menu */}
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="p-2 space-y-1">
                            {/* Player Role */}
                            <button
                              onClick={() => { onRoleSwitch && onRoleSwitch('PLAYER'); setShowRoleDropdown(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${displayRole === 'PLAYER' ? 'bg-lime-100 text-lime-900' : 'hover:bg-slate-50 text-slate-700'}`}
                            >
                              <User size={16} className={displayRole === 'PLAYER' ? 'text-lime-600' : 'text-slate-400'} />
                              <span className="font-black text-[10px] uppercase tracking-widest">Player</span>
                              {displayRole === 'PLAYER' && <div className="ml-auto w-2 h-2 rounded-full bg-lime-500" />}
                            </button>

                            {/* Pro Roles - only show roles the user is actually authorized for */}
                            {authorizedProRoles.map((role) => (
                              <button
                                key={role}
                                onClick={() => { onRoleSwitch && onRoleSwitch(role); setShowRoleDropdown(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${displayRole === role ? 'bg-lime-100 text-lime-900' : 'hover:bg-slate-50 text-slate-700'}`}
                              >
                                <Sparkles size={16} className={displayRole === role ? 'text-lime-600' : 'text-slate-400'} />
                                <span className="font-black text-[10px] uppercase tracking-widest">{role.replace('_', ' ')}</span>
                                {displayRole === role && <div className="ml-auto w-2 h-2 rounded-full bg-lime-500" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Show current role badge (no dropdown) for player-only users */}
                {isCurrentUser && authorizedProRoles.length === 0 && (
                  <div className="h-10 px-4 rounded-full bg-slate-100 text-slate-700 font-black text-[9px] uppercase tracking-widest flex items-center gap-2">
                    <User size={12} className="text-blue-500" />
                    <span>Player Mode</span>
                  </div>
                )}

                {/* Follow + Message Buttons for Other Users */}
                {!isCurrentUser && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => resolvedProfileId && onFollow(resolvedProfileId, displayName)} className={`h-10 px-5 rounded-full font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${isFollowing ? `bg-blue-600 text-white shadow-xl` : `bg-slate-900 text-white hover:bg-blue-600 shadow-lg`}`}>
                      {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <button
                      onClick={handleOpenMessage}
                      disabled={isMessaging || isMutualFollow === false}
                      title={isMutualFollow === false ? 'Follow each other to unlock messaging' : undefined}
                      className={`h-10 px-5 rounded-full font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${
                        isMutualFollow === false
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-100 text-slate-800 hover:bg-blue-50 hover:text-blue-700 shadow-sm disabled:opacity-60'
                      }`}
                    >
                      <MessageCircle size={14} />
                      {isMutualFollow === false ? 'Locked' : isMessaging ? '…' : 'Message'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Profile Header */}
        <div className="hidden md:flex md:flex-row md:items-center justify-between">
          <div>
            {!isCurrentUser && (
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest mb-3 transition-all shadow-sm"
              >
                <ArrowLeft size={13} />
                Back
              </button>
            )}
            <p className={`text-xs font-black text-${themeColor}-600 uppercase tracking-[0.4em] mb-2`}>
              User Identity / {displayRole.replace('_', ' ')}
            </p>
            <h1 className="text-4xl font-black text-slate-950 tracking-tighter uppercase">{displayName}.</h1>
          </div>

          {!isCurrentUser && (
            <div className="flex items-center gap-3">
              <button onClick={() => resolvedProfileId && onFollow(resolvedProfileId, displayName)} className={`h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 whitespace-nowrap ${isFollowing ? `bg-blue-600 text-white shadow-xl shadow-blue-100` : `bg-slate-900 text-white hover:bg-blue-600 shadow-xl`}`}>
                {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <button
                onClick={handleOpenMessage}
                disabled={isMessaging || isMutualFollow === false}
                title={isMutualFollow === false ? 'Follow each other to unlock messaging' : undefined}
                className={`h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 whitespace-nowrap ${
                  isMutualFollow === false
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-lg'
                    : 'bg-slate-100 text-slate-800 hover:bg-blue-50 hover:text-blue-700 shadow-lg disabled:opacity-60'
                }`}
              >
                <MessageCircle size={16} />
                {isMutualFollow === false ? 'Locked' : isMessaging ? '…' : 'Message'}
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs - Only show for current user */}
        {isCurrentUser && (
          <div className="relative group/tabs">
            {/* Scroll Indication Gradient (Right) */}
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 md:hidden" />

            <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-2 border-b border-slate-200 relative">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-3 px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              >
                <User size={14} className="inline mr-2" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`py-3 px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${activeTab === 'notifications' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              >
                <Bell size={14} className="inline mr-2" />
                Notifications
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`py-3 px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${activeTab === 'privacy' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              >
                <Eye size={14} className="inline mr-2" />
                Privacy
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-3 px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${activeTab === 'security' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              >
                <Shield size={14} className="inline mr-2" />
                Security
              </button>
              <button
                onClick={() => setActiveTab('preferences')}
                className={`py-3 px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${activeTab === 'preferences' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              >
                <Globe size={14} className="inline mr-2" />
                Preferences
              </button>
              <button
                onClick={() => setActiveTab('billing')}
                className={`py-3 px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${activeTab === 'billing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              >
                <CreditCard size={14} className="inline mr-2" />
                Billing
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`py-3 px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${activeTab === 'stats' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              >
                <BarChart3 size={14} className="inline mr-2" />
                Activity
              </button>
              <button
                onClick={() => setActiveTab('referral')}
                className={`py-3 px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${activeTab === 'referral' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              >
                <Sparkles size={14} className="inline mr-2" />
                Referral
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        <div className="hidden lg:block lg:col-span-1 space-y-8">
          <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm text-center">
            <div className="relative inline-block mb-6">
              <div className={`w-40 h-40 rounded-full p-1 border-4 border-${themeColor}-200 shadow-2xl group relative`}>
                <img
                  src={avatarUrl || profileData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
                  alt="Profile"
                  className="w-full h-full rounded-full bg-slate-50 object-cover cursor-pointer"
                  onClick={() => setShowAvatarDropdown(!showAvatarDropdown)}
                />
                {isCurrentUser && (
                  <>
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={(e) => { handleAvatarUpload(e); setShowAvatarDropdown(false); }}
                      className="hidden"
                    />
                    <button
                      onClick={() => setShowBgEditor(true)}
                      className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all z-10"
                      title="Edit with Background"
                    >
                      <ImageIcon size={14} />
                    </button>
                  </>
                )}

                {/* Avatar Dropdown Menu */}
                {showAvatarDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAvatarDropdown(false)} />
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden min-w-[200px] animate-in slide-in-from-top-2 duration-200">
                      <div className="p-1.5">
                        <button
                          onClick={() => { setShowAvatarViewer(true); setShowAvatarDropdown(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left group/item"
                        >
                          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover/item:bg-blue-100 transition-colors">
                            <Eye size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">View Profile</p>
                            <p className="text-[10px] text-slate-400 font-medium">See full photo</p>
                          </div>
                        </button>
                        {isCurrentUser && (
                          <label
                            htmlFor="avatar-upload"
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer group/item"
                          >
                            <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover/item:bg-emerald-100 transition-colors">
                              <Camera size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">Upload Photo</p>
                              <p className="text-[10px] text-slate-400 font-medium">Change your avatar</p>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <h2 className="text-2xl font-black text-slate-950 tracking-tight uppercase">{displayName}</h2>
            <p className={`text-[10px] text-${themeColor}-600 font-black uppercase tracking-widest mt-1 mb-8`}>
              {displayRole.replace('_', ' ')}
            </p>
            {/* Mobile Role Switcher (md:hidden) - Compact pill button */}
            {isCurrentUser && (
              <div className="md:hidden mt-6 flex items-center justify-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Matches</p>
                    <p className="font-black text-slate-950 text-base leading-none">{profileData.matches_played || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Rating</p>
                    <p className="font-black text-slate-950 text-base leading-none">{profileData.dupr_rating?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                {/* Only show dropdown when user has authorized pro roles */}
                {authorizedProRoles.length > 0 ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                      className="h-10 px-4 rounded-full bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-all"
                    >
                      <Sparkles size={12} className="text-lime-400" />
                      <span>{displayRole.replace('_', ' ')} Mode</span>
                    </button>
                    {showRoleDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowRoleDropdown(false)} />
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="p-2 space-y-1">
                            <button
                              onClick={() => { onRoleSwitch && onRoleSwitch('PLAYER'); setShowRoleDropdown(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${displayRole === 'PLAYER' ? 'bg-lime-100 text-lime-900' : 'hover:bg-slate-50 text-slate-700'}`}
                            >
                              <User size={16} className={displayRole === 'PLAYER' ? 'text-lime-600' : 'text-slate-400'} />
                              <span className="font-black text-[10px] uppercase tracking-widest">Player</span>
                              {displayRole === 'PLAYER' && <div className="ml-auto w-2 h-2 rounded-full bg-lime-500" />}
                            </button>
                            {authorizedProRoles.map((proRole) => (
                              <button
                                key={proRole}
                                onClick={() => { onRoleSwitch && onRoleSwitch(proRole); setShowRoleDropdown(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${displayRole === proRole ? 'bg-lime-100 text-lime-900' : 'hover:bg-slate-50 text-slate-700'}`}
                              >
                                <Sparkles size={16} className={displayRole === proRole ? 'text-lime-600' : 'text-slate-400'} />
                                <span className="font-black text-[10px] uppercase tracking-widest">{proRole.replace('_', ' ')}</span>
                                {displayRole === proRole && <div className="ml-auto w-2 h-2 rounded-full bg-slate-900" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* Show static badge for player-only users */
                  <div className="h-10 px-4 rounded-full bg-slate-100 text-slate-700 font-black text-[9px] uppercase tracking-widest flex items-center gap-2">
                    <User size={12} className="text-blue-500" />
                    <span>Player Mode</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4 pt-8 border-t border-slate-100">
              <div className="flex items-center justify-between text-left">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DUPR</span>
                <span className="font-black text-slate-950 text-sm">{profileData.dupr_rating?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex items-center justify-between text-left">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matches</span>
                <span className="font-black text-slate-950 text-sm">{profileData.matches_played || 0}</span>
              </div>
            </div>

            {/* QR Code — Open in Mobile App */}
            {isCurrentUser && qrCodeDataUrl && (
              <div className="pt-8 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone className="text-blue-600" size={14} />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Open in App</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="group relative bg-white border-2 border-slate-200 hover:border-blue-400 rounded-2xl p-3 transition-all hover:shadow-lg cursor-pointer"
                    title="Click to enlarge"
                  >
                    <img src={qrCodeDataUrl} alt="Profile QR Code" className="w-32 h-32" />
                    <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 rounded-2xl transition-all flex items-center justify-center">
                      <ZoomIn className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
                    </div>
                  </button>
                  <p className="text-[10px] text-slate-500 font-semibold text-center leading-relaxed">
                    Scan with the <span className="font-bold text-slate-700">PicklePlay</span> mobile app
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => setShowQrModal(true)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all"
                    >
                      <ZoomIn size={11} />
                      Enlarge
                    </button>
                    <a
                      href={qrCodeDataUrl}
                      download="pickleplay-profile-qr.png"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all"
                    >
                      <Download size={11} />
                      Save
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {/* Dashboard Tab */}
          {activeTab === 'referral' && (
            <div className="bg-white p-6 md:p-10 rounded-[48px] border border-slate-200 shadow-sm space-y-8 animate-in fade-in duration-500">

              {/* ─── Header with Points ─── */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-4">AFFILIATION PROGRAM</p>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Share & <span className="text-blue-600">Earn.</span></h2>
                  <p className="text-slate-500 font-medium max-w-md text-sm">Invite players and court owners to PicklePlay and earn rewards for every signup.</p>
                </div>
                <div className="bg-blue-50 p-6 md:p-8 rounded-[32px] text-center border border-blue-100 min-w-[180px]">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Your Total Points</p>
                  <div className="flex items-center justify-center gap-3">
                    <Sparkles size={24} className="text-blue-600" />
                    <span className="text-4xl font-black text-slate-900">{profileData?.points || 0}</span>
                  </div>
                </div>
              </div>

              {/* ─── Toggle: Player / Court Owner ─── */}
              <div className="flex items-center justify-center">
                <div className="bg-slate-100 p-1.5 rounded-2xl inline-flex gap-1">
                  <button
                    onClick={() => setReferralMode('player')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                      referralMode === 'player'
                        ? 'bg-white text-blue-600 shadow-md'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Users size={14} />
                    Player Invite
                  </button>
                  <button
                    onClick={() => setReferralMode('court-owner')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                      referralMode === 'court-owner'
                        ? 'bg-white text-emerald-600 shadow-md'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Building2 size={14} />
                    Court Owner Invite
                  </button>
                </div>
              </div>

              {/* ─── UNIFIED REFERRAL CARD ─── */}
              <div className={`relative overflow-hidden rounded-[40px] p-8 md:p-10 shadow-2xl transition-all duration-500 ${
                referralMode === 'court-owner'
                  ? 'bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-500 shadow-blue-200/50'
                  : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 shadow-slate-300/50'
              }`}>
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="absolute top-1/2 right-10 w-20 h-20 bg-white/5 rounded-full" />

                <div className="relative z-10">
                  {/* Card header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                      <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.15em] mb-4 ${
                        referralMode === 'court-owner'
                          ? 'bg-white/15 text-white'
                          : 'bg-white/15 text-white'
                      }`}>
                        {referralMode === 'court-owner' ? <Building2 size={12} /> : <Users size={12} />}
                        {referralMode === 'court-owner' ? 'Court Owner Referral' : 'Player Referral'}
                      </div>
                      <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase mb-2">
                        {referralMode === 'court-owner' ? (
                          <>Invite Court <span className="text-lime-300">Owners.</span></>
                        ) : (
                          <>Invite <span className="text-blue-300">Players.</span></>
                        )}
                      </h2>
                      <p className="text-white/70 font-medium max-w-md text-sm leading-relaxed">
                        {referralMode === 'court-owner'
                          ? 'Know a court owner or facility manager? Invite them and earn +25 bonus points! Instant access — no documents needed.'
                          : 'Invite your friends to join the Philippine pickleball community on PicklePlay and earn points for every signup!'}
                      </p>
                    </div>
                    {referralMode === 'court-owner' && (
                      <div className="bg-white/15 backdrop-blur-sm p-5 rounded-[28px] text-center min-w-[140px] border border-white/20">
                        <p className="text-[9px] font-black text-white/80 uppercase tracking-widest mb-1.5">Bonus</p>
                        <div className="flex items-center justify-center gap-2">
                          <Building2 size={18} className="text-lime-300" />
                          <span className="text-3xl font-black text-white">+25</span>
                        </div>
                        <p className="text-[8px] font-bold text-white/50 uppercase tracking-wider mt-1">Per Court Owner</p>
                      </div>
                    )}
                    {referralMode === 'player' && (
                      <div className="bg-white/15 backdrop-blur-sm p-5 rounded-[28px] text-center min-w-[140px] border border-white/20">
                        <p className="text-[9px] font-black text-white/80 uppercase tracking-widest mb-1.5">Earn Up To</p>
                        <div className="flex items-center justify-center gap-2">
                          <Sparkles size={18} className="text-blue-300" />
                          <span className="text-3xl font-black text-white">+10</span>
                        </div>
                        <p className="text-[8px] font-bold text-white/50 uppercase tracking-wider mt-1">Per Signup</p>
                      </div>
                    )}
                  </div>

                  {/* Content grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* QR Code */}
                    <div className="bg-white/10 backdrop-blur-sm p-6 md:p-8 rounded-[32px] border border-white/20 flex flex-col items-center text-center">
                      <h3 className="text-xs font-black text-white uppercase tracking-widest mb-5">Referral QR Code</h3>
                      {(referralMode === 'court-owner' ? courtOwnerQrDataUrl : playerQrDataUrl) ? (
                        <div className="bg-white p-3 rounded-2xl shadow-xl mb-4">
                          <img
                            src={(referralMode === 'court-owner' ? courtOwnerQrDataUrl : playerQrDataUrl)!}
                            alt={`${referralMode === 'court-owner' ? 'Court Owner' : 'Player'} Referral QR`}
                            className="w-44 h-44"
                          />
                        </div>
                      ) : (
                        <div className="w-44 h-44 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                          <QrCode size={48} className="text-white/40" />
                        </div>
                      )}
                      <p className="text-[10px] font-bold text-white/60 mb-4">
                        QR code includes PicklePlay logo
                      </p>
                      <div className="flex gap-2 w-full max-w-[260px]">
                        <button
                          onClick={() => setShowQrEnlargeModal(true)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all border border-white/20"
                        >
                          <ZoomIn size={11} />
                          Enlarge
                        </button>
                        {(referralMode === 'court-owner' ? courtOwnerQrDataUrl : playerQrDataUrl) && (
                          <a
                            href={(referralMode === 'court-owner' ? courtOwnerQrDataUrl : playerQrDataUrl)!}
                            download={`pickleplay-${referralMode}-referral-${profileData?.referral_code || 'qr'}.png`}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all border border-white/20"
                          >
                            <Download size={11} />
                            Save
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Right side: Link + How it Works */}
                    <div className="space-y-5">
                      {/* Referral Link */}
                      <div className="bg-white/10 backdrop-blur-sm p-6 rounded-[32px] border border-white/20">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-3">
                          {referralMode === 'court-owner' ? 'Court Owner Link' : 'Referral Link'}
                        </h3>
                        <div className="relative">
                          <div className="w-full bg-white/10 border border-white/20 rounded-2xl py-3.5 pl-4 pr-24 font-bold text-white/80 text-[11px] truncate">
                            {referralMode === 'court-owner'
                              ? `https://www.pickleplay.ph/signup?ref=${profileData?.referral_code || '...'}&type=court-owner`
                              : `https://www.pickleplay.ph/signup?ref=${profileData?.referral_code || '...'}`
                            }
                          </div>
                          <button
                            onClick={() => {
                              const link = referralMode === 'court-owner'
                                ? `https://www.pickleplay.ph/signup?ref=${profileData?.referral_code}&type=court-owner`
                                : `https://www.pickleplay.ph/signup?ref=${profileData?.referral_code}`;
                              navigator.clipboard.writeText(link);
                              setProfileMessage({ type: 'success', text: 'Link copied to clipboard!' });
                              setTimeout(() => setProfileMessage(null), 3000);
                            }}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                              referralMode === 'court-owner'
                                ? 'bg-white text-blue-600 hover:bg-lime-300 hover:text-blue-800'
                                : 'bg-white text-slate-900 hover:bg-blue-100'
                            }`}
                          >
                            Copy Link
                          </button>
                        </div>
                      </div>

                      {/* Share to Stories */}
                      <div className="bg-white/10 backdrop-blur-sm p-6 rounded-[32px] border border-white/20">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-3">Share to Stories</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => generateShareImage(referralMode)}
                            disabled={isGeneratingShare}
                            className="flex-1 inline-flex items-center justify-center gap-2 h-11 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                          >
                            {isGeneratingShare ? <Loader2 size={14} className="animate-spin" /> : (
                              <>
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                Facebook
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => generateShareImage(referralMode)}
                            disabled={isGeneratingShare}
                            className="flex-1 inline-flex items-center justify-center gap-2 h-11 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                          >
                            {isGeneratingShare ? <Loader2 size={14} className="animate-spin" /> : (
                              <>
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                                Instagram
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* How it Works */}
                      <div className="bg-white/10 backdrop-blur-sm p-6 rounded-[32px] border border-white/20 space-y-3">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">How It Works</h3>
                        <div className="space-y-2.5">
                          {(referralMode === 'court-owner'
                            ? [
                                { step: '1', text: 'Share your QR code or link with a court owner' },
                                { step: '2', text: 'They sign up as a player first' },
                                { step: '3', text: 'Auto-directed to upgrade as Court Owner' },
                                { step: '4', text: 'Instant approval — no documents needed!' }
                              ]
                            : [
                                { step: '1', text: 'Share your QR code or referral link' },
                                { step: '2', text: 'Your friend signs up on PicklePlay' },
                                { step: '3', text: 'You both earn points automatically' },
                                { step: '4', text: 'More referrals = more rewards!' }
                              ]
                          ).map((item) => (
                            <div key={item.step} className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                referralMode === 'court-owner'
                                  ? 'bg-lime-300 text-blue-900'
                                  : 'bg-blue-400 text-white'
                              }`}>
                                {item.step}
                              </div>
                              <p className="text-white/80 text-xs font-semibold">{item.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Points Package ─── */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-200 space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Points Package</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Friend Signup', points: 10, icon: <UserPlus size={16} /> },
                    { label: 'Court Owner Referral', points: 25, icon: <Building2 size={16} /> },
                    { label: 'Friend Booking', points: 8, icon: <Calendar size={16} /> },
                    { label: 'Friend Purchase', points: 5, icon: <ShoppingBag size={16} /> },
                    { label: 'Friend Review', points: 3, icon: <Star size={16} /> }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-3 text-slate-600">
                        {item.icon}
                        <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
                      </div>
                      <span className="font-black text-blue-600">+{item.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-10">
              <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm space-y-10">
                {/* Modern Flipping ID Card */}
                <PlayerIDCard
                  profileData={profileData}
                  avatarUrl={avatarUrl}
                  isCurrentUser={isCurrentUser}
                  onUploadClick={() => document.getElementById('avatar-upload-mobile')?.click()}
                  qrCodeDataUrl={qrCodeDataUrl}
                />

                {/* Profile Message */}
                {profileMessage && (
                  <div className={`flex items-center gap-3 p-4 rounded-2xl ${profileMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                    {profileMessage.type === 'success' ? (
                      <CheckCircle className="text-emerald-600 flex-shrink-0" size={20} />
                    ) : (
                      <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                    )}
                    <p className={`text-sm font-bold ${profileMessage.type === 'success' ? 'text-emerald-900' : 'text-red-900'}`}>
                      {profileMessage.text}
                    </p>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
                  <Sparkles className="text-slate-500 mt-0.5" size={16} />
                  <p className="text-xs text-slate-600 font-semibold">
                    These fields are optional. Customize only what you want other players to see.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleProfileSection('identity')}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight">
                    <User className={`text-${themeColor}-600`} /> Player Identity
                  </h3>
                  <ChevronDown className={`transition-transform ${profileSections.identity ? 'rotate-180' : ''}`} size={18} />
                </button>

                {profileSections.identity && (
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Display Name</label>
                      {isCurrentUser ? (
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          onBlur={() => setEditedName(editedName.trim())}
                          maxLength={MAX_NAME}
                          className="w-full bg-slate-50/80 border-2 border-slate-200 focus:border-blue-500 focus:bg-white rounded-2xl py-4 px-6 font-bold text-slate-700 transition-all outline-none"
                          placeholder="Enter your name"
                        />
                      ) : (
                        <div className="w-full bg-slate-50/80 rounded-2xl py-4 px-6 font-bold text-slate-700">{displayName}</div>
                      )}
                      {isCurrentUser && (
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className={isNameValid ? 'text-slate-400' : 'text-rose-500'}>
                            {isNameValid ? 'Looks good' : 'Min 2 characters'}
                          </span>
                          <span className="text-slate-400">{MAX_NAME - editedName.length} left</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Home Location</label>
                      {isCurrentUser ? (
                        <div className="relative">
                          <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="text"
                            value={editedLocation}
                            onChange={(e) => setEditedLocation(e.target.value)}
                            onBlur={() => setEditedLocation(editedLocation.trim())}
                            maxLength={MAX_LOCATION}
                            className="w-full bg-slate-50/80 border-2 border-slate-200 focus:border-blue-500 focus:bg-white rounded-2xl py-4 pl-14 pr-6 font-bold text-slate-700 transition-all outline-none"
                            placeholder="e.g., Metro Manila, PH"
                          />
                        </div>
                      ) : (
                        <div className="w-full bg-slate-50/80 rounded-2xl py-4 px-6 font-bold text-slate-700 flex items-center gap-3">
                          <MapPin className="text-slate-400" size={16} />
                          {profileData.location || 'Not specified'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Short Manifesto (Bio)</label>
                      {isCurrentUser ? (
                        <textarea
                          value={editedBio}
                          onChange={(e) => setEditedBio(e.target.value)}
                          onBlur={() => setEditedBio(editedBio.trim())}
                          maxLength={MAX_BIO}
                          rows={4}
                          className="w-full bg-slate-50/80 border-2 border-slate-200 focus:border-blue-500 focus:bg-white rounded-2xl py-4 px-6 font-bold text-slate-700 leading-relaxed transition-all outline-none resize-none"
                          placeholder="Tell us about yourself..."
                        />
                      ) : (
                        <div className="w-full bg-slate-50/80 rounded-2xl py-4 px-6 font-bold text-slate-700 leading-relaxed">{profileData.bio || 'No bio yet.'}</div>
                      )}
                      {isCurrentUser && (
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span>Keep it short and real.</span>
                          <span>{MAX_BIO - editedBio.length} left</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => toggleProfileSection('availability')}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight">
                    <Clock className="text-emerald-600" size={18} /> Availability
                  </h3>
                  <ChevronDown className={`transition-transform ${profileSections.availability ? 'rotate-180' : ''}`} size={18} />
                </button>

                {profileSections.availability && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Availability</label>
                    {isCurrentUser ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {(['looking', 'busy', 'offline'] as const).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setAvailabilityStatus(status)}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${availabilityStatus === status
                                ? status === 'looking'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : status === 'busy'
                                    ? 'bg-blue-500 text-white border-blue-500'
                                    : 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                              {status === 'looking' ? 'Looking to Play' : status === 'busy' ? 'Busy' : 'Offline'}
                            </button>
                          ))}
                        </div>

                        {availabilityStatus === 'looking' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start</label>
                              <input
                                type="time"
                                value={availabilityStart}
                                onChange={(e) => setAvailabilityStart(e.target.value)}
                                className="w-full bg-slate-50/80 border-2 border-slate-200 focus:border-emerald-500 focus:bg-white rounded-2xl py-3 px-4 font-bold text-slate-700 transition-all outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End</label>
                              <input
                                type="time"
                                value={availabilityEnd}
                                onChange={(e) => setAvailabilityEnd(e.target.value)}
                                className="w-full bg-slate-50/80 border-2 border-slate-200 focus:border-emerald-500 focus:bg-white rounded-2xl py-3 px-4 font-bold text-slate-700 transition-all outline-none"
                              />
                            </div>
                          </div>
                        )}

                        <input
                          type="text"
                          value={availabilityNote}
                          onChange={(e) => setAvailabilityNote(e.target.value)}
                          maxLength={60}
                          className="w-full bg-slate-50/80 border-2 border-slate-200 focus:border-blue-500 focus:bg-white rounded-2xl py-3 px-4 font-bold text-slate-700 transition-all outline-none"
                          placeholder="Optional: Open for doubles"
                        />
                        <div className="text-[10px] font-bold text-slate-400 text-right">
                          {60 - availabilityNote.length} left
                        </div>
                      </div>
                    ) : (
                      <div className="w-full bg-slate-50/80 rounded-2xl py-4 px-6 font-bold text-slate-700 flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${availabilityStatus === 'looking'
                            ? 'bg-emerald-100 text-emerald-700'
                            : availabilityStatus === 'busy'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-200 text-slate-600'
                            }`}>
                            {availabilityStatus === 'looking' ? 'Looking to Play' : availabilityStatus === 'busy' ? 'Busy' : 'Offline'}
                          </span>
                          {availabilityStatus === 'looking' && availabilityStart && availabilityEnd && (
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{availabilityStart} - {availabilityEnd}</span>
                          )}
                        </div>
                        {availabilityNote && (
                          <p className="text-[11px] text-slate-500 font-semibold">{availabilityNote}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => toggleProfileSection('matchmaking')}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight">
                    <ArrowLeftRight className="text-blue-600" size={18} /> Match Preferences
                  </h3>
                  <ChevronDown className={`transition-transform ${profileSections.matchmaking ? 'rotate-180' : ''}`} size={18} />
                </button>

                {profileSections.matchmaking && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preferred Skill Range (DUPR)</label>
                      {isCurrentUser ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="number"
                            min={1}
                            max={8}
                            step={0.1}
                            value={preferredSkillMin}
                            onChange={(e) => setPreferredSkillMin(e.target.value)}
                            className="w-full bg-slate-50/80 border-2 border-slate-200 focus:border-blue-500 focus:bg-white rounded-2xl py-3 px-4 font-bold text-slate-700 transition-all outline-none"
                            placeholder="Min (e.g. 3.0)"
                          />
                          <input
                            type="number"
                            min={1}
                            max={8}
                            step={0.1}
                            value={preferredSkillMax}
                            onChange={(e) => setPreferredSkillMax(e.target.value)}
                            className="w-full bg-slate-50/80 border-2 border-slate-200 focus:border-blue-500 focus:bg-white rounded-2xl py-3 px-4 font-bold text-slate-700 transition-all outline-none"
                            placeholder="Max (e.g. 4.0)"
                          />
                        </div>
                      ) : (
                        <div className="w-full bg-slate-50/80 rounded-2xl py-4 px-6 font-bold text-slate-700">
                          {preferredSkillMin || preferredSkillMax ? `DUPR ${preferredSkillMin || '?'} - ${preferredSkillMax || '?'}` : 'Not specified'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preferred Court Type</label>
                      {isCurrentUser ? (
                        <div className="flex flex-wrap gap-2">
                          {(['Indoor', 'Outdoor', 'Both'] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setPreferredCourtType(type)}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${preferredCourtType === type
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="w-full bg-slate-50/80 rounded-2xl py-4 px-6 font-bold text-slate-700">
                          {preferredCourtType || 'Not specified'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preferred Locations</label>
                      {isCurrentUser ? (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setPreferredLocationMode('auto')}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${preferredLocationMode === 'auto'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                              Auto (near me)
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreferredLocationMode('manual')}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${preferredLocationMode === 'manual'
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                              Manual select
                            </button>
                          </div>

                          {preferredLocationMode === 'auto' ? (
                            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Based on your Home Location</p>
                              <p className="text-xs text-slate-600 font-semibold mt-2">
                                {editedLocation ? `Using "${editedLocation}"` : 'Set your Home Location to auto-match'}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {preferredLocationNames.length > 0 ? (
                                  preferredLocationNames.map((name) => (
                                    <span key={name} className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100">
                                      {name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-400 font-bold">No nearby locations found.</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {availableLocations.length > 0 ? (
                                availableLocations.map((loc) => (
                                  <button
                                    key={loc.id}
                                    type="button"
                                    onClick={() => togglePreferredLocation(loc.id)}
                                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${preferredLocationIds.includes(loc.id)
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                                      }`}
                                  >
                                    {loc.name}
                                  </button>
                                ))
                              ) : (
                                <div className="text-xs text-slate-400 font-bold">No locations found.</div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full bg-slate-50/80 rounded-2xl py-4 px-6 font-bold text-slate-700">
                          {preferredLocationNames.length > 0 ? preferredLocationNames.join(', ') : 'Not specified'}
                          {preferredLocationMode && (
                            <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-slate-400">({preferredLocationMode})</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preferred Courts</label>
                      {isCurrentUser ? (
                        <div className="space-y-3">
                          {preferredLocationMode === 'auto' ? (
                            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Auto-selected from nearby locations</p>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {preferredCourtNames.length > 0 ? (
                                  preferredCourtNames.map((name) => (
                                    <span key={name} className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-700 border border-slate-200">
                                      {name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-400 font-bold">No courts matched.</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {availableCourts.length > 0 ? (
                                availableCourts.map((court) => (
                                  <button
                                    key={court.id}
                                    type="button"
                                    onClick={() => togglePreferredCourt(court.id)}
                                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${preferredCourtIds.includes(court.id)
                                      ? 'bg-slate-900 text-white border-slate-900'
                                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                                      }`}
                                  >
                                    {court.name}
                                  </button>
                                ))
                              ) : (
                                <div className="text-xs text-slate-400 font-bold">No courts found.</div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full bg-slate-50/80 rounded-2xl py-4 px-6 font-bold text-slate-700">
                          {preferredCourtNames.length > 0 ? preferredCourtNames.join(', ') : 'Not specified'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Save Changes Button */}
                {isCurrentUser && (
                  <div className="pt-6 border-t border-slate-100 space-y-3">
                    {isProfileDirty && (
                      <div className="text-[10px] font-black uppercase tracking-widest text-blue-600">Unsaved changes</div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => {
                          setEditedName(savedName);
                          setEditedLocation(savedLocation);
                          setEditedBio(savedBio);
                          setAvailabilityStatus(savedAvailabilityStatus);
                          setAvailabilityStart(savedAvailabilityStart);
                          setAvailabilityEnd(savedAvailabilityEnd);
                          setAvailabilityNote(savedAvailabilityNote);
                          setPreferredSkillMin(savedPreferredSkillMin);
                          setPreferredSkillMax(savedPreferredSkillMax);
                          setPreferredLocationIds(savedPreferredLocationIds);
                          setPreferredCourtIds(savedPreferredCourtIds);
                          setPreferredLocationMode(savedPreferredLocationMode);
                          setPreferredCourtType(savedPreferredCourtType);
                        }}
                        disabled={!isProfileDirty || isSaving}
                        className="h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => setShowSaveConfirm(true)}
                        disabled={isSaving || !isProfileDirty || !isNameValid}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'} <Save size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <h3 className="text-base font-black text-slate-950 uppercase tracking-tight px-4">
                  Player Feed
                </h3>
                {userPosts.length > 0 ? (
                  userPosts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLike={() => handleLike(post.id)}
                      isExpanded={expandedComments[post.id]}
                      onToggleComments={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                      postsState={posts}
                      setPostsState={setPosts}
                      currentUserId={currentUserId}
                      currentUserProfile={{
                        name: profileData?.full_name || 'Anonymous',
                        avatar: profileData?.avatar_url || '',
                        role: profileData?.active_role || 'PLAYER'
                      }}
                    />
                  ))
                ) : (
                  <div className="bg-white text-center p-12 rounded-3xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-medium">This player hasn't posted anything yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm">
              <div className="flex flex-col items-center justify-center py-20 space-y-6">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center">
                  <Bell className="text-blue-600" size={40} />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Coming Soon</h3>
                  <p className="text-slate-500 font-medium max-w-md">Notification settings and preferences will be available in a future update.</p>
                </div>
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 rounded-full">
                  <Sparkles className="text-blue-600" size={16} />
                  <span className="text-xs font-black text-blue-600 uppercase tracking-wider">Under Development</span>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm space-y-8">
              {/* Success/Error Message */}
              {privacyMessage && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${privacyMessage.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
                  }`}>
                  {privacyMessage.type === 'success' ? (
                    <CheckCircle className="text-green-600" size={20} />
                  ) : (
                    <AlertCircle className="text-red-600" size={20} />
                  )}
                  <p className={`text-sm font-semibold ${privacyMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}>
                    {privacyMessage.text}
                  </p>
                </div>
              )}

              <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight">
                <Eye className="text-emerald-600" /> Privacy & Discovery
              </h3>

              <div className="space-y-6 border-t border-slate-100 pt-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile Visibility</p>

                <div className="space-y-3">
                  <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${tempVisibility === 'public'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200 hover:border-emerald-200'
                    } ${isCurrentUser ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                    <input
                      type="radio"
                      checked={tempVisibility === 'public'}
                      onChange={() => setTempVisibility('public')}
                      className="w-4 h-4"
                      disabled={!isCurrentUser}
                    />
                    <div>
                      <p className="font-bold text-slate-900">Public</p>
                      <p className="text-xs text-slate-500">Visible to everyone on PicklePlay</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${tempVisibility === 'friends'
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-slate-50 border-slate-200 hover:border-blue-200'
                    } ${isCurrentUser ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                    <input
                      type="radio"
                      checked={tempVisibility === 'friends'}
                      onChange={() => setTempVisibility('friends')}
                      className="w-4 h-4"
                      disabled={!isCurrentUser}
                    />
                    <div>
                      <p className="font-bold text-slate-900">Friends Only</p>
                      <p className="text-xs text-slate-500">Only visible to connected players</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${tempVisibility === 'private'
                    ? 'bg-slate-100 border-slate-300'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    } ${isCurrentUser ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                    <input
                      type="radio"
                      checked={tempVisibility === 'private'}
                      onChange={() => setTempVisibility('private')}
                      className="w-4 h-4"
                      disabled={!isCurrentUser}
                    />
                    <div>
                      <p className="font-bold text-slate-900">Private</p>
                      <p className="text-xs text-slate-500">Hidden from search results</p>
                    </div>
                  </label>
                </div>

                {/* Apply Changes Button - Only show when there are unsaved changes */}
                {isCurrentUser && tempVisibility !== savedVisibility && (
                  <button
                    onClick={handlePrivacyChange}
                    className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                  >
                    <Save size={20} />
                    Apply Changes
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm space-y-8">
              {/* Only show security message here when modals are closed */}
              {securityMessage && !show2FASetup && !showPasswordModal && !showEmailModal && !showSecurityReauthModal && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl ${securityMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  {securityMessage.type === 'success' ? (
                    <CheckCircle className="text-emerald-600" size={20} />
                  ) : (
                    <AlertCircle className="text-red-600" size={20} />
                  )}
                  <p className={`text-sm font-bold ${securityMessage.type === 'success' ? 'text-emerald-900' : 'text-red-900'}`}>
                    {securityMessage.text}
                  </p>
                </div>
              )}

              <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight">
                <Shield className="text-blue-600" /> Account Security
              </h3>

              <div className="space-y-6 border-t border-slate-100 pt-8">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="font-bold text-slate-900">Change Email Address</p>
                    <p className="text-xs text-slate-500">Update your sign-in and recovery email</p>
                    {currentAuthEmail && (
                      <p className="text-xs text-slate-400 mt-2">
                        Current: <span className="font-bold text-slate-700">{currentAuthEmail}</span>
                      </p>
                    )}
                    {pendingEmailChange && (
                      <p className="text-xs text-amber-600 mt-1 font-bold">
                        Pending confirmation: {pendingEmailChange}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleOpenEmailModal}
                    className="px-6 py-2 rounded-xl font-bold text-xs transition-all bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Update
                  </button>
                </div>

                {/* Password Management Section */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="font-bold text-slate-900">{hasPasswordAuth ? 'Change Password' : 'Set Password'}</p>
                    <p className="text-xs text-slate-500">
                      {hasPasswordAuth
                        ? 'Update your account password'
                        : 'Add a password to your Google account for email login & 2FA'
                      }
                    </p>
                    {!hasPasswordAuth && (
                      <p className="text-xs text-blue-500 mt-1 font-bold">Google account detected</p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className={`px-6 py-2 rounded-xl font-bold text-xs transition-all ${hasPasswordAuth
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                  >
                    {hasPasswordAuth ? 'Update' : 'Set Password'}
                  </button>
                </div>

                {/* Two-Factor Authentication Section */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="font-bold text-slate-900">Two-Factor Authentication</p>
                    {hasPasswordAuth ? (
                      <>
                        <p className="text-xs text-slate-500">Add an extra layer of security with Email verification</p>
                        <p className="text-xs text-slate-400 mt-2">Status: {twoFactorEnabled ? '✅ Enabled' : '❌ Disabled'}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-slate-500">Requires a password to enable 2FA verification</p>
                        <p className="text-xs text-blue-500 mt-2">Google-only account — set a password first</p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasPasswordAuth ? (
                      <button
                        onClick={() => {
                          if (!twoFactorEnabled) {
                            setSecurityMessage(null);
                            setCodeSent(false);
                            setVerificationCode('');
                            setBackupCodes([]);
                            setSetupMaskedEmail('');
                            setSetupResendCooldown(0);
                            setSetupCodeExpiresAt(null);
                            setShow2FASetup(true);
                          } else {
                            void handleDisableTwoFactor();
                          }
                        }}
                        className={`px-6 py-2 rounded-xl font-bold text-xs transition-all ${twoFactorEnabled
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                      >
                        {twoFactorEnabled ? 'Disable' : 'Enable'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowPasswordModal(true)}
                        className="px-5 py-2 rounded-xl font-bold text-xs transition-all bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Set Password
                      </button>
                    )}
                  </div>
                </div>

                {/* Active Sessions Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="font-bold text-slate-900">Active Sessions</p>
                      <p className="text-xs text-slate-500">Manage your active logins</p>
                    </div>
                    {isCurrentUser && (
                      <button
                        onClick={handleRevokeAllSessions}
                        disabled={isRevokingAllSessions}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isRevokingAllSessions ? 'Signing out...' : 'Sign out all'}
                      </button>
                    )}
                  </div>

                  {isLoadingSessions ? (
                    <div className="p-4 text-center text-slate-500">Loading sessions...</div>
                  ) : groupedSessions.length > 0 ? (
                    <div className="space-y-3 ml-4">
                      {groupedSessions.map((group) => {
                        const ipList = Array.from(group.ipAddresses);
                        const ipLabel = ipList.length === 0
                          ? 'Unknown IP'
                          : ipList.length === 1
                            ? ipList[0]
                            : `Multiple IPs (${ipList.length})`;

                        return (
                          <div key={group.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-900 text-sm">
                                  {group.deviceLabel}
                                </p>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                  {group.browserLabel}
                                </span>
                                {group.count > 1 && (
                                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                                    {group.count} sessions
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">{ipLabel}</p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                Last active: {new Date(group.lastActivity).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRevokeSessionGroup(group.sessionIds)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition-all flex items-center gap-2 whitespace-nowrap ml-3"
                            >
                              <LogOut size={14} />
                              Revoke
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-sm">No active sessions to display</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Activity & Ratings Tab */}
          {activeTab === 'stats' && (
            <div className="flex flex-col gap-12">

              {/* ── Activity Stats ── */}
              <div className="bg-white rounded-3xl border border-slate-200/50 shadow-sm p-8">
                <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight mb-6">
                  <BarChart3 className="text-blue-600" /> Activity Stats
                </h3>
                {isLoadingStats ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-slate-100 rounded-3xl h-28" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-3xl p-5 flex flex-col gap-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Sessions</p>
                      <p className="text-4xl font-black text-blue-600">{activityStats.totalBookings}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-3xl p-5 flex flex-col gap-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Courts Visited</p>
                      <p className="text-4xl font-black text-emerald-600">{activityStats.courtsVisited}</p>
                    </div>
                    <div className="bg-amber-50 rounded-3xl p-5 flex flex-col gap-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Hours Played</p>
                      <p className="text-4xl font-black text-amber-600">{activityStats.totalHours}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-3xl p-5 flex flex-col gap-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Member Since</p>
                      <p className="text-4xl font-black text-indigo-600">{activityStats.memberSince || '—'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Ratings from Opponents ── */}
              <div className="bg-white rounded-3xl border border-slate-200/50 shadow-sm p-8">
                <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight mb-6">
                  <Star className="text-amber-500" fill="currentColor" /> Ratings from Opponents
                </h3>

                {isLoadingStats ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-24 bg-slate-100 rounded-3xl" />
                    <div className="h-24 bg-slate-100 rounded-3xl" />
                  </div>
                ) : receivedRatings.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                      <Star className="text-slate-300" size={32} />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 uppercase tracking-tight">No Ratings Yet</p>
                      <p className="text-sm text-slate-400 mt-1">Play and verify matches to receive ratings from opponents.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Averages Grid */}
                    {(() => {
                      const total = receivedRatings.length;
                      const avg = (key: string) =>
                        (receivedRatings.reduce((s: number, r: any) => s + (r[key] || 0), 0) / total).toFixed(1);
                      const dims = [
                        { id: 'skill_level', label: 'Skill', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
                        { id: 'sportsmanship', label: 'Sportsmanship', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200' },
                        { id: 'reliability', label: 'Reliability', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
                        { id: 'fair_play', label: 'Fair Play', color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                      ];
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {dims.map(d => (
                            <div key={d.id} className={`${d.bg} border ${d.border} rounded-2xl p-4 text-center`}>
                              <p className={`text-2xl font-black ${d.color}`}>{avg(d.id)}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{d.label}</p>
                              <div className="flex justify-center gap-0.5 mt-2">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} size={10} className={parseFloat(avg(d.id)) >= s ? d.color : 'text-slate-200'} fill={parseFloat(avg(d.id)) >= s ? 'currentColor' : 'transparent'} />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Individual rating cards */}
                    <div className="space-y-4 border-t border-slate-100 pt-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {receivedRatings.length} Rating{receivedRatings.length !== 1 ? 's' : ''} Received
                      </p>
                      {receivedRatings.map((r: any) => {
                        const raterName = r.rater?.full_name || r.rater?.username || 'Anonymous Player';
                        const raterAvatar = r.rater?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${raterName}`;
                        const overallAvg = ((r.skill_level + r.sportsmanship + r.reliability + r.fair_play) / 4).toFixed(1);
                        const date = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                        return (
                          <div key={r.id} className="bg-slate-50 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <img src={raterAvatar} alt={raterName} className="w-10 h-10 rounded-full object-cover bg-slate-200" />
                                <div>
                                  <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{raterName}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{date}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-black text-indigo-600">{overallAvg}</p>
                                <div className="flex gap-0.5 justify-end mt-1">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} size={10} className={parseFloat(overallAvg) >= s ? 'text-amber-400' : 'text-slate-200'} fill={parseFloat(overallAvg) >= s ? 'currentColor' : 'transparent'} />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { label: 'Skill', val: r.skill_level, color: 'text-amber-500' },
                                { label: 'Sports.', val: r.sportsmanship, color: 'text-rose-500' },
                                { label: 'Reliab.', val: r.reliability, color: 'text-blue-500' },
                                { label: 'Fair Play', val: r.fair_play, color: 'text-emerald-500' },
                              ].map(d => (
                                <div key={d.label} className="bg-white rounded-2xl p-3 text-center border border-slate-100">
                                  <p className={`text-lg font-black ${d.color}`}>{d.val}</p>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{d.label}</p>
                                </div>
                              ))}
                            </div>
                            {r.comment && (
                              <p className="text-sm text-slate-600 font-medium leading-relaxed bg-white rounded-2xl p-4 border border-slate-100 italic">
                                &ldquo;{r.comment}&rdquo;
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}


          {show2FASetup && ReactDOM.createPortal(
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-3xl p-10 max-w-md w-full shadow-2xl border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-100 rounded-2xl">
                    <Shield size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-950">Enable 2FA</h4>
                    <p className="text-xs text-slate-500 mt-1">Secure your account</p>
                  </div>
                </div>

                {/* Security Message inside modal */}
                {securityMessage && (
                  <div className={`flex items-center gap-3 p-4 rounded-2xl mb-6 ${securityMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                    {securityMessage.type === 'success' ? (
                      <CheckCircle className="text-emerald-600 flex-shrink-0" size={20} />
                    ) : (
                      <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                    )}
                    <p className={`text-sm font-bold ${securityMessage.type === 'success' ? 'text-emerald-900' : 'text-red-900'}`}>
                      {securityMessage.text}
                    </p>
                  </div>
                )}

                {!codeSent && backupCodes.length === 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      A 6-digit verification code will be sent to your registered email address.
                    </p>

                    {/* Send Code Button */}
                    <button
                      onClick={handleSetup2FA}
                      disabled={isSending2FACode}
                      className="w-full py-3 px-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      {isSending2FACode ? 'Sending...' : 'Send Code to Email'}
                    </button>
                  </div>
                ) : backupCodes.length === 0 ? (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Email Delivery</p>
                      <p className="mt-2 text-sm font-semibold text-blue-950">{setupMaskedEmail || 'Checking your account email...'}</p>
                      <div className="mt-2 flex items-center justify-between text-xs font-medium text-blue-700">
                        <span>{setupCodeExpiresAt ? `Expires at ${new Date(setupCodeExpiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'New codes stay valid for 10 minutes.'}</span>
                        <span>{setupResendCooldown > 0 ? `Resend in ${setupResendCooldown}s` : 'Ready to resend'}</span>
                      </div>
                    </div>

                    {/* Code Verification */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-3">Enter verification code</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-2xl py-4 px-4 font-black text-slate-900 text-center text-3xl tracking-[0.5em] transition-all outline-none"
                        placeholder="000000"
                      />
                    </div>

                    {/* Verify Button */}
                    <button
                      onClick={handleVerifyCode}
                      disabled={isVerifying}
                      className="w-full py-3 px-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                      {isVerifying ? 'Verifying...' : 'Verify Code'}
                    </button>

                    <button
                      onClick={handleSetup2FA}
                      disabled={isSending2FACode || setupResendCooldown > 0}
                      className="w-full py-3 px-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                    >
                      {isSending2FACode ? 'Sending...' : setupResendCooldown > 0 ? `Resend in ${setupResendCooldown}s` : 'Resend Code'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 p-5 rounded-2xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield size={18} className="text-blue-700" />
                        <p className="text-sm font-black text-blue-900 uppercase tracking-wider">Backup Codes</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {backupCodes.map((code, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-xl font-mono text-sm font-bold text-slate-800 text-center shadow-sm">
                            {code}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-blue-900 font-medium leading-relaxed">Save these codes in a secure location. You'll need them if you lose access to your email.</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-8">
                  {backupCodes.length > 0 && (
                    <button
                      onClick={downloadBackupCodes}
                      className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={16} />
                      Download as .txt
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShow2FASetup(false);
                      setCodeSent(false);
                      setVerificationCode('');
                      setBackupCodes([]);
                      setSetupMaskedEmail('');
                      setSetupResendCooldown(0);
                      setSetupCodeExpiresAt(null);
                      setSecurityMessage(null);
                    }}
                    className={`${backupCodes.length > 0 ? 'flex-1' : 'w-full'} py-3 px-4 bg-slate-200 text-slate-900 rounded-2xl font-bold text-sm hover:bg-slate-300 transition-all`}
                  >
                    {backupCodes.length > 0 ? 'Close' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Avatar Viewer Modal - Modern Design */}
          {showAvatarViewer && ReactDOM.createPortal(
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center z-[9999] p-4 cursor-pointer animate-in fade-in duration-300"
              onClick={() => setShowAvatarViewer(false)}
            >
              {/* Close button */}
              <button
                onClick={() => setShowAvatarViewer(false)}
                className="absolute top-5 right-5 md:top-8 md:right-8 w-10 h-10 md:w-12 md:h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all z-10 backdrop-blur-sm border border-white/10"
              >
                <X size={20} className="text-white" />
              </button>

              {/* Modal Content */}
              <div
                className="relative flex flex-col items-center gap-6 md:gap-8"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Glowing ring effect */}
                <div className="relative">
                  <div className={`absolute -inset-3 rounded-full bg-gradient-to-tr from-${themeColor}-400/30 to-lime-300/30 blur-xl animate-pulse`} />
                  <div className={`relative w-[70vw] h-[70vw] max-w-[420px] max-h-[420px] rounded-full p-1 bg-gradient-to-tr from-${themeColor}-400 to-lime-300 shadow-2xl`}>
                    <div className="w-full h-full rounded-full overflow-hidden bg-white p-1">
                      <img
                        src={avatarUrl || profileData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Name & Role Card */}
                <div className="text-center">
                  <h3 className="text-white font-black text-2xl md:text-3xl tracking-tight uppercase">{displayName}</h3>
                  <p className={`text-${themeColor}-400 text-xs font-black uppercase tracking-[0.3em] mt-1`}>{displayRole.replace('_', ' ')}</p>
                </div>

                {/* Action buttons */}
                {isCurrentUser && (
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="avatar-upload-viewer"
                      className="flex items-center gap-2.5 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all backdrop-blur-sm border border-white/10 cursor-pointer active:scale-95"
                    >
                      <Camera size={16} />
                      Change Photo
                      <input
                        type="file"
                        id="avatar-upload-viewer"
                        accept="image/*"
                        onChange={(e) => { handleAvatarUpload(e); setShowAvatarViewer(false); }}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => { setShowBgEditor(true); setShowAvatarViewer(false); }}
                      className="flex items-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 active:scale-95"
                    >
                      <ImageIcon size={16} />
                      Edit Background
                    </button>
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}

          {/* Image Crop Modal (Square) */}
          {showCropModal && cropImageSrc && ReactDOM.createPortal(
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-xl">
                      <Camera size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-950">Crop Photo</h4>
                      <p className="text-xs text-slate-500">Drag to reposition · Square crop</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowCropModal(false); setCropImageSrc(null); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                {/* Crop Area */}
                <div
                  className="relative w-[300px] h-[300px] mx-auto rounded-2xl overflow-hidden bg-slate-900 cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={handleCropMouseDown}
                  onMouseMove={handleCropMouseMove}
                  onMouseUp={handleCropMouseUp}
                  onMouseLeave={handleCropMouseUp}
                  onTouchStart={handleCropTouchStart}
                  onTouchMove={handleCropTouchMove}
                  onTouchEnd={handleCropMouseUp}
                >
                  <img
                    ref={cropImageRef}
                    src={cropImageSrc}
                    alt="Crop preview"
                    className="absolute select-none pointer-events-none"
                    draggable={false}
                    style={{
                      transform: `translate(${cropPosition.x}px, ${cropPosition.y}px) scale(${cropZoom})`,
                      transformOrigin: 'center center',
                      left: '50%',
                      top: '50%',
                      marginLeft: '-150px',
                      marginTop: '-150px',
                      minWidth: '300px',
                      minHeight: '300px',
                      objectFit: 'cover',
                      width: '300px',
                      height: '300px',
                    }}
                  />
                  {/* Square crop overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 border-2 border-white/40 rounded-2xl" />
                    {/* Grid lines */}
                    <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
                    <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
                    <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
                    <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
                  </div>
                  {/* Move icon hint */}
                  <div className="absolute bottom-3 right-3 bg-black/50 rounded-full p-1.5">
                    <Move size={14} className="text-white/70" />
                  </div>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-4 mt-4 justify-center">
                  <button onClick={() => setCropZoom(z => Math.max(1, z - 0.1))} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                    <ZoomOut size={18} className="text-slate-600" />
                  </button>
                  <div className="flex-1 max-w-[180px]">
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.05"
                      value={cropZoom}
                      onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <button onClick={() => setCropZoom(z => Math.min(3, z + 0.1))} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                    <ZoomIn size={18} className="text-slate-600" />
                  </button>
                  <button onClick={() => { setCropPosition({ x: 0, y: 0 }); setCropZoom(1); }} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors" title="Reset">
                    <RotateCw size={18} className="text-slate-600" />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => { setShowCropModal(false); setCropImageSrc(null); }}
                    className="flex-1 py-3 px-4 bg-slate-200 text-slate-900 rounded-2xl font-bold text-sm hover:bg-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCropConfirm}
                    disabled={isUploadingAvatar}
                    className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUploadingAvatar ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : 'Apply & Save'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Background Editor Modal */}
          {showBgEditor && ReactDOM.createPortal(
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-xl">
                      <ImageIcon size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-950">Profile Photo Editor</h4>
                      <p className="text-xs text-slate-500">Choose background · Upload & position your photo</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowBgEditor(false); setBgOverlayImage(null); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                {/* Step 1: Choose Background */}
                <div className="mb-5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">1. Choose Background</p>
                  <div className="grid grid-cols-6 gap-2">
                    {backgroundOptions.map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => setSelectedBg(bg.id)}
                        className={`w-full aspect-square rounded-xl border-2 transition-all relative overflow-hidden ${selectedBg === bg.id ? 'border-blue-500 ring-2 ring-blue-200 scale-105' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        style={{ background: bg.style }}
                        title={bg.label}
                      >
                        {selectedBg === bg.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <CheckCircle size={16} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Upload PNG Photo */}
                <div className="mb-5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">2. Upload Your Photo (PNG recommended)</p>
                  <label className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 rounded-2xl cursor-pointer transition-all border-2 border-dashed border-slate-300 hover:border-blue-400">
                    <Upload size={18} className="text-slate-500" />
                    <span className="text-sm font-bold text-slate-600">{bgOverlayImage ? 'Change Photo' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/png,image/webp,image/*"
                      onChange={handleBgOverlayUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Step 3: Preview & Position */}
                <div className="mb-5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">3. Preview & Position</p>
                  <div className="flex justify-center">
                    <div
                      ref={bgPreviewRef}
                      className="relative w-[300px] h-[300px] rounded-full overflow-hidden border-4 border-slate-200 shadow-xl cursor-grab active:cursor-grabbing select-none"
                      style={{ background: backgroundOptions.find(b => b.id === selectedBg)?.style || '#667eea' }}
                      onMouseDown={bgOverlayImage ? handleOverlayMouseDown : undefined}
                      onMouseMove={bgOverlayImage ? handleOverlayMouseMove : undefined}
                      onMouseUp={handleOverlayMouseUp}
                      onMouseLeave={handleOverlayMouseUp}
                      onTouchStart={bgOverlayImage ? handleOverlayTouchStart : undefined}
                      onTouchMove={bgOverlayImage ? handleOverlayTouchMove : undefined}
                      onTouchEnd={handleOverlayMouseUp}
                    >
                      {bgOverlayImage ? (
                        <img
                          src={bgOverlayImage}
                          alt="Overlay"
                          className="absolute select-none pointer-events-none"
                          draggable={false}
                          style={{
                            transform: `translate(${bgOverlayPosition.x}px, ${bgOverlayPosition.y}px) scale(${bgOverlayScale})`,
                            transformOrigin: 'center center',
                            left: '50%',
                            top: '50%',
                            marginLeft: '-150px',
                            marginTop: '-150px',
                            width: '300px',
                            height: '300px',
                            objectFit: 'contain',
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60">
                          <Upload size={32} />
                          <p className="text-xs mt-2 font-bold">Upload a photo above</p>
                        </div>
                      )}
                      {bgOverlayImage && (
                        <div className="absolute bottom-4 right-4 bg-black/50 rounded-full p-1.5">
                          <Move size={14} className="text-white/70" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scale Controls */}
                  {bgOverlayImage && (
                    <div className="flex items-center gap-4 mt-4 justify-center">
                      <button onClick={() => setBgOverlayScale(s => Math.max(0.3, s - 0.1))} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                        <ZoomOut size={18} className="text-slate-600" />
                      </button>
                      <div className="flex-1 max-w-[180px]">
                        <input
                          type="range"
                          min="0.3"
                          max="3"
                          step="0.05"
                          value={bgOverlayScale}
                          onChange={(e) => setBgOverlayScale(parseFloat(e.target.value))}
                          className="w-full accent-blue-600"
                        />
                      </div>
                      <button onClick={() => setBgOverlayScale(s => Math.min(3, s + 0.1))} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                        <ZoomIn size={18} className="text-slate-600" />
                      </button>
                      <button onClick={() => { setBgOverlayPosition({ x: 0, y: 0 }); setBgOverlayScale(1); }} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors" title="Reset">
                        <RotateCw size={18} className="text-slate-600" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowBgEditor(false); setBgOverlayImage(null); }}
                    className="flex-1 py-3 px-4 bg-slate-200 text-slate-900 rounded-2xl font-bold text-sm hover:bg-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBgEditorConfirm}
                    disabled={isUploadingAvatar}
                    className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUploadingAvatar ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : 'Apply & Save'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* QR Code Enlarged Modal */}
          {showQrModal && qrCodeDataUrl && ReactDOM.createPortal(
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center z-[9999] p-4 cursor-pointer animate-in fade-in duration-300"
              onClick={() => setShowQrModal(false)}
            >
              <div
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl">
                      <QrCode size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-950">Profile QR Code</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scan with PicklePlay App</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowQrModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <X size={18} className="text-slate-400" />
                  </button>
                </div>

                <div className="flex flex-col items-center gap-6">
                  <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 shadow-inner">
                    <img src={qrCodeDataUrl} alt="Profile QR Code" className="w-64 h-64" />
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-sm text-slate-600 font-medium">
                      Point your phone's camera or use the <span className="font-bold text-slate-900">PicklePlay</span> app scanner
                    </p>
                    <div className="inline-flex items-center gap-2 bg-slate-50 text-slate-500 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      <Smartphone size={12} />
                      Mobile App Required
                    </div>
                  </div>

                  <a
                    href={qrCodeDataUrl}
                    download="pickleplay-profile-qr.png"
                    className="w-full inline-flex items-center justify-center gap-2 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                  >
                    <Download size={16} />
                    Download QR Code
                  </a>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Unified QR Code Enlarged Modal */}
          {showQrEnlargeModal && (referralMode === 'court-owner' ? courtOwnerQrDataUrl : playerQrDataUrl) && ReactDOM.createPortal(
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center z-[9999] p-4 cursor-pointer animate-in fade-in duration-300"
              onClick={() => setShowQrEnlargeModal(false)}
            >
              <div
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${referralMode === 'court-owner' ? 'bg-indigo-50' : 'bg-blue-50'}`}>
                      {referralMode === 'court-owner' ? <Building2 size={20} className="text-indigo-600" /> : <Users size={20} className="text-blue-600" />}
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-950">{referralMode === 'court-owner' ? 'Court Owner Referral' : 'Player Referral'}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Share this QR Code</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowQrEnlargeModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <X size={18} className="text-slate-400" />
                  </button>
                </div>

                <div className="flex flex-col items-center gap-6">
                  <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 shadow-inner">
                    <img
                      src={(referralMode === 'court-owner' ? courtOwnerQrDataUrl : playerQrDataUrl)!}
                      alt="Referral QR Code"
                      className="w-64 h-64"
                    />
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-sm text-slate-600 font-medium">
                      {referralMode === 'court-owner'
                        ? <>Share with court owners to invite them to <span className="font-bold text-slate-900">PicklePlay</span></>
                        : <>Share with friends to invite them to <span className="font-bold text-slate-900">PicklePlay</span></>
                      }
                    </p>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      referralMode === 'court-owner' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {referralMode === 'court-owner' ? <Building2 size={12} /> : <Users size={12} />}
                      {referralMode === 'court-owner' ? 'Instant Court Owner Access' : 'Player Invitation'}
                    </div>
                  </div>

                  <div className="flex gap-2 w-full">
                    <a
                      href={(referralMode === 'court-owner' ? courtOwnerQrDataUrl : playerQrDataUrl)!}
                      download={`pickleplay-${referralMode}-referral-${profileData?.referral_code || 'qr'}.png`}
                      className="flex-1 inline-flex items-center justify-center gap-2 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                    >
                      <Download size={16} />
                      Download
                    </a>
                    <button
                      onClick={() => {
                        const link = referralMode === 'court-owner'
                          ? `https://www.pickleplay.ph/signup?ref=${profileData?.referral_code}&type=court-owner`
                          : `https://www.pickleplay.ph/signup?ref=${profileData?.referral_code}`;
                        navigator.clipboard.writeText(link);
                        setProfileMessage({ type: 'success', text: 'Referral link copied!' });
                        setTimeout(() => setProfileMessage(null), 3000);
                      }}
                      className={`flex-1 inline-flex items-center justify-center gap-2 h-12 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                        referralMode === 'court-owner' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      <Copy size={16} />
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Share Story Image Modal */}
          {showShareModal && shareImageUrl && ReactDOM.createPortal(
            <div
              className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[9999] p-4 cursor-pointer animate-in fade-in duration-300"
              onClick={() => setShowShareModal(false)}
            >
              <div
                className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 cursor-default max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                      <Share2 size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-950">Share to Story</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Choose a platform</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <X size={18} className="text-slate-400" />
                  </button>
                </div>

                {/* Story image preview */}
                <div className="bg-slate-100 rounded-2xl p-3 mb-5">
                  <img
                    src={shareImageUrl}
                    alt="Share preview"
                    className="w-full rounded-xl shadow-lg"
                    style={{ maxHeight: '360px', objectFit: 'contain' }}
                  />
                </div>

                {/* Share buttons */}
                <div className="space-y-2.5">
                  <button
                    onClick={() => handleShareStory('facebook')}
                    className="w-full flex items-center justify-center gap-3 h-14 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Share to Facebook Story
                  </button>
                  <button
                    onClick={() => handleShareStory('instagram')}
                    className="w-full flex items-center justify-center gap-3 h-14 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    Share to Instagram Story
                  </button>
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                    <div className="relative flex justify-center"><span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Or</span></div>
                  </div>
                  <a
                    href={shareImageUrl}
                    download={`pickleplay-${referralMode}-invite-${profileData?.referral_code || 'share'}.png`}
                    className="w-full flex items-center justify-center gap-3 h-14 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
                  >
                    <Download size={18} />
                    Download Image
                  </a>
                </div>

                <p className="text-center text-[10px] font-bold text-slate-400 mt-4">
                  Upload the image to your story, then add a link sticker with your referral URL
                </p>
              </div>
            </div>,
            document.body
          )}

          {/* Save Confirmation Modal */}
          {showSaveConfirm && ReactDOM.createPortal(
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-100 rounded-2xl">
                    <Save size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-950">Save Changes?</h4>
                    <p className="text-xs text-slate-500 mt-1">Confirm your action</p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-6">
                  Are you sure you want to save these changes to your profile? This will update your display name, location, and bio.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSaveConfirm(false)}
                    className="flex-1 py-3 px-4 bg-slate-200 text-slate-900 rounded-2xl font-bold text-sm hover:bg-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveConfirm(false);
                      handleSave();
                    }}
                    disabled={isSaving}
                    className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Password Change/Set Modal */}
          {showPasswordModal && ReactDOM.createPortal(
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                <h4 className="text-xl font-black text-slate-950 mb-2 flex items-center gap-2">
                  <Lock size={20} className="text-blue-600" /> {hasPasswordAuth ? 'Change Password' : 'Set Password'}
                </h4>
                {!hasPasswordAuth && (
                  <p className="text-xs text-slate-500 mb-6">Create a password so you can log in with email and enable 2FA</p>
                )}

                <div className="space-y-4">
                  {hasPasswordAuth && (
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full mt-2 bg-slate-50 border-2 border-slate-200 focus:border-blue-500 rounded-2xl py-3 px-4 font-bold text-slate-700 transition-all outline-none"
                        placeholder="Enter current password"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className="w-full mt-2 bg-slate-50 border-2 border-slate-200 focus:border-blue-500 rounded-2xl py-3 px-4 font-bold text-slate-700 transition-all outline-none"
                      placeholder="Enter new password"
                    />
                    {newPassword && (
                      <div className="mt-2">
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${passwordStrength < 30 ? 'bg-red-500 w-1/3' :
                              passwordStrength < 60 ? 'bg-blue-500 w-2/3' :
                                'bg-emerald-500 w-full'
                              }`}
                          />
                        </div>
                        <p className={`text-xs mt-1 font-bold ${passwordStrength < 30 ? 'text-red-600' :
                          passwordStrength < 60 ? 'text-blue-600' :
                            'text-emerald-600'
                          }`}>
                          Strength: {passwordStrength < 30 ? 'Weak' : passwordStrength < 60 ? 'Fair' : 'Strong'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full mt-2 bg-slate-50 border-2 border-slate-200 focus:border-blue-500 rounded-2xl py-3 px-4 font-bold text-slate-700 transition-all outline-none"
                      placeholder="Confirm new password"
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-red-600 mt-1 font-bold">Passwords do not match</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Security Check</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Before this password change is completed, PicklePlay will send a security code to your current email so you can confirm it&apos;s you.
                  </p>
                </div>

                {securityMessage && (
                  <div className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 ${securityMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                    {securityMessage.type === 'success' ? (
                      <CheckCircle className="text-emerald-600 mt-0.5 shrink-0" size={18} />
                    ) : (
                      <AlertCircle className="text-red-600 mt-0.5 shrink-0" size={18} />
                    )}
                    <p className={`text-sm font-bold leading-6 ${securityMessage.type === 'success' ? 'text-emerald-900' : 'text-red-900'}`}>
                      {securityMessage.text}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setSecurityMessage(null);
                      if (securityReauthAction === 'change_password') {
                        closeSecurityReauthModal();
                      }
                    }}
                    className="flex-1 py-3 px-4 bg-slate-200 text-slate-900 rounded-2xl font-bold hover:bg-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdatePassword}
                    className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all"
                  >
                    {hasPasswordAuth ? 'Update Password' : 'Set Password'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {showEmailModal && ReactDOM.createPortal(
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-xl font-black text-slate-950 mb-2 flex items-center gap-2">
                      <Mail size={20} className="text-blue-600" /> Change Email Address
                    </h4>
                    <p className="text-sm text-slate-500 leading-6">
                      Update your sign-in and recovery email. Your new email must be confirmed before the change takes effect.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseEmailModal}
                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    aria-label="Close change email modal"
                  >
                    <X size={18} />
                  </button>
                </div>

                {pendingEmailChange && (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <Clock size={18} className="text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-black text-amber-900 uppercase tracking-wide">Confirmation Pending</p>
                        <p className="mt-1 text-sm text-amber-800 leading-6">
                          We are waiting for confirmation from <span className="font-bold">{pendingEmailChange}</span>. Your current email stays active and your account remains protected until the new address is verified.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4 mt-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Email Address</label>
                    <input
                      type="email"
                      readOnly
                      value={currentAuthEmail}
                      className="w-full mt-2 bg-slate-100 border-2 border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Email Address</label>
                    <input
                      type="email"
                      value={newEmailAddress}
                      onChange={(e) => setNewEmailAddress(e.target.value)}
                      className="w-full mt-2 bg-slate-50 border-2 border-slate-200 focus:border-blue-500 rounded-2xl py-3 px-4 font-bold text-slate-700 transition-all outline-none"
                      placeholder="Enter your new email address"
                      autoComplete="email"
                    />
                    <p className="mt-2 text-xs text-slate-500 leading-5">
                      Your sign-in email will only change after you confirm the new address from the email we send.
                    </p>
                    <p className="mt-1 text-xs text-slate-500 leading-5">
                      Before we submit the change, we&apos;ll ask you to confirm it&apos;s you with a security code sent to your current email.
                    </p>
                  </div>
                </div>

                {emailChangeMessage && (
                  <div className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 ${emailChangeMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                    {emailChangeMessage.type === 'success' ? (
                      <CheckCircle className="text-emerald-600 mt-0.5 shrink-0" size={18} />
                    ) : (
                      <AlertCircle className="text-red-600 mt-0.5 shrink-0" size={18} />
                    )}
                    <p className={`text-sm font-bold leading-6 ${emailChangeMessage.type === 'success' ? 'text-emerald-900' : 'text-red-900'}`}>
                      {emailChangeMessage.text}
                    </p>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 mt-8">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleCloseEmailModal}
                      className="px-5 py-3 bg-slate-200 text-slate-900 rounded-2xl font-bold hover:bg-slate-300 transition-all"
                    >
                      Cancel
                    </button>
                    {pendingEmailChange && (
                      <button
                        type="button"
                        onClick={handleResendEmailChange}
                        disabled={isResendingEmailChange}
                        className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold hover:border-blue-200 hover:text-blue-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                      >
                        {isResendingEmailChange && <Loader2 size={16} className="animate-spin" />}
                        {isResendingEmailChange ? 'Sending...' : 'Resend Confirmation'}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleUpdateEmailAddress}
                    disabled={isUpdatingEmail}
                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {isUpdatingEmail && <Loader2 size={16} className="animate-spin" />}
                    {isUpdatingEmail ? 'Sending Link...' : 'Send Confirmation Link'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          <SecurityReauthModal
            open={showSecurityReauthModal}
            action={securityReauthAction}
            code={securityReauthCode}
            maskedEmail={securityReauthMaskedEmail}
            codeExpiresAt={securityReauthCodeExpiresAt}
            resendCooldown={securityReauthResendCooldown}
            isSending={isStartingSecurityReauth}
            isSubmitting={isSubmittingSecurityReauth}
            message={securityReauthMessage}
            onCodeChange={setSecurityReauthCode}
            onClose={closeSecurityReauthModal}
            onSubmit={handleSubmitSecurityReauth}
            onResend={handleResendSecurityReauth}
          />

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm space-y-8">
              <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight">
                <Globe className="text-rose-600" /> Regional & Formats
              </h3>

              <div className="space-y-6 border-t border-slate-100 pt-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Language</label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-rose-500 rounded-2xl py-3 px-4 font-bold text-slate-700 transition-all"
                  >
                    <option value="en">🇬🇧 English</option>
                    <option value="fil">🇵🇭 Filipino (Tagalog)</option>
                    <option value="es">🇪🇸 Spanish</option>
                    <option value="zh">🇨🇳 Chinese (Mandarin)</option>
                    <option value="ja">🇯🇵 Japanese</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timezone</label>
                  <div className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-700">
                    🇵🇭 Asia/Manila (PHT) UTC+8
                  </div>
                  <p className="text-[10px] text-slate-500">PicklePlay Philippines - Fixed to Manila Timezone</p>
                </div>

                <button
                  onClick={() => handleLanguageChange(selectedLanguage)}
                  disabled={isTranslating}
                  className="w-full py-3 px-6 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isTranslating ? 'Saving...' : 'Apply Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm space-y-8">
              <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight">
                <CreditCard className="text-emerald-600" /> Subscription Management
              </h3>

              {/* Note: For court owners only, fetch their subscription status */}
              {userRole === 'COURT_OWNER' ? (
                <div className="border-t border-slate-100 pt-8 space-y-6">
                  <div className="bg-slate-50 rounded-2xl p-6">
                    <p className="text-sm font-bold text-slate-700 mb-4">🎉 Trial & Subscription Status</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Your subscription details will be displayed here. This is a placeholder - the actual implementation
                      would fetch your subscription from the database and show Active Trial, Grace Period, or Hard Locked status.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-950 uppercase">Available Plans</h4>

                    {/* Pro Plan */}
                    <div className="border-2 border-emerald-500 rounded-2xl p-6 bg-emerald-50/50 relative overflow-hidden">
                      <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">
                        Recommended
                      </div>
                      <h5 className="text-xl font-black text-slate-950 mb-1">Pro Plan</h5>
                      <p className="text-3xl font-black text-emerald-600 mb-3">₱999<span className="text-sm text-slate-500 font-normal">/month</span></p>
                      <ul className="space-y-2 mb-6">
                        <li className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span>Unlimited Courts & Locations</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span>Advanced Revenue Analytics</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span>Priority Customer Support</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span>Tournament Management</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span>Broadcast Announcements</span>
                        </li>
                      </ul>
                      <button className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all">
                        Subscribe to Pro
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                    <p className="text-xs text-blue-800 leading-relaxed">
                      <strong>💳 Payment Integration Coming Soon:</strong> Subscription activation is currently being developed.
                      You can still enjoy your free trial and grace period!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 space-y-6 border-t border-slate-100 pt-8">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center">
                    <ShoppingBag className="text-slate-400" size={40} />
                  </div>
                  <div className="text-center space-y-2">
                    <h4 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Player Account</h4>
                    <p className="text-slate-500 font-medium max-w-md">
                      Billing and subscriptions are for Court Owners only. Players enjoy free access to all features!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
