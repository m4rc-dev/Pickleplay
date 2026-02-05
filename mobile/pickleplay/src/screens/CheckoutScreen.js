import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

const thematicBlue = '#0A56A7';

const CheckoutScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [selectedPayment, setSelectedPayment] = useState('card');
  
  // Static checkout data
  const cartItems = route?.params?.cartItems || [
    { id: 1, name: 'Pro Carbon Paddle', price: 149.99, quantity: 1 },
    { id: 2, name: 'Tournament Balls (6-pack)', price: 24.99, quantity: 2 },
    { id: 3, name: 'Grip Tape Set', price: 19.99, quantity: 1 },
  ];
  
  const subtotal = route?.params?.subtotal || 219.96;
  const shipping = route?.params?.shipping || 5.99;
  const tax = route?.params?.tax || 26.40;
  const total = route?.params?.total || 252.35;

  const shippingAddress = {
    name: 'Juan Dela Cruz',
    address: '123 Mango Street, Barangay Banawa',
    city: 'Cebu City, Cebu 6000',
    phone: '+63 912 345 6789',
  };

  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: 'credit-card', detail: '**** **** **** 1234' },
    { id: 'gcash', name: 'GCash', icon: 'account-balance-wallet', detail: '+63 912 ***' },
    { id: 'cod', name: 'Cash on Delivery', icon: 'local-shipping', detail: 'Pay when you receive' },
  ];

  const handlePlaceOrder = () => {
    const orderData = {
      orderId: 'ORD-' + Date.now().toString().slice(-8),
      items: cartItems,
      subtotal,
      shipping,
      tax,
      total,
      paymentMethod: paymentMethods.find(p => p.id === selectedPayment)?.name,
      shippingAddress,
      orderDate: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
    };
    navigation.navigate('ShopReceipt', { orderData });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />
      
      {/* Header */}
      <LinearGradient colors={[thematicBlue, thematicBlue]} style={[styles.header, { paddingTop: insets.top > 0 ? insets.top : 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Shipping Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <TouchableOpacity>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.addressCard}>
            <View style={styles.addressIcon}>
              <MaterialIcons name="location-on" size={24} color={thematicBlue} />
            </View>
            <View style={styles.addressInfo}>
              <Text style={styles.addressName}>{shippingAddress.name}</Text>
              <Text style={styles.addressText}>{shippingAddress.address}</Text>
              <Text style={styles.addressText}>{shippingAddress.city}</Text>
              <Text style={styles.addressPhone}>{shippingAddress.phone}</Text>
            </View>
          </View>
        </View>

        {/* Order Items Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items ({cartItems.length})</Text>
          <View style={styles.itemsSummaryCard}>
            {cartItems.map((item, index) => (
              <View key={item.id} style={[styles.itemRow, index < cartItems.length - 1 && styles.itemBorder]}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQty}>x{item.quantity}</Text>
                <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentCard,
                selectedPayment === method.id && styles.paymentCardSelected,
              ]}
              onPress={() => setSelectedPayment(method.id)}>
              <View style={styles.paymentIcon}>
                <MaterialIcons name={method.icon} size={24} color={thematicBlue} />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentName}>{method.name}</Text>
                <Text style={styles.paymentDetail}>{method.detail}</Text>
              </View>
              <View style={[
                styles.radioButton,
                selectedPayment === method.id && styles.radioButtonSelected,
              ]}>
                {selectedPayment === method.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping Fee</Text>
              <Text style={styles.summaryValue}>${shipping.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax (12%)</Text>
              <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total Payment</Text>
              <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Place Order Button */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
        <View style={styles.totalRow}>
          <Text style={styles.bottomTotalLabel}>Total:</Text>
          <Text style={styles.bottomTotalValue}>${total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.placeOrderButton} onPress={handlePlaceOrder}>
          <MaterialIcons name="lock" size={20} color={Colors.white} />
          <Text style={styles.placeOrderText}>Place Order</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: thematicBlue,
    marginBottom: 15,
  },
  editButton: {
    fontSize: 14,
    color: thematicBlue,
    fontWeight: '600',
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
  addressIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#F2F2F7',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addressInfo: {
    flex: 1,
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
  itemsSummaryCard: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: thematicBlue,
  },
  itemQty: {
    fontSize: 14,
    color: thematicBlue,
    opacity: 0.7,
    marginHorizontal: 15,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: thematicBlue,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentCardSelected: {
    borderColor: thematicBlue,
    backgroundColor: 'rgba(10, 86, 167, 0.05)',
  },
  paymentIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#F2F2F7',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 16,
    fontWeight: '600',
    color: thematicBlue,
    marginBottom: 2,
  },
  paymentDetail: {
    fontSize: 13,
    color: thematicBlue,
    opacity: 0.7,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: thematicBlue,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: thematicBlue,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: thematicBlue,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 14,
    color: thematicBlue,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: thematicBlue,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: thematicBlue,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  totalRow: {
    flex: 1,
  },
  bottomTotalLabel: {
    fontSize: 12,
    color: thematicBlue,
    opacity: 0.7,
  },
  bottomTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: thematicBlue,
  },
  placeOrderButton: {
    backgroundColor: thematicBlue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  placeOrderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    marginLeft: 8,
  },
});

export default CheckoutScreen;
