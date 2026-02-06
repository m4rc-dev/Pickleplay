import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');
const thematicBlue = '#0A56A7';
const activeColor = '#0A56A7';

const PlayerProfileCard = ({ player }) => {
  // Default player data structure
  const {
    avatarUrl = 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200',
    playerName = 'Player Name',
    username = 'username',
    skillLevel = 'Intermediate',
    rating = 4.5,
    rank = 'Gold',
    roles = ['Singles', 'Doubles'],
    stats = {
      matches: 156,
      wins: 98,
      winRate: 62.8,
      aces: 45,
      tournaments: 8,
      mvp: 12,
    },
    badges = [
      { name: 'Top 10 Manila', icon: 'emoji-events' },
      { name: 'Tournament Winner', icon: 'workspace-premium' },
    ],
    favoritePartners = [],
  } = player || {};

  const getRankColor = (rank) => {
    switch (rank?.toLowerCase()) {
      case 'bronze': return ['#CD7F32', '#8B4513'];
      case 'silver': return ['#C0C0C0', '#808080'];
      case 'gold': return ['#FFD700', '#FFA500'];
      case 'platinum': return ['#E5E4E2', '#A0B2C6'];
      case 'diamond': return ['#B9F2FF', '#00CED1'];
      case 'master': return ['#9B30FF', '#4B0082'];
      default: return ['#667eea', '#764ba2'];
    }
  };

  const getRankIcon = (rank) => {
    switch (rank?.toLowerCase()) {
      case 'bronze': return 'shield';
      case 'silver': return 'shield';
      case 'gold': return 'shield';
      case 'platinum': return 'diamond';
      case 'diamond': return 'diamond';
      case 'master': return 'crown';
      default: return 'shield';
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[thematicBlue, '#2bb38a', '#2fb922']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      >
        {/* Decorative Elements */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        
        {/* Header Section */}
        <View style={styles.headerSection}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <View style={styles.onlineIndicator} />
          </View>

          {/* Player Info */}
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{playerName}</Text>
            <Text style={styles.username}>@{username}</Text>
            
            {/* Roles */}
            <View style={styles.rolesContainer}>
              {roles.map((role, index) => (
                <View key={index} style={styles.roleTag}>
                  <Text style={styles.roleText}>{role}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Rank Badge */}
          <View style={styles.rankContainer}>
            <LinearGradient
              colors={getRankColor(rank)}
              style={styles.rankBadge}
            >
              <MaterialCommunityIcons 
                name={getRankIcon(rank)} 
                size={24} 
                color="#fff" 
              />
            </LinearGradient>
            <Text style={styles.rankText}>{rank}</Text>
            <View style={styles.ratingRow}>
              <MaterialIcons name="star" size={14} color={activeColor} />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.matches}</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.wins}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: activeColor }]}>{stats.winRate}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.aces}</Text>
              <Text style={styles.statLabel}>Aces</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.tournaments}</Text>
              <Text style={styles.statLabel}>Tournaments</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#d81818' }]}>{stats.mvp}</Text>
              <Text style={styles.statLabel}>MVP</Text>
            </View>
          </View>
        </View>

        {/* Skill Level Bar */}
        <View style={styles.skillSection}>
          <View style={styles.skillHeader}>
            <Text style={styles.skillLabel}>SKILL LEVEL</Text>
            <Text style={styles.skillValue}>{skillLevel}</Text>
          </View>
          <View style={styles.skillBarContainer}>
            <LinearGradient
              colors={[activeColor, '#7CFC00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.skillBarFill, { width: `${getSkillPercentage(skillLevel)}%` }]}
            />
          </View>
        </View>

        {/* Badges Section */}
        {badges.length > 0 && (
          <View style={styles.badgesSection}>
            <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
            <View style={styles.badgesContainer}>
              {badges.map((badge, index) => (
                <View key={index} style={styles.badgeItem}>
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.badgeIcon}
                  >
                    <MaterialIcons name={badge.icon} size={18} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Favorite Partners */}
        {favoritePartners.length > 0 && (
          <View style={styles.partnersSection}>
            <Text style={styles.sectionTitle}>TOP PARTNERS</Text>
            <View style={styles.partnersContainer}>
              {favoritePartners.slice(0, 4).map((partner, index) => (
                <View key={index} style={styles.partnerAvatar}>
                  <Image source={{ uri: partner.avatarUrl }} style={styles.partnerImage} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer Stats */}
        <View style={styles.footerStats}>
          <View style={styles.footerStatItem}>
            <MaterialIcons name="sports-tennis" size={16} color={activeColor} />
            <Text style={styles.footerStatText}>Power: {calculatePower(stats)}</Text>
          </View>
          <View style={styles.footerStatItem}>
            <MaterialIcons name="trending-up" size={16} color={activeColor} />
            <Text style={styles.footerStatText}>Streak: 5W</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

// Helper functions
const getSkillPercentage = (level) => {
  switch (level?.toLowerCase()) {
    case 'beginner': return 20;
    case 'intermediate': return 45;
    case 'advanced': return 70;
    case 'expert': return 85;
    case 'pro': return 100;
    default: return 50;
  }
};

const calculatePower = (stats) => {
  return Math.round((stats.wins * 10 + stats.mvp * 50 + stats.tournaments * 100) / 10);
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  backgroundGradient: {
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  
  // Header Section
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00FF00',
    borderWidth: 2,
    borderColor: '#fff',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 14,
    marginTop: 4,
  },
  playerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  username: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  roleTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Rank Badge
  rankContainer: {
    alignItems: 'center',
  },
  rankBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 2,
  },

  // Stats Section
  statsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginVertical: 6,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Skill Section
  skillSection: {
    marginBottom: 16,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skillLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },
  skillValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  skillBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  skillBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Badges Section
  badgesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
  },
  badgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    maxWidth: 100,
  },

  // Partners Section
  partnersSection: {
    marginBottom: 16,
  },
  partnersContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  partnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    overflow: 'hidden',
  },
  partnerImage: {
    width: '100%',
    height: '100%',
  },

  // Footer Stats
  footerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 12,
    marginTop: 4,
  },
  footerStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});

export default PlayerProfileCard;
