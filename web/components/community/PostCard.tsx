import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  MessageSquare,
  Share2,
  Send,
  MoreHorizontal,
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
        .update({ content: editContent, is_edited: true })
        .eq('id', post.id);

      if (error) {
        console.warn('is_edited column might be missing, falling back:', error.message);
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
      const { error } = await supabase.from('community_posts').delete().eq('id', post.id);
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
        .insert({ post_id: post.id, profile_id: currentUserId, content: commentInput })
        .select(`*, profiles!profile_id (full_name, avatar_url)`)
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
    <div className="bg-white border-b border-slate-100 last:border-b-0">
      <div className="px-4 pt-4 pb-1">
        <div className="flex items-start gap-3">

          {/* Avatar column with thread line */}
          <div className="flex flex-col items-center shrink-0">
            <Link to={`/profile/${post.authorId}`}>
              <img
                src={post.authorAvatar}
                className="w-10 h-10 rounded-full bg-slate-100 border border-slate-100 object-cover"
              />
            </Link>
            {isExpanded && <div className="w-0.5 bg-slate-200 flex-1 mt-2 min-h-[24px]" />}
          </div>

          {/* Content column */}
          <div className="flex-1 min-w-0">

            {/* Author row */}
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/profile/${post.authorId}`}
                  className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors"
                >
                  {post.authorName}
                </Link>
                {post.authorRole === 'COACH' && <Sparkles size={12} className="text-lime-500" />}
                <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-widest">
                  {post.authorRole}
                </span>
                {post.authorAvailabilityStatus && post.authorAvailabilityStatus !== 'offline' && (
                  <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${post.authorAvailabilityStatus === 'looking'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-blue-700'
                    }`}>
                    {post.authorAvailabilityStatus === 'looking' ? 'Looking' : 'Busy'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-slate-400">
                  {new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {post.isEdited && <span className="text-indigo-400 italic ml-1">· edited</span>}
                </span>
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 text-slate-300 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-50"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      {post.authorId === currentUserId ? (
                        <>
                          <button
                            onClick={() => { setIsEditing(true); setShowMenu(false); }}
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                          >
                            <Edit2 size={14} /> Edit Post
                          </button>
                          <button
                            onClick={() => { handleDeletePost(); setShowMenu(false); }}
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-500 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 size={14} /> Delete Post
                          </button>
                        </>
                      ) : (
                        <button className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                          Report Post
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Post content / edit mode */}
            {isEditing ? (
              <div className="space-y-3 my-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none h-24"
                  placeholder="Edit your thoughts..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setIsEditing(false); setEditContent(post.content); }}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-all flex items-center gap-1.5"
                  >
                    <RotateCcw size={12} /> Cancel
                  </button>
                  <button
                    onClick={handleUpdatePost}
                    disabled={isUpdating || !editContent.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isUpdating ? 'Saving...' : <><Check size={12} /> Save</>}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-800 text-sm leading-relaxed mt-0.5 mb-2">
                {formatContent(post.content)}
              </p>
            )}

            {/* Tags */}
            {(post.tags && post.tags.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {post.tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => onSelectTag(tag)}
                    className="px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:bg-indigo-50 hover:border-indigo-100 transition-all"
                  >
                    #{tag}
                  </button>
                ))}
                <button
                  onClick={() => post.tags?.forEach(t => { if (!followedTags.includes(t)) onFollowTag(t); })}
                  className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-400 hover:bg-slate-50 transition-all"
                >
                  Follow tags
                </button>
              </div>
            )}

            {/* Post image */}
            {post.image && (
              <div className="rounded-2xl overflow-hidden mb-3 border border-slate-100 mt-2">
                <img src={post.image} className="w-full max-h-96 object-cover" />
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center gap-5 pb-3 pt-1">
              <button
                onClick={onLike}
                className={`flex items-center gap-1.5 text-xs font-semibold transition-all ${isLiked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'}`}
              >
                <Heart size={16} className={isLiked ? 'fill-rose-500' : ''} />
                <span>{post.likes.length}</span>
              </button>
              <button
                onClick={onToggleComments}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-all"
              >
                <MessageSquare size={16} />
                <span>{post.comments.length}</span>
              </button>
              <button className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-all">
                <Share2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments section */}
      {isExpanded && (
        <div className="bg-slate-50/60 border-t border-slate-100 px-4 py-4 space-y-4">
          <div className="space-y-4">
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
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-3 bg-white">
            <MessageCircle size={16} className="text-indigo-400 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Direct message</p>
                <button
                  onClick={() => setShowDm(!showDm)}
                  className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest"
                >
                  {showDm ? 'Close' : 'Open'}
                </button>
              </div>
              {showDm && (
                <div className="flex gap-2">
                  <input
                    value={dmText}
                    onChange={(e) => setDmText(e.target.value)}
                    placeholder={`DM ${post.authorName}`}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    onClick={() => {
                      if (dmText.trim()) {
                        alert('Quick DM drafted locally. Connect messaging backend to send.');
                        setDmText('');
                        setShowDm(false);
                      }
                    }}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          </div>
          <form onSubmit={handleCommentSubmit} className="flex gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              disabled={!commentInput.trim() || isSubmitting}
              className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
