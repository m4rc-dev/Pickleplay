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
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

const thematicBlue = '#0A56A7';
const successGreen = '#4CAF50';

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
      <StatusBar barStyle="light-content" backgroundColor={successGreen} />
      
      {/* Success Header */}
      <LinearGradient colors={[successGreen, '#43A047']} style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 20 : 40 }]}>
        <View style={styles.successIconContainer}>
          <MaterialIcons name="check-circle" size={80} color={Colors.white} />
        </View>
        <Text style={styles.successTitle}>Order Placed!</Text>
        <Text style={styles.successSubtitle}>Thank you for your purchase</Text>
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderIdLabel}>Order ID:</Text>
          <Text style={styles.orderId}>{orderData.orderId}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Delivery Info */}
        <View style={styles.section}>
          <View style={styles.deliveryCard}>
            <View style={styles.deliveryIconContainer}>
              <MaterialIcons name="local-shipping" size={32} color={thematicBlue} />
            </View>
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryLabel}>Estimated Delivery</Text>
              <Text style={styles.deliveryDate}>{estimatedDelivery}</Text>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
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
              <Text style={styles.totalLabel}>Total Paid</Text>
              <Text style={styles.totalValue}>${orderData.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialIcons name="credit-card" size={20} color={thematicBlue} />
              <Text style={styles.infoLabel}>Payment Method</Text>
              <Text style={styles.infoValue}>{orderData.paymentMethod}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="access-time" size={20} color={thematicBlue} />
              <Text style={styles.infoLabel}>Order Date</Text>
              <Text style={styles.infoValue}>{orderData.orderDate}</Text>
            </View>
          </View>
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <View style={styles.addressCard}>
            <MaterialIcons name="location-on" size={24} color={thematicBlue} />
            <View style={styles.addressInfo}>
              <Text style={styles.addressName}>{orderData.shippingAddress.name}</Text>
              <Text style={styles.addressText}>{orderData.shippingAddress.address}</Text>
              <Text style={styles.addressText}>{orderData.shippingAddress.city}</Text>
              <Text style={styles.addressPhone}>{orderData.shippingAddress.phone}</Text>
            </View>
          </View>
        </View>

        {/* Thank You Section */}
        <View style={styles.thankYouSection}>
          <Image 
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/5610/5610944.png' }}
            style={styles.thankYouIcon}
          />
          <Text style={styles.thankYouText}>Thank you for shopping with PicklePlay!</Text>
          <Text style={styles.thankYouSubtext}>We'll send you updates about your order via email and SMS.</Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
        <TouchableOpacity style={styles.trackButton} onPress={handleTrackOrder}>
          <MaterialIcons name="local-shipping" size={20} color={thematicBlue} />
          <Text style={styles.trackButtonText}>Track Order</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinueShopping}>
          <Text style={styles.continueButtonText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
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
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 5,
  },
  successSubtitle: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: 20,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  orderIdLabel: {
    fontSize: 14,
    color: Colors.white,
    marginRight: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
  },
  content: {
    flex: 1,
    marginTop: -15,
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: thematicBlue,
    marginBottom: 12,
  },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deliveryIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(10, 86, 167, 0.1)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryLabel: {
    fontSize: 14,
    color: thematicBlue,
    opacity: 0.7,
    marginBottom: 4,
  },
  deliveryDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: thematicBlue,
  },
  receiptCard: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: thematicBlue,
    marginBottom: 3,
  },
  itemQty: {
    fontSize: 13,
    color: thematicBlue,
    opacity: 0.7,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: thematicBlue,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: thematicBlue,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 14,
    color: thematicBlue,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: thematicBlue,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: successGreen,
  },
  infoCard: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: thematicBlue,
    opacity: 0.7,
    marginLeft: 12,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: thematicBlue,
  },
  addressCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  addressInfo: {
    flex: 1,
    marginLeft: 12,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: thematicBlue,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: thematicBlue,
    opacity: 0.7,
    marginBottom: 2,
  },
  addressPhone: {
    fontSize: 14,
    color: thematicBlue,
    marginTop: 4,
  },
  thankYouSection: {
    alignItems: 'center',
    padding: 30,
  },
  thankYouIcon: {
    width: 80,
    height: 80,
    marginBottom: 15,
  },
  thankYouText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: thematicBlue,
    textAlign: 'center',
    marginBottom: 8,
  },
  thankYouSubtext: {
    fontSize: 14,
    color: thematicBlue,
    opacity: 0.7,
    textAlign: 'center',
  },
  bottomContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  trackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: thematicBlue,
    marginRight: 10,
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: thematicBlue,
    marginLeft: 8,
  },
  continueButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: thematicBlue,
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.white,
  },
});

export default ShopReceiptScreen;
