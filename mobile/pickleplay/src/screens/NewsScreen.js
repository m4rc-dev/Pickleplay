import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

const HOMESPH_NEWS_API_URL = 'https://homesphnews-api-394504332858.asia-southeast1.run.app';
const HOMESPH_NEWS_API_KEY = '1nZKZvIK2EPpCIykBheHylG5tuGCJ5wVSSSwui2ESxhZwDrqwNiWxQJOCyr2XEW6';

const MOCK_NEWS = [
  {
    id: '1',
    title: 'PicklePlay Masters 2025 - Registration Open',
    description: 'Join the biggest pickleball tournament of the year. Limited spots available!',
    content: 'The PicklePlay Masters 2025 is set to be the most exciting pickleball tournament of the year. With professional players from around the world competing for the championship title, this event promises to deliver top-tier competition and entertainment. Registration is now open for both amateur and professional divisions. The tournament will feature cash prizes, sponsorship opportunities, and the chance to compete against the best players in the sport. Don\'t miss out on this incredible opportunity to showcase your skills and be part of pickleball history.',
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=400',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    category: 'Tournament',
    featured: true,
  },
  {
    id: '2',
    title: 'New Courts Opened in BGC',
    description: 'Three new state-of-the-art pickleball courts are now available in Bonifacio Global City.',
    content: 'Bonifacio Global City welcomes three brand new state-of-the-art pickleball courts, equipped with premium surfaces and professional-grade lighting for evening play. These courts are designed to meet international standards and provide players with the best possible playing experience. The facility also includes modern amenities such as locker rooms, a pro shop, and a viewing area for spectators. Court reservations are now available through the PicklePlay app.',
    image: 'https://picsum.photos/seed/court2/400/300',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    category: 'News',
    featured: false,
  },
  {
    id: '3',
    title: 'Top 5 Tips to Improve Your Pickleball Game',
    description: 'Learn expert techniques to level up your pickleball skills with these essential tips.',
    content: 'Improving your pickleball game requires dedication, practice, and the right techniques. Here are five expert tips: 1) Master the third-shot drop to gain control of the net. 2) Work on your footwork and positioning to be ready for every shot. 3) Practice your dinking skills to win those crucial net exchanges. 4) Develop a consistent serve that puts pressure on opponents. 5) Study professional matches to learn strategic positioning and shot selection. Remember, consistent practice and patience are key to becoming a better player.',
    image: 'https://picsum.photos/seed/tips/400/300',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    category: 'Tips',
    featured: false,
  },
  {
    id: '4',
    title: 'Community Tournament Results',
    description: 'Congratulations to the winners of last weekends community tournament!',
    content: 'Last weekend\'s community tournament was a huge success with over 100 participants competing across multiple skill levels. The competition was fierce, and we witnessed some incredible matches throughout the day. Congratulations to all the winners and participants who made this event memorable. Special thanks to our sponsors and volunteers who helped organize this fantastic event. We look forward to seeing everyone at the next tournament!',
    image: 'https://picsum.photos/seed/community/400/300',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    category: 'Community',
    featured: false,
  },
];

const transformApiNews = (apiNews) => {
  if (!Array.isArray(apiNews)) {
    return [];
  }
  
  return apiNews.slice(0, 20).map((article, index) => ({
    id: article.id || `${index}`,
    title: article.title || 'Untitled',
    description: article.description || article.summary || 'No description available',
    content: article.content || article.body || article.description || 'Full article content not available.',
    image: article.image || article.imageUrl || article.urlToImage || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=400',
    date: article.publishedAt ? new Date(article.publishedAt) : new Date(),
    category: 'News',
    featured: index === 0,
    url: article.url || article.link,
    source: article.source?.name || 'HomesPhNews',
  }));
};

const NewsScreen = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filteredNews, setFilteredNews] = useState(MOCK_NEWS);
  const [allNews, setAllNews] = useState(MOCK_NEWS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    filterNews();
  }, [selectedCategory, allNews]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      let newsData = null;

      // Web environment: Skip API (CORS issues), use mock data
      if (Platform.OS === 'web') {
        console.log(`🌐 Web environment: Using mock data (API testing for native only)`);
        setAllNews(MOCK_NEWS);
        setLoading(false);
        return;
      }

      // Native mobile: Fetch from direct API
      try {
        const url = `${HOMESPH_NEWS_API_URL}/api/external/articles`;
        const headers = {
          'X-Site-Api-Key': HOMESPH_NEWS_API_KEY,
          'Accept': 'application/json',
        };
        
        console.log(`📱 Native mobile: Fetching from API...`);
        console.log(`🔄 URL: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers,
        });
        
        console.log(`📡 Response status: ${response.status}`);
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ API Response structure:', Object.keys(result));
          
          // Extract articles - structure: result.data or result.data.data
          newsData = result?.data?.data || result?.data || result?.articles || null;
          
          if (newsData && Array.isArray(newsData) && newsData.length > 0) {
            console.log(`✅ Success! Fetched ${newsData.length} articles from HomesPhNews API`);
            const transformedNews = transformApiNews(newsData);
            setAllNews(transformedNews);
            setLoading(false);
            setRefreshing(false);
            return;
          } else {
            console.warn('⚠️ API returned no articles, using mock data');
          }
        } else {
          const errorText = await response.text();
          console.error(`❌ API Error ${response.status}:`, errorText);
        }
      } catch (apiError) {
        console.error('❌ Failed to fetch from API:', apiError.message);
      }

      // Fallback to mock data
      console.log('📦 Using mock data as fallback');
      setAllNews(MOCK_NEWS);
    } catch (error) {
      console.error('Error in fetchNews:', error);
      setAllNews(MOCK_NEWS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  const filterNews = () => {
    if (selectedCategory === 'All') {
      setFilteredNews(allNews);
    } else {
      setFilteredNews(
        allNews.filter((item) => item.category === selectedCategory)
      );
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleNewsPress = (item) => {
    navigation.navigate('ArticleDetail', { article: item });
  };

  const renderNewsItem = ({ item, index }) => {
    if (item.featured && index === 0) {
      return (
        <TouchableOpacity
          style={styles.featuredCard}
          activeOpacity={0.9}
          onPress={() => handleNewsPress(item)}
        >
          <Image source={{ uri: item.image }} style={styles.featuredImage} />
          <LinearGradient
            colors={['transparent', 'rgba(2, 6, 23, 0.9)']}
            style={styles.featuredOverlay}
          />
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={12} color={Colors.slate950} />
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </View>
          <View style={styles.featuredContent}>
            <Text style={styles.categoryTag}>{item.category}</Text>
            <Text style={styles.featuredTitle} numberOfLines={3}>
              {item.title}
            </Text>
            <Text style={styles.featuredDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.newsCard}
        activeOpacity={0.9}
        onPress={() => handleNewsPress(item)}
      >
        <Image source={{ uri: item.image }} style={styles.newsImage} />
        <View style={styles.newsContent}>
          <Text style={styles.newsTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.newsDescription} numberOfLines={3}>
            {item.description}
          </Text>
          <View style={styles.newsFooter}>
            <Text style={styles.newsDate}>
              {item.date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </Text>
            <View style={styles.newsCategoryBadge}>
              <Text style={styles.newsCategory}>{item.category}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.slate950} />

      <LinearGradient
        colors={[Colors.slate950, Colors.slate900]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>News & Updates</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.lime400} />
          <Text style={styles.loadingText}>Loading news...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNews}
          renderItem={renderNewsItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.lime400]}
              tintColor={Colors.lime400}
            />
          }
          ListHeaderComponent={
            <View style={styles.categoryFilterContainer}>
              {['All', 'News', 'Tournament', 'Tips', 'Community'].map(
                (category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      selectedCategory === category && styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === category &&
                          styles.categoryChipTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.slate50,
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
    fontSize: 24,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.slate600,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  categoryFilterContainer: {
    marginBottom: 20,
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
  },
  categoryChipActive: {
    backgroundColor: Colors.lime400,
    borderColor: Colors.lime400,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.slate600,
    letterSpacing: 0.2,
  },
  categoryChipTextActive: {
    color: Colors.slate950,
  },
  featuredCard: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  featuredContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  categoryTag: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.lime400,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 6,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  featuredDescription: {
    fontSize: 13,
    color: Colors.slate200,
    fontWeight: '500',
    lineHeight: 18,
  },
  newsCard: {
    backgroundColor: Colors.slate50,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  newsImage: {
    width: 120,
    height: 140,
    backgroundColor: Colors.slate200,
  },
  newsContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  newsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 8,
    lineHeight: 20,
  },
  newsDescription: {
    fontSize: 12,
    color: Colors.slate600,
    fontWeight: '500',
    lineHeight: 17,
    marginBottom: 12,
  },
  newsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newsDate: {
    fontSize: 10,
    color: Colors.slate500,
    fontWeight: '600',
  },
  newsCategoryBadge: {
    backgroundColor: Colors.lime400 + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newsCategory: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.lime400,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  newsArrow: {
    alignSelf: 'center',
    marginRight: 12,
  },
});

export default NewsScreen;
