import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  MessageSquare,
  Share2,
  Send,
  MoreHorizontal,
  Clock,
  Sparkles,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  MessageCircle
} from 'lucide-react';
import { SocialPost, SocialComment } from '../../types';
import { supabase } from '../../services/supabase';
import { formatContent } from './formatContent';
import { CommentItem } from './CommentItem';

export interface PostCardProps {
  post: SocialPost;
  onLike: () => void;
  isExpanded: boolean;
  onToggleComments: () => void;
  postsState: SocialPost[];
  setPostsState: React.Dispatch<React.SetStateAction<SocialPost[]>>;
  currentUserId: string | null;
  currentUserProfile: { name: string; avatar: string; role: string } | null;
  onSelectTag: (tag: string | null) => void;
  onFollowTag: (tag: string) => void;
  followedTags: string[];
}

export const PostCard: React.FC<PostCardProps> = ({
  post, onLike, isExpanded, onToggleComments, postsState, setPostsState,
  currentUserId, currentUserProfile, onSelectTag, onFollowTag, followedTags
}) => {
  const [commentInput, setCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDm, setShowDm] = useState(false);
  const [dmText, setDmText] = useState('');
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
          is_edited: true
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
                      ? 'bg-blue-100 text-blue-700'
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

        {(post.tags && post.tags.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map(tag => (
              <button
                key={tag}
                onClick={() => onSelectTag(tag)}
                className="px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-indigo-50 hover:border-indigo-100 transition-all"
              >
                #{tag}
              </button>
            ))}
            <button
              onClick={() => post.tags?.forEach(t => { if (!followedTags.includes(t)) onFollowTag(t); })}
              className="px-3 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
            >
              Follow tags
            </button>
          </div>
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
          <div className="flex items-center gap-3 border border-slate-200 rounded-2xl p-4 bg-white">
            <MessageCircle size={18} className="text-indigo-500" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Direct message</p>
                <button onClick={() => setShowDm(!showDm)} className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">{showDm ? 'Close' : 'Open'}</button>
              </div>
              {showDm && (
                <div className="flex gap-3">
                  <input
                    value={dmText}
                    onChange={(e) => setDmText(e.target.value)}
                    placeholder={`Send a quick DM to ${post.authorName} (local only)`}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    onClick={() => { if (dmText.trim()) { alert('Quick DM drafted locally. Connect messaging backend to send.'); setDmText(''); setShowDm(false); } }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
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
