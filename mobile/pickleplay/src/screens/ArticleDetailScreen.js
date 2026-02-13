import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  StatusBar,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

const ArticleDetailScreen = ({ route, navigation }) => {
  const { article } = route.params;
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${article.title}\n\n${article.description}${article.url ? `\n\nRead more: ${article.url}` : ''}`,
        title: article.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleOpenLink = async () => {
    if (article.url) {
      try {
        const canOpen = await Linking.canOpenURL(article.url);
        if (canOpen) {
          await Linking.openURL(article.url);
        }
      } catch (error) {
        console.error('Error opening link:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.slate950} />
      
      {/* Header */}
      <LinearGradient
        colors={[Colors.slate950, Colors.slate900]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Article</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Article Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: article.image }} style={styles.articleImage} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            style={styles.imageOverlay}
          />
          {article.featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color={Colors.slate950} />
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
          )}
        </View>

        {/* Article Content */}
        <View style={styles.articleContent}>
          {/* Category and Date */}
          <View style={styles.metaContainer}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{article.category}</Text>
            </View>
            <Text style={styles.dateText}>
              {article.date.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{article.title}</Text>

          {/* Source */}
          {article.source && (
            <View style={styles.sourceContainer}>
              <Ionicons name="newspaper-outline" size={14} color={Colors.slate500} />
              <Text style={styles.sourceText}>Source: {article.source}</Text>
            </View>
          )}

          {/* Description */}
          <Text style={styles.description}>{article.description}</Text>

          {/* Full Content Placeholder */}
          <View style={styles.contentSection}>
            <Text style={styles.contentText}>
              {article.content || article.description}
            </Text>
          </View>

          {/* Read More Button */}
          {article.url && (
            <TouchableOpacity
              style={styles.readMoreButton}
              onPress={handleOpenLink}
              activeOpacity={0.8}
            >
              <Text style={styles.readMoreText}>Read Full Article</Text>
              <Ionicons name="open-outline" size={18} color={Colors.slate950} />
            </TouchableOpacity>
          )}

          {/* Share Section */}
          <View style={styles.shareSection}>
            <Text style={styles.shareSectionTitle}>Share this article</Text>
            <TouchableOpacity
              style={styles.shareCard}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <View style={styles.shareIconContainer}>
                <Ionicons name="share-social" size={24} color={Colors.lime400} />
              </View>
              <Text style={styles.shareCardText}>Share with friends</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.slate400} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  shareButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 280,
    position: 'relative',
  },
  articleImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.slate200,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  featuredBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: Colors.lime400,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredBadgeText: {
    color: Colors.slate950,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  articleContent: {
    padding: 20,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryBadge: {
    backgroundColor: Colors.lime400 + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.lime400,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 12,
    color: Colors.slate500,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.slate950,
    lineHeight: 32,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  sourceText: {
    fontSize: 12,
    color: Colors.slate500,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: Colors.slate700,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 20,
  },
  contentSection: {
    marginBottom: 24,
  },
  contentText: {
    fontSize: 15,
    color: Colors.slate600,
    lineHeight: 24,
    fontWeight: '500',
  },
  readMoreButton: {
    backgroundColor: Colors.lime400,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
    shadowColor: Colors.lime400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  readMoreText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: 0.2,
  },
  shareSection: {
    marginTop: 8,
  },
  shareSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 12,
  },
  shareCard: {
    backgroundColor: Colors.slate50,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  shareIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  shareCardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate700,
  },
  spacer: {
    height: 40,
  },
});

export default ArticleDetailScreen;
