/**
 * Find Local Services Screen
 * Search for local service providers with tips and related maintenance items
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { colors, typography, spacing, borderRadius, shadows } from '../constants/theme';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';

type ServiceType = 'Plumber' | 'Electrician' | 'HVAC' | 'Landscaper' | 'Cleaner' | 'Tutor' | 'Handyman' | 'Vet';

interface MaintenanceItem {
  id: string;
  title: string;
  asset_name: string;
  next_due_at: string;
  category: string;
}

// Service type tips mapping
const SERVICE_TIPS: Record<ServiceType, string[]> = {
  Plumber: [
    'Ask about warranty coverage for repairs',
    'Get multiple quotes before hiring',
    'Check if they offer emergency services',
    'Ask about water pressure testing',
    'Verify they have proper licensing and insurance',
  ],
  Electrician: [
    'Ensure they provide a detailed invoice with parts used',
    'Ask about warranty on electrical work',
    'Check if they follow local electrical codes',
    'Get an estimate in writing before work begins',
    'Ask about energy-efficient upgrades',
  ],
  HVAC: [
    'Ask when your last maintenance was due',
    'Inquire about seasonal maintenance plans',
    'Get a quote for repairs and replacement',
    'Ask about energy efficiency ratings',
    'Verify proper licensing and EPA certification',
  ],
  Landscaper: [
    'Discuss seasonal maintenance schedules',
    'Ask about organic vs. chemical treatments',
    'Get a detailed landscape plan in writing',
    'Ask about warranty on plantings',
    'Discuss water conservation practices',
  ],
  Cleaner: [
    'Define exact scope of cleaning services',
    'Ask about eco-friendly cleaning products',
    'Discuss frequency and scheduling',
    'Ask for references from current clients',
    'Clarify what areas are included',
  ],
  Tutor: [
    'Ask about the tutoring methodology',
    'Discuss expected improvement timeline',
    'Ask for student testimonials or references',
    'Clarify cancellation and rescheduling policy',
    'Ask about materials and resources provided',
  ],
  Handyman: [
    'Get a detailed estimate for all work',
    'Ask about warranty on workmanship',
    'Verify liability insurance coverage',
    'Ask if they subcontract work',
    'Discuss project timeline and deadlines',
  ],
  Vet: [
    'Ask about preventive care plans',
    'Discuss vaccination schedules',
    'Ask about emergency and after-hours services',
    'Inquire about pet dental care',
    'Ask about microchipping and ID options',
  ],
};

// Tip card component
function TipCard({ tip, index }: { tip: string; index: number }) {
  return (
    <View style={styles.tipItem}>
      <Text style={styles.tipNumber}>{index + 1}</Text>
      <Text style={styles.tipText}>{tip}</Text>
    </View>
  );
}

// Related maintenance item component
function RelatedItemCard({
  item,
  serviceType,
}: {
  item: MaintenanceItem;
  serviceType: ServiceType;
}) {
  return (
    <Card variant="outlined" style={styles.relatedItem}>
      <View style={styles.relatedItemContent}>
        <View style={styles.relatedItemLeft}>
          <Text style={styles.relatedItemTitle}>{item.title}</Text>
          <Text style={styles.relatedItemAsset}>{item.asset_name}</Text>
        </View>
        <Text style={styles.relatedItemDue}>
          Due {new Date(item.next_due_at).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.relatedItemHint}>
        💡 Consider bundling this with your {serviceType} work
      </Text>
    </Card>
  );
}

export default function FindServicesScreen() {
  const router = useRouter();
  const { household } = useAuthStore();

  const serviceCategories: ServiceType[] = [
    'Plumber',
    'Electrician',
    'HVAC',
    'Landscaper',
    'Cleaner',
    'Tutor',
    'Handyman',
    'Vet',
  ];

  const [searchText, setSearchText] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [relatedItems, setRelatedItems] = useState<MaintenanceItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Load related maintenance items when service is selected
  useEffect(() => {
    if (selectedService && household) {
      loadRelatedItems(selectedService);
    } else {
      setRelatedItems([]);
    }
  }, [selectedService, household]);

  const loadRelatedItems = async (serviceType: ServiceType) => {
    setIsLoadingItems(true);
    try {
      // Map service types to maintenance categories
      const categoryMap: Record<ServiceType, string[]> = {
        Plumber: ['Home'],
        Electrician: ['Home'],
        HVAC: ['Home', 'Appliance'],
        Landscaper: ['Home'],
        Cleaner: ['Home'],
        Tutor: [],
        Handyman: ['Home'],
        Vet: ['Pet'],
      };

      const categories = categoryMap[serviceType] || [];

      if (categories.length === 0) {
        setRelatedItems([]);
        return;
      }

      const { data, error } = await supabase
        .from('maintenance_items')
        .select('id, title, asset_name, next_due_at, category')
        .eq('household_id', household!.id)
        .in('category', categories)
        .order('next_due_at', { ascending: true })
        .limit(3);

      if (error) throw error;
      setRelatedItems((data || []) as MaintenanceItem[]);
    } catch (error) {
      console.error('Error loading related items:', error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleSearchNearMe = () => {
    if (!selectedService) {
      Alert.alert('Select a service', 'Please select a service type first');
      return;
    }

    const query = `${selectedService} near me`;
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

    Linking.openURL(mapsUrl).catch(() => {
      Alert.alert('Error', 'Could not open Google Maps');
    });
  };

  const handleAskHomeBase = () => {
    if (!selectedService) {
      Alert.alert('Select a service', 'Please select a service type first');
      return;
    }

    router.push({
      pathname: '/voice-assistant',
      params: { query: `Find me a ${selectedService.toLowerCase()}` },
    });
  };

  const filteredServices = serviceCategories.filter((service) =>
    service.toLowerCase().includes(searchText.toLowerCase())
  );

  const showServiceDetails = selectedService !== null;
  const tips = selectedService ? SERVICE_TIPS[selectedService] : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Services</Text>
        <View style={{ width: 40 }} />
      </View>

      {!showServiceDetails ? (
        <>
          {/* Search bar */}
          <View style={styles.searchSection}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search service type..."
              placeholderTextColor={colors.gray[400]}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {/* Service categories */}
          <FlatList
            data={filteredServices}
            keyExtractor={(service) => service}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.serviceChip}
                onPress={() => setSelectedService(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.serviceChipIcon}>
                  {getServiceIcon(item)}
                </Text>
                <Text style={styles.serviceChipText}>{item}</Text>
                <Text style={styles.serviceChipArrow}>→</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.servicesGrid}
            numColumns={2}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <ScrollView
          style={styles.detailsContainer}
          contentContainerStyle={styles.detailsContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back to list */}
          <TouchableOpacity
            style={styles.backToListButton}
            onPress={() => {
              setSelectedService(null);
              setSearchText('');
            }}
          >
            <Text style={styles.backToListText}>← Back to Services</Text>
          </TouchableOpacity>

          {/* Service header */}
          <View style={styles.serviceHeader}>
            <Text style={styles.serviceHeaderIcon}>{getServiceIcon(selectedService)}</Text>
            <Text style={styles.serviceHeaderTitle}>{selectedService}</Text>
          </View>

          {/* Smart Hiring Tips */}
          <Card style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 Smart Hiring Tips</Text>
            {tips.map((tip, idx) => (
              <TipCard key={idx} tip={tip} index={idx} />
            ))}
          </Card>

          {/* Action buttons */}
          <View style={styles.actionsSection}>
            <Button
              title="Search Near Me"
              onPress={handleSearchNearMe}
              variant="primary"
              size="md"
              style={styles.actionButton}
            />
            <Button
              title="Ask HomeBase"
              onPress={handleAskHomeBase}
              variant="secondary"
              size="md"
              style={styles.actionButton}
            />
          </View>

          {/* Related maintenance items */}
          {isLoadingItems ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.green[500]} />
              <Text style={styles.loadingText}>Loading related tasks...</Text>
            </View>
          ) : relatedItems.length > 0 ? (
            <>
              <Text style={styles.relatedTitle}>Related Maintenance Tasks</Text>
              <Text style={styles.relatedSubtitle}>
                You could bundle these with your {selectedService.toLowerCase()} appointment
              </Text>
              {relatedItems.map((item) => (
                <RelatedItemCard
                  key={item.id}
                  item={item}
                  serviceType={selectedService}
                />
              ))}
            </>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function getServiceIcon(service: ServiceType): string {
  const iconMap: Record<ServiceType, string> = {
    Plumber: '🔧',
    Electrician: '⚡',
    HVAC: '❄️',
    Landscaper: '🌿',
    Cleaner: '🧹',
    Tutor: '📚',
    Handyman: '🛠️',
    Vet: '🐾',
  };
  return iconMap[service];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: colors.gray[700] },
  headerTitle: { flex: 1, textAlign: 'center', ...typography.h2, color: colors.gray[900] },

  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInput: {
    ...typography.body,
    color: colors.gray[900],
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  servicesGrid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },

  serviceChip: {
    flex: 0.5,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  serviceChipIcon: { fontSize: 32 },
  serviceChipText: { ...typography.bodyBold, color: colors.gray[900], textAlign: 'center' },
  serviceChipArrow: { ...typography.body, color: colors.green[600] },

  // Details view
  detailsContainer: { flex: 1 },
  detailsContent: { padding: spacing.lg, paddingBottom: spacing.xl },

  backToListButton: { marginBottom: spacing.lg },
  backToListText: { ...typography.bodyBold, color: colors.green[600] },

  serviceHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.blue[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.blue[200],
  },
  serviceHeaderIcon: { fontSize: 48, marginBottom: spacing.sm },
  serviceHeaderTitle: { ...typography.h2, color: colors.blue[800] },

  tipsCard: {
    marginBottom: spacing.xl,
    backgroundColor: colors.green[50],
    borderWidth: 1,
    borderColor: colors.green[200],
  },
  tipsTitle: { ...typography.bodyBold, color: colors.green[800], marginBottom: spacing.md },
  tipItem: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.green[200],
  },
  tipNumber: {
    ...typography.bodyBold,
    color: colors.green[600],
    minWidth: 28,
    textAlign: 'center',
    backgroundColor: colors.green[100],
    borderRadius: borderRadius.sm,
    paddingVertical: 4,
  },
  tipText: { ...typography.body, color: colors.gray[700], flex: 1, lineHeight: 22 },

  actionsSection: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  actionButton: {},

  relatedTitle: { ...typography.bodyBold, color: colors.gray[900], marginBottom: spacing.sm },
  relatedSubtitle: { ...typography.caption, color: colors.gray[500], marginBottom: spacing.md },

  relatedItem: {
    marginBottom: spacing.md,
  },
  relatedItemContent: {
    marginBottom: spacing.sm,
  },
  relatedItemLeft: { flex: 1, marginBottom: spacing.sm },
  relatedItemTitle: { ...typography.bodyBold, color: colors.gray[900] },
  relatedItemAsset: { ...typography.caption, color: colors.gray[500], marginTop: 2 },
  relatedItemDue: { ...typography.small, color: colors.gray[600] },
  relatedItemHint: { ...typography.small, color: colors.blue[600], fontStyle: 'italic' },

  loadingContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.lg },
  loadingText: { ...typography.body, color: colors.gray[500] },
});
