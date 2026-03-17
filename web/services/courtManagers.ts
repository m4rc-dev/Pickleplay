import { supabase } from './supabase';
import type { CourtManagerAssignment, UserRole } from '../types';

export interface CourtManagerInvitePayload {
  courtId: string;
  fullName: string;
  email: string;
  contactNumber: string;
}

export interface CourtManagerInviteResponse {
  success: boolean;
  assignment: CourtManagerAssignment;
  inviteLink?: string;
  expiresAt?: string;
}

export interface CourtManagerInviteDetails {
  assignmentId: string;
  courtId: string;
  courtName: string;
  managerEmail: string;
  managerName: string;
  expiresAt: string;
  status: CourtManagerAssignment['status'];
  existingAccount: boolean;
}

export interface CourtManagerRegistrationPayload {
  token: string;
  fullName: string;
  email: string;
  contactNumber: string;
  password: string;
}

export interface CourtManagerContext {
  assignment: CourtManagerAssignment;
  court: {
    id: string;
    name: string;
    owner_id: string;
    location_id?: string | null;
  };
}

export interface PendingCourtManagerContext {
  assignment: CourtManagerAssignment;
  court: {
    id: string;
    name: string;
    owner_id: string;
    location_id?: string | null;
  };
}

export type CourtManagerLoginState = 'none' | 'pending_invite_registration' | 'pending_owner_approval';

export interface CourtManagerLoginStateResponse {
  state: CourtManagerLoginState;
  restoredLoginAccess?: boolean;
}

export type CourtManagerBookingAction = 'confirm' | 'cancel' | 'check_in' | 'check_out' | 'no_show';

const getServerBaseUrl = () => {
  if (import.meta.env.DEV) {
    return '';
  }

  const serverUrl = import.meta.env.VITE_SERVER_URL?.trim();
  return serverUrl || '';
};

const getAccessToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
};

const requestJson = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${getServerBaseUrl()}${path}`, init);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }

  return payload as T;
};

export const assignCourtManager = async (payload: CourtManagerInvitePayload) => {
  const accessToken = await getAccessToken();

  return requestJson<CourtManagerInviteResponse>(
    '/api/court-managers/invite',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }
  );
};

export const approveCourtManager = async (assignmentId: string) => {
  const accessToken = await getAccessToken();

  return requestJson<{ success: boolean; assignment: CourtManagerAssignment }>(
    `/api/court-managers/${assignmentId}/approve`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
};

export const removeCourtManager = async (assignmentId: string) => {
  const accessToken = await getAccessToken();

  return requestJson<{ success: boolean; assignment: CourtManagerAssignment }>(
    `/api/court-managers/${assignmentId}/remove`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
};

export const getManagerInviteDetails = async (token: string) => {
  return requestJson<CourtManagerInviteDetails>(
    `/api/court-managers/invite/${encodeURIComponent(token)}`
  );
};

export const registerCourtManager = async (payload: CourtManagerRegistrationPayload) => {
  return requestJson<{ success: boolean }>(
    '/api/court-managers/register',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
};

export const copyCourtManagerInviteLink = async (assignmentId: string) => {
  const accessToken = await getAccessToken();

  return requestJson<CourtManagerInviteResponse>(
    `/api/court-managers/${assignmentId}/copy-link`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
};

export const acceptCourtManagerInvite = async (token: string) => {
  const accessToken = await getAccessToken();

  return requestJson<{ success: boolean; assignment: CourtManagerAssignment; alreadyAccepted?: boolean }>(
    '/api/court-managers/invite/accept',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    }
  );
};

export const getCourtManagerLoginState = async (email: string) => {
  const query = new URLSearchParams({ email });
  return requestJson<CourtManagerLoginStateResponse>(
    `/api/court-managers/login-state?${query.toString()}`
  );
};

export const performCourtManagerBookingAction = async (
  bookingId: string,
  action: CourtManagerBookingAction
) => {
  const accessToken = await getAccessToken();

  return requestJson<{ success: boolean; booking: Record<string, unknown> }>(
    `/api/court-managers/bookings/${bookingId}/action`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ action }),
    }
  );
};

export const getCourtManagerAssignments = async (courtIds: string[]) => {
  if (courtIds.length === 0) return [];

  const { data, error } = await supabase
    .from('court_manager_assignments')
    .select('*')
    .in('court_id', courtIds);

  if (error) throw error;
  return (data || []) as CourtManagerAssignment[];
};

export const getCurrentCourtManagerContext = async (): Promise<CourtManagerContext | null> => {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) return null;

  const { data, error } = await supabase
    .from('court_manager_assignments')
    .select(`
      *,
      courts!inner (
        id,
        name,
        owner_id,
        location_id
      )
    `)
    .eq('manager_user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.courts) return null;

  return {
    assignment: data as CourtManagerAssignment,
    court: Array.isArray(data.courts) ? data.courts[0] : data.courts,
  };
};

export const getCurrentPendingCourtManagerContext = async (): Promise<PendingCourtManagerContext | null> => {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) return null;

  const { data, error } = await supabase
    .from('court_manager_assignments')
    .select(`
      *,
      courts!inner (
        id,
        name,
        owner_id,
        location_id
      )
    `)
    .eq('manager_user_id', userId)
    .eq('status', 'pending_approval')
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.courts) return null;

  return {
    assignment: data as CourtManagerAssignment,
    court: Array.isArray(data.courts) ? data.courts[0] : data.courts,
  };
};

export const getCurrentActiveRole = async (): Promise<UserRole> => {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    const localRole = localStorage.getItem('active_role') as UserRole | null;
    return localRole || 'guest';
  }

  const { data } = await supabase
    .from('profiles')
    .select('active_role')
    .eq('id', userId)
    .maybeSingle();

  return ((data?.active_role as UserRole | undefined) || (localStorage.getItem('active_role') as UserRole | null) || 'PLAYER');
};
