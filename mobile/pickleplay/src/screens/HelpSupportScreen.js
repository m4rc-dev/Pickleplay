import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {MaterialIcons} from '@expo/vector-icons';
import Colors from '../constants/Colors';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

const HelpSupportScreen = ({ navigation }) => {
  const faqs = [
    {
      question: 'How do I find pickleball courts near me?',
      answer: 'Use the "Find Courts" tab to search for courts in your area. You can filter by distance, amenities, and rating.',
    },
    {
      question: 'How do I book a court?',
      answer: 'Click on a court in the search results, then tap "Book Court" to reserve your time slot.',
    },
    {
      question: 'Can I cancel a booking?',
      answer: 'Yes, you can cancel up to 24 hours before your scheduled time. Visit your bookings and select cancel.',
    },
    {
      question: 'How do I join a game?',
      answer: 'Look for open games in the "Find Courts" tab and request to join. The organizer will approve your request.',
    },
    {
      question: 'Is there a cancellation fee?',
      answer: 'Cancellations made 24+ hours before the booking have no fee. Cancellations within 24 hours may incur a fee.',
    },
  ];

  const [expandedIndex, setExpandedIndex] = React.useState(null);

  const FAQItem = ({ index, question, answer }) => (
    <TouchableOpacity 
      style={styles.faqItem}
      onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
    >
      <View style={styles.faqQuestion}>
        <MaterialIcons 
          name={expandedIndex === index ? 'expand-less' : 'expand-more'} 
          size={24} 
          color={thematicBlue} 
        />
        <Text style={styles.faqQuestionText}>{question}</Text>
      </View>
      {expandedIndex === index && (
        <Text style={styles.faqAnswer}>{answer}</Text>
      )}
    </TouchableOpacity>
  );

  const ContactItem = ({ icon, title, description, onPress }) => (
    <TouchableOpacity style={styles.contactItem} onPress={onPress}>
      <View style={styles.contactIconContainer}>
        <MaterialIcons name={icon} size={24} color={Colors.white} />
      </View>
      <View style={styles.contactContent}>
        <Text style={styles.contactTitle}>{title}</Text>
        <Text style={styles.contactDescription}>{description}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={Colors.border} />
    </TouchableOpacity>
  );

  const handleEmail = () => {
    Linking.openURL('mailto:support@pickleplay.com');
  };

  const handlePhone = () => {
    Linking.openURL('tel:+1-800-PICKLE-1');
  };

  const handleLiveChat = () => {
    Alert.alert('Live Chat', 'Live chat will open shortly. Coming soon!', [{ text: 'OK' }]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get Help</Text>
          <ContactItem
            icon="email"
            title="Email Support"
            description="support@pickleplay.com"
            onPress={handleEmail}
          />
          <ContactItem
            icon="phone"
            title="Call Us"
            description="+1-800-PICKLE-1"
            onPress={handlePhone}
          />
          <ContactItem
            icon="chat"
            title="Live Chat"
            description="Chat with our support team"
            onPress={handleLiveChat}
          />
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              index={index}
              question={faq.question}
              answer={faq.answer}
            />
          ))}
        </View>

        {/* Resources Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources</Text>
          <TouchableOpacity style={styles.resourceItem}>
            <MaterialIcons name="description" size={24} color={thematicBlue} />
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>User Guide</Text>
              <Text style={styles.resourceDescription}>Learn how to use PicklePlay</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.border} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.resourceItem}>
            <MaterialIcons name="gavel" size={24} color={thematicBlue} />
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Terms of Service</Text>
              <Text style={styles.resourceDescription}>Read our terms and conditions</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.border} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.resourceItem}>
            <MaterialIcons name="privacy-tip" size={24} color={thematicBlue} />
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Privacy Policy</Text>
              <Text style={styles.resourceDescription}>View our privacy policy</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.border} />
          </TouchableOpacity>
        </View>

        {/* Support Status */}
        <View style={styles.statusBox}>
          <MaterialIcons name="check-circle" size={20} color={activeColor} />
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>Support Status</Text>
            <Text style={styles.statusText}>We typically respond within 2-4 hours</Text>
          </View>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: thematicBlue,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingBottom: 10,
  },
  section: {
    paddingHorizontal: 15,
    marginVertical: 10,
  },
  sectionTitle: {
    color: thematicBlue,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: thematicBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  contactDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  faqItem: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestionText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  faqAnswer: {
    color: Colors.textSecondary,
    fontSize: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
    lineHeight: 20,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  resourceContent: {
    flex: 1,
    marginLeft: 12,
  },
  resourceTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  resourceDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  statusBox: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    margin: 15,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: activeColor,
    alignItems: 'center',
  },
  statusContent: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  statusText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
});

export default HelpSupportScreen;
