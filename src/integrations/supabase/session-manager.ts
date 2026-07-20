/**
 * Session Manager Service
 *
 * Handles user session management including inactivity logout and session validation.
 */

import { supabase } from "@/integrations/supabase/client";

export class SessionManager {
  /**
   * Log out the user due to inactivity
   */
  static async logoutDueToInactivity(): Promise<void> {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error during inactivity logout:", error);
      }

      // Clear session storage
      SessionManager.clearSessionData();

      // Show notification and redirect (will be handled by beforeLoad redirect)
      console.log("User logged out due to inactivity");
    } catch (error) {
      console.error("Failed to logout due to inactivity:", error);
      // Force redirect anyway
      SessionManager.clearSessionData();
    }
  }

  /**
   * Manually log out the user
   */
  static async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
      SessionManager.clearSessionData();
    } catch (error) {
      console.error("Error logging out:", error);
      SessionManager.clearSessionData();
    }
  }

  /**
   * Check if user session is still valid
   */
  static async isSessionValid(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.getSession();
      return !error && !!data.session;
    } catch (error) {
      console.error("Error checking session validity:", error);
      return false;
    }
  }

  /**
   * Get current session user
   */
  static async getCurrentUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        return null;
      }
      return data.user;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  /**
   * Clear session-related data
   */
  private static clearSessionData(): void {
    // Clear any cached session data if needed
    // The Supabase client handles session storage internally
  }
}
