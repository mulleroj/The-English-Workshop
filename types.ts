
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'mixed';

export type CourseLevel = 'elementary' | 'pre-intermediate';

export interface VocabItem {
  term: string;
  translation: string;
  emoji?: string;
}

export interface Lesson {
  id: string;
  course: CourseLevel; // New field to distinguish levels
  title: string;
  description: string;
  icon: string; // Lucide icon name
  emoji?: string; // Main emoji for the lesson
  type: 'generative' | 'vocabulary'; // 'generative' uses concepts, 'vocabulary' uses fixed list
  content: string | VocabItem[]; // Prompt context or list of words
}

export interface QuizQuestion {
  id: string;
  text: string;
  type: 'multiple-choice' | 'text-input';
  options?: string[]; // Optional for text-input
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  emoji?: string;
}

export enum GameState {
  COURSE_SELECT = 'COURSE_SELECT', // New Initial State
  LESSON_SELECT = 'LESSON_SELECT',
  MODE_SELECT = 'MODE_SELECT',
  FLASHCARDS = 'FLASHCARDS',
  DIFFICULTY_SELECT = 'DIFFICULTY_SELECT',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  ERROR = 'ERROR'
}

export interface PlayerStats {
  score: number;
  streak: number;
  totalQuestions: number;
  correctAnswers: number;
}

export interface LessonProgress {
  scores: {
    easy: number;
    medium: number;
    hard: number;
    mixed: number;
  };
  lastUpdated: number; // Timestamp
}
