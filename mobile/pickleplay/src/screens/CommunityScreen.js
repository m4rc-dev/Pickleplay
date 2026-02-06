import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const thematicBlue = '#0A56A7';

const CommunityScreen = ({ navigation, route }) => {
  const [activeTab, setActiveTab] = useState('feed');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [userLikes, setUserLikes] = useState({}); // Track which posts user has liked
  const { user } = useAuth();

  useEffect(() => {
    fetchPosts();
    if (user) {
      fetchUserLikes();
    }
  }, [user]);

  // Refresh posts when returning from PostScreen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPosts();
      if (user) {
        fetchUserLikes();
      }
    });
    return unsubscribe;
  }, [navigation, user]);

  const fetchUserLikes = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('community_post_likes')
        .select('post_id')
        .eq('profile_id', user.id);

      if (data) {
        const likesMap = {};
        data.forEach(like => {
          likesMap[like.post_id] = true;
        });
        setUserLikes(likesMap);
      }
    } catch (error) {
      console.error('Error fetching user likes:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          profiles:profile_id (
            full_name,
            avatar_url
          ),
          community_post_likes(count),
          community_post_comments(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPosts = data.map(post => ({
        id: post.id,
        user: post.profiles?.full_name || 'Anonymous',
        avatar: post.profiles?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
        time: formatTime(post.created_at),
        content: post.content,
        likes: post.community_post_likes?.[0]?.count || 0,
        comments: post.community_post_comments?.[0]?.count || 0,
        image: post.image_url,
        profile_id: post.profile_id,
      }));

      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load community posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const postDate = new Date(timestamp);
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return postDate.toLocaleDateString();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
    if (user) {
      fetchUserLikes();
    }
  };

  const handleLike = async (postId) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to like posts');
      return;
    }

    const isLiked = userLikes[postId];

    // Optimistic update
    setUserLikes(prev => ({ ...prev, [postId]: !isLiked }));
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return { ...post, likes: isLiked ? post.likes - 1 : post.likes + 1 };
      }
      return post;
    }));

    try {
      if (isLiked) {
        // Remove like
        const { error } = await supabase
          .from('community_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('profile_id', user.id);

        if (error) throw error;
      } else {
        // Add like
        const { error } = await supabase
          .from('community_post_likes')
          .insert({
            post_id: postId,
            profile_id: user.id,
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update
      setUserLikes(prev => ({ ...prev, [postId]: isLiked }));
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return { ...post, likes: isLiked ? post.likes + 1 : post.likes - 1 };
        }
        return post;
      }));
      Alert.alert('Error', 'Failed to update like');
    }
  };

  const openComments = async (post) => {
    setSelectedPost(post);
    setShowComments(true);
    fetchComments(post.id);
  };

  const fetchComments = async (postId) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('community_post_comments')
        .select(`
          *,
          profiles:profile_id (
            full_name,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedComments = data.map(comment => ({
        id: comment.id,
        user: comment.profiles?.full_name || 'Anonymous',
        avatar: comment.profiles?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
        content: comment.content,
        time: formatTime(comment.created_at),
        profile_id: comment.profile_id,
      }));

      setComments(formattedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  };

  const submitComment = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to comment');
      return;
    }

    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from('community_post_comments')
        .insert({
          post_id: selectedPost.id,
          profile_id: user.id,
          content: newComment.trim(),
        })
        .select(`
          *,
          profiles:profile_id (
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      const newCommentFormatted = {
        id: data.id,
        user: data.profiles?.full_name || 'Anonymous',
        avatar: data.profiles?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
        content: data.content,
        time: 'Just now',
        profile_id: data.profile_id,
      };

      setComments(prev => [...prev, newCommentFormatted]);
      setNewComment('');
      
      // Update comment count in posts
      setPosts(prev => prev.map(post => {
        if (post.id === selectedPost.id) {
          return { ...post, comments: post.comments + 1 };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const events = [
    {
      id: 1,
      title: 'Weekend Open Tournament',
      date: 'Feb 1, 2026',
      location: 'IT Park Courts',
      participants: 32,
      image: 'https://picsum.photos/seed/event1/400/200',
    },
    {
      id: 2,
      title: 'Beginner Clinic',
      date: 'Feb 5, 2026',
      location: 'Ayala Sports Hub',
      participants: 16,
      image: 'https://picsum.photos/seed/event2/400/200',
    },
    {
      id: 3,
      title: 'Doubles Championship',
      date: 'Feb 15, 2026',
      location: 'Downtown Sports Complex',
      participants: 48,
      image: 'https://picsum.photos/seed/event3/400/200',
    },
  ];

  const groups = [
    { id: 1, name: 'Cebu Pickleball Club', members: 1250, image: 'https://picsum.photos/seed/group1/100/100' },
    { id: 2, name: 'Beginners Welcome', members: 680, image: 'https://picsum.photos/seed/group2/100/100' },
    { id: 3, name: 'Tournament Players', members: 420, image: 'https://picsum.photos/seed/group3/100/100' },
    { id: 4, name: 'Weekend Warriors', members: 890, image: 'https://picsum.photos/seed/group4/100/100' },
  ];

  const renderFeed = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={thematicBlue} />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      );
    }

    if (posts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="forum" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No posts yet</Text>
          <Text style={styles.emptySubtext}>Be the first to share something!</Text>
        </View>
      );
    }

    return (
      <View style={styles.feedContainer}>
        {posts.map((post) => {
          const isLiked = userLikes[post.id];
          return (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <Image source={{ uri: post.avatar }} style={styles.avatar} />
                <View style={styles.postUserInfo}>
                  <Text style={styles.userName}>{post.user}</Text>
                  <Text style={styles.postTime}>{post.time}</Text>
                </View>
                <TouchableOpacity style={styles.moreButton}>
                  <MaterialIcons name="more-vert" size={20} color="#888" />
                </TouchableOpacity>
              </View>
              <Text style={styles.postContent}>{post.content}</Text>
              {post.image && (
                <Image source={{ uri: post.image }} style={styles.postImage} />
              )}
              <View style={styles.postActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleLike(post.id)}
                >
                  <Ionicons 
                    name={isLiked ? "heart" : "heart-outline"} 
                    size={22} 
                    color={isLiked ? "#e74c3c" : thematicBlue} 
                  />
                  <Text style={[styles.actionText, isLiked && styles.likedText]}>{post.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => openComments(post)}
                >
                  <Ionicons name="chatbubble-outline" size={20} color={thematicBlue} />
                  <Text style={styles.actionText}>{post.comments}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="share-outline" size={22} color={thematicBlue} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderEvents = () => (
    <View style={styles.eventsContainer}>
      {events.map((event) => (
        <TouchableOpacity key={event.id} style={styles.eventCard} activeOpacity={0.8}>
          <Image source={{ uri: event.image }} style={styles.eventImage} />
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <View style={styles.eventDetail}>
              <MaterialIcons name="event" size={16} color={thematicBlue} />
              <Text style={styles.eventDetailText}>{event.date}</Text>
            </View>
            <View style={styles.eventDetail}>
              <MaterialIcons name="location-on" size={16} color={thematicBlue} />
              <Text style={styles.eventDetailText}>{event.location}</Text>
            </View>
            <View style={styles.eventDetail}>
              <MaterialIcons name="people" size={16} color={thematicBlue} />
              <Text style={styles.eventDetailText}>{event.participants} participants</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderGroups = () => (
    <View style={styles.groupsContainer}>
      {groups.map((group) => (
        <TouchableOpacity key={group.id} style={styles.groupCard} activeOpacity={0.8}>
          <Image source={{ uri: group.image }} style={styles.groupImage} />
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupMembers}>{group.members.toLocaleString()} members</Text>
          </View>
          <TouchableOpacity style={styles.joinButton}>
            <Text style={styles.joinButtonText}>Join</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[thematicBlue]} />
        }
      >
        {/* Header Banner */}
        <LinearGradient colors={[thematicBlue, '#084590']} style={styles.headerBanner}>
          <Text style={styles.headerTitle}>Community</Text>
          <Text style={styles.headerSubtitle}>Connect with fellow players</Text>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'feed' && styles.activeTab]}
            onPress={() => setActiveTab('feed')}>
            <MaterialIcons 
              name="dynamic-feed" 
              size={20} 
              color={activeTab === 'feed' ? thematicBlue : '#888'} 
            />
            <Text style={[styles.tabText, activeTab === 'feed' && styles.activeTabText]}>Feed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'events' && styles.activeTab]}
            onPress={() => setActiveTab('events')}>
            <MaterialIcons 
              name="event" 
              size={20} 
              color={activeTab === 'events' ? thematicBlue : '#888'} 
            />
            <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>Events</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
            onPress={() => setActiveTab('groups')}>
            <MaterialIcons 
              name="groups" 
              size={20} 
              color={activeTab === 'groups' ? thematicBlue : '#888'} 
            />
            <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>Groups</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'feed' && renderFeed()}
        {activeTab === 'events' && renderEvents()}
        {activeTab === 'groups' && renderGroups()}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.9}
        onPress={() => navigation.navigate('Post')}
      >
        <LinearGradient colors={[thematicBlue, '#084590']} style={styles.fabGradient}>
          <MaterialIcons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowComments(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.commentsModal}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowComments(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Post Preview */}
            {selectedPost && (
              <View style={styles.postPreview}>
                <Image source={{ uri: selectedPost.avatar }} style={styles.smallAvatar} />
                <View style={styles.postPreviewContent}>
                  <Text style={styles.postPreviewUser}>{selectedPost.user}</Text>
                  <Text style={styles.postPreviewText} numberOfLines={2}>{selectedPost.content}</Text>
                </View>
              </View>
            )}

            {/* Comments List */}
            {loadingComments ? (
              <View style={styles.loadingComments}>
                <ActivityIndicator size="small" color={thematicBlue} />
                <Text style={styles.loadingText}>Loading comments...</Text>
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.noComments}>
                <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
                <Text style={styles.noCommentsText}>No comments yet</Text>
                <Text style={styles.noCommentsSubtext}>Be the first to comment!</Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                style={styles.commentsList}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <Image source={{ uri: item.avatar }} style={styles.commentAvatar} />
                    <View style={styles.commentContent}>
                      <View style={styles.commentBubble}>
                        <Text style={styles.commentUser}>{item.user}</Text>
                        <Text style={styles.commentText}>{item.content}</Text>
                      </View>
                      <Text style={styles.commentTime}>{item.time}</Text>
                    </View>
                  </View>
                )}
              />
            )}

            {/* Comment Input */}
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor="#999"
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={[
                  styles.sendButton,
                  (!newComment.trim() || submittingComment) && styles.sendButtonDisabled
                ]}
                onPress={submitComment}
                disabled={!newComment.trim() || submittingComment}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  headerBanner: {
    padding: 25,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: -15,
    borderRadius: 15,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: thematicBlue + '15',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginLeft: 6,
  },
  activeTabText: {
    color: thematicBlue,
  },
  feedContainer: {
    padding: 15,
    paddingTop: 20,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  postUserInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  postTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  moreButton: {
    padding: 5,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 21,
    color: '#333',
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 25,
  },
  actionText: {
    fontSize: 13,
    color: thematicBlue,
    marginLeft: 5,
    fontWeight: '500',
  },
  likedText: {
    color: '#e74c3c',
  },
  eventsContainer: {
    padding: 15,
    paddingTop: 20,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  eventImage: {
    width: '100%',
    height: 120,
  },
  eventInfo: {
    padding: 15,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventDetailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  groupsContainer: {
    padding: 15,
    paddingTop: 20,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  groupImage: {
    width: 55,
    height: 55,
    borderRadius: 12,
  },
  groupInfo: {
    flex: 1,
    marginLeft: 15,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  groupMembers: {
    fontSize: 13,
    color: '#888',
  },
  joinButton: {
    backgroundColor: thematicBlue,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#888',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptySubtext: {
    marginTop: 5,
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
  // Comments Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  commentsModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '85%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 5,
  },
  postPreview: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  smallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  postPreviewContent: {
    flex: 1,
    marginLeft: 10,
  },
  postPreviewUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  postPreviewText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  loadingComments: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noComments: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noCommentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
  },
  noCommentsSubtext: {
    fontSize: 13,
    color: '#888',
    marginTop: 5,
  },
  commentsList: {
    flex: 1,
    padding: 15,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentContent: {
    flex: 1,
    marginLeft: 10,
  },
  commentBubble: {
    backgroundColor: '#f0f2f5',
    padding: 12,
    borderRadius: 18,
    borderTopLeftRadius: 4,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    marginLeft: 12,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    paddingBottom: 25,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    color: '#333',
  },
  sendButton: {
    backgroundColor: thematicBlue,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default CommunityScreen;
