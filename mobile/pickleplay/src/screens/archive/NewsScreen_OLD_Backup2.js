import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Image,
    Linking,
    Platform,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

const {width} = Dimensions.get('window');

const HOMESPH_NEWS_API_URL = 'https://homesphnews-api-394504332858.asia-southeast1.run.app';
const HOMESPH_NEWS_API_KEY = '1nZKZvIK2EPpCIykBheHylG5tuGCJ5wVSSSwui2ESxhZwDrqwNiWxQJOCyr2XEW6';

// Mock data for fallback
const mockNews = [
    {
        title: 'THE 2025 PHILIPPINE NATIONALS: DATES CONFIRMED',
        description: 'The biggest tournament of the year returns with a record-breaking prize pool and world-class facilities in Manila.',
        image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800',
        source: { name: 'PicklePlay News' },
        publishedAt: new Date().toISOString(),
        url: 'https://pickleplay.ph',
        category: 'Tournament',
        readTime: '5 min read',
    },
    {
        title: 'WHY CARBON FIBER IS REVOLUTIONIZING THE DINK',
        description: 'A deep dive into the engineering behind the latest paddle technology and why the pros are switching.',
        image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800',
        source: { name: 'PicklePlay Gear' },
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        url: 'https://pickleplay.ph',
        category: 'Gear',
        readTime: '8 min read',
    },
    {
        title: 'MASTERING THE THIRD SHOT DROP',
        description: 'Coach breaks down the most critical shot in the game. Learn the footwork and paddle angle secrets.',
        image: 'https://images.unsplash.com/photo-1511067007398-7e4b90cfa4bc?w=800',
        source: { name: 'PicklePlay Pro Tips' },
        publishedAt: new Date(Date.now() - 172800000).toISOString(),
        url: 'https://pickleplay.ph',
        category: 'Pro Tips',
        readTime: '4 min read',
    },
    {
        title: 'COMMUNITY SPOTLIGHT: MANILA PICKLEBALL HUB',
        description: 'How one local court transformed into a national pickleball destination through community passion.',
        image: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800',
        source: { name: 'PicklePlay Community' },
        publishedAt: new Date(Date.now() - 259200000).toISOString(),
        url: 'https://pickleplay.ph',
        category: 'Community',
        readTime: '6 min read',
    },
];

const NewsScreen = ({ navigation }) => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('All');

    useEffect(() => {
        fetchNews();
    }, []);

    const fetchNews = async () => {
        try {
            setLoading(true);
            let newsData = null;

            if (Platform.OS !== 'web') {
                try {
                    const endpoint = '/api/external/articles';
                    const url = `${HOMESPH_NEWS_API_URL}${endpoint}`;
                    
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'X-Site-Api-Key': HOMESPH_NEWS_API_KEY,
                            'Accept': 'application/json',
                        },
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        newsData = result?.data?.data || result?.data || result?.articles || null;
                        
                        if (newsData && Array.isArray(newsData) && newsData.length > 0) {
                            console.log(`✅ Fetched ${newsData.length} articles`);
                        } else {
                            console.warn('⚠️ API returned no articles, using mock data');
                        }
                    }
                } catch (apiError) {
                    console.error('❌ API Error:', apiError.message);
                }
            }

            setNews(newsData && newsData.length > 0 ? newsData : mockNews);
        } catch (error) {
            console.error('Error fetching news:', error);
            setNews(mockNews);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchNews();
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        } catch {
            return '';
        }
    };

    const handleNewsPress = async (article) => {
        if (article.url || article.link) {
            const url = article.url || article.link;
            try {
                const canOpen = await Linking.canOpenURL(url);
                if (canOpen) {
                    await Linking.openURL(url);
                } else {
                    Alert.alert('Error', 'Cannot open this link');
                }
            } catch (error) {
                Alert.alert('Error', 'Failed to open link');
            }
        }
    };

    const filters = ['All', 'Tournament', 'Gear', 'Pro Tips', 'Community'];

    const filteredNews = selectedFilter === 'All' 
        ? news 
        : news.filter(article => article.category === selectedFilter);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView 
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh}
                        colors={[Colors.lime400]}
                        tintColor={Colors.lime400}
                    />
                }
            >
                {/* Header Section */}
                <View style={styles.headerSection}>
                    <Text style={styles.headerLabel}>THE FEED / FEB 2026</Text>
                    <Text style={styles.headerTitle}>LATEST</Text>
                    <Text style={styles.headerTitleAccent}>UPDATES.</Text>
                    
                    {/* Filter Tabs */}
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.filterContainer}
                        contentContainerStyle={styles.filterContent}
                    >
                        {filters.map((filter) => (
                            <TouchableOpacity
                                key={filter}
                                style={[
                                    styles.filterButton,
                                    selectedFilter === filter && styles.filterButtonActive
                                ]}
                                onPress={() => setSelectedFilter(filter)}
                                activeOpacity={0.8}
                            >
                                <Text style={[
                                    styles.filterText,
                                    selectedFilter === filter && styles.filterTextActive
                                ]}>
                                    {filter}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors.lime400} />
                        <Text style={styles.loadingText}>Loading news...</Text>
                    </View>
                ) : filteredNews.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBg}>
                            <MaterialIcons name="article" size={40} color={Colors.slate400} />
                        </View>
                        <Text style={styles.emptyText}>No articles found</Text>
                        <Text style={styles.emptySubtext}>Check back later for updates</Text>
                    </View>
                ) : (
                    <>
                        {/* Featured Article */}
                        {filteredNews.length > 0 && (
                            <TouchableOpacity
                                style={styles.featuredCard}
                                onPress={() => handleNewsPress(filteredNews[0])}
                                activeOpacity={0.9}
                            >
                                <Image
                                    source={{ uri: filteredNews[0].image || filteredNews[0].imageUrl || filteredNews[0].urlToImage }}
                                    style={styles.featuredImage}
                                    resizeMode="cover"
                                />
                                <LinearGradient
                                    colors={['transparent', 'rgba(2,6,23,0.4)', 'rgba(2,6,23,0.95)']}
                                    style={styles.featuredGradient}
                                />
                                <View style={styles.featuredContent}>
                                    <View style={styles.featuredBadge}>
                                        <Text style={styles.featuredBadgeText}>FEATURED STORY</Text>
                                    </View>
                                    <Text style={styles.featuredTitle} numberOfLines={3}>
                                        {filteredNews[0].title}
                                    </Text>
                                    <Text style={styles.featuredDescription} numberOfLines={2}>
                                        {filteredNews[0].description || filteredNews[0].summary}
                                    </Text>
                                    <View style={styles.featuredFooter}>
                                        <MaterialIcons name="calendar-today" size={12} color={Colors.white} />
                                        <Text style={styles.featuredDate}>
                                            {formatDate(filteredNews[0].publishedAt || filteredNews[0].date)}
                                        </Text>
                                        {filteredNews[0].readTime && (
                                            <>
                                                <Text style={styles.featuredDot}>•</Text>
                                                <Text style={styles.featuredReadTime}>{filteredNews[0].readTime}</Text>
                                            </>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}

                        {/* Article Grid */}
                        <View style={styles.articlesSection}>
                            {filteredNews.slice(1).map((article, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.articleCard}
                                    onPress={() => handleNewsPress(article)}
                                    activeOpacity={0.9}
                                >
                                    <View style={styles.articleImageContainer}>
                                        <Image
                                            source={{ uri: article.image || article.imageUrl || article.urlToImage }}
                                            style={styles.articleImage}
                                            resizeMode="cover"
                                        />
                                        {article.category && (
                                            <View style={styles.categoryBadge}>
                                                <Text style={styles.categoryBadgeText}>{article.category}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.articleContent}>
                                        <View style={styles.articleMeta}>
                                            <Text style={styles.articleDate}>
                                                {formatDate(article.publishedAt || article.date)}
                                            </Text>
                                            {article.readTime && (
                                                <>
                                                    <Text style={styles.articleMetaDot}>•</Text>
                                                    <Text style={styles.articleReadTime}>{article.readTime}</Text>
                                                </>
                                            )}
                                        </View>
                                        <Text style={styles.articleTitle} numberOfLines={2}>
                                            {article.title}
                                        </Text>
                                        <Text style={styles.articleDescription} numberOfLines={2}>
                                            {article.description || article.summary}
                                        </Text>
                                        <View style={styles.articleSource}>
                                            <MaterialIcons name="source" size={14} color={Colors.slate400} />
                                            <Text style={styles.articleSourceText}>
                                                {article.source?.name || article.source || 'HomesPhNews'}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}

                <View style={{height: 40}} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    
    // Header Section
    headerSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 20,
    },
    headerLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: Colors.blue600,
        letterSpacing: 3,
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 40,
        fontWeight: '900',
        color: Colors.slate950,
        letterSpacing: -2,
        lineHeight: 40,
    },
    headerTitleAccent: {
        fontSize: 40,
        fontWeight: '900',
        color: Colors.slate950,
        letterSpacing: -2,
        marginBottom: 20,
        lineHeight: 40,
    },
    
    // Filter Tabs
    filterContainer: {
        marginTop: 12,
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },
    filterContent: {
        paddingRight: 20,
        gap: 12,
    },
    filterButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: Colors.slate100,
    },
    filterButtonActive: {
        backgroundColor: Colors.slate950,
    },
    filterText: {
        fontSize: 13,
        fontWeight: '800',
        color: Colors.slate600,
        letterSpacing: 0.5,
    },
    filterTextActive: {
        color: Colors.white,
    },
    
    // Featured Card
    featuredCard: {
        marginHorizontal: 20,
        marginTop: 20,
        height: 400,
        borderRadius: 32,
        overflow: 'hidden',
        backgroundColor: Colors.slate900,
        shadowColor: Colors.slate950,
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12,
    },
    featuredImage: {
        width: '100%',
        height: '100%',
    },
    featuredGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    featuredContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
    },
    featuredBadge: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.lime400,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 16,
    },
    featuredBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        color: Colors.slate950,
        letterSpacing: 1.5,
    },
    featuredTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: Colors.white,
        letterSpacing: -1,
        marginBottom: 12,
        lineHeight: 32,
    },
    featuredDescription: {
        fontSize: 15,
        color: Colors.slate300,
        lineHeight: 22,
        marginBottom: 12,
    },
    featuredFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    featuredDate: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.8)',
    },
    featuredDot: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
    },
    featuredReadTime: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.8)',
    },
    
    // Articles Section
    articlesSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    articleCard: {
        marginBottom: 20,
        backgroundColor: Colors.white,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: Colors.slate950,
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: Colors.slate100,
    },
    articleImageContainer: {
        position: 'relative',
        width: '100%',
        height: 200,
    },
    articleImage: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.slate100,
    },
    categoryBadge: {
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: 'rgba(2,6,23,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    categoryBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: Colors.white,
        letterSpacing: 1,
    },
    articleContent: {
        padding: 20,
    },
    articleMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    articleDate: {
        fontSize: 11,
        fontWeight: '800',
        color: Colors.slate400,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    articleMetaDot: {
        fontSize: 11,
        color: Colors.slate300,
    },
    articleReadTime: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.slate400,
    },
    articleTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.slate950,
        letterSpacing: -0.5,
        marginBottom: 8,
        lineHeight: 24,
    },
    articleDescription: {
        fontSize: 14,
        color: Colors.slate600,
        lineHeight: 20,
        marginBottom: 12,
    },
    articleSource: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    articleSourceText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.slate500,
    },
    
    // Loading & Empty States
    loadingContainer: {
        paddingVertical: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        fontWeight: '600',
        color: Colors.slate600,
    },
    emptyContainer: {
        paddingVertical: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.slate100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.slate700,
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.slate500,
    },
});

export default NewsScreen;
