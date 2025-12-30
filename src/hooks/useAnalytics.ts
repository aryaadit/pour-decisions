import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/integrations/supabase/types';

type JsonRecord = { [key: string]: Json };

interface AnalyticsEvent {
  user_id: string | null;
  session_id: string;
  event_name: string;
  event_category: string;
  properties: JsonRecord;
  device_info: JsonRecord;
}

const SESSION_KEY = 'analytics_session_id';
const QUEUE_KEY = 'analytics_queue';
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 30000; // 30 seconds

function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function getDeviceInfo(): JsonRecord {
  return {
    platform: navigator.platform || 'unknown',
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function getQueuedEvents(): AnalyticsEvent[] {
  try {
    const queue = localStorage.getItem(QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
}

function saveQueuedEvents(events: AnalyticsEvent[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(events));
  } catch {
    // Storage might be full, clear old events
    localStorage.removeItem(QUEUE_KEY);
  }
}

export function useAnalytics() {
  const { user } = useAuth();
  const queueRef = useRef<AnalyticsEvent[]>(getQueuedEvents());
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const deviceInfoRef = useRef<JsonRecord | null>(null);
  const pageStartTimeRef = useRef<number>(Date.now());

  // Get device info once
  useEffect(() => {
    deviceInfoRef.current = getDeviceInfo();
  }, []);

  const flush = useCallback(async () => {
    if (queueRef.current.length === 0) return;

    const eventsToSend = [...queueRef.current];
    queueRef.current = [];
    saveQueuedEvents([]);

    try {
      const { error } = await supabase
        .from('analytics_events')
        .insert(eventsToSend);

      if (error) {
        console.error('Failed to send analytics:', error);
        // Re-queue failed events
        queueRef.current = [...eventsToSend, ...queueRef.current];
        saveQueuedEvents(queueRef.current);
      }
    } catch (err) {
      console.error('Analytics error:', err);
      // Re-queue on network failure
      queueRef.current = [...eventsToSend, ...queueRef.current];
      saveQueuedEvents(queueRef.current);
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    flushTimeoutRef.current = setTimeout(flush, FLUSH_INTERVAL);
  }, [flush]);

  const queueEvent = useCallback((event: AnalyticsEvent) => {
    queueRef.current.push(event);
    saveQueuedEvents(queueRef.current);

    if (queueRef.current.length >= BATCH_SIZE) {
      flush();
    } else {
      scheduleFlush();
    }
  }, [flush, scheduleFlush]);

  const trackEvent = useCallback((
    eventName: string,
    category: 'action' | 'page_view' | 'error' | 'engagement',
    properties: JsonRecord = {}
  ) => {
    const event: AnalyticsEvent = {
      user_id: user?.id || null,
      session_id: getOrCreateSessionId(),
      event_name: eventName,
      event_category: category,
      properties,
      device_info: deviceInfoRef.current || getDeviceInfo(),
    };

    queueEvent(event);
  }, [user?.id, queueEvent]);

  const trackPageView = useCallback((pageName: string, properties: JsonRecord = {}) => {
    // Track time spent on previous page
    const timeSpent = Math.round((Date.now() - pageStartTimeRef.current) / 1000);
    if (timeSpent > 1) {
      trackEvent('page_time', 'engagement', {
        duration_seconds: timeSpent,
        ...properties,
      });
    }
    
    pageStartTimeRef.current = Date.now();
    trackEvent('page_view', 'page_view', { page: pageName, ...properties });
  }, [trackEvent]);

  const trackError = useCallback((
    errorMessage: string,
    context: JsonRecord = {}
  ) => {
    trackEvent('error', 'error', {
      message: errorMessage,
      ...context,
    });
  }, [trackEvent]);

  const trackClick = useCallback((
    element: string,
    context: JsonRecord = {}
  ) => {
    trackEvent('click', 'action', {
      element,
      ...context,
    });
  }, [trackEvent]);

  // Flush on unmount or page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Track session end
      const sessionDuration = Math.round((Date.now() - pageStartTimeRef.current) / 1000);
      const event: AnalyticsEvent = {
        user_id: user?.id || null,
        session_id: getOrCreateSessionId(),
        event_name: 'session_end',
        event_category: 'engagement',
        properties: { duration_seconds: sessionDuration },
        device_info: deviceInfoRef.current || getDeviceInfo(),
      };
      queueRef.current.push(event);
      
      // Try to send synchronously using sendBeacon
      const events = queueRef.current;
      if (events.length > 0) {
        // sendBeacon doesn't work with Supabase auth, so just save to localStorage
        saveQueuedEvents(events);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      flush();
    };
  }, [user?.id, flush]);

  return {
    trackEvent,
    trackPageView,
    trackError,
    trackClick,
    flush,
  };
}
