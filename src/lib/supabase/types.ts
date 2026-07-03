export type UserRole =
  | 'super_admin'
  | 'tenant_admin'
  | 'manager'
  | 'technician'
  | 'viewer';

/** Shape returned by profiles table queries — used for explicit casting. */
export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  tenant_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: UserRole;
          tenant_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: UserRole;
          tenant_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: UserRole;
          tenant_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          is_active: boolean;
          isActive: boolean;
          plan: string;
          reportConfig: string | null;
          google_review_url: string | null;
          survey_message: string | null;
          mfa_required: boolean;
          membershipType: string;
          membershipExpiresAt: string | null;
          maxUsers: number;
          deletedAt: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          is_active?: boolean;
          isActive?: boolean;
          plan?: string;
          reportConfig?: string | null;
          google_review_url?: string | null;
          survey_message?: string | null;
          mfa_required?: boolean;
          membershipType?: string;
          membershipExpiresAt?: string | null;
          maxUsers?: number;
          deletedAt?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          is_active?: boolean;
          isActive?: boolean;
          plan?: string;
          reportConfig?: string | null;
          google_review_url?: string | null;
          survey_message?: string | null;
          mfa_required?: boolean;
          membershipType?: string;
          membershipExpiresAt?: string | null;
          maxUsers?: number;
          deletedAt?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
