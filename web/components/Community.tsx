
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
  Reply,
  UserCheck
} from 'lucide-react';
import { SocialPost, SocialComment, UserRole } from '../types';
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
  const [currentUserProfile, setCurrentUserProfile] = useState<{ name: string, avatar: string, role: string } | null>(null);

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
          .select('full_name, avatar_url, active_role')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setCurrentUserProfile({
            name: profile.full_name,
            avatar: profile.avatar_url,
            role: profile.active_role
          });
        }

        // Fetch other users for partners tab
        const { data: otherUsers } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, active_role')
          .neq('id', session.user.id)
          .limit(10);

        if (otherUsers) {
          setPartners(otherUsers.map(u => ({
            id: u.id,
            name: u.full_name,
            level: 'N/A', // Assuming level is not in profile yet or needs calculation
            location: 'Nearby',
            tags: [u.active_role || 'PLAYER'],
            avatar: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`
          })));
        }
      }
      setIsLoading(false);
    };
    fetchUserData();
  }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !currentUserId || !currentUserProfile) return;

    setIsPosting(true);

    try {
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          profile_id: currentUserId,
          content: newPostContent,
          tags: ['General']
        })
        .select(`
          *,
          profiles!profile_id (full_name, avatar_url, active_role)
        `)
        .single();

      if (error) throw error;

      const newPost: SocialPost = {
        id: data.id,
        authorId: data.profile_id,
        authorName: data.profiles?.full_name || currentUserProfile.name,
        authorAvatar: data.profiles?.avatar_url || currentUserProfile.avatar,
        authorRole: (data.profiles?.active_role as UserRole) || (currentUserProfile.role as UserRole),
        content: data.content,
        tags: data.tags || [],
        likes: [],
        comments: [],
        timestamp: data.created_at
      };

      setPosts(prevPosts => [newPost, ...prevPosts]);
      setNewPostContent('');
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
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex gap-2">
                      <button type="button" className="p-3 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all"><ImageIcon size={20} /></button>
                      <button type="button" className="p-3 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all"><Sparkles size={20} /></button>
                    </div>
                    <button
                      type="submit"
                      disabled={!newPostContent.trim() || isPosting}
                      className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isPosting ? 'POSTING...' : 'PUBLISH POST'} <Send size={14} />
                    </button>
                  </div>
                </form>
              </div>

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
            </div>
          </Link>
          <button className="p-2 text-slate-300 hover:text-slate-950 transition-colors">
            <MoreHorizontal size={24} />
          </button>
        </div>

        <p className="text-slate-700 text-lg leading-relaxed mb-6 font-medium">
          {formatContent(post.content)}
        </p>

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
