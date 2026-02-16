import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

const HelpSupportScreen = ({ navigation }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const faqs = [
    {
      question: 'How do I find pickleball courts near me?',
      answer: 'Use the "Find Courts" tab to search for courts in your area. You can filter by distance, amenities, and rating.',
      icon: 'search',
    },
    {
      question: 'How do I book a court?',
      answer: 'Click on a court in the search results, then tap "Book Court" to reserve your time slot.',
      icon: 'calendar',
    },
    {
      question: 'Can I cancel a booking?',
      answer: 'Yes, you can cancel up to 24 hours before your scheduled time. Visit your bookings and select cancel.',
      icon: 'trash',
    },
    {
      question: 'How do I join a game?',
      answer: 'Look for open games in the "Find Courts" tab and request to join. The organizer will approve your request.',
      icon: 'people',
    },
    {
      question: 'What is the cancellation policy?',
      answer: 'Cancellations made 24+ hours before the booking have no fee. Cancellations within 24 hours may incur a fee.',
      icon: 'information',
    },
  ];

  const contactOptions = [
    {
      icon: 'mail',
      title: 'Email Support',
      description: 'support@pickleplay.ph',
      action: () => Linking.openURL('mailto:support@pickleplay.ph'),
    },
    {
      icon: 'call',
      title: 'Call Us',
      description: '+63 (2) 1234-5678',
      action: () => Linking.openURL('tel:+6321234567'),
    },
    {
      icon: 'chatbubble',
      title: 'Live Chat',
      description: 'Chat with our support team',
      action: () => Alert.alert('Live Chat', 'Live chat will open shortly. Coming soon!'),
    },
  ];

  const FAQ = ({ index, question, answer, icon }) => (
    <TouchableOpacity
      style={styles.faqCard}
      onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
      activeOpacity={0.7}
    >
      <View style={styles.faqHeader}>
        <View style={styles.faqIconContainer}>
          <Ionicons name={icon} size={20} color={Colors.lime400} />
        </View>
        <Text style={styles.faqQuestion} numberOfLines={2}>
          {question}
        </Text>
        <Ionicons
          name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.slate500}
        />
      </View>
      {expandedIndex === index && (
        <View style={styles.faqAnswerContainer}>
          <Text style={styles.faqAnswer}>{answer}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const ContactCard = ({ icon, title, description, action }) => (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={action}
      activeOpacity={0.8}
    >
      <View style={styles.contactIconContainer}>
        <Ionicons name={icon} size={24} color={Colors.white} />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactTitle}>{title}</Text>
        <Text style={styles.contactDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.slate400} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[Colors.slate950, Colors.slate900]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Contact Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="headset-sharp" size={24} color={Colors.lime400} />
            <Text style={styles.sectionTitle}>Quick Contact</Text>
          </View>

          {contactOptions.map((option, index) => (
            <ContactCard
              key={index}
              icon={option.icon}
              title={option.title}
              description={option.description}
              action={option.action}
            />
          ))}
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle-sharp" size={24} color={Colors.lime400} />
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          </View>

          {faqs.map((faq, index) => (
            <FAQ
              key={index}
              index={index}
              question={faq.question}
              answer={faq.answer}
              icon={faq.icon}
            />
          ))}
        </View>

        {/* Resources Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="book-sharp" size={24} color={Colors.lime400} />
            <Text style={styles.sectionTitle}>Resources</Text>
          </View>

          <TouchableOpacity style={styles.resourceCard} activeOpacity={0.8}>
            <View style={styles.resourceIconContainer}>
              <Ionicons name="document" size={20} color={Colors.white} />
            </View>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>User Guide</Text>
              <Text style={styles.resourceDescription}>Learn how to use PicklePlay</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.slate400} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.resourceCard} activeOpacity={0.8}>
            <View style={styles.resourceIconContainer}>
              <Ionicons name="shield-checkmark" size={20} color={Colors.white} />
            </View>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Terms & Conditions</Text>
              <Text style={styles.resourceDescription}>Read our terms of service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.slate400} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.resourceCard} activeOpacity={0.8}>
            <View style={styles.resourceIconContainer}>
              <Ionicons name="lock-closed" size={20} color={Colors.white} />
            </View>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Privacy Policy</Text>
              <Text style={styles.resourceDescription}>How we protect your data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.slate400} />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={Colors.lime400} />
            <Text style={styles.infoText}>
              PicklePlay v1.0.0 • Build 2024.01 • © 2024 All rights reserved
            </Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    marginLeft: 10,
    letterSpacing: -0.5,
  },
  contactCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.lime400,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: -0.3,
  },
  contactDescription: {
    fontSize: 13,
    color: Colors.slate600,
    marginTop: 2,
  },
  faqCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  faqIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.lime400 + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate950,
    marginRight: 8,
    letterSpacing: -0.2,
  },
  faqAnswerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopColor: Colors.slate100,
    borderTopWidth: 1,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.slate600,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  resourceCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  resourceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: Colors.slate950,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: -0.3,
  },
  resourceDescription: {
    fontSize: 13,
    color: Colors.slate600,
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: Colors.lime400 + '10',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: Colors.lime400,
  },
  infoText: {
    fontSize: 13,
    color: Colors.slate600,
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
  },
});

export default HelpSupportScreen;
