import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const thematicBlue = '#0A56A7';

const ProductDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  
  const product = route?.params?.product || {
    id: 1,
    name: 'Pro Carbon Paddle',
    category: 'Paddles',
    price: '$149.99',
    priceNum: 149.99,
    rating: 4.8,
    image: 'https://picsum.photos/seed/paddle1/300/300',
    description: 'Professional-grade carbon fiber paddle with honeycomb core for maximum power and control.',
  };

  const increaseQuantity = () => setQuantity(prev => prev + 1);
  const decreaseQuantity = () => quantity > 1 && setQuantity(prev => prev - 1);
  const toggleFavorite = () => setIsFavorite(prev => !prev);
  const addToCart = () => navigation.navigate('Cart');
  const goBack = () => navigation.goBack();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color={thematicBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity style={styles.headerButton} onPress={toggleFavorite}>
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={24} 
            color={isFavorite ? "#FF4757" : thematicBlue} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Product Image */}
        <View style={styles.imageSection}>
          <Image source={{ uri: product.image }} style={styles.productImage} />
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{product.category}</Text>
          </View>
        </View>

        {/* Product Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.productName}>{product.name}</Text>
          
          {/* Rating & Reviews */}
          <View style={styles.ratingSection}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= Math.floor(product.rating) ? "star" : "star-outline"}
                  size={18}
                  color="#FFD700"
                  style={{ marginRight: 2 }}
                />
              ))}
            </View>
            <Text style={styles.ratingNumber}>{product.rating}</Text>
            <Text style={styles.reviewCount}>(128 reviews)</Text>
          </View>

          {/* Price */}
          <Text style={styles.price}>{product.price}</Text>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Features */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionLabel}>Highlights</Text>
            <View style={styles.featuresGrid}>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <MaterialIcons name="verified" size={20} color={thematicBlue} />
                </View>
                <Text style={styles.featureText}>Premium Quality</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <MaterialIcons name="emoji-events" size={20} color={thematicBlue} />
                </View>
                <Text style={styles.featureText}>Tournament Ready</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <MaterialIcons name="security" size={20} color={thematicBlue} />
                </View>
                <Text style={styles.featureText}>1-Year Warranty</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <MaterialIcons name="local-shipping" size={20} color={thematicBlue} />
                </View>
                <Text style={styles.featureText}>Free Shipping</Text>
              </View>
            </View>
          </View>

          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <Text style={styles.sectionLabel}>Quantity</Text>
            <View style={styles.quantityRow}>
              <View style={styles.quantitySelector}>
                <TouchableOpacity 
                  style={[styles.qtyBtn, quantity === 1 && styles.qtyBtnDisabled]} 
                  onPress={decreaseQuantity}
                  disabled={quantity === 1}
                >
                  <Ionicons name="remove" size={20} color={quantity === 1 ? "#ccc" : thematicBlue} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={increaseQuantity}>
                  <Ionicons name="add" size={20} color={thematicBlue} />
                </TouchableOpacity>
              </View>
              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalPrice}>${(product.priceNum * quantity).toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 15 }]}>
        <TouchableOpacity style={styles.addToCartBtn} onPress={addToCart} activeOpacity={0.9}>
          <LinearGradient
            colors={[thematicBlue, '#084590']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addToCartGradient}
          >
            <Ionicons name="cart-outline" size={22} color="#fff" />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: thematicBlue,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  imageSection: {
    backgroundColor: '#fff',
    paddingVertical: 30,
    alignItems: 'center',
    position: 'relative',
  },
  productImage: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 20,
  },
  categoryBadge: {
    position: 'absolute',
    top: 15,
    left: 15,
    backgroundColor: thematicBlue + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: thematicBlue,
  },
  infoCard: {
    backgroundColor: '#fff',
    marginTop: 10,
    marginHorizontal: 15,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 5,
  },
  reviewCount: {
    fontSize: 13,
    color: '#888',
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: thematicBlue,
    marginBottom: 20,
  },
  descriptionSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
  },
  featuresSection: {
    marginBottom: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  featureItem: {
    width: '50%',
    paddingHorizontal: 5,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: thematicBlue + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  featureText: {
    fontSize: 13,
    color: '#444',
    flex: 1,
  },
  quantitySection: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 5,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  qtyBtnDisabled: {
    backgroundColor: '#f5f5f5',
  },
  qtyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    paddingHorizontal: 20,
  },
  totalSection: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: thematicBlue,
  },
  bottomBar: {
    backgroundColor: '#fff',
    paddingTop: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  addToCartBtn: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  addToCartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default ProductDetailScreen;
