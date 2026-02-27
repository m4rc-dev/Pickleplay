import { supabase } from './supabase';

export interface Squad {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  is_private: boolean;
  is_official: boolean;
  tags: string[];
  wins: number;
  losses: number;
  members_count: number;
  avg_rating: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_member?: boolean;
  slug?: string;
  require_approval?: boolean;
  invite_code?: string;
}

export interface SquadMember {
  id: string;
  squad_id: string;
  user_id: string;
  role: 'OWNER' | 'MEMBER' | 'MODERATOR';
  joined_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

export const squadsService = {
  // Fetch all public squads with search and filter
  async getPublicSquads(
    searchQuery = '',
    tags: string[] = [],
    userId?: string
  ): Promise<Squad[]> {
    let query = supabase
      .from('squads')
      .select('*')
      .eq('is_private', false)
      .order('members_count', { ascending: false });

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Add is_member flag if userId provided
    if (userId && data) {
      const { data: userSquadIds } = await supabase
        .from('squad_members')
        .select('squad_id')
        .eq('user_id', userId);

      const memberSquadIds = new Set(userSquadIds?.map(m => m.squad_id) || []);
      return data.map(squad => ({
        ...squad,
        is_member: memberSquadIds.has(squad.id),
      }));
    }

    return data || [];
  },

  // Fetch user's squads
  async getUserSquads(userId: string): Promise<Squad[]> {
    const { data, error } = await supabase
      .from('squad_members')
      .select('squads(*)')
      .eq('user_id', userId);

    if (error) throw error;
    return (data?.map((m: any) => m.squads).filter(Boolean) || []) as Squad[];
  },

  // Get single squad by ID
  async getSquadById(squadId: string, userId?: string): Promise<Squad | null> {
    const { data, error } = await supabase
      .from('squads')
      .select('*')
      .eq('id', squadId)
      .single();

    if (error) throw error;

    if (data && userId) {
      const { data: member } = await supabase
        .from('squad_members')
        .select('id')
        .eq('squad_id', squadId)
        .eq('user_id', userId)
        .single();

      return { ...data, is_member: !!member };
    }

    return data;
  },

  // Create new squad
  async createSquad(
    name: string,
    description: string,
    imageUrl?: string,
    isPrivate = false
  ): Promise<Squad> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('squads')
      .insert({
        name,
        description,
        image_url: imageUrl,
        is_private: isPrivate,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-add creator as OWNER
    await supabase.from('squad_members').insert({
      squad_id: data.id,
      user_id: user.id,
      role: 'OWNER',
    });

    return { ...data, is_member: true };
  },

  // Update squad
  async updateSquad(squadId: string, updates: Partial<Squad>): Promise<Squad> {
    const { data, error } = await supabase
      .from('squads')
      .update(updates)
      .eq('id', squadId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete squad (owner only)
  async deleteSquad(squadId: string): Promise<void> {
    const { error } = await supabase
      .from('squads')
      .delete()
      .eq('id', squadId);

    if (error) throw error;
  },

  // Join squad
  async joinSquad(squadId: string, userId: string): Promise<SquadMember> {
    const { data, error } = await supabase
      .from('squad_members')
      .insert({
        squad_id: squadId,
        user_id: userId,
        role: 'MEMBER',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Leave squad
  async leaveSquad(squadId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('squad_members')
      .delete()
      .eq('squad_id', squadId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // Get squad members with profile details
  async getSquadMembers(squadId: string): Promise<SquadMember[]> {
    const { data, error } = await supabase
      .from('squad_members')
      .select('*, profiles(id, full_name, avatar_url)')
      .eq('squad_id', squadId)
      .order('role', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Check if user is squad member
  async isSquadMember(squadId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('squad_members')
      .select('id')
      .eq('squad_id', squadId)
      .eq('user_id', userId)
      .single();

    if (error) return false;
    return !!data;
  },

  // Get user's role in squad
  async getUserRoleInSquad(squadId: string, userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('squad_members')
      .select('role')
      .eq('squad_id', squadId)
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return data?.role || null;
  },

  // Update member role (owner only)
  async updateMemberRole(
    squadId: string,
    userId: string,
    role: 'OWNER' | 'MEMBER' | 'MODERATOR'
  ): Promise<void> {
    const { error } = await supabase
      .from('squad_members')
      .update({ role })
      .eq('squad_id', squadId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // Remove member from squad (owner only)
  async removeMember(squadId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('squad_members')
      .delete()
      .eq('squad_id', squadId)
      .eq('user_id', userId);

    if (error) throw error;
  },
};
