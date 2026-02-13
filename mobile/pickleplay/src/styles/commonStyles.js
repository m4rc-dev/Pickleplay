import { StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

/**
 * Common reusable styles for PicklePlay Mobile
 * Web-inspired design system
 */

export const commonStyles = StyleSheet.create({
  // ==================== CONTAINERS ====================
  pageContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  
  scrollContainer: {
    flex: 1,
  },
  
  contentPadding: {
    paddingHorizontal: 20,
  },
  
  // ==================== HEADERS ====================
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  
  headerLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.blue600,
    letterSpacing: 3,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  
  headerTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -2,
    lineHeight: 40,
  },
  
  headerTitleAccent: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -2,
    marginBottom: 20,
    lineHeight: 40,
  },
  
  sectionHeader: {
    marginBottom: 16,
  },
  
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.blue600,
    letterSpacing: 3,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  
  sectionTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -1,
    marginBottom: 12,
  },
  
  // ==================== CARDS ====================
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    shadowColor: Colors.slate950,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  
  cardCompact: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    shadowColor: Colors.slate950,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  
  cardDescription: {
    fontSize: 14,
    color: Colors.slate600,
    lineHeight: 20,
  },
  
  // ==================== BUTTONS ====================
  primaryButton: {
    backgroundColor: Colors.lime400,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.lime400,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: 0.5,
  },
  
  secondaryButton: {
    backgroundColor: Colors.slate100,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: 0.5,
  },
  
  outlineButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.slate200,
  },
  
  outlineButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: 0.5,
  },
  
  // ==================== ICON BUTTONS ====================
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  iconButtonSmall: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // ==================== BADGES ====================
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  
  badgePrimary: {
    backgroundColor: Colors.lime400,
  },
  
  badgePrimaryText: {
    color: Colors.slate950,
  },
  
  badgeSecondary: {
    backgroundColor: Colors.slate100,
  },
  
  badgeSecondaryText: {
    color: Colors.slate700,
  },
  
  // ==================== LIST ITEMS ====================
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 16,
  },
  
  listItemIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  listItemContent: {
    flex: 1,
  },
  
  listItemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  
  listItemSubtitle: {
    fontSize: 14,
    color: Colors.slate600,
  },
  
  // ==================== DIVIDERS ====================
  divider: {
    height: 1,
    backgroundColor: Colors.slate100,
    marginVertical: 16,
  },
  
  dividerThick: {
    height: 8,
    backgroundColor: Colors.slate50,
    marginVertical: 24,
  },
  
  // ==================== TYPOGRAPHY ====================
  h1: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -2,
    lineHeight: 44,
  },
  
  h2: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -1.5,
    lineHeight: 36,
  },
  
  h3: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: -1,
    lineHeight: 28,
  },
  
  h4: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  
  bodyLarge: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.slate700,
    lineHeight: 24,
  },
  
  body: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.slate600,
    lineHeight: 22,
  },
  
  bodySmall: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.slate500,
    lineHeight: 18,
  },
  
  caption: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.slate400,
    letterSpacing: 0.5,
  },
  
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.slate600,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  
  // ==================== LOADING STATES ====================
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.slate600,
  },
  
  // ==================== EMPTY STATES ====================
  emptyContainer: {
    paddingVertical: 80,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.slate700,
    marginBottom: 4,
    textAlign: 'center',
  },
  
  emptySubtext: {
    fontSize: 14,
    color: Colors.slate500,
    textAlign: 'center',
  },
  
  // ==================== INPUTS ====================
  input: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.slate200,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.slate950,
  },
  
  inputFocused: {
    borderColor: Colors.lime400,
  },
  
  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.slate700,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  
  inputError: {
    borderColor: Colors.error,
  },
  
  inputErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
    marginTop: 6,
  },
  
  // ==================== SPACING ====================
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt20: { marginTop: 20 },
  mt24: { marginTop: 24 },
  mt32: { marginTop: 32 },
  
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mb20: { marginBottom: 20 },
  mb24: { marginBottom: 24 },
  mb32: { marginBottom: 32 },
  
  mx20: { marginHorizontal: 20 },
  my16: { marginVertical: 16 },
  my20: { marginVertical: 20 },
  
  p16: { padding: 16 },
  p20: { padding: 20 },
  p24: { padding: 24 },
  
  // ==================== FLEX ====================
  row: {
    flexDirection: 'row',
  },
  
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  flex1: {
    flex: 1,
  },
});

export default commonStyles;
