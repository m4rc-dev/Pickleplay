
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
import { SocialPost, SocialComment } from '../types';
import { PostSkeleton } from './ui/Skeleton';

const PARTNERS = [
  { id: 'u2', name: 'Marcus Chen', level: '4.5', location: '1.2 miles away', tags: ['Power', 'Aggressive'], avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus' },
  { id: 'u3', name: 'Elena Rodriguez', level: '3.8', location: '2.5 miles away', tags: ['Casual', 'Dinking'], avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena' },
  { id: 'u1', name: 'David Smith', level: '5.0', location: '0.8 miles away', tags: ['Tournament Ready'], avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' },
];

interface CommunityProps {
  followedUsers: string[];
  onFollow: (userId: string, userName: string) => void;
  posts: SocialPost[];
  setPosts: React.Dispatch<React.SetStateAction<SocialPost[]>>;
}

const Community: React.FC<CommunityProps> = ({ followedUsers, onFollow, posts, setPosts }) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'partners'>('feed');
  const [newPostContent, setNewPostContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Data is now passed via props, but we can still simulate a loading state
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    setIsPosting(true);

    const newPost: SocialPost = {
      id: `p-${Date.now()}`,
      authorId: 'player-current',
      authorName: 'John Player',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
      authorRole: 'PLAYER',
      content: newPostContent,
      tags: ['General'],
      likes: [],
      comments: [],
      timestamp: new Date().toISOString()
    };
    
    // Simulate API call and update global state
    await new Promise(resolve => setTimeout(resolve, 500));
    setPosts(prevPosts => [newPost, ...prevPosts]);
    setNewPostContent('');
    setIsPosting(false);
  };

  const handleLike = (postId: string) => {
    setPosts(posts.map(p => {
      if (p.id === postId) {
        const isLiked = p.likes.includes('player-current');
        const newLikes = isLiked
          ? p.likes.filter(id => id !== 'player-current')
          : [...p.likes, 'player-current'];
        return { ...p, likes: newLikes };
      }
      return p;
    }));
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
            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'feed' ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:text-slate-950'
            }`}
          >
            THE FEED
          </button>
          <button 
            onClick={() => setActiveTab('partners')}
            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'partners' ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:text-slate-950'
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
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=John" className="w-12 h-12 rounded-2xl bg-slate-100" />
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
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PARTNERS.map(partner => {
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
                      className={`w-full font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl text-xs uppercase tracking-[0.2em] transition-all ${
                        isFollowing ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-slate-950 text-white hover:bg-indigo-600 shadow-slate-100'
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
                {['#DUPR3Sync', '#KitchenMeta', '#MetroManilaOpen', '#ThirdShotDrop'].map(tag => (
                  <div key={tag} className="flex items-center justify-between group cursor-pointer">
                    <span className="font-black text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{tag}</span>
                    <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-900">1.2k posts</span>
                  </div>
                ))}
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
  setPostsState: React.Dispatch<React.SetStateAction<SocialPost[]>>
}> = ({ post, onLike, isExpanded, onToggleComments, postsState, setPostsState }) => {
  const [commentInput, setCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    setIsSubmitting(true);
    const newComment: SocialComment = {
      id: `c-${Date.now()}`,
      authorName: 'John Player',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
      content: commentInput,
      timestamp: new Date().toISOString(),
      likes: [],
      replies: []
    };
    await new Promise(resolve => setTimeout(resolve, 500));
    setPostsState(currentPosts => currentPosts.map(p => p.id === post.id ? { ...p, comments: [...p.comments, newComment] } : p));
    setCommentInput('');
    setIsSubmitting(false);
  };

  const isLiked = post.likes.includes('player-current');

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
          {post.content}
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
                <CommentItem key={comment.id} postId={post.id} comment={comment} postsState={postsState} setPostsState={setPostsState} />
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
  setPostsState: React.Dispatch<React.SetStateAction<SocialPost[]>>
}> = ({ postId, comment, isReply = false, postsState, setPostsState }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLike = () => {
    setPostsState(currentPosts => 
      currentPosts.map(p => {
        if (p.id !== postId) return p;
        
        const updateLikes = (comments: SocialComment[]): SocialComment[] => {
          return comments.map(c => {
            if (c.id === comment.id) {
              const isLiked = c.likes.includes('player-current');
              const newLikes = isLiked ? c.likes.filter(id => id !== 'player-current') : [...c.likes, 'player-current'];
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
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setIsSubmitting(true);
    const newReply: SocialComment = {
        id: `r-${Date.now()}`,
        authorName: 'John Player',
        authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
        content: replyContent,
        timestamp: new Date().toISOString(),
        likes: [],
        replies: []
    };
    await new Promise(resolve => setTimeout(resolve, 500));
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
    setIsSubmitting(false);
  };

  const isLiked = comment.likes?.includes('player-current');

  return (
    <div className={`space-y-4 ${isReply ? 'ml-10' : ''}`}>
      <div className="flex gap-4">
        <img src={comment.authorAvatar} className="w-10 h-10 rounded-xl bg-white border border-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative group">
            <p className="text-[10px] font-black text-slate-950 mb-1 uppercase tracking-widest">{comment.authorName}</p>
            <p className="text-sm text-slate-600 leading-relaxed">{comment.content}</p>
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
        <CommentItem key={reply.id} postId={postId} comment={reply} isReply={true} postsState={postsState} setPostsState={setPostsState} />
      ))}
    </div>
  );
};

export default Community;
