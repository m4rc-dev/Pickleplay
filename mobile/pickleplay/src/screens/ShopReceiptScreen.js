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

const ShopReceiptScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  
  // Static order data fallback
  const orderData = route?.params?.orderData || {
    orderId: 'ORD-12345678',
    items: [
      { id: 1, name: 'Pro Carbon Paddle', price: 149.99, quantity: 1 },
      { id: 2, name: 'Tournament Balls (6-pack)', price: 24.99, quantity: 2 },
      { id: 3, name: 'Grip Tape Set', price: 19.99, quantity: 1 },
    ],
    subtotal: 219.96,
    shipping: 5.99,
    tax: 26.40,
    total: 252.35,
    paymentMethod: 'Credit/Debit Card',
    shippingAddress: {
      name: 'Juan Dela Cruz',
      address: '123 Mango Street, Barangay Banawa',
      city: 'Cebu City, Cebu 6000',
      phone: '+63 912 345 6789',
    },
    orderDate: 'January 28, 2026, 10:45 AM',
  };

  const estimatedDelivery = 'February 2-5, 2026';

  const handleContinueShopping = () => {
    navigation.navigate('Shop', { direction: 'left', screenIndex: 3 });
  };

  const handleTrackOrder = () => {
    alert('Order tracking feature coming soon!');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Success Header */}
      <LinearGradient 
        colors={[Colors.slate950, Colors.slate900]} 
        style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 20 : 40 }]}
      >
        <View style={styles.successIconContainer}>
          <Ionicons name="checkmark-circle" size={80} color={Colors.lime400} />
        </View>
        <Text style={styles.successTitle}>ORDER PLACED!</Text>
        <Text style={styles.successSubtitle}>Thank you for your purchase</Text>
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderIdLabel}>ORDER ID</Text>
          <Text style={styles.orderId}>{orderData.orderId}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Delivery Info */}
        <View style={styles.section}>
          <View style={styles.deliveryCard}>
            <View style={styles.deliveryIconContainer}>
              <Ionicons name="bicycle" size={32} color={Colors.lime400} />
            </View>
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryLabel}>ESTIMATED DELIVERY</Text>
              <Text style={styles.deliveryDate}>{estimatedDelivery}</Text>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ORDER ITEMS</Text>
          <View style={styles.receiptCard}>
            {orderData.items.map((item, index) => (
              <View key={item.id} style={[styles.itemRow, index < orderData.items.length - 1 && styles.itemBorder]}>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
            
            <View style={styles.divider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${orderData.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>${orderData.shipping.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>${orderData.tax.toFixed(2)}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL PAID</Text>
              <Text style={styles.totalValue}>${orderData.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PAYMENT INFORMATION</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="card" size={20} color={Colors.lime400} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Payment Method</Text>
                <Text style={styles.infoValue}>{orderData.paymentMethod}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="time" size={20} color={Colors.lime400} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Order Date</Text>
                <Text style={styles.infoValue}>{orderData.orderDate}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SHIPPING ADDRESS</Text>
          <View style={styles.addressCard}>
            <View style={styles.addressIconContainer}>
              <Ionicons name="location" size={24} color={Colors.lime400} />
            </View>
            <View style={styles.addressInfo}>
              <Text style={styles.addressName}>{orderData.shippingAddress.name}</Text>
              <Text style={styles.addressText}>{orderData.shippingAddress.address}</Text>
              <Text style={styles.addressText}>{orderData.shippingAddress.city}</Text>
              <View style={styles.phoneRow}>
                <Ionicons name="call" size={14} color={Colors.slate500} />
                <Text style={styles.addressPhone}>{orderData.shippingAddress.phone}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Thank You Section */}
        <View style={styles.thankYouSection}>
          <Image 
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/5610/5610944.png' }}
            style={styles.thankYouIcon}
          />
          <Text style={styles.thankYouText}>THANK YOU FOR SHOPPING!</Text>
          <Text style={styles.thankYouSubtext}>We'll send you updates about your order via email and SMS</Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
        <TouchableOpacity style={styles.trackButton} onPress={handleTrackOrder}>
          <Ionicons name="location-outline" size={20} color={Colors.slate950} />
          <Text style={styles.trackButtonText}>TRACK ORDER</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinueShopping}>
          <Text style={styles.continueButtonText}>CONTINUE SHOPPING</Text>
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
    alignItems: 'center',
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  successIconContainer: {
    marginBottom: 15,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  successSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.slate300,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(163, 230, 53, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  orderIdLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.lime400,
    letterSpacing: 0.5,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    marginTop: -15,
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
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  deliveryIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: Colors.slate100,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.slate500,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  deliveryDate: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -0.5,
  },
  receiptCard: {
    backgroundColor: Colors.white,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.slate500,
    letterSpacing: -0.3,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.slate200,
    marginVertical: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 16,
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
  infoCard: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.slate500,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: -0.3,
  },
  addressCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  addressIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addressInfo: {
    flex: 1,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.slate600,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  addressPhone: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate950,
    letterSpacing: -0.3,
  },
  thankYouSection: {
    alignItems: 'center',
    padding: 30,
  },
  thankYouIcon: {
    width: 80,
    height: 80,
    marginBottom: 20,
    opacity: 0.8,
  },
  thankYouText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  thankYouSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.slate500,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  bottomContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  trackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.slate200,
    backgroundColor: Colors.white,
    gap: 8,
  },
  trackButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: 0.5,
  },
  continueButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 24,
    backgroundColor: Colors.lime400,
    shadowColor: Colors.lime400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: 0.5,
  },
});

export default ShopReceiptScreen;
