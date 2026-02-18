import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase!: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Supabase URL and Service Role Key not configured. Supabase Auth will not work.');
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Verify Supabase JWT token and get user
   */
  async verifyToken(accessToken: string) {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }

    try {
      const { data, error } = await this.supabase.auth.getUser(accessToken);
      
      if (error) {
        console.error('Supabase getUser error:', error);
        throw new Error(`Supabase authentication error: ${error.message || 'Unknown error'}`);
      }
      
      if (!data || !data.user) {
        throw new Error('No user data returned from Supabase');
      }
      
      return data;
    } catch (err) {
      console.error('Error verifying Supabase token:', err);
      throw err;
    }
  }

  /**
   * Get user by Supabase Auth ID (admin method)
   */
  async getUserById(supabaseUserId: string) {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await this.supabase.auth.admin.getUserById(supabaseUserId);
    
    if (error) {
      throw error;
    }
    
    return data;
  }
}

