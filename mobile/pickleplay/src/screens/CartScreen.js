import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

const CartScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  
  // Static cart items
  const cartItems = [
    {
      id: 1,
      name: 'Pro Carbon Paddle',
      category: 'Paddles',
      price: 149.99,
      quantity: 1,
      image: 'https://picsum.photos/seed/paddle1/300/300',
    },
    {
      id: 2,
      name: 'Tournament Balls (6-pack)',
      category: 'Balls',
      price: 24.99,
      quantity: 2,
      image: 'https://picsum.photos/seed/balls2/300/300',
    },
    {
      id: 3,
      name: 'Grip Tape Set',
      category: 'Accessories',
      price: 19.99,
      quantity: 1,
      image: 'https://picsum.photos/seed/grip4/300/300',
    },
  ];

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = 5.99;
  const tax = subtotal * 0.12;
  const total = subtotal + shipping + tax;

  const handleCheckout = () => {
    navigation.navigate('Checkout', { cartItems, subtotal, shipping, tax, total });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient 
        colors={[Colors.slate950, Colors.slate900]} 
        style={[styles.header, { paddingTop: insets.top > 0 ? insets.top : 20 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <View style={styles.backIconContainer}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CART</Text>
        <View style={styles.headerRight}>
          <View style={styles.cartIconContainer}>
            <Ionicons name="cart" size={24} color={Colors.slate950} />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cart Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>YOUR ITEMS</Text>
          {cartItems.map((item) => (
            <View key={item.id} style={styles.cartItem}>
              <Image source={{ uri: item.image }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemCategory}>{item.category.toUpperCase()}</Text>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
              </View>
              <View style={styles.quantityContainer}>
                <TouchableOpacity style={styles.quantityButton}>
                  <Ionicons name="remove" size={20} color={Colors.slate950} />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{item.quantity}</Text>
                <TouchableOpacity style={styles.quantityButtonAdd}>
                  <Ionicons name="add" size={20} color={Colors.slate950} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ORDER SUMMARY</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>${shipping.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax (12%)</Text>
              <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Promo Code */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.promoCard}>
            <View style={styles.promoIconContainer}>
              <Ionicons name="pricetag" size={20} color={Colors.lime400} />
            </View>
            <Text style={styles.promoText}>Add promo code</Text>
            <Ionicons name="chevron-forward" size={24} color={Colors.slate400} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Checkout Button */}
      <View style={[styles.checkoutContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
        <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
          <View style={styles.checkoutButtonContent}>
            <Text style={styles.checkoutButtonText}>PROCEED TO CHECKOUT</Text>
            <Text style={styles.checkoutTotal}>${total.toFixed(2)}</Text>
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
    fontSize: 20,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  headerRight: {
    width: 48,
    alignItems: 'flex-end',
  },
  cartIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lime400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.slate950,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  cartBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.slate950,
    marginBottom: 16,
    letterSpacing: 1,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginRight: 16,
    backgroundColor: Colors.slate100,
  },
  itemInfo: {
    flex: 1,
  },
  itemCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.slate500,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -0.5,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate100,
    borderRadius: 20,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
  },
  quantityButtonAdd: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lime400,
    borderRadius: 16,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.slate950,
    marginHorizontal: 16,
    letterSpacing: -0.5,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.slate600,
    letterSpacing: -0.3,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: -0.3,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.slate200,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -0.5,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.lime400,
    letterSpacing: -1,
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  promoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  promoText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.slate950,
    letterSpacing: -0.3,
  },
  checkoutContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  checkoutButton: {
    backgroundColor: Colors.lime400,
    borderRadius: 24,
    shadowColor: Colors.lime400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  checkoutButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: 0.5,
  },
  checkoutTotal: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -0.5,
  },
});

export default CartScreen;
