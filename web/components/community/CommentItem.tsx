import React, { useState } from 'react';
import { Heart, Reply } from 'lucide-react';
import { SocialPost, SocialComment } from '../../types';
import { supabase } from '../../services/supabase';
import { formatContent } from './formatContent';

interface CommentItemProps {
  postId: string;
  comment: SocialComment;
  isReply?: boolean;
  postsState: SocialPost[];
  setPostsState: React.Dispatch<React.SetStateAction<SocialPost[]>>;
  currentUserId: string | null;
  currentUserProfile: { name: string; avatar: string; role: string } | null;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  postId, comment, isReply = false, postsState, setPostsState, currentUserId, currentUserProfile
}) => {
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
