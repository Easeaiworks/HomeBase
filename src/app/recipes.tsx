/**
 * Recipes Browser Screen
 * Browse household recipes with search, add new recipes, and expand for details
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { colors, typography, spacing, borderRadius, shadows } from '../constants/theme';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  ingredients: string;
  instructions: string;
  prep_time_min: number;
  cook_time_min: number;
  servings: number | null;
  tags: string[] | null;
  source_url: string | null;
  household_id: string | null;
  created_at: string;
}

// Recipe card for list view
function RecipeCard({
  recipe,
  onPress,
}: {
  recipe: Recipe;
  onPress: () => void;
}) {
  const totalTime = recipe.prep_time_min + recipe.cook_time_min;
  const tags = recipe.tags || [];

  return (
    <TouchableOpacity style={styles.recipeCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.recipeName} numberOfLines={2}>
            {recipe.title}
          </Text>
          {recipe.description && (
            <Text style={styles.recipeDescription} numberOfLines={1}>
              {recipe.description}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>⏱️</Text>
          <Text style={styles.infoText}>{totalTime} min</Text>
        </View>
        {recipe.servings && (
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>🍽️</Text>
            <Text style={styles.infoText}>{recipe.servings} servings</Text>
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
          {tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{tags.length - 3}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// Expanded recipe detail modal
function RecipeDetailModal({
  recipe,
  visible,
  onClose,
}: {
  recipe: Recipe | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!recipe) return null;

  const totalTime = recipe.prep_time_min + recipe.cook_time_min;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        {/* Modal header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle} numberOfLines={1}>
            {recipe.title}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.modalContent}
          contentContainerStyle={styles.modalContentPadding}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick info */}
          <View style={styles.quickInfo}>
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoIcon}>⏱️</Text>
              <Text style={styles.quickInfoLabel}>Prep</Text>
              <Text style={styles.quickInfoValue}>{recipe.prep_time_min} min</Text>
            </View>
            <View style={styles.quickInfoDivider} />
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoIcon}>🍳</Text>
              <Text style={styles.quickInfoLabel}>Cook</Text>
              <Text style={styles.quickInfoValue}>{recipe.cook_time_min} min</Text>
            </View>
            <View style={styles.quickInfoDivider} />
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoIcon}>🍽️</Text>
              <Text style={styles.quickInfoLabel}>Servings</Text>
              <Text style={styles.quickInfoValue}>{recipe.servings || '—'}</Text>
            </View>
          </View>

          {/* Description */}
          {recipe.description && (
            <>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.descriptionText}>{recipe.description}</Text>
            </>
          )}

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.allTagsRow}>
                {recipe.tags.map((tag, idx) => (
                  <View key={idx} style={styles.tagChipLarge}>
                    <Text style={styles.tagTextLarge}>{tag}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Ingredients */}
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {recipe.ingredients.split('\n').map((ingredient, idx) => (
            <View key={idx} style={styles.ingredientRow}>
              <Text style={styles.ingredientBullet}>•</Text>
              <Text style={styles.ingredientText}>{ingredient.trim()}</Text>
            </View>
          ))}

          {/* Instructions */}
          <Text style={styles.sectionTitle}>Instructions</Text>
          {recipe.instructions.split('\n').map((instruction, idx) => (
            <View key={idx} style={styles.instructionRow}>
              <Text style={styles.instructionNumber}>{idx + 1}</Text>
              <Text style={styles.instructionText}>{instruction.trim()}</Text>
            </View>
          ))}

          {/* Source link */}
          {recipe.source_url && (
            <>
              <Text style={styles.sectionTitle}>Source</Text>
              <Button
                title="Open Source"
                onPress={() => Linking.openURL(recipe.source_url!)}
                variant="outline"
                size="sm"
              />
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// Add recipe modal
function AddRecipeModal({
  visible,
  onClose,
  onAdd,
  isLoading,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (recipe: Omit<Recipe, 'id' | 'created_at' | 'household_id'>) => Promise<void>;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [prepTime, setPrepTime] = useState('15');
  const [cookTime, setCookTime] = useState('30');
  const [servings, setServings] = useState('4');
  const [tags, setTags] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  const handleAdd = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a recipe title');
      return;
    }
    if (!ingredients.trim()) {
      Alert.alert('Required', 'Please enter ingredients');
      return;
    }
    if (!instructions.trim()) {
      Alert.alert('Required', 'Please enter instructions');
      return;
    }

    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      await onAdd({
        title: title.trim(),
        description: description.trim() || null,
        ingredients: ingredients.trim(),
        instructions: instructions.trim(),
        prep_time_min: parseInt(prepTime, 10) || 0,
        cook_time_min: parseInt(cookTime, 10) || 0,
        servings: servings.trim() ? parseInt(servings, 10) : null,
        tags: tagArray.length > 0 ? tagArray : null,
        source_url: sourceUrl.trim() || null,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setIngredients('');
      setInstructions('');
      setPrepTime('15');
      setCookTime('30');
      setServings('4');
      setTags('');
      setSourceUrl('');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to add recipe. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add Recipe</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.modalContent}
          contentContainerStyle={styles.modalContentPadding}
          showsVerticalScrollIndicator={false}
        >
          <Input
            label="Recipe Title"
            placeholder="e.g., Chocolate Chip Cookies"
            value={title}
            onChangeText={setTitle}
            editable={!isLoading}
          />

          <Input
            label="Description (Optional)"
            placeholder="A brief description..."
            value={description}
            onChangeText={setDescription}
            editable={!isLoading}
          />

          <View style={styles.timeRow}>
            <View style={styles.timeInput}>
              <Input
                label="Prep Time (min)"
                placeholder="15"
                value={prepTime}
                onChangeText={setPrepTime}
                keyboardType="number-pad"
                editable={!isLoading}
              />
            </View>
            <View style={styles.timeInput}>
              <Input
                label="Cook Time (min)"
                placeholder="30"
                value={cookTime}
                onChangeText={setCookTime}
                keyboardType="number-pad"
                editable={!isLoading}
              />
            </View>
          </View>

          <Input
            label="Servings (Optional)"
            placeholder="4"
            value={servings}
            onChangeText={setServings}
            keyboardType="number-pad"
            editable={!isLoading}
          />

          <View style={styles.largeInputContainer}>
            <Text style={styles.label}>Ingredients</Text>
            <TextInput
              style={styles.largeInput}
              placeholder="One per line (e.g., 2 cups flour)"
              placeholderTextColor={colors.gray[400]}
              value={ingredients}
              onChangeText={setIngredients}
              multiline
              editable={!isLoading}
              numberOfLines={6}
            />
          </View>

          <View style={styles.largeInputContainer}>
            <Text style={styles.label}>Instructions</Text>
            <TextInput
              style={styles.largeInput}
              placeholder="One step per line"
              placeholderTextColor={colors.gray[400]}
              value={instructions}
              onChangeText={setInstructions}
              multiline
              editable={!isLoading}
              numberOfLines={8}
            />
          </View>

          <Input
            label="Tags (Optional)"
            placeholder="Separated by commas (e.g., dessert, vegetarian)"
            value={tags}
            onChangeText={setTags}
            editable={!isLoading}
          />

          <Input
            label="Source URL (Optional)"
            placeholder="https://example.com/recipe"
            value={sourceUrl}
            onChangeText={setSourceUrl}
            editable={!isLoading}
          />

          <Button
            title="Add Recipe"
            onPress={handleAdd}
            loading={isLoading}
            style={styles.addButton}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function RecipesScreen() {
  const router = useRouter();
  const { household } = useAuthStore();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeDetail, setShowRecipeDetail] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load recipes
  useEffect(() => {
    loadRecipes();
  }, [household]);

  const loadRecipes = async () => {
    if (!household) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .or(`household_id.eq.${household.id},household_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecipes((data || []) as Recipe[]);
    } catch (error) {
      console.error('Error loading recipes:', error);
      Alert.alert('Error', 'Failed to load recipes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRecipe = async (recipeData: Omit<Recipe, 'id' | 'created_at' | 'household_id'>) => {
    setIsAdding(true);
    try {
      const { error } = await supabase.from('recipes').insert({
        ...recipeData,
        household_id: household?.id || null,
      });

      if (error) throw error;
      await loadRecipes();
    } catch (error) {
      console.error('Error adding recipe:', error);
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const filteredRecipes = recipes.filter((recipe) => {
    const searchLower = searchText.toLowerCase();
    return (
      recipe.title.toLowerCase().includes(searchLower) ||
      recipe.description?.toLowerCase().includes(searchLower) ||
      recipe.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green[500]} />
          <Text style={styles.loadingText}>Loading recipes...</Text>
        </View>
      </SafeAreaView>
    );
  }

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

      {/* Search bar */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search recipes..."
          placeholderTextColor={colors.gray[400]}
          value={searchText}
          onChangeText={setSearchText}
        />
        <TouchableOpacity
          style={styles.addRecipeButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addRecipeText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Suggest Recipe button */}
      <TouchableOpacity
        style={styles.suggestBanner}
        onPress={() => router.push('/voice-assistant')}
        activeOpacity={0.7}
      >
        <View style={styles.suggestContent}>
          <Text style={styles.suggestEmoji}>🎤</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.suggestTitle}>Need a Recipe Idea?</Text>
            <Text style={styles.suggestSubtitle}>Ask HomeBase for suggestions</Text>
          </View>
          <Text style={styles.suggestArrow}>→</Text>
        </View>
      </TouchableOpacity>

      {/* Recipes list */}
      {filteredRecipes.length > 0 ? (
        <FlatList
          data={filteredRecipes}
          keyExtractor={(recipe) => recipe.id}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={() => {
                setSelectedRecipe(item);
                setShowRecipeDetail(true);
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.emptyStateContainer}>
          <Text style={styles.emptyEmoji}>🍳</Text>
          <Text style={styles.emptyTitle}>
            {searchText ? 'No recipes found' : 'No recipes yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchText
              ? `Try searching for something else`
              : `Add your first recipe or ask HomeBase for suggestions`}
          </Text>
          {!searchText && (
            <Button
              title="Add Recipe"
              onPress={() => setShowAddModal(true)}
              variant="primary"
              size="md"
              style={styles.emptyButton}
            />
          )}
        </ScrollView>
      )}

      {/* Modals */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        visible={showRecipeDetail}
        onClose={() => setShowRecipeDetail(false)}
      />
      <AddRecipeModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddRecipe}
        isLoading={isAdding}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...typography.body, color: colors.gray[400] },

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
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.gray[900],
    backgroundColor: 'rgba(255,255,255,0.70)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addRecipeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.green[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  addRecipeText: { color: colors.white, fontSize: 24, fontWeight: '600' },

  suggestBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(59,130,246,0.06)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.12)',
    padding: spacing.md,
  },
  suggestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  suggestEmoji: { fontSize: 24 },
  suggestTitle: { ...typography.bodyBold, color: colors.blue[800] },
  suggestSubtitle: { ...typography.caption, color: colors.blue[600], marginTop: 2 },
  suggestArrow: { fontSize: 16, color: colors.blue[600] },

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  recipeCard: {
    backgroundColor: colors.glass.elevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.60)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.glass,
  },
  cardHeader: {
    marginBottom: spacing.sm,
  },
  cardTitle: { flex: 1 },
  recipeName: { ...typography.bodyBold, color: colors.gray[900], marginBottom: 4, fontSize: 16 },
  recipeDescription: { ...typography.caption, color: colors.gray[500], lineHeight: 18 },

  cardInfo: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoIcon: { fontSize: 14 },
  infoText: { ...typography.small, color: colors.gray[600] },

  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tagChip: {
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagText: { ...typography.small, color: colors.green[700] },
  moreTagsText: { ...typography.small, color: colors.gray[500], paddingHorizontal: 4 },

  // Modal styles
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
  modalContentPadding: { padding: spacing.lg, paddingBottom: spacing.xl },

  quickInfo: {
    flexDirection: 'row',
    backgroundColor: colors.blue[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.blue[200],
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  quickInfoItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  quickInfoIcon: { fontSize: 20, marginBottom: 4 },
  quickInfoLabel: { ...typography.caption, color: colors.gray[600] },
  quickInfoValue: { ...typography.bodyBold, color: colors.blue[700], marginTop: 2 },
  quickInfoDivider: {
    width: 1,
    backgroundColor: colors.blue[200],
  },

  sectionTitle: { ...typography.bodyBold, color: colors.gray[900], marginBottom: spacing.sm, marginTop: spacing.lg },
  descriptionText: { ...typography.body, color: colors.gray[600], marginBottom: spacing.lg },

  allTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  tagChipLarge: {
    backgroundColor: colors.green[100],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tagTextLarge: { ...typography.body, color: colors.green[700] },

  ingredientRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  ingredientBullet: { ...typography.body, color: colors.gray[400], width: 16 },
  ingredientText: { ...typography.body, color: colors.gray[700], flex: 1 },

  instructionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  instructionNumber: {
    ...typography.bodyBold,
    color: colors.green[600],
    minWidth: 28,
    textAlign: 'center',
  },
  instructionText: { ...typography.body, color: colors.gray[700], flex: 1, lineHeight: 22 },

  // Add recipe form
  label: { ...typography.bodyBold, color: colors.gray[700], marginBottom: spacing.sm },
  timeRow: { flexDirection: 'row', gap: spacing.md },
  timeInput: { flex: 1 },

  largeInputContainer: { marginBottom: spacing.lg },
  largeInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.gray[900],
    textAlignVertical: 'top',
  },

  addButton: { marginTop: spacing.lg },

  // Empty state
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: { ...typography.h2, color: colors.gray[900], textAlign: 'center', marginBottom: spacing.sm },
  emptySubtitle: { ...typography.body, color: colors.gray[500], textAlign: 'center', marginBottom: spacing.xl },
  emptyButton: { marginTop: spacing.lg },
});
