/**
 * Recipes Screen
 * "What's in your fridge?" ingredient-based recipe finder with AI suggestions,
 * YouTube/Instagram video search, and saved recipe browsing
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Linking,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { colors, typography, spacing, borderRadius, shadows } from '../constants/theme';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  ingredients: any; // jsonb in DB
  instructions: any; // jsonb in DB
  prep_time_min: number | null;
  cook_time_min: number | null;
  servings: number | null;
  tags: string[] | null;
  source_url: string | null;
  image_url: string | null;
  times_cooked: number;
  rating: number | null;
  household_id: string | null;
  created_at: string;
}

interface AISuggestion {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prep_time: number;
  cook_time: number;
  servings: number;
}

// Parse ingredients/instructions from jsonb or string
function parseList(data: any): string[] {
  if (!data) return [];
  if (Array.isArray(data)) return data.map(String);
  if (typeof data === 'string') {
    try { const parsed = JSON.parse(data); return Array.isArray(parsed) ? parsed.map(String) : [data]; }
    catch { return data.split('\n').filter((s: string) => s.trim()); }
  }
  return [];
}

// ---- Ingredient Chip ----
function IngredientChip({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{name}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.chipRemove}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---- Video Link Button ----
function VideoLink({ title, platform, onPress }: { title: string; platform: 'youtube' | 'instagram'; onPress: () => void }) {
  const icon = platform === 'youtube' ? '▶️' : '📷';
  const label = platform === 'youtube' ? 'YouTube' : 'Instagram';
  const bg = platform === 'youtube' ? '#FF000015' : '#E1306C15';
  const color = platform === 'youtube' ? '#FF0000' : '#E1306C';
  return (
    <TouchableOpacity style={[styles.videoLink, { backgroundColor: bg }]} onPress={onPress}>
      <Text style={styles.videoIcon}>{icon}</Text>
      <Text style={[styles.videoLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---- Recipe Card ----
function RecipeCard({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  const totalTime = (recipe.prep_time_min || 0) + (recipe.cook_time_min || 0);
  const tags = recipe.tags || [];

  return (
    <TouchableOpacity style={styles.recipeCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.recipeName} numberOfLines={2}>{recipe.title}</Text>
        {recipe.description && (
          <Text style={styles.recipeDescription} numberOfLines={1}>{recipe.description}</Text>
        )}
      </View>
      <View style={styles.cardInfo}>
        {totalTime > 0 && (
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>⏱️</Text>
            <Text style={styles.infoText}>{totalTime} min</Text>
          </View>
        )}
        {recipe.servings && (
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>🍽️</Text>
            <Text style={styles.infoText}>{recipe.servings} servings</Text>
          </View>
        )}
        {recipe.rating && (
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>⭐</Text>
            <Text style={styles.infoText}>{recipe.rating}</Text>
          </View>
        )}
      </View>
      {tags.length > 0 && (
        <View style={styles.tagsRow}>
          {tags.slice(0, 3).map((tag, idx) => (
            <View key={idx} style={styles.tagChip}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ---- AI Suggestion Card ----
function AISuggestionCard({ suggestion, onSave, onYouTube, onInstagram }: {
  suggestion: AISuggestion;
  onSave: () => void;
  onYouTube: () => void;
  onInstagram: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card style={styles.suggestionCard}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <View style={styles.suggestionHeader}>
          <Text style={styles.suggestionEmoji}>🍳</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
            <Text style={styles.suggestionDesc} numberOfLines={expanded ? undefined : 2}>
              {suggestion.description}
            </Text>
          </View>
          <Text style={styles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {/* Time badges */}
      <View style={styles.timeBadges}>
        <View style={styles.timeBadge}>
          <Text style={styles.timeBadgeText}>⏱ {suggestion.prep_time + suggestion.cook_time} min</Text>
        </View>
        <View style={styles.timeBadge}>
          <Text style={styles.timeBadgeText}>🍽 {suggestion.servings} servings</Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.suggestionDetails}>
          <Text style={styles.detailLabel}>Ingredients:</Text>
          {suggestion.ingredients.map((ing, i) => (
            <Text key={i} style={styles.detailItem}>• {ing}</Text>
          ))}

          <Text style={[styles.detailLabel, { marginTop: 12 }]}>Steps:</Text>
          {suggestion.instructions.map((step, i) => (
            <Text key={i} style={styles.detailItem}>{i + 1}. {step}</Text>
          ))}
        </View>
      )}

      {/* Action buttons: Save + Video links */}
      <View style={styles.suggestionActions}>
        <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
          <Text style={styles.saveBtnText}>💾 Save Recipe</Text>
        </TouchableOpacity>
        <VideoLink title={suggestion.title} platform="youtube" onPress={onYouTube} />
        <VideoLink title={suggestion.title} platform="instagram" onPress={onInstagram} />
      </View>
    </Card>
  );
}

// ---- Recipe Detail Modal ----
function RecipeDetailModal({ recipe, visible, onClose }: {
  recipe: Recipe | null; visible: boolean; onClose: () => void;
}) {
  if (!recipe) return null;
  const ingredients = parseList(recipe.ingredients);
  const instructions = parseList(recipe.instructions);
  const totalTime = (recipe.prep_time_min || 0) + (recipe.cook_time_min || 0);

  const searchYouTube = () => {
    const q = encodeURIComponent(recipe.title + ' recipe');
    Linking.openURL('https://www.youtube.com/results?search_query=' + q);
  };
  const searchInstagram = () => {
    const q = encodeURIComponent(recipe.title.replace(/\s+/g, ''));
    Linking.openURL('https://www.instagram.com/explore/tags/' + q + 'recipe/');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle} numberOfLines={1}>{recipe.title}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentPadding} showsVerticalScrollIndicator={false}>
          {/* Quick info */}
          <View style={styles.quickInfo}>
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoIcon}>⏱️</Text>
              <Text style={styles.quickInfoLabel}>Prep</Text>
              <Text style={styles.quickInfoValue}>{recipe.prep_time_min || 0} min</Text>
            </View>
            <View style={styles.quickInfoDivider} />
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoIcon}>🍳</Text>
              <Text style={styles.quickInfoLabel}>Cook</Text>
              <Text style={styles.quickInfoValue}>{recipe.cook_time_min || 0} min</Text>
            </View>
            <View style={styles.quickInfoDivider} />
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoIcon}>🍽️</Text>
              <Text style={styles.quickInfoLabel}>Servings</Text>
              <Text style={styles.quickInfoValue}>{recipe.servings || '—'}</Text>
            </View>
          </View>

          {recipe.description && (
            <>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.descriptionText}>{recipe.description}</Text>
            </>
          )}

          {/* Video search links */}
          <Text style={styles.sectionTitle}>Watch & Learn</Text>
          <View style={styles.videoRow}>
            <VideoLink title={recipe.title} platform="youtube" onPress={searchYouTube} />
            <VideoLink title={recipe.title} platform="instagram" onPress={searchInstagram} />
          </View>

          {/* Ingredients */}
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {ingredients.map((ing, idx) => (
            <View key={idx} style={styles.ingredientRow}>
              <Text style={styles.ingredientBullet}>•</Text>
              <Text style={styles.ingredientText}>{ing}</Text>
            </View>
          ))}

          {/* Instructions */}
          <Text style={styles.sectionTitle}>Instructions</Text>
          {instructions.map((step, idx) => (
            <View key={idx} style={styles.instructionRow}>
              <Text style={styles.instructionNumber}>{idx + 1}</Text>
              <Text style={styles.instructionText}>{step}</Text>
            </View>
          ))}

          {recipe.source_url && (
            <>
              <Text style={styles.sectionTitle}>Source</Text>
              <Button title="Open Source" onPress={() => Linking.openURL(recipe.source_url!)} variant="outline" size="sm" />
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ======== MAIN SCREEN ========
export default function RecipesScreen() {
  const router = useRouter();
  const { household, member } = useAuthStore();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeDetail, setShowRecipeDetail] = useState(false);

  // "What's in your fridge?" state
  const [ingredientInput, setIngredientInput] = useState('');
  const [myIngredients, setMyIngredients] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);

  // Load saved recipes
  useEffect(() => {
    if (household?.id) loadRecipes();
  }, [household?.id]);

  const loadRecipes = async () => {
    if (!household) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .or('household_id.eq.' + household.id + ',household_id.is.null')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecipes((data || []) as Recipe[]);
    } catch (err) {
      console.error('Error loading recipes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Add ingredient chip
  const addIngredient = () => {
    const trimmed = ingredientInput.trim().toLowerCase();
    if (!trimmed) return;
    if (myIngredients.includes(trimmed)) {
      setIngredientInput('');
      return;
    }
    setMyIngredients([...myIngredients, trimmed]);
    setIngredientInput('');
  };

  const removeIngredient = (name: string) => {
    setMyIngredients(myIngredients.filter((i) => i !== name));
  };

  // Ask AI for recipe suggestions based on ingredients
  const askAiForRecipes = async () => {
    if (myIngredients.length === 0) {
      Alert.alert('Add Ingredients', 'Please add at least one ingredient to get recipe suggestions.');
      return;
    }

    setIsAiLoading(true);
    setAiSuggestions([]);

    try {
      const prompt = 'I have these ingredients on hand: ' + myIngredients.join(', ') +
        '. Suggest 3 recipes I can make. For each recipe, provide: title, description, ingredients list, step-by-step instructions, prep time in minutes, cook time in minutes, and servings. Return ONLY a JSON array of objects with keys: title, description, ingredients (array of strings), instructions (array of strings), prep_time (number), cook_time (number), servings (number). No markdown, no explanation, just the JSON array.';

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: prompt,
          household_id: household?.id,
          member_id: member?.id,
          skip_tools: true,
        },
      });

      if (error) throw error;

      // Parse AI response - extract JSON from the response text
      const responseText = typeof data === 'string' ? data : (data?.response || data?.text || JSON.stringify(data));
      let suggestions: AISuggestion[] = [];

      // Try to find JSON array in response
      const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        // Try parsing the whole response as JSON
        try {
          const parsed = JSON.parse(responseText);
          suggestions = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // Fallback: show as a single suggestion
          Alert.alert('AI Response', 'Got suggestions but couldn\'t parse them. Try asking HomeBase directly.');
          router.push('/voice-assistant');
          return;
        }
      }

      setAiSuggestions(suggestions);
    } catch (err: any) {
      console.error('AI recipe error:', err);
      Alert.alert('Error', err.message || 'Failed to get recipe suggestions. Try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Save AI suggestion to recipes table
  const saveAiSuggestion = async (suggestion: AISuggestion) => {
    if (!household?.id) return;
    setIsSavingRecipe(true);
    try {
      const { error } = await supabase.from('recipes').insert({
        household_id: household.id,
        title: suggestion.title,
        description: suggestion.description,
        ingredients: suggestion.ingredients,
        instructions: suggestion.instructions,
        prep_time_min: suggestion.prep_time || 0,
        cook_time_min: suggestion.cook_time || 0,
        servings: suggestion.servings || 4,
        tags: ['ai-suggested'],
        times_cooked: 0,
      });

      if (error) throw error;
      Alert.alert('Saved!', suggestion.title + ' has been added to your recipe collection.');
      await loadRecipes();
    } catch (err: any) {
      Alert.alert('Error', 'Failed to save recipe: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingRecipe(false);
    }
  };

  // Open YouTube search for a recipe
  const searchYouTube = (title: string) => {
    const q = encodeURIComponent(title + ' recipe');
    Linking.openURL('https://www.youtube.com/results?search_query=' + q);
  };

  // Open Instagram search for a recipe
  const searchInstagram = (title: string) => {
    const tag = encodeURIComponent(title.replace(/\s+/g, '').toLowerCase());
    Linking.openURL('https://www.instagram.com/explore/tags/' + tag + 'recipe/');
  };

  const filteredRecipes = recipes.filter((recipe) => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return (
      recipe.title.toLowerCase().includes(s) ||
      recipe.description?.toLowerCase().includes(s) ||
      recipe.tags?.some((tag) => tag.toLowerCase().includes(s))
    );
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recipes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ---- What's in your fridge? ---- */}
        <Card style={styles.fridgeCard}>
          <View style={styles.fridgeHeader}>
            <Text style={styles.fridgeEmoji}>🧊</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.fridgeTitle}>What's in your fridge?</Text>
              <Text style={styles.fridgeSubtitle}>Add ingredients and get recipe ideas</Text>
            </View>
          </View>

          {/* Ingredient input */}
          <View style={styles.ingredientInputRow}>
            <TextInput
              style={styles.ingredientInput}
              placeholder="Type an ingredient (e.g. chicken)"
              placeholderTextColor={colors.gray[400]}
              value={ingredientInput}
              onChangeText={setIngredientInput}
              onSubmitEditing={addIngredient}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addIngredientBtn} onPress={addIngredient}>
              <Text style={styles.addIngredientText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Ingredient chips */}
          {myIngredients.length > 0 && (
            <View style={styles.chipsWrap}>
              {myIngredients.map((name) => (
                <IngredientChip key={name} name={name} onRemove={() => removeIngredient(name)} />
              ))}
            </View>
          )}

          {/* Quick add common items */}
          {myIngredients.length === 0 && (
            <View style={styles.quickAddRow}>
              <Text style={styles.quickAddLabel}>Quick add:</Text>
              {['chicken', 'rice', 'pasta', 'eggs', 'onion', 'garlic'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.quickAddChip}
                  onPress={() => setMyIngredients([...myIngredients, item])}
                >
                  <Text style={styles.quickAddText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Find Recipes button */}
          <Button
            title={isAiLoading ? 'Finding recipes...' : '🍳 Find Recipes with These Ingredients'}
            onPress={askAiForRecipes}
            variant="primary"
            loading={isAiLoading}
            style={{ marginTop: 14 }}
          />
        </Card>

        {/* ---- AI Suggestions ---- */}
        {aiSuggestions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>✨ AI Suggestions ({aiSuggestions.length})</Text>
            {aiSuggestions.map((suggestion, idx) => (
              <AISuggestionCard
                key={idx}
                suggestion={suggestion}
                onSave={() => saveAiSuggestion(suggestion)}
                onYouTube={() => searchYouTube(suggestion.title)}
                onInstagram={() => searchInstagram(suggestion.title)}
              />
            ))}
          </View>
        )}

        {isAiLoading && (
          <View style={styles.aiLoadingWrap}>
            <ActivityIndicator color={colors.green[500]} size="large" />
            <Text style={styles.aiLoadingText}>Finding recipes based on your ingredients...</Text>
          </View>
        )}

        {/* ---- Search saved recipes ---- */}
        <View style={styles.section}>
          <View style={styles.savedHeader}>
            <Text style={styles.sectionHeader}>📚 My Recipes</Text>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search saved recipes..."
              placeholderTextColor={colors.gray[400]}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.green[500]} style={{ marginTop: 20 }} />
          ) : filteredRecipes.length > 0 ? (
            filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onPress={() => {
                  setSelectedRecipe(recipe);
                  setShowRecipeDetail(true);
                }}
              />
            ))
          ) : (
            <Card variant="outlined" style={styles.emptyCard}>
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🍳</Text>
                <Text style={styles.emptyTitle}>
                  {searchText ? 'No recipes found' : 'No saved recipes yet'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchText ? 'Try a different search' : 'Use the ingredient finder above to discover and save recipes'}
                </Text>
              </View>
            </Card>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Recipe detail modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        visible={showRecipeDetail}
        onClose={() => setShowRecipeDetail(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg },

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

  // ---- What's in your fridge ----
  fridgeCard: {
    marginBottom: 20,
    backgroundColor: 'rgba(34,197,94,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)',
  },
  fridgeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  fridgeEmoji: { fontSize: 32 },
  fridgeTitle: { ...typography.h3, color: colors.gray[900] },
  fridgeSubtitle: { ...typography.caption, color: colors.gray[500], marginTop: 2 },

  ingredientInputRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  ingredientInput: {
    flex: 1,
    ...typography.body,
    color: colors.gray[900],
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addIngredientBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.green[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  addIngredientText: { color: colors.white, fontSize: 22, fontWeight: '600' },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green[100],
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  chipText: { ...typography.caption, color: colors.green[800], fontWeight: '600' },
  chipRemove: { fontSize: 16, color: colors.green[600], fontWeight: '700' },

  quickAddRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  quickAddLabel: { ...typography.small, color: colors.gray[400] },
  quickAddChip: {
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  quickAddText: { ...typography.small, color: colors.gray[600] },

  // ---- AI Suggestions ----
  section: { marginBottom: 20 },
  sectionHeader: { ...typography.h3, color: colors.gray[900], marginBottom: 12 },

  suggestionCard: { marginBottom: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.12)' },
  suggestionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  suggestionEmoji: { fontSize: 24, marginTop: 2 },
  suggestionTitle: { ...typography.bodyBold, color: colors.gray[900] },
  suggestionDesc: { ...typography.caption, color: colors.gray[500], marginTop: 4, lineHeight: 18 },
  expandIcon: { fontSize: 12, color: colors.gray[400], marginTop: 4 },

  timeBadges: { flexDirection: 'row', gap: 8, marginTop: 10 },
  timeBadge: {
    backgroundColor: colors.blue[50],
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timeBadgeText: { ...typography.small, color: colors.blue[700] },

  suggestionDetails: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.gray[100] },
  detailLabel: { ...typography.bodyBold, color: colors.gray[700], marginBottom: 6 },
  detailItem: { ...typography.body, color: colors.gray[600], marginBottom: 4, paddingLeft: 4 },

  suggestionActions: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  saveBtn: {
    backgroundColor: colors.green[500],
    borderRadius: borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...shadows.sm,
  },
  saveBtnText: { ...typography.caption, color: colors.white, fontWeight: '700' },

  videoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  videoIcon: { fontSize: 14 },
  videoLabel: { ...typography.caption, fontWeight: '700' },
  videoRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },

  aiLoadingWrap: { alignItems: 'center', paddingVertical: 30, gap: 12 },
  aiLoadingText: { ...typography.body, color: colors.gray[500] },

  // ---- Saved Recipes ----
  savedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  searchRow: { marginBottom: 12 },
  searchInput: {
    ...typography.body,
    color: colors.gray[900],
    backgroundColor: colors.glass.elevated,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  recipeCard: {
    backgroundColor: colors.glass.elevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.60)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: 10,
    ...shadows.glass,
  },
  cardHeader: { marginBottom: 8 },
  recipeName: { ...typography.bodyBold, color: colors.gray[900], fontSize: 16 },
  recipeDescription: { ...typography.caption, color: colors.gray[500], marginTop: 4 },

  cardInfo: { flexDirection: 'row', gap: spacing.md, marginBottom: 8 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoIcon: { fontSize: 14 },
  infoText: { ...typography.small, color: colors.gray[600] },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip: {
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { ...typography.small, color: colors.green[700] },

  // ---- Modal ----
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  closeButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  closeIcon: { fontSize: 24, color: colors.gray[700], fontWeight: '600' },
  modalTitle: { flex: 1, textAlign: 'center', ...typography.h2, color: colors.gray[900] },
  modalContent: { flex: 1 },
  modalContentPadding: { padding: spacing.lg },

  quickInfo: {
    flexDirection: 'row',
    backgroundColor: colors.blue[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.blue[200],
    marginBottom: 20,
  },
  quickInfoItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  quickInfoIcon: { fontSize: 20, marginBottom: 4 },
  quickInfoLabel: { ...typography.caption, color: colors.gray[600] },
  quickInfoValue: { ...typography.bodyBold, color: colors.blue[700], marginTop: 2 },
  quickInfoDivider: { width: 1, backgroundColor: colors.blue[200] },

  sectionTitle: { ...typography.bodyBold, color: colors.gray[900], marginBottom: 8, marginTop: 16 },
  descriptionText: { ...typography.body, color: colors.gray[600], marginBottom: 16 },

  ingredientRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  ingredientBullet: { ...typography.body, color: colors.gray[400], width: 16 },
  ingredientText: { ...typography.body, color: colors.gray[700], flex: 1 },

  instructionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  instructionNumber: { ...typography.bodyBold, color: colors.green[600], minWidth: 28, textAlign: 'center' },
  instructionText: { ...typography.body, color: colors.gray[700], flex: 1, lineHeight: 22 },

  // ---- Empty state ----
  emptyCard: { marginTop: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { ...typography.h3, color: colors.gray[900], textAlign: 'center', marginBottom: 6 },
  emptySubtitle: { ...typography.body, color: colors.gray[500], textAlign: 'center' },
});
