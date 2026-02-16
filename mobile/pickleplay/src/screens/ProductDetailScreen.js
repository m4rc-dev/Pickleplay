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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

const { width } = Dimensions.get('window');

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
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.slate950} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PRODUCT</Text>
        <TouchableOpacity style={styles.headerButton} onPress={toggleFavorite}>
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={24} 
            color={isFavorite ? "#FF4757" : Colors.slate950} 
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
            <Text style={styles.categoryText}>{product.category.toUpperCase()}</Text>
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
                  size={20}
                  color={Colors.lime400}
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
            <Text style={styles.sectionLabel}>DESCRIPTION</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Features */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionLabel}>HIGHLIGHTS</Text>
            <View style={styles.featuresGrid}>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.lime400} />
                </View>
                <Text style={styles.featureText}>Premium Quality</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="trophy" size={20} color={Colors.lime400} />
                </View>
                <Text style={styles.featureText}>Tournament Ready</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="shield-checkmark" size={20} color={Colors.lime400} />
                </View>
                <Text style={styles.featureText}>1-Year Warranty</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="rocket" size={20} color={Colors.lime400} />
                </View>
                <Text style={styles.featureText}>Free Shipping</Text>
              </View>
            </View>
          </View>

          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <Text style={styles.sectionLabel}>QUANTITY</Text>
            <View style={styles.quantityRow}>
              <View style={styles.quantitySelector}>
                <TouchableOpacity 
                  style={[styles.qtyBtn, quantity === 1 && styles.qtyBtnDisabled]} 
                  onPress={decreaseQuantity}
                  disabled={quantity === 1}
                >
                  <Ionicons name="remove" size={20} color={quantity === 1 ? Colors.slate300 : Colors.slate950} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{quantity}</Text>
                <TouchableOpacity style={styles.qtyBtnAdd} onPress={increaseQuantity}>
                  <Ionicons name="add" size={20} color={Colors.slate950} />
                </TouchableOpacity>
              </View>
              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalPrice}>${(product.priceNum * quantity).toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 15 }]}>
        <TouchableOpacity style={styles.addToCartBtn} onPress={addToCart} activeOpacity={0.9}>
          <View style={styles.addToCartContent}>
            <Ionicons name="cart" size={22} color={Colors.slate950} />
            <Text style={styles.addToCartText}>ADD TO CART</Text>
          </View>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  imageSection: {
    backgroundColor: Colors.white,
    paddingVertical: 40,
    alignItems: 'center',
    position: 'relative',
  },
  productImage: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: 24,
    backgroundColor: Colors.slate50,
  },
  categoryBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: Colors.lime400,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: Colors.white,
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  productName: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.slate950,
    marginBottom: 12,
    letterSpacing: -1,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 10,
  },
  ratingNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.slate950,
    marginRight: 6,
    letterSpacing: -0.5,
  },
  reviewCount: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.slate500,
    letterSpacing: -0.3,
  },
  price: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.lime400,
    marginBottom: 24,
    letterSpacing: -1.5,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.slate950,
    marginBottom: 12,
    letterSpacing: 1,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
    color: Colors.slate600,
    letterSpacing: -0.3,
  },
  featuresSection: {
    marginBottom: 24,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  featureItem: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate950,
    flex: 1,
    letterSpacing: -0.3,
  },
  quantitySection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate100,
    borderRadius: 20,
    padding: 4,
  },
  qtyBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnDisabled: {
    backgroundColor: Colors.slate200,
  },
  qtyBtnAdd: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.lime400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    paddingHorizontal: 20,
    letterSpacing: -0.5,
  },
  totalSection: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.slate500,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  totalPrice: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -1,
  },
  bottomBar: {
    backgroundColor: Colors.white,
    paddingTop: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  addToCartBtn: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.lime400,
    shadowColor: Colors.lime400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addToCartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  addToCartText: {
    color: Colors.slate950,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

export default ProductDetailScreen;
