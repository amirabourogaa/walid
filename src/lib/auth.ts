import { User } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private currentSession: Session | null = null;
  
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async initialize(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        this.currentSession = session;
        await this.loadUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  }

  private async loadUserProfile(userId: string): Promise<void> {
    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        console.error('Profile not found for user:', userId);
        // Sign out if profile doesn't exist (stale session)
        await this.logout();
        return;
      }

      // Fetch user role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) throw roleError;
      if (!roleData) {
        console.error('Role not found for user:', userId);
        // Sign out if role doesn't exist (data inconsistency)
        await this.logout();
        return;
      }

      this.currentUser = {
        id: profileData.id,
        email: profileData.email,
        firstName: profileData.first_name,
        lastName: profileData.last_name,
        role: roleData.role as 'admin' | 'manager' | 'employee' | 'client',
        status: profileData.status as 'active' | 'inactive',
        phone: profileData.phone,
        department: profileData.department,
        createdAt: new Date(profileData.created_at),
        updatedAt: new Date(profileData.updated_at)
      };
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    if (!data.session) throw new Error('No session returned');

    this.currentSession = data.session;
    await this.loadUserProfile(data.user.id);
    
    if (!this.currentUser) {
      throw new Error('User profile not found');
    }
    
    return this.currentUser;
  }

  async signup(
    email: string, 
    password: string, 
    metadata: { firstName: string; lastName: string; role: string }
  ): Promise<void> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          first_name: metadata.firstName,
          last_name: metadata.lastName,
          role: metadata.role
        }
      }
    });

    if (error) throw error;
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
    this.currentUser = null;
    this.currentSession = null;
  }

  isAuthenticated(): boolean {
    return !!this.currentSession && !!this.currentUser;
  }

  isManager(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin' || user?.role === 'manager' || user?.role === 'employee';
  }

  isClient(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'client';
  }
}

export type { User };
export const authService = AuthService.getInstance();
