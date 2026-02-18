import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  MapPin,
  UserPlus,
  Heart,
  Send,
  Image as ImageIcon,
  Plus,
  Clock,
  Sparkles,
  Trophy as TrophyIcon,
  UserCheck,
  X,
  Newspaper,
  Calendar,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Check,
  Search,
  SlidersHorizontal,
  Tag,
  BookmarkPlus,
  MessageCircle,
  Users,
  CalendarCheck,
  Settings
} from 'lucide-react';
import { SocialPost, SocialComment, UserRole, NewsArticle, Group, GroupEvent } from '../../types';
import { PostSkeleton } from '../ui/Skeleton';
import { supabase } from '../../services/supabase';
import { getGroups, getFollowedTags, followTag, unfollowTag, getGroupEvents, rsvpToEvent, removeRsvp, joinGroup, createGroupEvent } from '../../services/community';
import { PostCard } from './PostCard';
import { CreateGroupModal } from './CreateGroupModal';
import { CreateEventModal } from './CreateEventModal';

interface CommunityProps {
  followedUsers: string[];
  onFollow: (userId: string, userName: string) => void;
  posts: SocialPost[];
  setPosts: React.Dispatch<React.SetStateAction<SocialPost[]>>;
}

const Community: React.FC<CommunityProps> = ({ followedUsers, onFollow, posts, setPosts }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Initialize activeTab from URL parameter or default to 'feed'
  const initialTab = (() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'groups' || tabParam === 'partners' || tabParam === 'feed') {
      return tabParam;
    }
    return 'feed';
  })();
  
  const [activeTab, setActiveTab] = useState<'feed' | 'partners' | 'groups'>(initialTab);
  const [newPostContent, setNewPostContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [partners, setPartners] = useState<any[]>([]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    name: string;
    avatar: string;
    role: string;
    availabilityStatus?: 'looking' | 'busy' | 'offline';
    availabilityStart?: string | null;
    availabilityEnd?: string | null;
    availabilityNote?: string | null;
    preferredSkillMin?: number | null;
    preferredSkillMax?: number | null;
    preferredLocationIds?: string[] | null;
    preferredCourtIds?: string[] | null;
    preferredCourtType?: 'Indoor' | 'Outdoor' | 'Both' | null;
    preferredLocationMode?: 'auto' | 'manual' | null;
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ hasImage: false, hasLikes: false, authorRole: 'all' as 'all' | UserRole, followedTagsOnly: false });
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [followedTags, setFollowedTags] = useState<string[]>([]);
  const [upcomingMeets, setUpcomingMeets] = useState<GroupEvent[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  // Compute user's squad count for limit enforcement
  const userSquadCount = React.useMemo(() => {
    if (!currentUserId) return 0;
    return groups.filter(g => (g as any).created_by === currentUserId).length;
  }, [groups, currentUserId]);

  // Lock body scroll when modals are open
  useEffect(() => {
    if (showCreateGroup || showCreateEvent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCreateGroup, showCreateEvent]);

  // Set active tab from URL parameter (handles browser back/forward and direct links)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'groups' || tabParam === 'partners' || tabParam === 'feed') {
      setActiveTab(tabParam);
    }
  }, [location.search, searchParams]);

  const hasGroupAccess = followedUsers.length > 0;
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trendingTags = React.useMemo(() => {
    const tagCounts: Record<string, number> = {};
    posts.forEach(post => {
      const foundTags = post.content.match(/#\w+/g) || [];
      foundTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [posts]);

  useEffect(() => {
    const loadFollowedTags = async () => {
      try {
        const dbTags = await getFollowedTags();
        setFollowedTags(dbTags);
      } catch (err) {
        console.error('Error loading followed tags from DB:', err);
        if (typeof window !== 'undefined') {
          try {
            const storedTags = localStorage.getItem('pp_followed_tags');
            if (storedTags) setFollowedTags(JSON.parse(storedTags));
          } catch (localErr) {
            console.error('Error loading from localStorage:', localErr);
          }
        }
      }
    };
    loadFollowedTags();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const saveFollowedTags = async () => {
      if (followedTags.length === 0 && !currentUserId) return;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('pp_followed_tags', JSON.stringify(followedTags));
        }
      } catch (err) {
        console.error('Error saving followed tags:', err);
      }
    };
    saveFollowedTags();
  }, [followedTags, currentUserId]);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, active_role, availability_status, availability_start, availability_end, availability_note, preferred_skill_min, preferred_skill_max, preferred_location_ids, preferred_court_ids, preferred_court_type, preferred_location_mode')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setCurrentUserProfile({
            name: profile.full_name,
            avatar: profile.avatar_url,
            role: profile.active_role,
            availabilityStatus: profile.availability_status || 'offline',
            availabilityStart: profile.availability_start,
            availabilityEnd: profile.availability_end,
            availabilityNote: profile.availability_note,
            preferredSkillMin: profile.preferred_skill_min,
            preferredSkillMax: profile.preferred_skill_max,
            preferredLocationIds: profile.preferred_location_ids || [],
            preferredCourtIds: profile.preferred_court_ids || [],
            preferredCourtType: profile.preferred_court_type || 'Both',
            preferredLocationMode: profile.preferred_location_mode || 'auto'
          });
        }

        const { data: otherUsers } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, active_role, availability_status, availability_start, availability_end, availability_note, preferred_skill_min, preferred_skill_max, preferred_location_ids, preferred_court_ids, preferred_court_type, preferred_location_mode')
          .neq('id', session.user.id)
          .limit(10);

        if (otherUsers) {
          setPartners(otherUsers.map(u => ({
            id: u.id,
            name: u.full_name,
            level: 'N/A',
            location: 'Nearby',
            tags: [u.active_role || 'PLAYER'],
            avatar: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`,
            availabilityStatus: u.availability_status || 'offline',
            availabilityStart: u.availability_start,
            availabilityEnd: u.availability_end,
            availabilityNote: u.availability_note,
            preferredSkillMin: u.preferred_skill_min,
            preferredSkillMax: u.preferred_skill_max,
            preferredLocationIds: u.preferred_location_ids || [],
            preferredCourtIds: u.preferred_court_ids || [],
            preferredCourtType: u.preferred_court_type || 'Both',
            preferredLocationMode: u.preferred_location_mode || 'auto'
          })));
        }
      }
      setIsLoading(false);
    };

    const fetchNews = async () => {
      try {
        const response = await fetch('/api/v1/news/articles');
        if (response.ok) {
          const result = await response.json();
          const rawArticles = result?.data?.data || result?.data || result?.articles || [];
          const normalized: NewsArticle[] = rawArticles.slice(0, 5).map((raw: any) => ({
            id: String(raw.id),
            title: raw.title || 'Untitled',
            excerpt: raw.excerpt || (raw.body || raw.content || '').substring(0, 150) + '...',
            category: (raw.category || raw.category_name || 'Community') as any,
            date: new Date(raw.published_at || raw.created_at || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            image: raw.image || raw.image_url || raw.featured_image || 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=800',
            readTime: raw.read_time || raw.reading_time || '3 min read',
            author: raw.author || raw.author_name || 'Staff'
          }));
          setNewsArticles(normalized);
        }
      } catch (err) {
        console.error('Error fetching news:', err);
      }
    };

    const loadGroupsAndEvents = async () => {
      try {
        const allGroups = await getGroups();
        setGroups(allGroups);

        if (allGroups.length > 0) {
          const allEvents = await getGroupEvents(allGroups[0].id, true).catch(() => [] as GroupEvent[]);
          const now = new Date();
          const upcoming = allEvents
            .filter(e => new Date(e.start_time) > now)
            .slice(0, 3);
          setUpcomingMeets(upcoming);
        }
      } catch (err) {
        console.error('Error loading groups and events:', err);
      }
    };

    fetchUserData();
    fetchNews();
    loadGroupsAndEvents();
  }, []);

  const filteredPosts = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return posts.filter(post => {
      if (filters.hasImage && !post.image) return false;
      if (filters.hasLikes && post.likes.length === 0) return false;
      if (filters.authorRole !== 'all' && post.authorRole !== filters.authorRole) return false;
      if (filters.followedTagsOnly && followedTags.length > 0 && !(post.tags || []).some(t => followedTags.includes(t))) return false;
      if (selectedTag && !(post.tags || []).includes(selectedTag)) return false;
      if (query) {
        const haystack = `${post.content} ${post.authorName} ${(post.tags || []).join(' ')}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [filters, followedTags, posts, searchQuery, selectedTag]);

  const filteredPartners = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return partners;
    return partners.filter(partner => {
      const haystack = `${partner.name} ${partner.location || ''} ${partner.skillLevel || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [partners, searchQuery]);

  const filteredGroups = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let filtered = query
      ? groups.filter(group => {
          const haystack = `${group.name} ${group.description || ''} ${group.category || ''}`.toLowerCase();
          return haystack.includes(query);
        })
      : groups;

    // Sort: user's created groups first, then member groups, then others
    return filtered.sort((a, b) => {
      const aIsCreator = a.created_by === currentUserId ? 0 : 1;
      const bIsCreator = b.created_by === currentUserId ? 0 : 1;
      if (aIsCreator !== bIsCreator) return aIsCreator - bIsCreator;

      const aIsMember = a.user_is_member ? 0 : 1;
      const bIsMember = b.user_is_member ? 0 : 1;
      return aIsMember - bIsMember;
    });
  }, [groups, searchQuery, currentUserId]);

  const handleToggleFollowTag = async (tag: string) => {
    const isFollowing = followedTags.includes(tag);
    try {
      if (isFollowing) {
        await unfollowTag(tag);
        setFollowedTags(prev => prev.filter(t => t !== tag));
      } else {
        await followTag(tag);
        setFollowedTags(prev => [...prev, tag]);
      }
    } catch (err) {
      console.error('Error toggling tag follow:', err);
      setFollowedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    }
  };

  const handleRsvp = async (eventId: string) => {
    const event = upcomingMeets.find(e => e.id === eventId);
    if (!event) return;

    const isGoing = event.user_rsvp_status === 'going';

    try {
      if (isGoing) {
        await removeRsvp(eventId);
        setUpcomingMeets(prev => prev.map(e =>
          e.id === eventId ? { ...e, user_rsvp_status: null, rsvp_count: (e.rsvp_count || 1) - 1 } : e
        ));
      } else {
        await rsvpToEvent(eventId, 'going');
        setUpcomingMeets(prev => prev.map(e =>
          e.id === eventId ? { ...e, user_rsvp_status: 'going', rsvp_count: (e.rsvp_count || 0) + 1 } : e
        ));
      }
    } catch (err) {
      console.error('Error updating RSVP:', err);
      alert('Failed to update RSVP. Please try again.');
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    setJoiningGroupId(groupId);
    try {
      await joinGroup(groupId);
      setGroups(prev => prev.map(g => 
        g.id === groupId 
          ? { ...g, member_count: (g.member_count || 0) + 1, user_is_member: true } 
          : g
      ));
    } catch (err) {
      console.error('Error joining group:', err);
      alert('Failed to join group.');
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPostContent.trim() && !selectedFile) || !currentUserId || !currentUserProfile) return;

    setIsPosting(true);

    try {
      let imageUrl = null;

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('community-posts')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('community-posts')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          profile_id: currentUserId,
          content: newPostContent,
          image_url: imageUrl,
          tags: ['General']
        })
        .select(`
          *,
          profiles!profile_id (full_name, avatar_url, active_role, availability_status, availability_start, availability_end, availability_note, preferred_skill_min, preferred_skill_max, preferred_location_ids, preferred_court_ids, preferred_court_type, preferred_location_mode)
        `)
        .single();

      if (error) throw error;

      const newPost: SocialPost = {
        id: data.id,
        authorId: data.profile_id,
        authorName: data.profiles?.full_name || currentUserProfile.name,
        authorAvatar: data.profiles?.avatar_url || currentUserProfile.avatar,
        authorRole: (data.profiles?.active_role as UserRole) || (currentUserProfile.role as UserRole),
        authorAvailabilityStatus: data.profiles?.availability_status || 'offline',
        authorAvailabilityStart: data.profiles?.availability_start,
        authorAvailabilityEnd: data.profiles?.availability_end,
        authorAvailabilityNote: data.profiles?.availability_note,
        authorPreferredSkillMin: data.profiles?.preferred_skill_min,
        authorPreferredSkillMax: data.profiles?.preferred_skill_max,
        authorPreferredLocationIds: data.profiles?.preferred_location_ids || [],
        authorPreferredCourtIds: data.profiles?.preferred_court_ids || [],
        authorPreferredCourtType: data.profiles?.preferred_court_type || 'Both',
        authorPreferredLocationMode: data.profiles?.preferred_location_mode || 'auto',
        content: data.content,
        image: data.image_url,
        tags: data.tags || [],
        likes: [],
        comments: [],
        timestamp: data.created_at,
        isEdited: false
      };

      setPosts(prevPosts => [newPost, ...prevPosts]);
      setNewPostContent('');
      setSelectedFile(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error creating post:', err);
      alert('Failed to publish post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUserId) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isLiked = post.likes.includes(currentUserId);

    try {
      if (isLiked) {
        await supabase
          .from('community_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('profile_id', currentUserId);

        setPosts(posts.map(p => p.id === postId ? { ...p, likes: p.likes.filter(id => id !== currentUserId) } : p));
      } else {
        await supabase
          .from('community_post_likes')
          .insert({ post_id: postId, profile_id: currentUserId });

        setPosts(posts.map(p => p.id === postId ? { ...p, likes: [...p.likes, currentUserId] } : p));
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <>
    <div className="space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-xs font-black text-indigo-600 uppercase tracking-[0.4em] mb-4">THE KITCHEN HUB / 2025</p>
          <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter uppercase">Community.</h1>
        </div>

        <div className="flex bg-white rounded-full border border-slate-200 shadow-md p-1.5">
          {([
            { key: 'feed', label: 'THE FEED' },
            { key: 'partners', label: 'FIND PARTNERS' },
            { key: 'groups', label: 'FIND GROUPS' }
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 md:px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.key ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:text-slate-950'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar - all tabs */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-[32px] p-6 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1 flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
            <Search size={18} className="text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'feed' ? "Search posts by text, author, or tags" :
                activeTab === 'partners' ? "Search partners by name or location" :
                "Search squads by name or category"
              }
              className="w-full bg-transparent outline-none text-sm font-medium text-slate-700"
            />
          </div>
          {/* Filters - Feed tab only */}
          {activeTab === 'feed' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilters(prev => ({ ...prev, hasImage: !prev.hasImage }))}
              className={`flex items-center gap-2 px-3 py-2 rounded-full border text-[11px] font-black uppercase tracking-widest transition-all ${filters.hasImage ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <ImageIcon size={16} /> Media
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, hasLikes: !prev.hasLikes }))}
              className={`flex items-center gap-2 px-3 py-2 rounded-full border text-[11px] font-black uppercase tracking-widest transition-all ${filters.hasLikes ? 'bg-rose-500 text-white border-rose-500 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <Heart size={16} /> Liked
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, followedTagsOnly: !prev.followedTagsOnly }))}
              className={`flex items-center gap-2 px-3 py-2 rounded-full border text-[11px] font-black uppercase tracking-widest transition-all ${filters.followedTagsOnly ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <BookmarkPlus size={16} /> My Tags
            </button>
            <div ref={roleMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setShowRoleMenu(v => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 text-[11px] font-black uppercase tracking-widest text-slate-700 bg-white shadow-[0_6px_18px_-12px_rgba(15,23,42,0.25)] min-w-[170px] hover:border-slate-300 hover:shadow-[0_10px_26px_-14px_rgba(15,23,42,0.35)] transition-all"
              >
                <SlidersHorizontal size={16} className="text-slate-400" />
                <span className="flex-1 text-left">{filters.authorRole === 'all' ? 'All roles' : filters.authorRole === 'PLAYER' ? 'Players' : filters.authorRole === 'COACH' ? 'Coaches' : 'Court Owners'}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showRoleMenu ? 'rotate-180' : ''}`} />
              </button>
              {showRoleMenu && (
                <div className="absolute z-20 mt-2 w-56 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                  {[
                    { value: 'all', label: 'All roles' },
                    { value: 'PLAYER', label: 'Players' },
                    { value: 'COACH', label: 'Coaches' },
                    { value: 'COURT_OWNER', label: 'Court Owners' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => { setFilters(prev => ({ ...prev, authorRole: option.value as any })); setShowRoleMenu(false); }}
                      className={`w-full text-left px-4 py-3 text-sm font-semibold flex items-center justify-between hover:bg-slate-50 ${filters.authorRole === option.value ? 'text-indigo-600' : 'text-slate-700'}`}
                    >
                      <span>{option.label}</span>
                      {filters.authorRole === option.value && <Check size={16} className="text-indigo-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {(selectedTag || searchQuery || filters.hasImage || filters.hasLikes || filters.followedTagsOnly || filters.authorRole !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedTag(null); setFilters({ hasImage: false, hasLikes: false, authorRole: 'all', followedTagsOnly: false }); }}
                className="px-3 py-2 rounded-full border border-slate-200 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
              >
                Clear
              </button>
            )}
          </div>
          )}
        </div>

        {/* Followed tags - Feed tab only */}
        {activeTab === 'feed' && followedTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {followedTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full border text-[11px] font-black uppercase tracking-widest transition-all ${selectedTag === tag ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                <Tag size={14} /> {tag}
                <span onClick={(e) => { e.stopPropagation(); handleToggleFollowTag(tag); }} className="text-slate-400 hover:text-rose-500">✕</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        <div className="lg:col-span-2 space-y-8">
          {activeTab === 'partners' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPartners.map(partner => {
                const isFollowing = followedUsers.includes(partner.id);
                return (
                  <div key={partner.id} className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm hover:shadow-2xl transition-all group">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="relative">
                        <img src={partner.avatar} className="w-16 h-16 rounded-2xl object-cover bg-slate-50" />
                        <div className="absolute -bottom-2 -right-2 bg-lime-400 text-slate-950 font-black text-[10px] px-2 py-1 rounded-lg border-2 border-white">
                          {partner.level}
                        </div>
                      </div>
                      <div>
                        <Link to={`/profile/${partner.id}`} className="font-black text-slate-950 text-xl tracking-tight group-hover:text-indigo-600 transition-colors">{partner.name}</Link>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-1">
                          <MapPin size={12} className="text-indigo-600" /> {partner.location}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${partner.availabilityStatus === 'looking'
                              ? 'bg-emerald-100 text-emerald-700'
                              : partner.availabilityStatus === 'busy'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-200 text-slate-600'
                            }`}>
                            {partner.availabilityStatus === 'looking' ? 'Looking to Play' : partner.availabilityStatus === 'busy' ? 'Busy' : 'Offline'}
                          </span>
                          {partner.availabilityStatus === 'looking' && partner.availabilityStart && partner.availabilityEnd && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{partner.availabilityStart} - {partner.availabilityEnd}</span>
                          )}
                        </div>
                        {partner.availabilityNote && (
                          <p className="text-[10px] text-slate-500 font-semibold mt-1">{partner.availabilityNote}</p>
                        )}
                        {(partner.preferredSkillMin || partner.preferredSkillMax) && (
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">
                            Prefers DUPR {partner.preferredSkillMin || '?'}-{partner.preferredSkillMax || '?'}
                          </p>
                        )}
                        {partner.preferredCourtType && (
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">
                            Court Type: {partner.preferredCourtType}
                          </p>
                        )}
                        {(partner.preferredLocationIds?.length || partner.preferredCourtIds?.length) && (
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">
                            Prefers {partner.preferredLocationIds?.length || 0} locations • {partner.preferredCourtIds?.length || 0} courts
                          </p>
                        )}
                        {partner.preferredLocationMode && (
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">
                            Locations: {partner.preferredLocationMode === 'auto' ? 'Auto' : 'Manual'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-8">
                      {partner.tags.map((tag: string) => (
                        <span key={tag} className="text-[9px] font-black bg-slate-50 text-slate-500 px-3 py-1 rounded-lg uppercase tracking-widest border border-slate-100">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => onFollow(partner.id, partner.name)}
                      className={`w-full font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl text-xs uppercase tracking-[0.2em] transition-all ${isFollowing ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-slate-950 text-white hover:bg-indigo-600 shadow-slate-100'
                        }`}
                    >
                      {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                      {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                    </button>
                  </div>
                );
              })}
              {filteredPartners.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <Search size={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2">No partners found</h3>
                  <p className="text-sm text-slate-500">Try adjusting your search to find more results</p>
                </div>
              )}
            </div>
          ) : activeTab === 'groups' ? (
            <div className="space-y-4">
              <div className="bg-indigo-600 p-8 md:p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute -bottom-10 -right-10 w-48 h-48 text-white/10 rotate-12">
                  <TrophyIcon className="w-full h-full" />
                </div>
                <h3 className="text-3xl font-black mb-4 tracking-tight uppercase leading-none">JOIN THE <br /> SQUAD.</h3>
                <p className="text-indigo-100 text-sm font-medium mb-8 leading-relaxed">Find local teams or found your own elite pickleball dynasty in your district.</p>
                <div className={`grid grid-cols-1 ${groups.length > 0 ? 'md:grid-cols-2' : ''} gap-3`}>
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className="w-full bg-white text-indigo-600 font-black py-4 rounded-[24px] hover:bg-lime-400 hover:text-slate-900 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest shadow-xl"
                  >
                    Create squad <Plus size={16} />
                  </button>
                  {(() => {
                    // Check if user is admin of any group
                    const isAdminOfAny = groups.some(g => g.created_by === currentUserId);
                    return isAdminOfAny ? (
                      <button
                        onClick={() => setShowCreateEvent(true)}
                        className="w-full bg-indigo-500/70 text-white font-black py-4 rounded-[24px] hover:bg-indigo-400 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest border border-white/20"
                      >
                        Create event <Calendar size={16} />
                      </button>
                    ) : (
                      <p className="text-indigo-200 text-xs font-semibold mt-2">Only squad admins can create events</p>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredGroups.map(group => {
                  const isCreator = group.created_by === currentUserId;
                  return (
                  <div key={group.id} className={`bg-white p-6 rounded-[32px] border shadow-sm hover:shadow-xl transition-all ${isCreator ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pickleball</p>
                          {isCreator && (
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-indigo-600 text-white">YOUR SQUAD</span>
                          )}
                        </div>
                        <h4 className="text-lg font-black text-slate-900 leading-tight">{group.name}</h4>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{group.description || 'Join this group to connect with other players'}</p>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full shrink-0 ${group.privacy === 'public' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>{group.privacy === 'public' ? 'Public' : 'Private'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold mb-3">
                      <Users size={14} className="text-indigo-500" /> {group.member_count} members
                      <span>•</span>
                      <MapPin size={14} className="text-indigo-500" /> {group.location || 'Location TBD'}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(group.tags || []).map(tag => (
                        <span key={tag} className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-slate-50 border border-slate-100 text-slate-500">{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigate(`/community/groups/${group.id}`)}
                        className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:border-indigo-200 hover:text-indigo-600 transition-all"
                      >
                        View details
                      </button>
                      {isCreator ? (
                        <button
                          onClick={() => navigate(`/community/groups/${group.id}/manage`)}
                          title="Manage Squad"
                          className="p-2.5 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                        >
                          <Settings size={18} />
                        </button>
                      ) : group.user_is_member ? (
                        <button
                          disabled
                          className="px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-[11px] font-black uppercase tracking-widest cursor-default"
                        >
                          Joined
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinGroup(group.id)}
                          className="px-4 py-3 rounded-2xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:opacity-50"
                          disabled={joiningGroupId === group.id}
                        >
                          {joiningGroupId === group.id ? 'Joining...' : 'Join group'}
                        </button>
                      )}
                    </div>
                  </div>
                );
                })}
                {filteredGroups.length === 0 && (
                  <div className="col-span-full text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                      <Search size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-2">No squads found</h3>
                    <p className="text-sm text-slate-500">Try adjusting your search or create a new squad</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                <form onSubmit={handlePost} className="space-y-4">
                  <div className="flex gap-4">
                    <img src={currentUserProfile?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=John"} className="w-12 h-12 rounded-2xl bg-slate-100" />
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Share your latest match update or drill tip..."
                      className="flex-1 bg-slate-50 border-none rounded-3xl p-5 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none h-28"
                    />
                  </div>

                  {imagePreview && (
                    <div className="relative inline-block ml-16">
                      <img src={imagePreview} className="w-48 rounded-2xl border border-slate-100 shadow-sm" />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg hover:bg-rose-600 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-3 rounded-xl transition-all ${imagePreview ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-600'}`}
                      >
                        <ImageIcon size={20} />
                      </button>
                      <button type="button" className="p-3 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all"><Sparkles size={20} /></button>
                    </div>
                    <button
                      type="submit"
                      disabled={(!newPostContent.trim() && !selectedFile) || isPosting}
                      className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isPosting ? 'POSTING...' : 'PUBLISH POST'} <Send size={14} />
                    </button>
                  </div>
                </form>
              </div>

              {/* Featured News in Feed */}
              {newsArticles.length > 0 && (
                <Link to="/news" className="block bg-slate-900 rounded-[48px] overflow-hidden shadow-2xl relative group border border-slate-800 transition-all hover:shadow-indigo-500/10">
                  <div className="aspect-[21/9] w-full relative">
                    <img src={newsArticles[0].image} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                  </div>
                  <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-lime-400 text-slate-950 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">FEATURED NEWS</span>
                      <span className="text-white/60 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar size={12} className="text-lime-400" /> {newsArticles[0].date}
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-tight mb-4 group-hover:text-lime-400 transition-colors">
                      {newsArticles[0].title}
                    </h3>
                    <p className="text-slate-300 text-sm font-medium leading-relaxed line-clamp-2 mb-6 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                      {newsArticles[0].excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-black text-[10px]">
                          {newsArticles[0].author.charAt(0)}
                        </div>
                        <span className="text-[10px] text-white/80 font-black uppercase tracking-widest">{newsArticles[0].author}</span>
                      </div>
                      <span className="text-[10px] font-black text-lime-400 uppercase tracking-widest flex items-center gap-2">
                        READ STORY <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              )}

              <div className="space-y-8">
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => <PostSkeleton key={i} />)
                ) : (
                  filteredPosts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLike={() => handleLike(post.id)}
                      isExpanded={expandedComments[post.id]}
                      onToggleComments={() => toggleComments(post.id)}
                      postsState={posts}
                      setPostsState={setPosts}
                      currentUserId={currentUserId}
                      currentUserProfile={currentUserProfile}
                      onSelectTag={setSelectedTag}
                      onFollowTag={handleToggleFollowTag}
                      followedTags={followedTags}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT SIDEBAR — News, Events & My Squads (all tabs) */}
        <div className="space-y-6">
          {/* Latest News */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em]">Latest News</h3>
              <Link to="/news" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors">
                All →
              </Link>
            </div>
            <div className="space-y-4">
              {newsArticles.slice(0, 3).map((article) => (
                <Link key={article.id} to="/news" className="block group/item">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                      <img src={article.image} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest mb-1 block">{article.category}</span>
                      <h4 className="font-black text-slate-950 text-xs leading-tight group-hover/item:text-indigo-600 transition-colors line-clamp-2">
                        {article.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>{article.date}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {newsArticles.length === 0 && !isLoading && (
                <div className="text-center py-6">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">No updates</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          {upcomingMeets.length > 0 && (
            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em]">Events</h3>
                <CalendarCheck size={16} className="text-indigo-500" />
              </div>
              <div className="space-y-3">
                {upcomingMeets.slice(0, 3).map(event => {
                  const eventDate = new Date(event.start_time);
                  const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'short' });
                  const time = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                  const formattedDate = `${dayName} • ${time}`;

                  return (
                    <div key={event.id} className="border border-slate-100 rounded-2xl p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-1">{formattedDate}</p>
                      <h4 className="font-black text-slate-900 text-xs leading-tight mb-1">{event.title}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold">
                        <Users size={10} /> {event.rsvp_count || 0} going
                        {event.location && (
                          <>
                            <span>•</span>
                            <span className="truncate">{event.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* My Squads or Join Squad Promo */}
          {currentUserId && (() => {
            const userGroups = groups.filter(g => 
              g.created_by === currentUserId || g.user_is_member
            );

            if (userGroups.length === 0) {
              // Show JOIN SQUAD promo when user has no groups
              return (
                <div className="bg-indigo-600 p-6 rounded-[32px] text-white shadow-sm overflow-hidden relative">
                  <div className="relative z-10">
                    <h3 className="text-lg font-black mb-2 tracking-tight uppercase leading-none">Join The<br />Squad.</h3>
                    <p className="text-indigo-100 text-xs font-medium mb-5 leading-relaxed">Find local teams or found your own elite pickleball dynasty.</p>
                    <button
                      onClick={() => setActiveTab('groups')}
                      className="w-full bg-white text-indigo-600 font-black py-3 rounded-2xl hover:bg-lime-400 hover:text-slate-900 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
                    >
                      {activeTab === 'groups' ? 'Create squad' : 'View squads'} <Plus size={14} />
                    </button>
                  </div>
                  <TrophyIcon className="absolute -bottom-6 -right-6 w-32 h-32 text-white/10 rotate-12" />
                </div>
              );
            }

            // Show user's accessible squads
            return (
              <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] mb-4">My Squads</h3>
                <div className="space-y-3">
                  {userGroups.map(group => {
                    const isCreator = group.created_by === currentUserId;
                    return (
                      <button
                        key={group.id}
                        onClick={() => navigate(`/community/groups/${group.id}`)}
                        className="w-full text-left p-3 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-black text-slate-900 text-sm group-hover:text-indigo-600 transition-colors truncate flex-1">
                            {group.name}
                          </p>
                          {isCreator && (
                            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 shrink-0">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-semibold">
                          {group.privacy === 'public' ? 'Public' : 'Private'} • {group.member_count} members
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>

    {/* Extracted Modals */}
    <CreateGroupModal
      show={showCreateGroup}
      onClose={() => setShowCreateGroup(false)}
      onGroupCreated={(newGroup) => setGroups(prev => [newGroup, ...prev])}
      userSquadCount={userSquadCount}
    />

    <CreateEventModal
      show={showCreateEvent}
      onClose={() => setShowCreateEvent(false)}
      onEventCreated={(newEvent) => setUpcomingMeets(prev => [newEvent, ...prev])}
      groups={groups.filter(g => g.created_by === currentUserId)}
    />
    </>
  );
};

export default Community;
