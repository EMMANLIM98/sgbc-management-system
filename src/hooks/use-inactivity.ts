/**
 * Inactivity Detection Hook
 *
 * Tracks user activity and triggers a callback after a period of inactivity.
 * Resets the timer on user interaction (mouse, keyboard, touch).
 */

import { useEffect, useRef, useCallback } from "react";

export interface UseInactivityOptions {
  timeoutMs: number; // Time in milliseconds before inactivity callback is triggered
  onInactivity: () => void; // Callback when inactivity timeout is reached
  enabled?: boolean; // Whether to enable inactivity detection
}

export function useInactivity({ timeoutMs, onInactivity, enabled = true }: UseInactivityOptions) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isActiveRef = useRef(true);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    isActiveRef.current = true;

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      isActiveRef.current = false;
      onInactivity();
    }, timeoutMs);
  }, [timeoutMs, onInactivity, enabled]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Define event handlers
    const handleActivity = () => {
      resetTimer();
    };

    // Activity events to track
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "focus",
    ];

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, resetTimer]);

  // Return functions to manually control inactivity state
  return {
    resetTimer,
    isActive: () => isActiveRef.current,
  };
}
