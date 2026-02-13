import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialIcons} from '@expo/vector-icons';
import Colors from '../constants/Colors';
import commonStyles from '../styles/commonStyles';

const {width} = Dimensions.get('window');

const ShopScreen = ({navigation, route}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Paddles', 'Balls', 'Apparel', 'Accessories'];

  const products = [
    {
      id: 1,
      name: 'Pro Carbon Paddle',
      category: 'Paddles',
      price: '$149.99',
      priceNum: 149.99,
      rating: 4.8,
      image: 'https://picsum.photos/seed/paddle1/300/300',
      description: 'Professional-grade carbon fiber paddle.',
    },
    {
      id: 2,
      name: 'Tournament Balls (6-pack)',
      category: 'Balls',
      price: '$24.99',
      priceNum: 24.99,
      rating: 4.6,
      image: 'https://picsum.photos/seed/balls2/300/300',
      description: 'Official tournament-approved pickleballs.',
    },
    {
      id: 3,
      name: 'Performance Jersey',
      category: 'Apparel',
      price: '$59.99',
      priceNum: 59.99,
      rating: 4.7,
      image: 'https://picsum.photos/seed/jersey3/300/300',
      description: 'Moisture-wicking athletic jersey.',
    },
    {
      id: 4,
      name: 'Grip Tape Set',
      category: 'Accessories',
      price: '$19.99',
      priceNum: 19.99,
      rating: 4.5,
      image: 'https://picsum.photos/seed/grip4/300/300',
      description: 'Premium overgrip tape set.',
    },
    {
      id: 5,
      name: 'Beginner Paddle Set',
      category: 'Paddles',
      price: '$89.99',
      priceNum: 89.99,
      rating: 4.4,
      image: 'https://picsum.photos/seed/paddle5/300/300',
      description: 'Complete starter set with 2 paddles.',
    },
  ];

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(product => product.category === selectedCategory);

  const goToProductDetail = (product) => {
    navigation.navigate('ProductDetail', {product: product});
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Banner */}
        <View style={styles.bannerContainer}>
          <LinearGradient 
            colors={[Colors.slate950, Colors.slate900]} 
            style={styles.banner}
          >
            <View style={styles.iconBg}>
              <MaterialIcons name="shopping-bag" size={32} color={Colors.lime400} />
            </View>
            <Text style={styles.bannerLabel}>SHOP</Text>
            <Text style={styles.bannerTitle}>PREMIUM</Text>
            <Text style={styles.bannerTitleAccent}>GEAR.</Text>
            <Text style={styles.bannerSubtitle}>Equipment for every player level</Text>
          </LinearGradient>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CATEGORIES</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {categories.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryChip, 
                  selectedCategory === category && styles.categoryChipActive
                ]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.categoryChipText, 
                  selectedCategory === category && styles.categoryChipTextActive
                ]}>
                  {category.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products Grid */}
        <View style={styles.section}>
          <View style={styles.productsHeader}>
            <Text style={styles.sectionTitle}>PRODUCTS</Text>
            <Text style={styles.productCount}>{filteredProducts.length} items</Text>
          </View>
          
          <View style={styles.productsGrid}>
            {filteredProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                activeOpacity={0.9}
                onPress={() => goToProductDetail(product)}
              >
                <View style={styles.productImageContainer}>
                  <Image source={{uri: product.image}} style={styles.productImage} />
                  <View style={styles.ratingBadge}>
                    <MaterialIcons name="star" size={12} color="#FBBC04" />
                    <Text style={styles.ratingBadgeText}>{product.rating}</Text>
                  </View>
                </View>
                
                <View style={styles.productDetails}>
                  <Text style={styles.productCategory}>{product.category.toUpperCase()}</Text>
                  <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                  
                  <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>{product.price}</Text>
                    <TouchableOpacity 
                      style={styles.addButton}
                      onPress={() => goToProductDetail(product)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="add" size={18} color={Colors.slate950} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={{height: 40}} />
      </ScrollView>

      {/* Floating Cart Button */}
      <TouchableOpacity 
        style={styles.floatingCart}
        onPress={() => navigation.navigate('Cart')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[Colors.slate950, Colors.slate900]}
          style={styles.floatingCartGradient}
        >
          <MaterialIcons name="shopping-cart" size={24} color={Colors.lime400} />
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>0</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
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
  
  // Hero Banner
  bannerContainer: { 
    padding: 20,
    paddingTop: 24,
  },
  banner: { 
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: Colors.slate950,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.slate800,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  bannerLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.slate500,
    letterSpacing: 3,
    marginBottom: 4,
  },
  bannerTitle: { 
    fontSize: 36,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -1.5,
    lineHeight: 36,
  },
  bannerTitleAccent: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.lime400,
    letterSpacing: -1.5,
    marginBottom: 8,
    lineHeight: 36,
  },
  bannerSubtitle: { 
    fontSize: 14,
    fontWeight: '600',
    color: Colors.slate400,
  },
  
  // Section
  section: { 
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionTitle: { 
    fontSize: 13,
    fontWeight: '900',
    color: Colors.slate500,
    letterSpacing: 2,
    marginBottom: 16,
  },
  
  // Categories
  categoriesScroll: {
    gap: 12,
  },
  categoryChip: { 
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.slate200,
  },
  categoryChipActive: { 
    backgroundColor: Colors.slate950,
    borderColor: Colors.slate950,
  },
  categoryChipText: { 
    fontSize: 12,
    fontWeight: '900',
    color: Colors.slate600,
    letterSpacing: 1,
  },
  categoryChipTextActive: { 
    color: Colors.white,
  },
  
  // Products
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  productCount: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.slate500,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  productCard: { 
    width: (width - 56) / 2,
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.slate950,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  productImageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
    backgroundColor: Colors.slate50,
  },
  productImage: { 
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.slate950,
  },
  productDetails: { 
    padding: 12,
  },
  productCategory: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.slate500,
    letterSpacing: 1,
    marginBottom: 4,
  },
  productName: { 
    fontSize: 14,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: -0.3,
    marginBottom: 12,
    lineHeight: 18,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: { 
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -0.5,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.lime400,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.lime400,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Floating Cart
  floatingCart: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    shadowColor: Colors.slate950,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingCartGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.white,
  },
});

export default ShopScreen;
