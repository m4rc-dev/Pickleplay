import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Colors from '../constants/Colors';

const PostScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [postContent, setPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [posting, setPosting] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && !selectedImage) {
      Alert.alert('Error', 'Please add some content or an image to your post');
      return;
    }

    try {
      setPosting(true);
      let imageUrl = null;

      // Upload image if selected
      if (selectedImage) {
        const filename = `${user.id}-${Date.now()}.jpg`;
        const filePath = filename;

        // Convert URI to blob for upload
        const response = await fetch(selectedImage);
        const blob = await response.blob();

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('community-posts')
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
          console.error('Image upload error:', uploadError);
          throw new Error('Failed to upload image');
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('community-posts')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Create post
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          profile_id: user.id,
          content: postContent.trim() || null,
          image_url: imageUrl,
        })
        .select();

      if (error) {
        console.error('Post creation error:', error);
        throw error;
      }

      Alert.alert('Success', 'Post created successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', error.message || 'Failed to create post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient 
        colors={[Colors.slate950, Colors.slate900]} 
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <View style={styles.backIconContainer}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CREATE POST</Text>
        <TouchableOpacity 
          style={[styles.postButton, posting && styles.postButtonDisabled]}
          onPress={handleCreatePost}
          disabled={posting}
        >
          {posting ? (
            <ActivityIndicator color={Colors.slate950} size="small" />
          ) : (
            <Text style={styles.postButtonText}>POST</Text>
          )}
        </TouchableOpacity>
      </LinearGradient>

      {/* Main Content Area */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* Text Input */}
        <TextInput
          style={styles.textInput}
          placeholder="What's on your mind?"
          placeholderTextColor={Colors.slate400}
          multiline
          value={postContent}
          onChangeText={setPostContent}
          autoFocus
        />

        {/* Image Preview */}
        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
            <TouchableOpacity 
              style={styles.removeImageButton}
              onPress={removeImage}
            >
              <Ionicons name="close" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <View>
            <Text style={styles.actionBarTitle}>ADD TO YOUR POST</Text>
          </View>
          <View style={styles.iconButtonsContainer}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={pickImage}
            >
              <Ionicons name="image" size={24} color={Colors.lime400} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.slate50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
    letterSpacing: 1,
  },
  postButton: {
    backgroundColor: Colors.lime400,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    color: Colors.slate950,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  textInput: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.slate950,
    padding: 24,
    minHeight: 200,
    textAlignVertical: 'top',
    letterSpacing: -0.3,
  },
  imagePreviewContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 0,
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 20,
    backgroundColor: Colors.slate100,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBar: {
    borderTopWidth: 1,
    borderTopColor: Colors.slate200,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    borderRadius: 20,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBarTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: 1,
  },
  iconButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PostScreen;
