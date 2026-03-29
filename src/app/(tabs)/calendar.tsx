/**
 * Calendar Tab
 * Full month calendar with real Supabase events
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, shadows, borderRadius } from '../../constants/theme';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface CalendarEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  description: string | null;
  location: string | null;
  created_by: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

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

  // Add event form
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [newDescription, setNewDescription] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const isToday = (day: number) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  // Fetch events for the current month
  const fetchEvents = useCallback(async () => {
    if (!household?.id) return;
    setIsLoading(true);
    try {
      const startDate = new Date(currentYear, currentMonth, 1).toISOString();
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('events')
        .select('id, title, starts_at, ends_at, description, location, created_by')
        .eq('household_id', household.id)
        .gte('starts_at', startDate)
        .lte('starts_at', endDate)
        .order('starts_at');

      if (!error && data) {
        setEvents(data as unknown as CalendarEvent[]);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [household?.id, currentMonth, currentYear]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Get events for a specific day
  const getEventsForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.starts_at.startsWith(dateStr));
  };

  // Check if a day has events (for dot indicator)
  const dayHasEvents = (day: number) => getEventsForDay(day).length > 0;

  const selectedEvents = getEventsForDay(selectedDate);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(1);
  };

  const handleAddEvent = async () => {
    if (!newTitle.trim() || !member?.id || !household?.id) return;

    setIsSaving(true);
    try {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
      const startsAt = `${dateStr}T${newTime}:00`;

      const { error } = await supabase.from('events').insert({
        household_id: household.id,
        created_by: member.id,
        title: newTitle.trim(),
        starts_at: startsAt,
        description: newDescription.trim() || null,
        location: newLocation.trim() || null,
      } as any);

      if (error) throw error;

      setShowAddModal(false);
      setNewTitle('');
      setNewTime('09:00');
      setNewDescription('');
      setNewLocation('');
      fetchEvents();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add event');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = (eventId: string, title: string) => {    Alert.alert('Delete Event', `Remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('events').delete().eq('id', eventId);
          fetchEvents();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Calendar</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addBtnText}>+ Event</Text>
          </TouchableOpacity>
        </View>

        {/* Month navigation */}
        <Card>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTHS[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={nextMonth}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={styles.dayHeaders}>
            {DAYS.map((day) => (
              <Text key={day} style={styles.dayHeader}>{day}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.grid}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = day === selectedDate;
              const todayHighlight = isToday(day);
              const hasEvents = dayHasEvents(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayCell,
                    selected && styles.selectedDay,
                    todayHighlight && !selected && styles.todayDay,
                  ]}
                  onPress={() => setSelectedDate(day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      selected && styles.selectedDayText,
                      todayHighlight && !selected && styles.todayDayText,
                    ]}
                  >
                    {day}
                  </Text>
                  {hasEvents && (
                    <View style={[styles.eventDot, selected && styles.eventDotSelected]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
        {/* Events for selected day */}
        <View style={styles.eventsSection}>
          <Text style={styles.eventsTitle}>
            {MONTHS[currentMonth]} {selectedDate}
          </Text>

          {isLoading ? (
            <ActivityIndicator color={colors.green[500]} style={{ marginTop: 20 }} />
          ) : selectedEvents.length > 0 ? (
            selectedEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onLongPress={() => handleDeleteEvent(event.id, event.title)}
              >
                <View style={styles.eventTime}>
                  <Text style={styles.eventTimeText}>{formatTime(event.starts_at)}</Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  {event.location && (
                    <Text style={styles.eventLocation}>📍 {event.location}</Text>
                  )}
                  {event.description && (
                    <Text style={styles.eventDesc} numberOfLines={2}>{event.description}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Card variant="outlined">
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📅</Text>
                <Text style={styles.emptyText}>No events scheduled</Text>
                <Button
                  title="Add Event"
                  onPress={() => setShowAddModal(true)}
                  variant="outline"
                  size="sm"
                  style={{ marginTop: 12 }}
                />
              </View>
            </Card>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Event</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDate}>
              {MONTHS[currentMonth]} {selectedDate}, {currentYear}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Event title"
              placeholderTextColor={colors.gray[400]}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Time (HH:MM, e.g. 14:30)"
              placeholderTextColor={colors.gray[400]}
              value={newTime}
              onChangeText={setNewTime}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Location (optional)"
              placeholderTextColor={colors.gray[400]}
              value={newLocation}
              onChangeText={setNewLocation}
            />

            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.gray[400]}
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
            />

            <Button
              title={isSaving ? 'Saving...' : 'Add Event'}
              onPress={handleAddEvent}
              variant="primary"
              loading={isSaving}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { ...typography.h1, color: colors.gray[900] },
  addBtn: {
    backgroundColor: colors.green[500],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  addBtnText: { ...typography.caption, color: colors.white, fontWeight: '700' },

  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  navArrow: { fontSize: 28, color: colors.green[600], fontWeight: '300', paddingHorizontal: 8 },
  monthLabel: { ...typography.h3, color: colors.gray[900] },

  dayHeaders: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    color: colors.gray[400],
    fontWeight: '600',
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: { ...typography.body, color: colors.gray[700] },
  selectedDay: {
    backgroundColor: colors.green[500],
    borderRadius: 20,
  },
  selectedDayText: { color: colors.white, fontWeight: '700' },
  todayDay: {
    backgroundColor: colors.green[50],
    borderRadius: 20,
  },
  todayDayText: { color: colors.green[700], fontWeight: '700' },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.green[500],
    position: 'absolute',
    bottom: 6,
  },
  eventDotSelected: {
    backgroundColor: colors.white,
  },

  eventsSection: { marginTop: 24 },
  eventsTitle: { ...typography.h3, color: colors.gray[700], marginBottom: 12 },

  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.glass.elevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.60)',
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    ...shadows.glass,
  },
  eventTime: {
    backgroundColor: colors.green[50],
    borderRadius: borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  eventTimeText: { ...typography.caption, color: colors.green[700], fontWeight: '700' },
  eventInfo: { flex: 1 },
  eventTitle: { ...typography.bodyBold, color: colors.gray[900] },
  eventLocation: { ...typography.caption, color: colors.gray[500], marginTop: 2 },
  eventDesc: { ...typography.caption, color: colors.gray[400], marginTop: 4 },

  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyText: { ...typography.body, color: colors.gray[400] },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.40)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { ...typography.h2, color: colors.gray[900] },
  modalClose: { fontSize: 22, color: colors.gray[400], padding: 4 },
  modalDate: { ...typography.body, color: colors.green[600], marginBottom: 16 },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.70)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...typography.body,
    color: colors.gray[900],
    marginBottom: 10,
  },
});
