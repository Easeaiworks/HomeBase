/**
 * Calendar Tab - Full month calendar with Supabase events
 * Redesigned with blue header
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, shadows, borderRadius } from '../../constants/theme';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface CalendarEvent {
  id: string; title: string; starts_at: string; ends_at: string | null;
  description: string | null; location: string | null; created_by: string;
}

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function formatTime(iso: string) { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }

export default function CalendarScreen() {
  const router = useRouter();
  const { member, household } = useAuthStore();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [newDescription, setNewDescription] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const isToday = (day: number) => day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  const fetchEvents = useCallback(async () => {
    if (!household?.id) return;
    setIsLoading(true);
    try {
      const startDate = new Date(currentYear, currentMonth, 1).toISOString();
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
      const { data, error } = await supabase.from('events')
        .select('id, title, starts_at, ends_at, description, location, created_by')
        .eq('household_id', household.id)
        .gte('starts_at', startDate)
        .lte('starts_at', endDate)
        .order('starts_at');
      if (!error && data) setEvents(data as unknown as CalendarEvent[]);
    } catch {} finally { setIsLoading(false); }
  }, [household?.id, currentMonth, currentYear]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const getEventsForDay = (day: number) => {
    const dateStr = currentYear + '-' + String(currentMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    return events.filter((e) => e.starts_at.startsWith(dateStr));
  };
  const dayHasEvents = (day: number) => getEventsForDay(day).length > 0;
  const selectedEvents = getEventsForDay(selectedDate);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else { setCurrentMonth(currentMonth - 1); }
    setSelectedDate(1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else { setCurrentMonth(currentMonth + 1); }
    setSelectedDate(1);
  };

  const handleAddEvent = async () => {
    if (!newTitle.trim() || !member?.id || !household?.id) ret