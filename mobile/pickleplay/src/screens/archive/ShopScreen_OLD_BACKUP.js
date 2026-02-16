import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialIcons} from '@expo/vector-icons';
import Colors from '../constants/Colors';

const thematicBlue = '#0A56A7';

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
      <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.bannerContainer}>
          <LinearGradient colors={[thematicBlue, '#084590']} style={styles.banner}>
            <Text style={styles.bannerTitle}>PICKLEBALL SHOP</Text>
            <Text style={styles.bannerSubtitle}>Premium gear for every player</Text>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(category)}>
                <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Products</Text>
          {filteredProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              activeOpacity={0.7}
              onPress={() => goToProductDetail(product)}>
              <Image source={{uri: product.image}} style={styles.productImage} />
              <View style={styles.productDetails}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productCategory}>{product.category}</Text>
                <View style={styles.ratingRow}>
                  <MaterialIcons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>{product.rating}</Text>
                </View>
                <Text style={styles.productPrice}>{product.price}</Text>
              </View>
              <View style={styles.cartIcon}>
                <MaterialIcons name="add-shopping-cart" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{height: 20}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scrollView: { flex: 1 },
  bannerContainer: { padding: 15 },
  banner: { padding: 25, borderRadius: 12, alignItems: 'center' },
  bannerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  bannerSubtitle: { fontSize: 14, color: '#fff' },
  section: { paddingHorizontal: 15, marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: thematicBlue, marginBottom: 12 },
  categoryChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
  categoryChipActive: { backgroundColor: thematicBlue, borderColor: thematicBlue },
  categoryChipText: { fontSize: 14, color: thematicBlue, fontWeight: '500' },
  categoryChipTextActive: { color: '#fff' },
  productCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, alignItems: 'center', elevation: 2 },
  productImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#f0f0f0' },
  productDetails: { flex: 1, marginLeft: 12 },
  productName: { fontSize: 15, fontWeight: '600', color: thematicBlue, marginBottom: 2 },
  productCategory: { fontSize: 12, color: '#888', marginBottom: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  ratingText: { fontSize: 12, color: '#666', marginLeft: 3 },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: thematicBlue },
  cartIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: thematicBlue, justifyContent: 'center', alignItems: 'center' },
});

export default ShopScreen;
