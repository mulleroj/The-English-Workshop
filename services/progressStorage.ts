import { SavedProgress, CourseLevel, DifficultyLevel } from '../types';

export const STORAGE_KEY = 'englishWorkshopProgress:v1';

export const createEmptyProgress = (): SavedProgress => ({
  version: 1,
  lastSelection: {
    bookId: null,
    lessonId: null,
  },
  lessons: {},
});

export const loadProgress = (): SavedProgress => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return createEmptyProgress();
    
    const parsed = JSON.parse(data);
    if (parsed && parsed.version === 1 && typeof parsed.lessons === 'object' && parsed.lessons !== null) {
      return parsed as SavedProgress;
    }
  } catch (e) {
    console.error('[progressStorage] Error loading progress, falling back to empty:', e);
  }
  return createEmptyProgress();
};

export const writeProgress = (progress: SavedProgress): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch (e) {
    console.error('[progressStorage] Error writing progress:', e);
    return false;
  }
};

export const clearProgress = (): boolean => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    console.error('[progressStorage] Error clearing progress:', e);
    return false;
  }
};

export const updateLastSelection = (
  progress: SavedProgress,
  bookId: CourseLevel | null,
  lessonId: string | null
): SavedProgress => {
  return {
    ...progress,
    lastSelection: { bookId, lessonId },
  };
};

export const updateLessonScore = (
  progress: SavedProgress,
  bookId: CourseLevel,
  lessonId: string,
  difficulty: DifficultyLevel,
  score: number,
  total: number
): SavedProgress => {
  // calculate percent safely
  const percent = total <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((score / total) * 100)));
  
  // Immutably clone lessons structure
  const lessonsCopy = { ...progress.lessons };
  const bookLessons = { ...lessonsCopy[bookId] };
  const lessonProgress = bookLessons[lessonId] 
    ? { ...bookLessons[lessonId] }
    : {
        badges: { easy: false, medium: false, hard: false, mixed: false },
        bestScores: { easy: null, medium: null, hard: null, mixed: null },
      };

  const newBadges = {
    ...lessonProgress.badges,
    [difficulty]: true,
  };

  const newBestScores = { ...lessonProgress.bestScores };
  const currentBest = newBestScores[difficulty];

  if (!currentBest || percent > currentBest.percent) {
    newBestScores[difficulty] = {
      score,
      total,
      percent,
      completedAt: new Date().toISOString(),
    };
  }

  return {
    ...progress,
    lessons: {
      ...lessonsCopy,
      [bookId]: {
        ...bookLessons,
        [lessonId]: {
          badges: newBadges,
          bestScores: newBestScores,
        },
      },
    },
  };
};
