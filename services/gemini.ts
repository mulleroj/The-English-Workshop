import { QuizQuestion, DifficultyLevel, Lesson, VocabItem } from "../types";

// Fisher-Yates Shuffle Algorithm
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Pick N random items from array (without repetition)
const pickRandom = <T>(array: T[], count: number): T[] => {
  return shuffleArray(array).slice(0, count);
};

// Get 3 wrong options from the vocab list (terms different from correct)
const getDistractors = (correctTerm: string, allItems: VocabItem[]): string[] => {
  const others = allItems
    .map(i => i.term)
    .filter(t => t.toLowerCase() !== correctTerm.toLowerCase());
  return pickRandom(others, 3);
};

// Easy question: "What is the English word for '[czech]'?" — multiple choice
const makeEasyQuestion = (item: VocabItem, allItems: VocabItem[], index: number): QuizQuestion => {
  const distractors = getDistractors(item.term, allItems);
  const options = shuffleArray([item.term, ...distractors]);
  return {
    id: `local-easy-${index}`,
    text: `What is the English word for "${item.translation}"?`,
    type: 'multiple-choice',
    options,
    correctAnswer: item.term,
    explanation: `"${item.translation}" in English is "${item.term}".`,
    difficulty: 'easy',
    emoji: item.emoji || '⚙️',
  };
};

// Medium question: "Which word means '[czech]'?" with Czech hint — multiple choice
const makeMediumQuestion = (item: VocabItem, allItems: VocabItem[], index: number): QuizQuestion => {
  const distractors = getDistractors(item.term, allItems);
  const options = shuffleArray([item.term, ...distractors]);
  return {
    id: `local-medium-${index}`,
    text: `Choose the correct English translation for: "${item.translation}"`,
    type: 'multiple-choice',
    options,
    correctAnswer: item.term,
    explanation: `The correct answer is "${item.term}" (${item.translation}).`,
    difficulty: 'medium',
    emoji: item.emoji || '⚙️',
  };
};

// Hard question: "Type the English word for '[czech]'" — text input
const makeHardQuestion = (item: VocabItem, allItems: VocabItem[], index: number): QuizQuestion => {
  return {
    id: `local-hard-${index}`,
    text: `Type the English word for: "${item.translation}"`,
    type: 'text-input',
    options: [],
    correctAnswer: item.term,
    explanation: `"${item.translation}" in English is "${item.term}".`,
    difficulty: 'hard',
    emoji: item.emoji || '⚙️',
  };
};

// Mixed question: alternates between easy multiple-choice and hard text-input
const makeMixedQuestion = (item: VocabItem, allItems: VocabItem[], index: number): QuizQuestion => {
  if (index % 2 === 0) {
    return makeEasyQuestion(item, allItems, index);
  } else {
    return makeHardQuestion(item, allItems, index);
  }
};

export const generateQuestions = async (
  lesson: Lesson,
  count: number = 10,
  difficulty: DifficultyLevel = 'mixed'
): Promise<QuizQuestion[]> => {

  // Only works for vocabulary lessons with a list of items
  if (!Array.isArray(lesson.content) || lesson.content.length === 0) {
    return [makeFallbackQuestion(difficulty)];
  }

  const allItems = lesson.content as VocabItem[];

  // Need at least 4 items for multiple-choice distractors
  if (allItems.length < 4) {
    return [makeFallbackQuestion(difficulty)];
  }

  // Pick random items for questions (can repeat within the quiz if fewer than 10)
  const available = allItems.length >= count
    ? pickRandom(allItems, count)
    : shuffleArray([...allItems, ...shuffleArray(allItems)]).slice(0, count);

  const questions: QuizQuestion[] = available.map((item, idx) => {
    switch (difficulty) {
      case 'easy':   return makeEasyQuestion(item, allItems, idx);
      case 'medium': return makeMediumQuestion(item, allItems, idx);
      case 'hard':   return makeHardQuestion(item, allItems, idx);
      case 'mixed':  return makeMixedQuestion(item, allItems, idx);
    }
  });

  return questions;
};

const makeFallbackQuestion = (difficulty: DifficultyLevel): QuizQuestion => ({
  id: 'fallback-1',
  text: 'What is the English word for "jablko"?',
  type: difficulty === 'hard' ? 'text-input' : 'multiple-choice',
  options: difficulty === 'hard' ? [] : ['apple', 'pear', 'banana', 'orange'],
  correctAnswer: 'apple',
  explanation: '"Jablko" in English is "apple".',
  difficulty: difficulty === 'mixed' ? 'easy' : (difficulty as 'easy' | 'medium' | 'hard'),
  emoji: '🍎',
});