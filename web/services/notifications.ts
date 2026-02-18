import { supabase } from './supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: 'match_request' | 'match_accepted' | 'match_declined' | 'new_message' | 
        'partner_review' | 'partner_endorsement' | 'group_message' | 'group_invite' | 
        'event_reminder' | 'booking_reminder' | 'system';
  title: string;
  message?: string;
  related_user_id?: string;
  related_match_request_id?: string;
  related_conversation_id?: string;
  related_message_id?: string;
  related_group_id?: string;
  related_event_id?: string;
  action_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  expires_at?: string;
}

export interface NotificationPreferences {
  user_id: string;
  email_match_requests: boolean;
  email_messages: boolean;
  email_reviews: boolean;
  email_events: boolean;
  push_match_requests: boolean;
  push_messages: boolean;
  push_reviews: boolean;
  push_events: boolean;
  inapp_match_requests: boolean;
  inapp_messages: boolean;
  inapp_reviews: boolean;
  inapp_events: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  daily_digest: boolean;
  weekly_digest: boolean;
  updated_at: string;
}

/**
 * Get all notifications for the current user
 */
export const getUserNotifications = async (limit = 50) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Notification[];
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async () => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .rpc('get_unread_notification_count', { target_user_id: user.user.id });

  if (error) throw error;
  return data as number;
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) throw error;
  return data as Notification;
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async () => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false);

  if (error) throw error;
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
};

/**
 * Get user notification preferences
 */
export const getNotificationPreferences = async () => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.user.id)
    .single();

  // If no preferences exist, create default ones
  if (error && error.code === 'PGRST116') {
    return await createDefaultNotificationPreferences();
  }

  if (error) throw error;
  return data as NotificationPreferences;
};

/**
 * Create default notification preferences
 */
const createDefaultNotificationPreferences = async () => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notification_preferences')
    .insert({
      user_id: user.user.id
    })
    .select()
    .single();

  if (error) throw error;
  return data as NotificationPreferences;
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (
  preferences: Partial<Omit<NotificationPreferences, 'user_id' | 'updated_at'>>
) => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notification_preferences')
    .update(preferences)
    .eq('user_id', user.user.id)
    .select()
    .single();

  if (error) throw error;
  return data as NotificationPreferences;
};

/**
 * Subscribe to real-time notifications
 */
export const subscribeToNotifications = (
  callback: (notification: Notification) => void
) => {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      (payload) => {
        callback(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
};
