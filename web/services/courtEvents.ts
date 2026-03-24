import { supabase } from './supabase';
import { CourtEvent, CourtEventType } from '../types';
import { getCurrentActiveRole, getCurrentCourtManagerContext } from './courtManagers';

const getCourtOperationsScope = async () => {
  const role = await getCurrentActiveRole();

  if (role === 'COURT_MANAGER') {
    const context = await getCurrentCourtManagerContext();
    if (!context) throw new Error('No active court manager assignment found');
    return {
      role,
      ownerId: context.court.owner_id,
      assignedCourtId: context.court.id,
    };
  }

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('User not authenticated');

  return {
    role,
    ownerId: userId,
    assignedCourtId: null,
  };
};

/**
 * Create a new court event (maintenance, closure, etc.)
 */
export const createCourtEvent = async (
  courtId: string,
  title: string,
  description: string | undefined,
  startDateTime: string,
  endDateTime: string,
  eventType: CourtEventType,
  blocksBookings: boolean = true,
  color: string = '#ef4444'
) => {
  try {
    const scope = await getCourtOperationsScope();
    if (scope.assignedCourtId && scope.assignedCourtId !== courtId) {
      throw new Error('Court manager can only manage the assigned court');
    }

    const { data, error } = await supabase
      .from('court_events')
      .insert({
        court_id: courtId,
        owner_id: scope.ownerId,
        title,
        description,
        start_datetime: startDateTime,
        end_datetime: endDateTime,
        event_type: eventType,
        blocks_bookings: blocksBookings,
        color
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error creating court event:', err);
    return { data: null, error: err };
  }
};

/**
 * Get all events for a specific court
 */
export const getCourtEvents = async (courtId: string) => {
  try {
    const { data, error } = await supabase
      .from('court_events')
      .select('*')
      .eq('court_id', courtId)
      .order('start_datetime', { ascending: true });

    if (error) throw error;
    return { data: data as CourtEvent[], error: null };
  } catch (err) {
    console.error('Error fetching court events:', err);
    return { data: null, error: err };
  }
};

/**
 * Get all events for the current court owner
 */
export const getOwnerEvents = async () => {
  try {
    const scope = await getCourtOperationsScope();

    let query = supabase
      .from('court_events')
      .select('*')
      .order('start_datetime', { ascending: true });

    query = scope.assignedCourtId
      ? query.eq('court_id', scope.assignedCourtId)
      : query.eq('owner_id', scope.ownerId);

    const { data, error } = await query;

    if (error) throw error;
    return { data: data as CourtEvent[], error: null };
  } catch (err) {
    console.error('Error fetching owner events:', err);
    return { data: null, error: err };
  }
};

/**
 * Get events for a specific court within a date range
 */
export const getCourtEventsInRange = async (
  courtId: string,
  startDate: string, // ISO date string
  endDate: string // ISO date string
) => {
  try {
    const { data, error } = await supabase
      .from('court_events')
      .select('*')
      .eq('court_id', courtId)
      .gte('start_datetime', new Date(startDate).toISOString())
      .lte('end_datetime', new Date(endDate).toISOString())
      .order('start_datetime', { ascending: true });

    if (error) throw error;
    return { data: data as CourtEvent[], error: null };
  } catch (err) {
    console.error('Error fetching court events in range:', err);
    return { data: null, error: err };
  }
};

/**
 * Check if a time slot is blocked for a court
 * Used during booking to prevent conflicts
 */
export const isTimeSlotBlocked = async (
  courtId: string,
  startDateTime: string,
  endDateTime: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('court_events')
      .select('id')
      .eq('court_id', courtId)
      .eq('blocks_bookings', true)
      .lte('start_datetime', endDateTime)
      .gte('end_datetime', startDateTime);

    if (error) throw error;
    return data && data.length > 0;
  } catch (err) {
    console.error('Error checking time slot:', err);
    return false; // Default to allowing booking if check fails
  }
};

/**
 * Get all blocking events for a court
 */
export const getCourtBlockingEvents = async (courtId: string) => {
  try {
    const { data, error } = await supabase
      .from('court_events')
      .select('*')
      .eq('court_id', courtId)
      .eq('blocks_bookings', true)
      .order('start_datetime', { ascending: true });

    if (error) throw error;
    return { data: data as CourtEvent[], error: null };
  } catch (err) {
    console.error('Error fetching blocking events:', err);
    return { data: null, error: err };
  }
};

/**
 * Update a court event
 */
export const updateCourtEvent = async (
  eventId: string,
  updates: {
    title?: string;
    description?: string;
    start_datetime?: string;
    end_datetime?: string;
    event_type?: CourtEventType;
    blocks_bookings?: boolean;
    color?: string;
  }
) => {
  try {
    const scope = await getCourtOperationsScope();
    const { data: currentEvent, error: lookupError } = await supabase
      .from('court_events')
      .select('id, court_id')
      .eq('id', eventId)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!currentEvent) throw new Error('Event not found');
    if (scope.assignedCourtId && currentEvent.court_id !== scope.assignedCourtId) {
      throw new Error('Court manager can only update events for the assigned court');
    }

    const { data, error } = await supabase
      .from('court_events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error updating court event:', err);
    return { data: null, error: err };
  }
};

/**
 * Delete a court event
 */
export const deleteCourtEvent = async (eventId: string) => {
  try {
    const scope = await getCourtOperationsScope();

    const { data: event, error: lookupError } = await supabase
      .from('court_events')
      .select('id, court_id, owner_id')
      .eq('id', eventId)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!event) throw new Error('Event not found');
    if (scope.assignedCourtId && event.court_id !== scope.assignedCourtId) {
      throw new Error('Court manager can only delete events for the assigned court');
    }

    const { error } = await supabase
      .from('court_events')
      .delete()
      .eq('id', eventId)
      .eq('owner_id', scope.ownerId);

    if (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }

    console.log('Event deleted successfully, eventId:', eventId);
    return { error: null, success: true };
  } catch (err) {
    console.error('Error deleting court event:', err);
    return { error: err, success: false };
  }
};

/**
 * Get event color by type for UI consistency
 */
export const getEventColorByType = (eventType: CourtEventType): string => {
  const colorMap: Record<CourtEventType, string> = {
    maintenance: '#ef4444', // red-500
    private_event: '#a855f7', // purple-500
    cleaning: '#3b82f6', // blue-500
    closure: '#dc2626', // red-600
    other: '#6b7280' // gray-500
  };
  return colorMap[eventType] || '#6b7280';
};

export default {
  createCourtEvent,
  getCourtEvents,
  getOwnerEvents,
  getCourtEventsInRange,
  isTimeSlotBlocked,
  getCourtBlockingEvents,
  updateCourtEvent,
  deleteCourtEvent,
  getEventColorByType
};
