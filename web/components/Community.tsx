
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  UserPlus,
  Heart,
  MessageSquare,
  Share2,
  Send,
  Image as ImageIcon,
  Plus,
  MoreHorizontal,
  Clock,
  Sparkles,
  Trophy as TrophyIcon,
  UserCheck,
  X,
  Reply,
  Newspaper,
  Calendar,
  ArrowRight,
  ChevronRight,
  Trash2,
  Edit2,
  Check,
  RotateCcw
} from 'lucide-react';
import { useRef } from 'react';
import { SocialPost, SocialComment, UserRole, NewsArticle } from '../types';
import { PostSkeleton } from './ui/Skeleton';
import { supabase } from '../services/supabase';

// PARTNERS mock data removed in favor of dynamic fetching

interface CommunityProps {
  followedUsers: string[];
  onFollow: (userId: string, userName: string) => void;
  posts: SocialPost[];
  setPosts: React.Dispatch<React.SetStateAction<SocialPost[]>>;
}

const formatContent = (content: string) => {
  if (!content) return null;
  return content.split(/(\s+)/).map((part, i) => {
    if (part.startsWith('#') && part.length > 1) {
      return (
        <span key={i} className="text-blue-600 font-bold hover:underline cursor-pointer">
          {part}
        </span>
      );
    }
    return part;
  });
};

const Community: React.FC<CommunityProps> = ({ followedUsers, onFollow, posts, setPosts }) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'partners'>('feed');
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trendingTags = React.useMemo(() => {
    const tagCounts: Record<string, number> = {};
    posts.forEach(post => {
      // Find all hashtags in content
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

        // Fetch other users for partners tab
        const { data: otherUsers } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, active_role, availability_status, availability_start, availability_end, availability_note, preferred_skill_min, preferred_skill_max, preferred_location_ids, preferred_court_ids, preferred_court_type, preferred_location_mode')
          .neq('id', session.user.id)
          .limit(10);

        if (otherUsers) {
          setPartners(otherUsers.map(u => ({
            id: u.id,
            name: u.full_name,
            level: 'N/A', // Assuming level is not in profile yet or needs calculation
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

    fetchUserData();
    fetchNews();
  }, []);

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
    <div className="space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-xs font-black text-indigo-600 uppercase tracking-[0.4em] mb-4">THE KITCHEN HUB / 2025</p>
          <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter uppercase">Community.</h1>
        </div>

        <div className="flex bg-white p-1.5 rounded-[24px] border border-slate-200 shadow-sm">
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'feed' ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:text-slate-950'
              }`}
          >
            THE FEED
          </button>
          <button
            onClick={() => setActiveTab('partners')}
            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'partners' ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:text-slate-950'
              }`}
          >
            FIND PARTNERS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        <div className="lg:col-span-2 space-y-8">
          {activeTab === 'feed' ? (
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
                  posts.map(post => (
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
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {partners.map(partner => {
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
                      {partner.tags.map(tag => (
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
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-indigo-600 p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden group">
            <h3 className="text-3xl font-black mb-4 tracking-tighter uppercase leading-none">JOIN THE <br />SQUAD.</h3>
            <p className="text-indigo-100 text-sm font-medium mb-8 leading-relaxed">
              Find local teams or found your own elite pickleball dynasty in your district.
            </p>
            <button className="w-full bg-white text-indigo-600 font-black py-5 rounded-[24px] hover:bg-lime-400 hover:text-slate-900 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest shadow-xl">
              CREATE SQUAD <Plus size={16} />
            </button>
            <TrophyIcon className="absolute -bottom-10 -right-10 w-48 h-48 text-white/10 rotate-12" />
          </div>

          {/* News Sidebar Summary */}
          <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8 relative z-10">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">LATEST NEWS</h3>
              <Link to="/news" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors flex items-center gap-1">
                ALL <ChevronRight size={12} />
              </Link>
            </div>

            <div className="space-y-8 relative z-10">
              {newsArticles.slice(0, 3).map((article, idx) => (
                <Link key={article.id} to="/news" className="block group/item">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                      <img src={article.image} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[8px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1 block">{article.category}</span>
                      <h4 className="font-black text-slate-950 text-xs leading-tight group-hover/item:text-indigo-600 transition-colors line-clamp-2">
                        {article.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>{article.date}</span>
                        <span>•</span>
                        <span>{article.readTime}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {newsArticles.length === 0 && !isLoading && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Newspaper size={20} className="text-slate-300" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">No updates today</p>
                </div>
              )}
            </div>

            {/* Decorative background element */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50/50 rounded-full blur-3xl -z-0" />
          </div>

          <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-8">TRENDING TAGS</h3>
            <div className="space-y-4">
              {trendingTags.length > 0 ? (
                trendingTags.map(tag => (
                  <div key={tag.name} className="flex items-center justify-between group cursor-pointer">
                    <span className="font-black text-blue-600 text-sm group-hover:text-indigo-600 transition-colors">{tag.name}</span>
                    <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-950">
                      {tag.count} {tag.count === 1 ? 'post' : 'posts'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 font-medium italic">No tags yet...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PostCard: React.FC<{
  post: SocialPost,
  onLike: () => void,
  isExpanded: boolean,
  onToggleComments: () => void,
  postsState: SocialPost[],
  setPostsState: React.Dispatch<React.SetStateAction<SocialPost[]>>,
  currentUserId: string | null,
  currentUserProfile: { name: string, avatar: string, role: string } | null
}> = ({ post, onLike, isExpanded, onToggleComments, postsState, setPostsState, currentUserId, currentUserProfile }) => {
  const [commentInput, setCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdatePost = async () => {
    if (!editContent.trim() || editContent === post.content) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('community_posts')
        .update({
          content: editContent,
          is_edited: true // Flag as edited
        })
        .eq('id', post.id);

      if (error) {
        console.warn('is_edited column might be missing, falling back to simple update:', error.message);
        const { error: fallbackError } = await supabase
          .from('community_posts')
          .update({ content: editContent })
          .eq('id', post.id);

        if (fallbackError) throw fallbackError;
      }

      setPostsState(current => current.map(p => p.id === post.id ? { ...p, content: editContent, isEdited: true } : p));
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating post:', err);
      alert('Failed to update post');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      setPostsState(current => current.filter(p => p.id !== post.id));
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !currentUserId || !currentUserProfile) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('community_post_comments')
        .insert({
          post_id: post.id,
          profile_id: currentUserId,
          content: commentInput
        })
        .select(`
          *,
          profiles!profile_id (full_name, avatar_url)

        `)
        .single();

      if (error) throw error;

      const newComment: SocialComment = {
        id: data.id,
        authorName: data.profiles?.full_name || currentUserProfile.name,
        authorAvatar: data.profiles?.avatar_url || currentUserProfile.avatar,
        content: data.content,
        timestamp: data.created_at,
        likes: [],
        replies: []
      };

      setPostsState(currentPosts => currentPosts.map(p => p.id === post.id ? { ...p, comments: [...p.comments, newComment] } : p));
      setCommentInput('');
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLiked = currentUserId ? post.likes.includes(currentUserId) : false;

  return (
    <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 overflow-hidden">
      <div className="p-8 pb-4">
        <div className="flex items-center justify-between mb-6">
          <Link to={`/profile/${post.authorId}`} className="flex items-center gap-4 group/author">
            <img src={post.authorAvatar} className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100" />
            <div>
              <h4 className="font-black text-slate-950 text-lg tracking-tight flex items-center gap-2 group-hover/author:text-indigo-600 transition-colors">
                {post.authorName}
                {post.authorRole === 'COACH' && <Sparkles size={16} className="text-lime-500" />}
              </h4>
              <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">{post.authorRole}</p>
              {post.authorAvailabilityStatus && (
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${post.authorAvailabilityStatus === 'looking'
                      ? 'bg-emerald-100 text-emerald-700'
                      : post.authorAvailabilityStatus === 'busy'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                    {post.authorAvailabilityStatus === 'looking' ? 'Looking' : post.authorAvailabilityStatus === 'busy' ? 'Busy' : 'Offline'}
                  </span>
                  {post.authorAvailabilityStatus === 'looking' && post.authorAvailabilityStart && post.authorAvailabilityEnd && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{post.authorAvailabilityStart} - {post.authorAvailabilityEnd}</span>
                  )}
                </div>
              )}
              {(post.authorPreferredSkillMin || post.authorPreferredSkillMax) && (
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">
                  Prefers DUPR {post.authorPreferredSkillMin || '?'}-{post.authorPreferredSkillMax || '?'}
                </div>
              )}
              {post.authorPreferredCourtType && (
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">
                  Court Type: {post.authorPreferredCourtType}
                </div>
              )}
            </div>
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-slate-300 hover:text-slate-950 transition-colors"
            >
              <MoreHorizontal size={24} />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {post.authorId === currentUserId ? (
                  <>
                    <button
                      onClick={() => { setIsEditing(true); setShowMenu(false); }}
                      className="w-full px-6 py-2.5 text-left text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3 transition-colors"
                    >
                      <Edit2 size={16} /> Edit Post
                    </button>
                    <button
                      onClick={() => { handleDeletePost(); setShowMenu(false); }}
                      className="w-full px-6 py-2.5 text-left text-[11px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 flex items-center gap-3 transition-colors"
                    >
                      <Trash2 size={16} /> Delete Post
                    </button>
                  </>
                ) : (
                  <button className="w-full px-6 py-2.5 text-left text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                    Report Post
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-4 mb-6">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none h-32"
              placeholder="Edit your thoughts..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setIsEditing(false); setEditContent(post.content); }}
                className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all flex items-center gap-2"
              >
                <RotateCcw size={14} /> Cancel
              </button>
              <button
                onClick={handleUpdatePost}
                disabled={isUpdating || !editContent.trim()}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
              >
                {isUpdating ? 'SAVING...' : <><Check size={14} /> SAVE CHANGES</>}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-slate-700 text-lg leading-relaxed mb-6 font-medium">
            {formatContent(post.content)}
          </p>
        )}

        {post.image && (
          <div className="rounded-3xl overflow-hidden mb-6 border border-slate-100">
            <img src={post.image} className="w-full aspect-video object-cover" />
          </div>
        )}

        <div className="flex items-center justify-between py-6 border-t border-slate-50">
          <div className="flex items-center gap-6">
            <button onClick={onLike} className={`flex items-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all ${isLiked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'}`}>
              <Heart size={20} className={isLiked ? 'fill-rose-500' : ''} /> {post.likes.length}
            </button>
            <button onClick={onToggleComments} className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-all">
              <MessageSquare size={20} /> {post.comments.length}
            </button>
            <button className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-all">
              <Share2 size={20} />
            </button>
          </div>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
            {post.isEdited && <span className="text-indigo-400 italic lowercase tracking-normal">Edited •</span>}
            <Clock size={12} /> {new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-slate-50 p-8 border-t border-slate-100 space-y-6 animate-slide-up">
          <div className="space-y-6">
            {postsState.find(p => p.id === post.id)?.comments.map(comment => (
              <CommentItem
                key={comment.id}
                postId={post.id}
                comment={comment}
                postsState={postsState}
                setPostsState={setPostsState}
                currentUserId={currentUserId}
                currentUserProfile={currentUserProfile}
              />
            ))}
          </div>
          <form onSubmit={handleCommentSubmit} className="flex gap-3 pt-4 border-t border-slate-200">
            <input type="text" value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="Write a comment..." className="flex-1 bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" />
            <button type="submit" disabled={!commentInput.trim() || isSubmitting} className="bg-indigo-600 text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50">
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

const CommentItem: React.FC<{
  postId: string,
  comment: SocialComment,
  isReply?: boolean,
  postsState: SocialPost[],
  setPostsState: React.Dispatch<React.SetStateAction<SocialPost[]>>,
  currentUserId: string | null,
  currentUserProfile: { name: string, avatar: string, role: string } | null
}> = ({ postId, comment, isReply = false, postsState, setPostsState, currentUserId, currentUserProfile }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLike = async () => {
    if (!currentUserId) return;
    const isCommentLiked = comment.likes?.includes(currentUserId);

    try {
      if (isCommentLiked) {
        await supabase
          .from('community_comment_likes')
          .delete()
          .eq('comment_id', comment.id)
          .eq('profile_id', currentUserId);
      } else {
        await supabase
          .from('community_comment_likes')
          .insert({ comment_id: comment.id, profile_id: currentUserId });
      }

      setPostsState(currentPosts =>
        currentPosts.map(p => {
          if (p.id !== postId) return p;

          const updateLikes = (comments: SocialComment[]): SocialComment[] => {
            return comments.map(c => {
              if (c.id === comment.id) {
                const newLikes = isCommentLiked ? c.likes.filter(id => id !== currentUserId) : [...c.likes, currentUserId];
                return { ...c, likes: newLikes };
              }
              if (c.replies) {
                return { ...c, replies: updateLikes(c.replies) };
              }
              return c;
            });
          };
          return { ...p, comments: updateLikes(p.comments) };
        })
      );
    } catch (err) {
      console.error('Error liking comment:', err);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !currentUserId || !currentUserProfile) return;
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('community_post_comments')
        .insert({
          post_id: postId,
          profile_id: currentUserId,
          parent_id: comment.id,
          content: replyContent
        })
        .select(`
          *,
          profiles!profile_id (full_name, avatar_url)

        `)
        .single();

      if (error) throw error;

      const newReply: SocialComment = {
        id: data.id,
        authorName: data.profiles?.full_name || currentUserProfile.name,
        authorAvatar: data.profiles?.avatar_url || currentUserProfile.avatar,
        content: data.content,
        timestamp: data.created_at,
        likes: [],
        replies: []
      };

      setPostsState(currentPosts =>
        currentPosts.map(p => {
          if (p.id !== postId) return p;

          const addReply = (comments: SocialComment[]): SocialComment[] => {
            return comments.map(c => {
              if (c.id === comment.id) {
                return { ...c, replies: [...c.replies, newReply] };
              }
              if (c.replies) {
                return { ...c, replies: addReply(c.replies) };
              }
              return c;
            });
          };
          return { ...p, comments: addReply(p.comments) };
        })
      );
      setReplyContent('');
      setShowReplyInput(false);
    } catch (err) {
      console.error('Error adding reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLiked = currentUserId ? comment.likes?.includes(currentUserId) : false;

  return (
    <div className={`space-y-4 ${isReply ? 'ml-10' : ''}`}>
      <div className="flex gap-4">
        <img src={comment.authorAvatar} className="w-10 h-10 rounded-xl bg-white border border-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative group">
            <p className="text-[10px] font-black text-slate-950 mb-1 uppercase tracking-widest">{comment.authorName}</p>
            <p className="text-sm text-slate-600 leading-relaxed">{formatContent(comment.content)}</p>
            <button onClick={handleLike} className={`absolute top-4 right-4 transition-all ${isLiked ? 'text-rose-500 scale-110' : 'text-slate-300 hover:text-rose-500'}`}>
              <Heart size={16} className={isLiked ? 'fill-rose-500' : ''} />
            </button>
          </div>
          <div className="flex items-center gap-4 ml-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {comment.likes?.length > 0 && <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">{comment.likes.length} LIKES</span>}
            {!isReply && <button onClick={() => setShowReplyInput(!showReplyInput)} className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1"><Reply size={12} /> Reply</button>}
          </div>
        </div>
      </div>
      {showReplyInput && (
        <form onSubmit={handleReplySubmit} className="ml-14 flex gap-3 animate-in slide-in-from-top-2">
          <input autoFocus type="text" value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder={`Reply to ${comment.authorName}...`} className="flex-1 bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <button type="submit" disabled={!replyContent.trim() || isSubmitting} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50">Post</button>
        </form>
      )}
      {comment.replies?.map(reply => (
        <CommentItem
          key={reply.id}
          postId={postId}
          comment={reply}
          isReply={true}
          postsState={postsState}
          setPostsState={setPostsState}
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
        />
      ))}
    </div>
  );
};

export default Community;
