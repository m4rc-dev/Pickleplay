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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

const thematicBlue = '#0A56A7';
const HOMESPH_NEWS_API_URL = 'https://homesphnews-api-394504332858.asia-southeast1.run.app';
const HOMESPH_NEWS_API_KEY = '1nZKZvIK2EPpCIykBheHylG5tuGCJ5wVSSSwui2ESxhZwDrqwNiWxQJOCyr2XEW6';

// Mock data for web (CORS blocked)
const mockNews = [
    {
        title: 'PicklePlay Launches New Court Booking System',
        description: 'Experience seamless court booking with our new real-time availability system.',
        image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800',
        source: { name: 'PicklePlay News' },
        publishedAt: new Date().toISOString(),
        url: 'https://pickleplay.ph',
    },
    {
        title: 'Top 5 Pickleball Courts in Metro Manila',
        description: 'Discover the best pickleball courts in the city with premium facilities and coaching.',
        image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800',
        source: { name: 'PicklePlay Guide' },
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        url: 'https://pickleplay.ph',
    },
    {
        title: 'Pickleball Tournament Season 2026',
        description: 'Join our upcoming tournaments and compete with the best players in the Philippines.',
        image: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=800',
        source: { name: 'PicklePlay Sports' },
        publishedAt: new Date(Date.now() - 172800000).toISOString(),
        url: 'https://pickleplay.ph',
    },
];

const NewsScreen = ({ navigation }) => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchNews();
    }, []);

    const fetchNews = async () => {
        try {
            setLoading(true);
            let newsData = null;

            // Use mock data on web due to CORS, but try API on mobile
            if (Platform.OS !== 'web') {
                try {
                    // Correct endpoint from EXTERNAL_API_GUIDE.md
                    const endpoint = '/api/external/articles';
                    const url = `${HOMESPH_NEWS_API_URL}${endpoint}`;
                    
                    console.log(`🔄 Fetching news from: ${url}`);
                    
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'X-Site-Api-Key': HOMESPH_NEWS_API_KEY,  // Correct header name per docs
                            'Accept': 'application/json',
                        },
                    });
                    
                    console.log(`📡 Response status: ${response.status}`);
                    
                    if (response.ok) {
                        const result = await response.json();
                        console.log('✅ API Response structure:', Object.keys(result));
                        
                        // Response structure: result.data.data contains articles array
                        newsData = result?.data?.data || result?.data || result?.articles || null;
                        
                        if (newsData && Array.isArray(newsData) && newsData.length > 0) {
                            console.log(`✅ Success! Fetched ${newsData.length} articles from HomesPhNews API`);
                        } else {
                            console.warn('⚠️ API returned no articles, using mock data');
                        }
                    } else {
                        const errorText = await response.text();
                        console.error(`❌ API Error ${response.status}:`, errorText);
                    }
                } catch (apiError) {
                    console.error('❌ Failed to fetch from HomesPhNews API:', apiError.message);
                }
            }

            // Use API data if available, otherwise use mock data
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
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Error', 'Cannot open this link');
            }
        }
    };

    const renderNewsCard = (article, index) => {
        return (
            <TouchableOpacity
                key={index}
                style={styles.newsCard}
                onPress={() => handleNewsPress(article)}
                activeOpacity={0.7}
            >
                {/* Image */}
                {article.image || article.imageUrl || article.urlToImage ? (
                    <Image
                        source={{ uri: article.image || article.imageUrl || article.urlToImage }}
                        style={styles.newsImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.newsImage, styles.placeholderImage]}>
                        <MaterialIcons name="article" size={40} color="#ccc" />
                    </View>
                )}

                {/* Content */}
                <View style={styles.newsContent}>
                    <Text style={styles.newsTitle} numberOfLines={2}>
                        {article.title || 'Untitled'}
                    </Text>
                    <Text style={styles.newsDescription} numberOfLines={3}>
                        {article.description || article.summary || 'No description available'}
                    </Text>
                    <View style={styles.newsFooter}>
                        <View style={styles.newsSource}>
                            <MaterialIcons name="source" size={14} color="#666" />
                            <Text style={styles.newsSourceText}>
                                {article.source?.name || article.source || 'HomesPhNews'}
                            </Text>
                        </View>
                        {article.publishedAt || article.date ? (
                            <Text style={styles.newsDate}>
                                {formatDate(article.publishedAt || article.date)}
                            </Text>
                        ) : null}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <LinearGradient
                colors={[thematicBlue, '#0842A0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="arrow-back" size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>News</Text>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={fetchNews}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="refresh" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={thematicBlue} />
                    <Text style={styles.loadingText}>Loading news...</Text>
                </View>
            ) : news.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="newspaper" size={80} color="#ccc" />
                    <Text style={styles.emptyText}>No news available</Text>
                    <Text style={styles.emptySubtext}>Check back later for updates</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[thematicBlue]}
                            tintColor={thematicBlue}
                        />
                    }
                >
                    {news.map(renderNewsCard)}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        paddingVertical: 20,
        paddingHorizontal: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 5,
    },
    refreshButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginTop: 20,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    newsCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    newsImage: {
        width: '100%',
        height: 200,
        backgroundColor: '#f0f0f0',
    },
    placeholderImage: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    newsContent: {
        padding: 16,
    },
    newsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
        lineHeight: 24,
    },
    newsDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 12,
    },
    newsFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    newsSource: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    newsSourceText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    newsDate: {
        fontSize: 12,
        color: '#999',
    },
});

export default NewsScreen;
