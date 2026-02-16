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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Colors from '../constants/Colors';
import commonStyles from '../styles/commonStyles';

const {width} = Dimensions.get('window');

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
  const [userLikes, setUserLikes] = useState({});
  const [squads, setSquads] = useState([]);
  const [userSquads, setUserSquads] = useState(new Set());
  const [squadMembers, setSquadMembers] = useState({});
  const [selectedSquad, setSelectedSquad] = useState(null);
  const [showSquadModal, setShowSquadModal] = useState(false);
  const [loadingSquads, setLoadingSquads] = useState(false);
  const [showCreateSquadModal, setShowCreateSquadModal] = useState(false);
  const [newSquadName, setNewSquadName] = useState('');
  const [newSquadDescription, setNewSquadDescription] = useState('');
  const [creatingSquad, setCreatingSquad] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchPosts();
    fetchSquads();
    if (user) {
      fetchUserLikes();
      fetchUserSquads();
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPosts();
      fetchSquads();
      if (user) {
        fetchUserLikes();
        fetchUserSquads();
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
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return postDate.toLocaleDateString();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
    fetchSquads();
    if (user) {
      fetchUserLikes();
      fetchUserSquads();
    }
  };

  const handleLike = async (postId) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to like posts');
      return;
    }

    const isCurrentlyLiked = userLikes[postId];

    try {
      if (isCurrentlyLiked) {
        const { error } = await supabase
          .from('community_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('profile_id', user.id);

        if (error) throw error;

        setUserLikes(prev => {
          const newLikes = { ...prev };
          delete newLikes[postId];
          return newLikes;
        });

        setPosts(prev => prev.map(post =>
          post.id === postId ? { ...post, likes: Math.max(0, post.likes - 1) } : post
        ));
      } else {
        const { error } = await supabase
          .from('community_post_likes')
          .insert([{ post_id: postId, profile_id: user.id }]);

        if (error) throw error;

        setUserLikes(prev => ({ ...prev, [postId]: true }));

        setPosts(prev => prev.map(post =>
          post.id === postId ? { ...post, likes: post.likes + 1 } : post
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like');
    }
  };

  const openComments = async (post) => {
    setSelectedPost(post);
    setShowComments(true);
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
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedComments = data.map(comment => ({
        id: comment.id,
        user: comment.profiles?.full_name || 'Anonymous',
        avatar: comment.profiles?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
        content: comment.content,
        time: formatTime(comment.created_at),
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
      Alert.alert('Login Required', 'Please log in to comment');
      return;
    }

    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);

      const { data, error } = await supabase
        .from('community_post_comments')
        .insert([
          {
            post_id: selectedPost.id,
            profile_id: user.id,
            content: newComment.trim(),
          }
        ])
        .select()
        .single();

      if (error) throw error;

      const newCommentObj = {
        id: data.id,
        user: user.user_metadata?.full_name || user.email?.split('@')[0] || 'You',
        avatar: user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
        content: newComment.trim(),
        time: 'Just now',
      };

      setComments(prev => [...prev, newCommentObj]);
      setPosts(prev => prev.map(post =>
        post.id === selectedPost.id ? { ...post, comments: post.comments + 1 } : post
      ));
      setNewComment('');
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const fetchSquads = async () => {
    try {
      setLoadingSquads(true);
      const { data, error } = await supabase
        .from('squads')
        .select(`
          *,
          squad_members(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSquads = data.map(squad => ({
        id: squad.id,
        name: squad.name,
        description: squad.description,
        avatar: squad.avatar_url || 'https://picsum.photos/seed/squad${squad.id}/200/200',
        members: squad.squad_members?.[0]?.count || 0,
      }));

      setSquads(formattedSquads);
    } catch (error) {
      console.error('Error fetching squads:', error);
    } finally {
      setLoadingSquads(false);
    }
  };

  const fetchUserSquads = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('squad_members')
        .select('squad_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const squadIds = new Set(data.map(member => member.squad_id));
      setUserSquads(squadIds);
    } catch (error) {
      console.error('Error fetching user squads:', error);
    }
  };

  const handleJoinSquad = async (squadId) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to join squads');
      return;
    }

    try {
      const { error } = await supabase
        .from('squad_members')
        .insert([{
          squad_id: squadId,
          user_id: user.id,
          role: 'member',
        }]);

      if (error) throw error;

      setUserSquads(prev => new Set([...prev, squadId]));
      setSquads(prev => prev.map(squad =>
        squad.id === squadId ? { ...squad, members: squad.members + 1 } : squad
      ));

      Alert.alert('Success', 'You have joined the squad!');
    } catch (error) {
      console.error('Error joining squad:', error);
      Alert.alert('Error', 'Failed to join squad');
    }
  };

  const fetchSquadMembers = async (squadId) => {
    try {
      const { data, error } = await supabase
        .from('squad_members')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            skill_level
          )
        `)
        .eq('squad_id', squadId)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      setSquadMembers(prev => ({
        ...prev,
        [squadId]: data,
      }));
    } catch (error) {
      console.error('Error fetching squad members:', error);
    }
  };

  const openSquadMembers = async (squad) => {
    setSelectedSquad(squad);
    setShowSquadModal(true);
    await fetchSquadMembers(squad.id);
  };

  const handleCreateSquad = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to create a squad');
      return;
    }

    if (!newSquadName.trim()) {
      Alert.alert('Error', 'Please enter a squad name');
      return;
    }

    try {
      setCreatingSquad(true);

      // Create the squad
      const { data: squadData, error: squadError } = await supabase
        .from('squads')
        .insert([{
          name: newSquadName.trim(),
          description: newSquadDescription.trim() || null,
          created_by: user.id,
        }])
        .select()
        .single();

      if (squadError) throw squadError;

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('squad_members')
        .insert([{
          squad_id: squadData.id,
          user_id: user.id,
          role: 'admin',
        }]);

      if (memberError) throw memberError;

      // Reset form and close modal
      setNewSquadName('');
      setNewSquadDescription('');
      setShowCreateSquadModal(false);

      // Refresh squads list
      await fetchSquads();
      await fetchUserSquads();

      Alert.alert('Success', 'Squad created successfully!');
    } catch (error) {
      console.error('Error creating squad:', error);
      Alert.alert('Error', 'Failed to create squad. Please try again.');
    } finally {
      setCreatingSquad(false);
    }
  };

  const events = [
    {
      id: 1,
      title: 'Weekend Tournament',
      date: 'Feb 12, 2026',
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

  const renderFeed = () => {
    if (loading) {
      return (
        <View style={commonStyles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.lime400} />
          <Text style={commonStyles.loadingText}>Loading posts...</Text>
        </View>
      );
    }

    if (posts.length === 0) {
      return (
        <View style={commonStyles.emptyContainer}>
          <View style={commonStyles.emptyIconBg}>
            <MaterialIcons name="forum" size={40} color={Colors.slate400} />
          </View>
          <Text style={commonStyles.emptyText}>No posts yet</Text>
          <Text style={commonStyles.emptySubtext}>Be the first to share something!</Text>
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
                <TouchableOpacity style={styles.moreButton} activeOpacity={0.8}>
                  <MaterialIcons name="more-vert" size={20} color={Colors.slate400} />
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
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={isLiked ? "heart" : "heart-outline"} 
                    size={22} 
                    color={isLiked ? Colors.error : Colors.slate600} 
                  />
                  <Text style={[styles.actionText, isLiked && styles.likedText]}>{post.likes}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => openComments(post)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubble-outline" size={20} color={Colors.slate600} />
                  <Text style={styles.actionText}>{post.comments}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
                  <Ionicons name="share-outline" size={22} color={Colors.slate600} />
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
        <TouchableOpacity key={event.id} style={styles.eventCard} activeOpacity={0.9}>
          <Image source={{ uri: event.image }} style={styles.eventImage} />
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <View style={styles.eventDetail}>
              <MaterialIcons name="calendar-today" size={14} color={Colors.slate600} />
              <Text style={styles.eventDetailText}>{event.date}</Text>
            </View>
            <View style={styles.eventDetail}>
              <MaterialIcons name="location-on" size={14} color={Colors.slate600} />
              <Text style={styles.eventDetailText}>{event.location}</Text>
            </View>
            <View style={styles.eventDetail}>
              <MaterialIcons name="people" size={14} color={Colors.slate600} />
              <Text style={styles.eventDetailText}>{event.participants} participants</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSquads = () => {
    if (loadingSquads) {
      return (
        <View style={commonStyles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.lime400} />
          <Text style={commonStyles.loadingText}>Loading squads...</Text>
        </View>
      );
    }

    if (squads.length === 0) {
      return (
        <View style={commonStyles.emptyContainer}>
          <View style={commonStyles.emptyIconBg}>
            <MaterialIcons name="groups" size={40} color={Colors.slate400} />
          </View>
          <Text style={commonStyles.emptyText}>No squads yet</Text>
          <Text style={commonStyles.emptySubtext}>Create or join a squad!</Text>
        </View>
      );
    }

    return (
      <View style={styles.groupsContainer}>
        {squads.map((squad) => {
          const isMember = userSquads.has(squad.id);
          return (
            <View key={squad.id} style={styles.groupCard}>
              <TouchableOpacity 
                style={styles.squadCardContent}
                onPress={() => openSquadMembers(squad)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: squad.avatar }} style={styles.groupImage} />
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{squad.name}</Text>
                  <Text style={styles.groupMembers}>{squad.members.toLocaleString()} members</Text>
                  {squad.description && (
                    <Text style={styles.squadDescription} numberOfLines={2}>
                      {squad.description}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              {isMember ? (
                <View style={styles.memberBadge}>
                  <MaterialIcons name="check-circle" size={14} color={Colors.lime400} />
                  <Text style={styles.memberBadgeText}>Member</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.joinButton}
                  onPress={() => handleJoinSquad(squad.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.joinButtonText}>JOIN</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.slate950} />

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
            colors={[Colors.lime400]}
            tintColor={Colors.lime400}
          />
        }
      >
        {/* Header Section with Dark Background */}
        <LinearGradient
          colors={[Colors.slate950, Colors.slate900]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.darkHeaderContainer}
        >
          <View style={styles.headerSection}>
            <Text style={styles.headerLabel}>CONNECT</Text>
            <Text style={styles.headerTitle}>COMMUNITY</Text>
            <Text style={styles.headerSubtitle}>Share and engage with players</Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'feed' && styles.activeTab]}
            onPress={() => setActiveTab('feed')}
            activeOpacity={0.8}
          >
            <MaterialIcons 
              name="dynamic-feed" 
              size={18} 
              color={activeTab === 'feed' ? Colors.slate950 : Colors.slate400} 
            />
            <Text style={[styles.tabText, activeTab === 'feed' && styles.activeTabText]}>FEED</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'events' && styles.activeTab]}
            onPress={() => setActiveTab('events')}
            activeOpacity={0.8}
          >
            <MaterialIcons 
              name="event" 
              size={18} 
              color={activeTab === 'events' ? Colors.slate950 : Colors.slate400} 
            />
            <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>EVENTS</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'squads' && styles.activeTab]}
            onPress={() => setActiveTab('squads')}
            activeOpacity={0.8}
          >
            <MaterialIcons 
              name="groups" 
              size={18} 
              color={activeTab === 'squads' ? Colors.slate950 : Colors.slate400} 
            />
            <Text style={[styles.tabText, activeTab === 'squads' && styles.activeTabText]}>SQUADS</Text>
          </TouchableOpacity>
        </View>
        </LinearGradient>

        {/* Content with White Background */}
        <View style={styles.contentContainer}>
          {/* Content */}
          {activeTab === 'feed' && renderFeed()}
          {activeTab === 'events' && renderEvents()}
          {activeTab === 'squads' && renderSquads()}

          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* Floating Action Button - Hidden on Squads Tab */}
      {activeTab !== 'squads' && (
        <TouchableOpacity 
          style={styles.fab} 
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Post')}
        >
          <LinearGradient 
            colors={[Colors.slate950, Colors.slate900]} 
            style={styles.fabGradient}
          >
            <MaterialIcons name="add" size={28} color={Colors.lime400} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Create Squad Button - Shown on Squads Tab */}
      {activeTab === 'squads' && (
        <TouchableOpacity 
          style={styles.createSquadButton} 
          activeOpacity={0.9}
          onPress={() => setShowCreateSquadModal(true)}
        >
          <LinearGradient 
            colors={[Colors.lime400, Colors.lime500]} 
            style={styles.createSquadGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <MaterialIcons name="group-add" size={24} color={Colors.slate950} />
            <Text style={styles.createSquadButtonText}>CREATE SQUAD</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowComments(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color={Colors.slate950} />
              </TouchableOpacity>
            </View>

            {selectedPost && (
              <View style={styles.postPreview}>
                <Image source={{ uri: selectedPost.avatar }} style={styles.smallAvatar} />
                <View style={styles.postPreviewContent}>
                  <Text style={styles.postPreviewUser}>{selectedPost.user}</Text>
                  <Text style={styles.postPreviewText} numberOfLines={2}>{selectedPost.content}</Text>
                </View>
              </View>
            )}

            {loadingComments ? (
              <View style={styles.loadingComments}>
                <ActivityIndicator size="small" color={Colors.lime400} />
                <Text style={commonStyles.loadingText}>Loading comments...</Text>
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.noComments}>
                <View style={commonStyles.emptyIconBg}>
                  <Ionicons name="chatbubble-outline" size={32} color={Colors.slate400} />
                </View>
                <Text style={commonStyles.emptyText}>No comments yet</Text>
                <Text style={commonStyles.emptySubtext}>Be the first to comment!</Text>
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

            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor={Colors.slate400}
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
                activeOpacity={0.8}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color={Colors.slate950} />
                ) : (
                  <Ionicons name="send" size={18} color={Colors.slate950} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Squad Members Modal */}
      <Modal
        visible={showSquadModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSquadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.commentsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedSquad?.name || 'Squad'} Members
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowSquadModal(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color={Colors.slate950} />
              </TouchableOpacity>
            </View>

            {!squadMembers[selectedSquad?.id] || squadMembers[selectedSquad?.id].length === 0 ? (
              <View style={styles.noComments}>
                <View style={commonStyles.emptyIconBg}>
                  <Ionicons name="people-outline" size={32} color={Colors.slate400} />
                </View>
                <Text style={commonStyles.emptyText}>No members yet</Text>
                <Text style={commonStyles.emptySubtext}>Be the first to join!</Text>
              </View>
            ) : (
              <ScrollView style={styles.commentsList}>
                {squadMembers[selectedSquad?.id]?.map((member) => (
                  <View key={member.id} style={styles.commentItem}>
                    <Image 
                      source={{ 
                        uri: member.profiles?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80' 
                      }} 
                      style={styles.commentAvatar} 
                    />
                    <View style={styles.commentContent}>
                      <View style={styles.commentBubble}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.commentUser}>
                            {member.profiles?.full_name || 'Unknown'}
                          </Text>
                          {member.role === 'admin' && (
                            <View style={styles.adminBadge}>
                              <Text style={styles.adminBadgeText}>ADMIN</Text>
                            </View>
                          )}
                        </View>
                        {member.profiles?.skill_level && (
                          <Text style={styles.memberSkillLevel}>
                            Skill Level: {member.profiles.skill_level}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.commentTime}>
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))}
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Create Squad Modal */}
      <Modal
        visible={showCreateSquadModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateSquadModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.createSquadModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Squad</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setShowCreateSquadModal(false);
                  setNewSquadName('');
                  setNewSquadDescription('');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color={Colors.slate950} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.createSquadContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Squad Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter squad name"
                  placeholderTextColor={Colors.slate400}
                  value={newSquadName}
                  onChangeText={setNewSquadName}
                  maxLength={50}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Describe your squad..."
                  placeholderTextColor={Colors.slate400}
                  value={newSquadDescription}
                  onChangeText={setNewSquadDescription}
                  multiline
                  numberOfLines={4}
                  maxLength={200}
                />
              </View>

              <TouchableOpacity 
                style={[
                  styles.createSquadSubmitButton,
                  (!newSquadName.trim() || creatingSquad) && styles.createSquadSubmitButtonDisabled
                ]}
                onPress={handleCreateSquad}
                disabled={!newSquadName.trim() || creatingSquad}
                activeOpacity={0.8}
              >
                <LinearGradient 
                  colors={
                    !newSquadName.trim() || creatingSquad
                      ? [Colors.slate300, Colors.slate300]
                      : [Colors.slate950, Colors.slate900]
                  }
                  style={styles.createSquadSubmitGradient}
                >
                  {creatingSquad ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <MaterialIcons name="group-add" size={20} color={Colors.lime400} />
                      <Text style={styles.createSquadSubmitButtonText}>CREATE SQUAD</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  
  // Dark Header Container
  darkHeaderContainer: {
    paddingBottom: 20,
  },
  
  // Header
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 24,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.lime400,
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.slate300,
    marginTop: 8,
  },
  
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: Colors.slate800,
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: Colors.lime400,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 1,
  },
  activeTabText: {
    color: Colors.slate950,
  },
  
  // Content Container
  contentContainer: {
    backgroundColor: Colors.white,
    flex: 1,
  },
  
  // Feed
  feedContainer: {
    paddingHorizontal: 20,
  },
  postCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.slate100,
    shadowColor: Colors.slate950,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.slate100,
  },
  postUserInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 2,
  },
  postTime: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.slate500,
  },
  moreButton: {
    padding: 4,
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.slate700,
    marginBottom: 12,
    fontWeight: '500',
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: Colors.slate100,
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    paddingTop: 12,
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: Colors.slate700,
    fontWeight: '800',
  },
  likedText: {
    color: Colors.error,
  },
  
  // Events
  eventsContainer: {
    paddingHorizontal: 20,
  },
  eventCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.slate100,
    shadowColor: Colors.slate950,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  eventImage: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.slate100,
  },
  eventInfo: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  eventDetailText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.slate600,
  },
  
  // Squads
  groupsContainer: {
    paddingHorizontal: 20,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.slate100,
    shadowColor: Colors.slate950,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  squadCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.slate100,
  },
  groupInfo: {
    flex: 1,
    marginLeft: 12,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  groupMembers: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.slate600,
  },
  squadDescription: {
    fontSize: 13,
    color: Colors.slate600,
    marginTop: 4,
    lineHeight: 18,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.lime400 + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  memberBadgeText: {
    color: Colors.lime400,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  joinButton: {
    backgroundColor: Colors.slate950,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 12,
  },
  joinButtonText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: Colors.slate950,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
    justifyContent: 'flex-end',
  },
  commentsModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
  },
  postPreview: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.slate50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  smallAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.slate200,
  },
  postPreviewContent: {
    flex: 1,
    marginLeft: 12,
  },
  postPreviewUser: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 2,
  },
  postPreviewText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.slate600,
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
  commentsList: {
    flex: 1,
    padding: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.slate100,
  },
  commentContent: {
    flex: 1,
    marginLeft: 10,
  },
  commentBubble: {
    backgroundColor: Colors.slate50,
    padding: 12,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.slate700,
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.slate500,
    marginTop: 4,
    marginLeft: 12,
  },
  adminBadge: {
    backgroundColor: Colors.slate950,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adminBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  memberSkillLevel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.slate600,
    marginTop: 4,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    backgroundColor: Colors.white,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.slate50,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    color: Colors.slate950,
    fontWeight: '500',
  },
  sendButton: {
    backgroundColor: Colors.lime400,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.lime400,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.slate300,
    shadowOpacity: 0,
  },
  
  // Create Squad Button
  createSquadButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.lime400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  createSquadGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  createSquadButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: 1,
  },
  
  // Create Squad Modal
  createSquadModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
  },
  createSquadContent: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  formInput: {
    backgroundColor: Colors.slate50,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.slate950,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  formTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  createSquadSubmitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  createSquadSubmitButtonDisabled: {
    opacity: 0.5,
  },
  createSquadSubmitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  createSquadSubmitButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.lime400,
    letterSpacing: 1,
  },
});

export default CommunityScreen;
