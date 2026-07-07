
import React, { useState, useCallback, useEffect } from 'react';
import { GameState, QuizQuestion, PlayerStats, DifficultyLevel, Lesson, LessonProgress, VocabItem, CourseLevel, SavedProgress } from './types';
import { generateQuestions } from './services/gemini';
import { loadProgress, writeProgress, clearProgress, updateLastSelection, updateLessonScore, createEmptyProgress } from './services/progressStorage';
import { lessons } from './data/lessons';
import QuizCard from './components/QuizCard';
import Flashcard from './components/Flashcard';
import Button from './components/Button';
import VocabularyPrintView from './components/VocabularyPrintView';
import { Users, Star, RotateCcw, Award, Play, Signal, QrCode, X, ArrowLeft, Globe, BookOpen, Music, MapPin, Grid, Smile, Shirt, Utensils, RefreshCw, Building2, Tent, Laptop, Trophy, Home, Map, GraduationCap, ChevronLeft, ChevronRight, Wrench, Hammer, Mountain, Clapperboard, CloudLightning, Briefcase, Plane, CreditCard, Siren, Microscope, Sunset, Info, CloudRain, IdCard, Clock, PawPrint, Printer } from 'lucide-react';
import confetti from 'canvas-confetti';

// Helper to map icon string to Component
const IconMap: Record<string, React.FC<any>> = {
  Users: Users,
  Globe: Globe,
  BookOpen: BookOpen,
  Music: Music,
  MapPin: MapPin,
  Grid: Grid,
  Smile: Smile,
  Shirt: Shirt,
  Utensils: Utensils,
  Building2: Building2,
  Tent: Tent,
  Laptop: Laptop,
  Trophy: Trophy,
  Home: Home,
  Map: Map,
  Wrench: Wrench,
  Mountain: Mountain,
  Clapperboard: Clapperboard,
  CloudLightning: CloudLightning,
  Briefcase: Briefcase,
  Plane: Plane,
  CreditCard: CreditCard,
  Siren: Siren,
  Microscope: Microscope,
  Sunset: Sunset,
  CloudRain: CloudRain,
  IdCard: IdCard,
  Clock: Clock,
  PawPrint: PawPrint
};

const STORAGE_KEY = 'english-quest-progress-v2';

// Fisher-Yates Shuffle Algorithm for local use
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.COURSE_SELECT);
  const [selectedCourse, setSelectedCourse] = useState<CourseLevel | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [incorrectQuestions, setIncorrectQuestions] = useState<QuizQuestion[]>([]); // Track mistakes
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [stats, setStats] = useState<PlayerStats>({ score: 0, streak: 0, totalQuestions: 0, correctAnswers: 0 });
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('mixed');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showStudentInfoModal, setShowStudentInfoModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'units' | 'topics'>('units');
  
  // Flashcard State
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [flashcardDeck, setFlashcardDeck] = useState<VocabItem[]>([]); // State for shuffled cards
  
  // Progress State
  const [progress, setProgress] = useState<SavedProgress>(createEmptyProgress());

  // Load progress from LocalStorage on mount and restore navigation
  useEffect(() => {
    const loaded = loadProgress();
    setProgress(loaded);

    // Restore last textbook/lesson selection if valid
    if (loaded.lastSelection && loaded.lastSelection.bookId) {
      const bookId = loaded.lastSelection.bookId;
      setSelectedCourse(bookId);
      setGameState(GameState.LESSON_SELECT);
      
      if (loaded.lastSelection.lessonId) {
        const lessonId = loaded.lastSelection.lessonId;
        // Verify that the lesson exists in the dataset and belongs to the selected textbook
        const matchedLesson = lessons.find(l => l.id === lessonId && l.course === bookId);
        if (matchedLesson) {
          setSelectedLesson(matchedLesson);
          setGameState(GameState.MODE_SELECT);
        }
      }
    }
  }, []);

  useEffect(() => {
      // Background Image Application - Directly to Root Element
      const rootElement = document.getElementById('root') || document.body;
      if (rootElement) {
         // Using cssText for aggressive application, but relying on CSS in index.html mainly.
         // This is a backup or dynamic override if needed.
         // For now, we removed the forceful JS injection to let index.html CSS work.
      }
  }, []);

  const saveProgress = (lessonId: string, correct: number, total: number, difficultyPlayed: DifficultyLevel) => {
    if (total === 0 || !selectedCourse) return;
    
    setProgress(prev => {
      const next = updateLessonScore(prev, selectedCourse, lessonId, difficultyPlayed, correct, total);
      writeProgress(next);
      return next;
    });
  };

  const handleResetProgress = () => {
    const confirm = window.confirm("Opravdu chcete vymazat pokrok uložený na tomto zařízení?");
    if (confirm) {
      clearProgress();
      setProgress(createEmptyProgress());
      setSelectedCourse(null);
      setSelectedLesson(null);
      setGameState(GameState.COURSE_SELECT);
      setShowStudentInfoModal(false);
    }
  };

  const selectCourse = (course: CourseLevel) => {
    setSelectedCourse(course);
    setGameState(GameState.LESSON_SELECT);
    setProgress(prev => {
      const next = updateLastSelection(prev, course, null);
      writeProgress(next);
      return next;
    });
  };

  const selectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setGameState(GameState.MODE_SELECT); 
    setProgress(prev => {
      const next = updateLastSelection(prev, lesson.course, lesson.id);
      writeProgress(next);
      return next;
    });
  };

  const handleModeSelect = (mode: 'learn' | 'test') => {
    if (mode === 'test') {
      setGameState(GameState.DIFFICULTY_SELECT);
    } else {
      // Learn Mode - Initialize un-shuffled list for manual viewing
      if (selectedLesson && Array.isArray(selectedLesson.content)) {
        setFlashcardDeck(selectedLesson.content as VocabItem[]);
        setCurrentFlashcardIndex(0);
        setGameState(GameState.FLASHCARDS);
      }
    }
  };

  const backToMenu = () => {
    // If we are in lesson select (viewing units), go back to Course Select
    if (gameState === GameState.LESSON_SELECT) {
        setGameState(GameState.COURSE_SELECT);
        setSelectedCourse(null);
        setProgress(prev => {
          const next = updateLastSelection(prev, null, null);
          writeProgress(next);
          return next;
        });
    } 
    // Otherwise go back to Lesson Select
    else {
        setGameState(GameState.LESSON_SELECT);
        setSelectedLesson(null);
        setQuestions([]);
        setIncorrectQuestions([]);
        setIsReviewMode(false);
        setFlashcardDeck([]); // Clear deck
        setProgress(prev => {
          const next = updateLastSelection(prev, selectedCourse, null);
          writeProgress(next);
          return next;
        });
    }
  };

  const startGame = useCallback(async () => {
    if (!selectedLesson) return;

    setGameState(GameState.LOADING);
    setStats({ score: 0, streak: 0, totalQuestions: 0, correctAnswers: 0 });
    setIncorrectQuestions([]); // Clear mistakes on fresh start
    setIsReviewMode(false); // Reset review mode on fresh start
    setCurrentQuestionIndex(0);
    setIsAnswered(false);
    setSelectedAnswer(null);

    try {
      const generatedQuestions = await generateQuestions(selectedLesson, 10, difficulty);
      setQuestions(generatedQuestions);
      setGameState(GameState.PLAYING);
    } catch (err) {
      console.error(err);
      setGameState(GameState.ERROR);
    }
  }, [difficulty, selectedLesson]);

  // Review Mode Logic
  const startReview = () => {
    if (incorrectQuestions.length === 0) return;

    // Create a copy of the incorrect questions array to avoid mutation
    const reviewQuestions = [...incorrectQuestions];
    setQuestions(reviewQuestions); // Set questions to the ones missed
    setIncorrectQuestions([]); // Reset mistake tracking for this new round
    setIsReviewMode(true); // Flag review mode
    setStats({ score: 0, streak: 0, totalQuestions: 0, correctAnswers: 0 });
    setCurrentQuestionIndex(0);
    setIsAnswered(false);
    setSelectedAnswer(null);
    setGameState(GameState.PLAYING);
  };

  // Confetti Animation Trigger
  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const playApplause = (delaySeconds: number = 0) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const startTime = ctx.currentTime + delaySeconds;
      
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(1, startTime);
      masterGain.gain.exponentialRampToValueAtTime(0.01, startTime + 4);
      masterGain.connect(ctx.destination);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;
      filter.Q.value = 1.5;
      filter.connect(masterGain);

      const clapCount = 50;
      
      for (let i = 0; i < clapCount; i++) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        source.connect(gain);
        gain.connect(filter);
        const clapStart = startTime + (Math.random() * 2.5); 
        const duration = 0.08 + Math.random() * 0.05; 
        gain.gain.setValueAtTime(0, clapStart);
        gain.gain.linearRampToValueAtTime(0.1 + Math.random() * 0.1, clapStart + 0.01); 
        gain.gain.exponentialRampToValueAtTime(0.001, clapStart + duration);
        source.start(clapStart);
        source.stop(clapStart + duration);
      }
    } catch (e) {
      console.error("Audio failed", e);
    }
  };

  const handleAnswer = (answer: string) => {
    setIsAnswered(true);
    setSelectedAnswer(answer);
    
    const currentQ = questions[currentQuestionIndex];
    const normalize = (s: string) => s.trim().toLowerCase();
    const isCorrect = normalize(answer) === normalize(currentQ.correctAnswer);
    
    const newCorrectAnswers = isCorrect ? stats.correctAnswers + 1 : stats.correctAnswers;
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    if (!isCorrect) {
      setIncorrectQuestions(prev => [...prev, currentQ]);
    }

    if (isLastQuestion && newCorrectAnswers === questions.length) {
      playApplause(3.5);
      setTimeout(() => triggerConfetti(), 3500);
    }

    setStats(prev => ({
      ...prev,
      totalQuestions: prev.totalQuestions + 1,
      correctAnswers: newCorrectAnswers,
      score: isCorrect ? prev.score + (100 + (prev.streak * 10)) : prev.score,
      streak: isCorrect ? prev.streak + 1 : 0
    }));

    setTimeout(() => {
      if (!isLastQuestion) {
        setCurrentQuestionIndex(prev => prev + 1);
        setIsAnswered(false);
        setSelectedAnswer(null);
      } else {
        if (!isReviewMode && selectedLesson && questions.length >= 5) {
            saveProgress(selectedLesson.id, newCorrectAnswers, questions.length, difficulty);
        }
        setGameState(GameState.GAME_OVER);
      }
    }, 3500);
  };

  const DifficultyBadges = ({ progressData }: { progressData: { badges: Record<DifficultyLevel, boolean>, bestScores: Record<DifficultyLevel, any> } }) => {
    const getStars = (bestScore: any) => {
      if (!bestScore) return 0;
      if (bestScore.percent >= 90) return 3;
      if (bestScore.percent >= 70) return 2;
      return 1;
    };

    // Badges designed as status lights
    const badges = [
      { id: 'easy', label: 'E', color: 'bg-zinc-900 text-zinc-600 border-zinc-700', activeColor: 'bg-emerald-900 text-emerald-400 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]', active: progressData.badges.easy, stars: getStars(progressData.bestScores.easy) },
      { id: 'medium', label: 'M', color: 'bg-zinc-900 text-zinc-600 border-zinc-700', activeColor: 'bg-yellow-900 text-yellow-400 border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]', active: progressData.badges.medium, stars: getStars(progressData.bestScores.medium) },
      { id: 'hard', label: 'H', color: 'bg-zinc-900 text-zinc-600 border-zinc-700', activeColor: 'bg-red-900 text-red-400 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]', active: progressData.badges.hard, stars: getStars(progressData.bestScores.hard) },
      { id: 'mixed', label: 'X', color: 'bg-zinc-900 text-zinc-600 border-zinc-700', activeColor: 'bg-purple-900 text-purple-400 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]', active: progressData.badges.mixed, stars: getStars(progressData.bestScores.mixed) },
    ];

    return (
      <div className="flex gap-2 mt-2">
        {badges.map((badge) => (
          <div 
            key={badge.id} 
            className={`
              w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-mono font-bold border
              ${badge.active ? badge.activeColor : badge.color}
            `}
            title={`${badge.id.toUpperCase()}: ${badge.stars} Stars`}
            aria-label={`${badge.id} difficulty: ${badge.stars} stars`}
          >
            {badge.active ? badge.stars : badge.label}
          </div>
        ))}
      </div>
    );
  };

  // Filter lessons based on selected course
  const filteredLessons = lessons.filter(l => l.course === selectedCourse);
  const unitLessons = filteredLessons.filter(l => l.title.includes('Unit'));
  const topicLessons = filteredLessons.filter(l => !l.title.includes('Unit'));

  const renderLessonCard = (lesson: Lesson) => {
    const Icon = IconMap[lesson.icon] || Grid;
    const lessonProgress = progress.lessons[lesson.course]?.[lesson.id] || {
      badges: { easy: false, medium: false, hard: false, mixed: false },
      bestScores: { easy: null, medium: null, hard: null, mixed: null }
    };
    
    // Determine visual style based on Course Level
    // Elementary = Green theme
    // Pre-Intermediate = Red theme
    let borderClass = 'border-zinc-700 hover:border-blue-500';
    let iconColor = 'text-blue-500';
    let hoverShadow = 'hover:shadow-blue-900/20';

    if (lesson.course === 'elementary') {
        borderClass = 'border-zinc-700 hover:border-emerald-600';
        iconColor = 'text-emerald-500';
        hoverShadow = 'hover:shadow-emerald-900/20';
    } else if (lesson.course === 'pre-intermediate') {
        borderClass = 'border-zinc-700 hover:border-red-600';
        iconColor = 'text-red-500';
        hoverShadow = 'hover:shadow-red-900/20';
    }

    return (
      <button
        key={lesson.id}
        onClick={() => selectLesson(lesson)}
        className={`bg-zinc-800 p-4 md:p-6 rounded-md shadow-lg border-2 ${borderClass} ${hoverShadow} hover:shadow-2xl transition-all duration-200 group text-left relative overflow-hidden flex flex-col h-full min-h-[160px] md:min-h-[220px]`}
      >
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
           <Icon size={80} className="text-zinc-200 transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" />
        </div>
        <div className="relative z-10 flex flex-col h-full w-full">
          <div className="flex items-start justify-between mb-3 md:mb-4">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-sm flex items-center justify-center group-hover:bg-zinc-700 transition-colors flex-shrink-0 bg-zinc-900 border border-zinc-600 ${iconColor}`}>
              <Icon size={20} className="md:w-6 md:h-6" />
            </div>
            <div className="text-right">
               <span className="text-2xl md:text-3xl filter drop-shadow-sm block mb-1">{lesson.emoji}</span>
            </div>
          </div>
          
          <h3 className="text-base md:text-xl font-mono font-bold text-zinc-100 mb-1 md:mb-2 group-hover:text-yellow-400 transition-colors leading-tight">{lesson.title}</h3>
          <p className="text-zinc-400 text-xs md:text-sm leading-relaxed flex-grow line-clamp-2">{lesson.description}</p>
          
          <div className="mt-auto pt-3 border-t border-zinc-700/50">
             <DifficultyBadges progressData={lessonProgress} />
          </div>
        </div>
      </button>
    );
  };

  // Header Title Logic
  const getHeaderTitle = () => {
      if (selectedCourse === 'elementary') return 'THE ENGLISH WORKSHOP (ELEM)';
      if (selectedCourse === 'pre-intermediate') return 'HEAVY DUTY ENGLISH (PRE-INT)';
      return 'THE ENGLISH WORKSHOP';
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-200 flex flex-col">
      {/* HEADER: Industrial Toolbar Look - REMOVED STICKY to allow it to scroll away */}
      <header className={`bg-zinc-950 border-b-4 p-4 shadow-xl relative z-40 transition-colors duration-300 ${
        selectedCourse === 'elementary' ? 'border-emerald-600' : 
        selectedCourse === 'pre-intermediate' ? 'border-red-600' : 'border-yellow-500'
      }`}>
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {gameState !== GameState.COURSE_SELECT && (
              <button 
                onClick={backToMenu}
                className={`p-1 hover:bg-zinc-800 rounded-sm transition-colors border border-transparent ${
                   selectedCourse === 'elementary' ? 'text-emerald-500 hover:border-emerald-500/50' :
                   selectedCourse === 'pre-intermediate' ? 'text-red-500 hover:border-red-500/50' : 'text-yellow-500 hover:border-yellow-500/50'
                }`}
                title="Back"
                aria-label="Zpět na výběr lekce"
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <h1 className={`text-lg md:text-xl font-mono font-black uppercase tracking-widest hidden sm:flex items-center gap-2 ${
               selectedCourse === 'elementary' ? 'text-emerald-500' : 
               selectedCourse === 'pre-intermediate' ? 'text-red-500' : 'text-yellow-500'
            }`}>
              {selectedLesson ? (
                <span className="text-zinc-400 truncate max-w-[200px]">{selectedLesson.title}</span>
              ) : (
                <>
                  {getHeaderTitle()} 
                  <span className="animate-spin-slow">⚙️</span>
                </>
              )}
            </h1>
          </div>
          
          {gameState === GameState.PLAYING && (
            <div className="flex gap-4 text-sm md:text-base font-mono">
              <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-3 py-1 rounded-sm">
                <Star size={16} className="text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-yellow-500">{stats.score}</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-3 py-1 rounded-sm">
                <span className="text-zinc-400">Q:</span>
                <span className="font-bold">{currentQuestionIndex + 1}<span className="text-zinc-400">/</span>{questions.length}</span>
              </div>
            </div>
          )}
          
          {gameState === GameState.COURSE_SELECT && (
            <div className="flex gap-2">
              <button 
                onClick={() => setShowStudentInfoModal(true)} 
                className="flex items-center gap-2 bg-transparent hover:bg-zinc-800 border border-zinc-600 px-3 py-1.5 rounded-sm text-sm font-mono font-bold transition-colors text-zinc-400 hover:text-zinc-200"
                title="Návod pro žáky"
                aria-label="Otevřít návod pro žáky"
              >
                <GraduationCap size={16} />
                <span className="hidden sm:inline">NÁVOD</span>
              </button>
              <button 
                onClick={() => setShowInfoModal(true)} 
                className="flex items-center gap-2 bg-transparent hover:bg-zinc-800 border border-zinc-600 px-3 py-1.5 rounded-sm text-sm font-mono font-bold transition-colors text-zinc-400 hover:text-zinc-200"
                title="Teacher Guide"
                aria-label="Otevřít příručku pro učitele"
              >
                <Info size={16} />
                <span className="hidden sm:inline">TEACHER</span>
              </button>
              <button 
                onClick={() => setShowQrModal(true)} 
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 border border-blue-600 hover:border-blue-500 px-3 py-1.5 rounded-sm text-sm font-mono font-bold transition-colors text-white shadow-lg hover:shadow-blue-500/20"
                aria-label="Zobrazit QR kód pro připojení"
              >
                <QrCode size={16} />
                <span className="hidden sm:inline">CONNECT</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        
        {/* COURSE SELECT (LANDING PAGE) */}
        {gameState === GameState.COURSE_SELECT && (
          <div className="max-w-4xl w-full animate-fade-in flex flex-col items-center">
             <div className="text-center mb-8">
                <h2 className="text-3xl md:text-5xl font-mono font-black text-zinc-100 mb-2 uppercase tracking-tight">ENGLISH WORKSHOP HUB</h2>
                <p className="text-zinc-400 font-mono text-sm">SELECT COLOUR ACCORDING TO YOUR BOOK</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {/* ELEMENTARY COURSE */}
                <button
                   onClick={() => selectCourse('elementary')}
                   className="bg-zinc-800 p-8 md:p-12 rounded-md border-2 border-emerald-600 hover:border-emerald-400 hover:bg-zinc-750 hover:shadow-2xl hover:shadow-emerald-900/20 transition-all duration-300 flex flex-col items-center gap-6 group text-center"
                >
                   <div className="bg-zinc-900 text-emerald-500 p-6 rounded-full group-hover:scale-110 transition-transform border border-emerald-900">
                      <Wrench size={64} />
                   </div>
                   <div>
                      <h3 className="text-2xl md:text-3xl font-mono font-bold text-emerald-500 mb-2 group-hover:text-emerald-400">THE ENGLISH WORKSHOP</h3>
                      <p className="text-zinc-400 font-mono text-sm tracking-widest uppercase">Elementary Level</p>
                      
                   </div>
                </button>

                {/* PRE-INTERMEDIATE COURSE */}
                <button
                   onClick={() => selectCourse('pre-intermediate')}
                   className="bg-zinc-800 p-8 md:p-12 rounded-md border-2 border-red-600 hover:border-red-400 hover:bg-zinc-750 hover:shadow-2xl hover:shadow-red-900/20 transition-all duration-300 flex flex-col items-center gap-6 group text-center"
                >
                   <div className="bg-zinc-900 text-red-500 p-6 rounded-full group-hover:scale-110 transition-transform border border-red-900">
                      <Hammer size={64} />
                   </div>
                   <div>
                      <h3 className="text-2xl md:text-3xl font-mono font-bold text-red-500 mb-2 group-hover:text-red-400">HEAVY DUTY ENGLISH</h3>
                      <p className="text-zinc-400 font-mono text-sm tracking-widest uppercase">Pre-Intermediate Level</p>
                      
                   </div>
                </button>
             </div>
          </div>
        )}

        {/* LESSON SELECT STATE */}
        {gameState === GameState.LESSON_SELECT && (
          <div className="max-w-5xl w-full animate-fade-in pb-8">
             <div className="text-center mb-4">
                <h2 className="text-3xl md:text-4xl font-mono font-black text-zinc-100 mb-2 uppercase tracking-tight">Select Module</h2>
                <p className="text-zinc-400 font-mono text-sm">/ SYSTEM READY / SELECT TOPIC TO BEGIN /</p>
                <p className="text-zinc-400 font-mono text-xs mt-3 select-none">
                  E = Easy · M = Medium · H = Hard · X = Mix
                </p>
             </div>

             {/* Sticky Tab Navigation: Physical Switch Look */}
             {/* Added sticky, top-0, z-50, and opaque background to cover content underneath */}
             <div className="sticky top-0 z-50 bg-[#1a1a1a] border-b border-yellow-500/20 shadow-2xl py-4 mb-6 -mx-4 px-4 md:-mx-0 md:rounded-b-md">
               <div className="flex justify-center gap-0 bg-zinc-950 p-1 rounded-md border border-zinc-800 max-w-md mx-auto">
                 <button
                   onClick={() => setActiveTab('units')}
                   className={`
                     flex-1 py-3 rounded-sm font-mono font-bold text-sm md:text-base flex justify-center items-center gap-2 transition-all duration-200
                     ${activeTab === 'units' 
                       ? 'bg-blue-600 text-white shadow-lg' 
                       : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}
                   `}
                 >
                   <BookOpen size={18} />
                   UNITS
                 </button>
                 <button
                   onClick={() => setActiveTab('topics')}
                   className={`
                     flex-1 py-3 rounded-sm font-mono font-bold text-sm md:text-base flex justify-center items-center gap-2 transition-all duration-200
                     ${activeTab === 'topics' 
                       ? 'bg-emerald-600 text-white shadow-lg' 
                       : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}
                   `}
                 >
                   <Grid size={18} />
                   TOPICS
                 </button>
               </div>
             </div>

             {filteredLessons.length === 0 ? (
                 <div className="text-center p-12 border-2 border-dashed border-zinc-700 rounded-md">
                     <p className="text-zinc-400 font-mono text-lg">NO MODULES LOADED FOR THIS LEVEL</p>
                     <p className="text-zinc-500 text-sm mt-2">Content coming soon...</p>
                 </div>
             ) : (
                <>
                    {activeTab === 'units' && (
                    <div className="animate-fade-in">
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {unitLessons.length > 0 ? unitLessons.map(lesson => renderLessonCard(lesson)) : <p className="col-span-full text-center text-zinc-500 font-mono">No units available.</p>}
                        </div>
                    </div>
                    )}

                    {activeTab === 'topics' && (
                    <div className="animate-fade-in">
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {topicLessons.length > 0 ? topicLessons.map(lesson => renderLessonCard(lesson)) : <p className="col-span-full text-center text-zinc-500 font-mono">No topics available.</p>}
                        </div>
                    </div>
                    )}
                </>
             )}
          </div>
        )}

        {/* MODE SELECT STATE */}
        {gameState === GameState.MODE_SELECT && selectedLesson && (
          <div className="max-w-2xl w-full animate-fade-in">
             <div className="text-center mb-8">
                <div className="text-6xl mb-4 animate-bounce-in">{selectedLesson.emoji}</div>
                <h2 className="text-3xl font-mono font-black text-zinc-100 mb-2 uppercase">{selectedLesson.title}</h2>
                <p className="text-zinc-400 font-mono">SELECT OPERATION MODE</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Learn Mode Button */}
                <button
                   onClick={() => handleModeSelect('learn')}
                   disabled={!Array.isArray(selectedLesson.content)} 
                   className={`
                      p-8 rounded-md border-2 transition-all duration-300 flex flex-col items-center gap-4 group
                      ${Array.isArray(selectedLesson.content)
                        ? 'bg-zinc-800 border-zinc-700 hover:border-yellow-500 hover:bg-zinc-750 cursor-pointer'
                        : 'bg-zinc-900 border-zinc-800 opacity-50 cursor-not-allowed'
                      }
                   `}
                >
                   <div className={`p-4 rounded-sm ${Array.isArray(selectedLesson.content) ? 'bg-zinc-900 text-yellow-500' : 'bg-zinc-900 text-zinc-600'}`}>
                      <GraduationCap size={48} />
                   </div>
                   <div className="text-center">
                       <h3 className="text-2xl font-mono font-bold text-zinc-200 mb-1 group-hover:text-yellow-500">LEARN</h3>
                       <p className="text-sm text-zinc-400">Flashcards</p>
                       {!Array.isArray(selectedLesson.content) && <p className="text-xs text-red-500 mt-2 font-mono">(UNAVAILABLE)</p>}
                   </div>
                </button>

                {/* Test Mode Button */}
                <button
                   onClick={() => handleModeSelect('test')}
                   className="bg-zinc-800 p-8 rounded-md border-2 border-zinc-700 hover:border-yellow-500 hover:bg-zinc-750 transition-all duration-300 flex flex-col items-center gap-4 cursor-pointer group"
                >
                   <div className="bg-zinc-900 text-yellow-500 p-4 rounded-sm group-hover:scale-110 transition-transform">
                      <Play size={48} fill="currentColor" />
                   </div>
                   <div className="text-center">
                       <h3 className="text-2xl font-mono font-bold text-zinc-200 mb-1 group-hover:text-yellow-500">TEST</h3>
                       <p className="text-sm text-zinc-400">Quiz</p>
                   </div>
                </button>
             </div>

             {/* Print View Button */}
             <div className="mt-8 flex justify-center">
               <button
                 onClick={() => setGameState(GameState.PRINT_VIEW)}
                 className="flex items-center gap-2 bg-zinc-800/80 border border-zinc-700 hover:border-yellow-500 hover:bg-zinc-750 text-zinc-300 hover:text-white px-5 py-2.5 rounded-sm font-mono font-bold text-xs tracking-wider transition-all active:scale-95 cursor-pointer"
                 aria-label="Tisk slovíček"
               >
                 <Printer size={16} />
                 <span>PRINT VOCABULARY</span>
               </button>
             </div>
          </div>
        )}

        {/* FLASHCARDS STATE */}
        {gameState === GameState.FLASHCARDS && flashcardDeck.length > 0 && (
          <div className="w-full max-w-lg animate-fade-in flex flex-col items-center">
             <div className="bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-sm shadow-sm mb-4 sm:mb-6 font-mono font-bold text-yellow-500 flex items-center gap-2">
                <GraduationCap size={18} />
                <span>ITEM {currentFlashcardIndex + 1} / {flashcardDeck.length}</span>
             </div>

             <Flashcard 
                key={currentFlashcardIndex} 
                item={flashcardDeck[currentFlashcardIndex]} 
             />

             <div className="flex justify-between items-center w-full mt-4 sm:mt-8 gap-4">
                <Button 
                   onClick={() => setCurrentFlashcardIndex(prev => Math.max(0, prev - 1))}
                   disabled={currentFlashcardIndex === 0}
                   variant="secondary"
                   className="flex-1 flex justify-center items-center gap-2"
                >
                   <ChevronLeft size={20} /> PREV
                </Button>

                <Button 
                   onClick={() => setCurrentFlashcardIndex(prev => Math.min(flashcardDeck.length - 1, prev + 1))}
                   disabled={currentFlashcardIndex === flashcardDeck.length - 1}
                   variant="primary"
                   className="flex-1 flex justify-center items-center gap-2"
                >
                   NEXT <ChevronRight size={20} />
                </Button>
             </div>
          </div>
        )}

        {/* DIFFICULTY SELECT STATE */}
        {gameState === GameState.DIFFICULTY_SELECT && selectedLesson && (
          <div className="text-center max-w-md w-full animate-fade-in relative">
            <div className="mb-6 relative inline-block">
               <div className="w-24 h-24 bg-zinc-800 border-2 border-zinc-700 rounded-sm flex items-center justify-center mx-auto text-yellow-500 shadow-lg">
                 <span className="text-6xl">{selectedLesson.emoji}</span>
               </div>
            </div>
            
            <h1 className="text-2xl font-mono font-black text-zinc-100 mb-2 tracking-tight uppercase">
              {selectedLesson.title}
            </h1>
            <p className="text-zinc-400 mb-8 font-mono text-sm">
              SELECT DIFFICULTY LEVEL
            </p>

            <div className="mb-8 bg-zinc-800 p-6 rounded-md border border-zinc-700 shadow-xl">
              <div className="flex items-center justify-center gap-2 mb-4 text-yellow-500 font-mono font-bold">
                <Signal size={18} />
                <span>LEVEL</span>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {(['easy', 'medium', 'hard', 'mixed'] as DifficultyLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`px-5 py-3 rounded-sm font-mono font-bold text-sm uppercase transition-all duration-200 border-2 ${
                      difficulty === level 
                        ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg' 
                        : 'bg-zinc-900 text-zinc-500 border-zinc-700 hover:border-yellow-500 hover:text-yellow-500'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            
            <Button onClick={startGame} fullWidth className="text-xl py-4 shadow-xl">
              <div className="flex items-center justify-center gap-3">
                <Play size={24} fill="currentColor" />
                START
              </div>
            </Button>
          </div>
        )}

        {/* LOADING STATE */}
        {gameState === GameState.LOADING && (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-zinc-700 border-t-yellow-500 rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-mono font-bold text-zinc-300">INITIALIZING...</h2>
            <p className="text-zinc-500 mt-2 font-mono text-sm uppercase">Loading {difficulty} sequence for {selectedLesson?.title}</p>
          </div>
        )}

        {/* PLAYING STATE */}
        {gameState === GameState.PLAYING && questions.length > 0 && (
          <div className="w-full max-w-lg flex flex-col items-center">
            {isReviewMode && (
              <div className="w-full mb-4 bg-yellow-950/60 border border-yellow-500/30 text-yellow-500 px-4 py-2.5 rounded-sm flex items-center justify-center gap-2 font-mono font-bold text-xs uppercase tracking-wide">
                <RefreshCw size={14} className="animate-spin-slow" />
                <span>Practice Mode: Retrying Mistakes / Procvičení chyb</span>
              </div>
            )}
            <QuizCard 
              question={questions[currentQuestionIndex]}
              onAnswer={handleAnswer}
              isAnswered={isAnswered}
              selectedAnswer={selectedAnswer}
            />
          </div>
        )}

        {/* GAME OVER STATE */}
        {gameState === GameState.GAME_OVER && (
          <div className="max-w-md w-full bg-zinc-800 border border-zinc-700 rounded-md shadow-2xl p-8 text-center animate-scale-in">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-4 ${
              stats.correctAnswers === questions.length ? 'bg-zinc-900 border-yellow-500 animate-pulse' : 'bg-zinc-900 border-zinc-600'
            }`}>
              <Award size={48} className={stats.correctAnswers === questions.length ? "text-yellow-500" : "text-zinc-500"} />
            </div>
            
            <h2 className="text-3xl font-mono font-bold text-zinc-100 mb-2 uppercase">
              {stats.correctAnswers === questions.length 
                ? "SYSTEM PERFECT" 
                : (isReviewMode ? "PRACTICE COMPLETE" : "SESSION COMPLETE")
              }
            </h2>
            <p className="text-zinc-400 mb-8 font-mono text-sm">
              Module: {selectedLesson?.title}
              {incorrectQuestions.length > 0 && <span className="block text-red-500 mt-2 font-bold">{incorrectQuestions.length} ERRORS DETECTED</span>}
              {incorrectQuestions.length === 0 && <span className="block text-emerald-400 mt-2 font-bold">BEZ CHYB / NO ERRORS</span>}
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-sm">
                <p className="text-xs text-zinc-500 uppercase font-mono font-bold mb-1">Score</p>
                <p className="text-3xl font-mono font-black text-yellow-500">{stats.score}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-sm">
                <p className="text-xs text-zinc-500 uppercase font-mono font-bold mb-1">Accuracy</p>
                <p className="text-3xl font-mono font-black text-emerald-500">{stats.correctAnswers}/{questions.length}</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Review Mistakes Button - Only visible if there are errors */}
              {incorrectQuestions.length > 0 && (
                <Button onClick={startReview} variant="danger" fullWidth>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={20} />
                      <span className="font-mono font-bold text-sm uppercase">Retry wrong answers ({incorrectQuestions.length})</span>
                    </div>
                    <span className="text-[10px] opacity-75 font-sans font-normal mt-0.5">Zopakovat jen chyby</span>
                  </div>
                </Button>
              )}

              <Button onClick={() => setGameState(GameState.LESSON_SELECT)} variant="primary" fullWidth>
                <div className="flex items-center justify-center gap-2">
                  <RotateCcw size={20} />
                  RETURN TO WORKSHOP
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* PRINT VIEW STATE */}
        {gameState === GameState.PRINT_VIEW && selectedLesson && (
          <VocabularyPrintView 
            lesson={selectedLesson}
            onBack={() => setGameState(GameState.MODE_SELECT)}
          />
        )}

        {/* ERROR STATE */}
        {gameState === GameState.ERROR && (
          <div className="text-center bg-zinc-800 p-8 rounded-md border border-red-900 shadow-xl max-w-sm">
             <div className="text-5xl mb-4">⚠️</div>
             <h3 className="text-xl font-mono font-bold text-red-500 mb-2">SYSTEM ERROR</h3>
             <p className="text-zinc-400 mb-6">Failed to generate sequence. Check connection.</p>
             <Button onClick={backToMenu}>REBOOT</Button>
          </div>
        )}

        {/* QR CODE MODAL */}
        {showQrModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-zinc-800 border border-zinc-600 rounded-md p-6 max-w-sm w-full relative shadow-2xl">
              <button 
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white bg-zinc-700 rounded-sm p-1"
                aria-label="Zavřít QR kód"
              >
                <X size={20} />
              </button>
              
              <div className="text-center">
                <h3 className="text-2xl font-mono font-bold text-yellow-500 mb-2">SCAN ACCESS CODE</h3>
                <p className="text-zinc-400 mb-6 text-sm font-mono">Connect mobile device to workshop network.</p>
                
                <div className="bg-white p-2 rounded-sm border-4 border-yellow-500 mb-6 inline-block">
                  <img 
                    src="/qr/english-workshop-url.png" 
                    alt="Scan to join"
                    className="w-full h-auto" 
                  />
                </div>

                <Button fullWidth variant="primary" onClick={() => setShowQrModal(false)}>
                  CLOSE
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TEACHER GUIDE MODAL */}
        {showInfoModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-zinc-800 border border-zinc-600 rounded-md p-0 max-w-lg w-full relative shadow-2xl max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b border-zinc-700 bg-zinc-900 rounded-t-md">
                   <h3 className="text-xl font-mono font-bold text-yellow-500 flex items-center gap-2">
                     <Info size={24} />
                     TEACHER'S GUIDE
                   </h3>
                   <button 
                      onClick={() => setShowInfoModal(false)}
                      className="text-zinc-500 hover:text-white bg-zinc-700 rounded-sm p-1 transition-colors"
                      aria-label="Zavřít příručku pro učitele"
                    >
                      <X size={20} />
                    </button>
                </div>
                
                {/* Modal Content - Scrollable */}
                <div className="p-6 overflow-y-auto text-zinc-300 font-sans leading-relaxed text-sm md:text-base" lang="cs">
                   
                   <div className="mb-6">
                      <h4 className="text-yellow-500 font-mono font-bold mb-2 uppercase border-b border-zinc-700 pb-1">O APLIKACI</h4>
                      <p className="mb-2">Tato aplikace je navržena pro výuku technické angličtiny na SPŠ. Je rozdělena na dvě úrovně:</p>
                      <ul className="space-y-2 ml-1">
                         <li className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold mt-1">🟢</span>
                            <span><strong className="text-emerald-500 font-mono">THE ENGLISH WORKSHOP (Elementary):</strong> Odpovídá slovní zásobě z učebnice Maturita Solutions Elementary, doplněnou o tématicky zaměřenou slovní zásobu dle tématického plánu.</span>
                         </li>
                         <li className="flex items-start gap-2">
                            <span className="text-red-500 font-bold mt-1">🔴</span>
                            <span><strong className="text-red-500 font-mono">HEAVY DUTY ENGLISH (Pre-Intermediate):</strong> Odpovídá slovní zásobě z učebnice Maturita Solutions Pre-Intermediate, doplněnou o tématicky zaměřenou slovní zásobu dle tématického plánu.</span>
                         </li>
                      </ul>
                   </div>

                   {/* NEW SECTION: Quick Start QR Code */}
                   <div className="mb-6">
                      <h4 className="text-yellow-500 font-mono font-bold mb-2 uppercase border-b border-zinc-700 pb-1 flex items-center gap-2">
                         <QrCode size={18} />
                         RYCHLÝ START (QR KÓD)
                      </h4>
                      <p className="mb-2 text-zinc-400 italic">Neztrácejte čas diktováním adresy.</p>
                      <ul className="space-y-2 list-disc ml-5">
                         <li><strong>Pro nové studenty:</strong> Promítněte na začátku hodiny (přes dataprojektor) QR kód aplikace.</li>
                         <li>Studenti si kód naskenují mobilem a okamžitě se dostanou do aplikace.</li>
                         <li>Doporučte jim, ať si ji ihned uloží na plochu (viz návod pro studenty).</li>
                      </ul>
                   </div>

                   <div className="mb-6">
                      <h4 className="text-yellow-500 font-mono font-bold mb-2 uppercase border-b border-zinc-700 pb-1">FUNKCE PRO VÝUKU</h4>
                      <ul className="space-y-3">
                         <li className="flex items-start gap-2">
                            <RefreshCw size={18} className="mt-1 text-zinc-500 shrink-0" />
                            <span><strong>Totální náhodnost (Shuffle):</strong> Aplikace při každém spuštění míchá pořadí otázek i odpovědí. Studenti se nemohou učit test nazpaměť podle pořadí (A, B, C).</span>
                         </li>
                         <li className="flex items-start gap-2">
                            <GraduationCap size={18} className="mt-1 text-zinc-500 shrink-0" />
                            <span><strong>Režim Učení (Flashcards):</strong> 3D otáčecí kartičky pro samostudium. Kliknutím se karta otočí.</span>
                         </li>
                         <li className="flex items-start gap-2">
                            <Play size={18} className="mt-1 text-zinc-500 shrink-0" />
                            <div>
                               <strong>Testování (3 obtížnosti):</strong>
                               <ul className="ml-4 mt-1 list-disc text-zinc-400 text-xs md:text-sm">
                                  <li><strong>Easy/Medium:</strong> Výběr z možností (ideální pro rychlé opakování).</li>
                                  <li><strong>Hard:</strong> Nutnost napsat slovo přesně (Case Insensitive). Rozvíjí pravopis (Spelling).</li>
                               </ul>
                            </div>
                         </li>
                      </ul>
                   </div>

                   <div className="mb-6">
                      <h4 className="text-yellow-500 font-mono font-bold mb-2 uppercase border-b border-zinc-700 pb-1">🏆 HODNOCENÍ A ODZNAKY</h4>
                      <p className="mb-2">Aplikace motivuje studenty sbíráním odznaků za každou lekci:</p>
                      <ul className="space-y-2 ml-1">
                         <li className="flex items-start gap-2">
                            <span>Za splnění testu získává student hvězdičky podle úspěšnosti.</span>
                         </li>
                         <li className="flex items-start gap-2">
                            <span className="text-yellow-500 font-bold">⭐⭐⭐</span>
                            <span><strong>100 % úspěšnost</strong> = 3 hvězdičky.</span>
                         </li>
                         <li className="flex items-start gap-2">
                            <span>Pokud student získá plný počet hvězdiček, odemkne se mu na kartě lekce Zlatý odznak s číslem 3.</span>
                         </li>
                         <li className="mt-2 text-zinc-400 italic text-sm border-l-2 border-yellow-500 pl-3">
                            <strong className="text-yellow-500 not-italic">Tip pro kontrolu:</strong> Pro rychlé známkování stačí, aby vám student ukázal menu lekcí – pokud u lekce svítí odznak s číslem 3, má splněno bez chyby.
                         </li>
                      </ul>
                   </div>

                   <div>
                      <h4 className="text-yellow-500 font-mono font-bold mb-2 uppercase border-b border-zinc-700 pb-1">TIPY DO HODINY</h4>
                      <ul className="space-y-2 list-disc ml-5">
                         <li>Pro maximální efekt nechte studenty projít <strong>Hard Mode</strong>, kde musí slova psát.</li>
                         <li>Aplikace funguje offline (PWA) a lze ji uložit na plochu mobilu jako běžnou aplikaci.</li>
                      </ul>
                   </div>

                </div>

                <div className="p-4 border-t border-zinc-700 bg-zinc-900 rounded-b-md">
                   <Button fullWidth variant="primary" onClick={() => setShowInfoModal(false)}>
                     CLOSE GUIDE
                   </Button>
                </div>
             </div>
          </div>
        )}

        {/* STUDENT GUIDE MODAL */}
        {showStudentInfoModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-zinc-800 border border-zinc-600 rounded-md p-0 max-w-lg w-full relative shadow-2xl max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b border-zinc-700 bg-zinc-900 rounded-t-md">
                   <h3 className="text-xl font-mono font-bold text-blue-400 flex items-center gap-2">
                     <GraduationCap size={24} />
                     HOW TO USE
                   </h3>
                   <button 
                      onClick={() => setShowStudentInfoModal(false)}
                      className="text-zinc-500 hover:text-white bg-zinc-700 rounded-sm p-1 transition-colors"
                      aria-label="Zavřít návod"
                    >
                      <X size={20} />
                    </button>
                </div>
                
                {/* Modal Content - Scrollable */}
                <div className="p-6 overflow-y-auto text-zinc-300 font-sans leading-relaxed text-sm md:text-base" lang="cs">
                   
                   <p className="mb-4">
                     👋 Vítej v dílně! Tato aplikace ti pomůže zvládnout slovní zásobu podle učebnice, kterou používáš v hodině angličtiny.
                   </p>

                   <div className="mb-6">
                      <h4 className="text-blue-400 font-mono font-bold mb-2 uppercase border-b border-zinc-700 pb-1">JAK SE UČIT?</h4>
                      <ol className="space-y-4 list-decimal ml-5">
                         <li>
                            <strong className="text-zinc-100">🃏 Flashcards (Kartičky):</strong> Ideální na začátek. Klikni na kartu, otočí se a uvidíš překlad. Anglické slovo si můžeš i poslechnout. Procházej si je, dokud si je nezapamatuješ.
                         </li>
                         <li>
                            <strong className="text-zinc-100">📝 Test (Quiz):</strong> Vyzkoušej se.
                            <ul className="ml-4 mt-1 list-disc text-zinc-400 text-xs md:text-sm">
                               <li><strong>Easy/Medium:</strong> Vybíráš ze 3 možností. Dobré na rozjezd.</li>
                               <li><strong>Hard (Profi):</strong> Musíš slovo napsat. Tohle je ta pravá zkouška – pokud to napíšeš špatně, aplikace ti to neuzná.</li>
                               <li><strong>Mix:</strong> kombinuje všechny obtížnosti.</li>
                            </ul>
                         </li>
                      </ol>
                   </div>

                   <div className="mb-6">
                      <h4 className="text-blue-400 font-mono font-bold mb-2 uppercase border-b border-zinc-700 pb-1">TIPY & TRIKY</h4>
                      <ul className="space-y-2 list-disc ml-5">
                         <li>
                            <strong className="text-zinc-100">📲 Stáhni si mě:</strong> Otevři menu prohlížeče v mobilu a dej 'Přidat na plochu'. Budeš to mít jako appku bez zadávání adresy.
                         </li>
                         <li>
                            <strong className="text-zinc-100">🔄 Míchání:</strong> Otázky se pokaždé zamíchají. Nemůžeš se naučit pořadí, musíš umět slovíčka!
                         </li>
                         <li>
                            <strong className="text-zinc-100">🔊 Výslovnost:</strong> U kartiček si můžeš pustit zvuk, abys věděl, jak se to čte.
                         </li>
                      </ul>
                   </div>

                   <div className="mt-6 border-t border-zinc-700/50 pt-4">
                      <h4 className="text-red-400 font-mono font-bold mb-2 uppercase flex items-center gap-2">
                         <RotateCcw size={18} />
                         MAZÁNÍ POKROKU
                      </h4>
                      <p className="mb-3 text-zinc-400 text-xs leading-relaxed">
                         Pokud chceš začít znovu a vymazat všechny své získané hvězdičky a odznaky, můžeš resetovat pokrok tlačítkem níže.
                      </p>
                      <button 
                         onClick={handleResetProgress}
                         className="flex items-center justify-center gap-2 w-full bg-zinc-900 hover:bg-red-950 border border-zinc-700 hover:border-red-800 text-zinc-400 hover:text-red-400 py-2 rounded-sm text-xs font-mono font-bold transition-all cursor-pointer"
                      >
                         <RotateCcw size={14} />
                         Vymazat můj pokrok
                      </button>
                   </div>

                </div>

                <div className="p-4 border-t border-zinc-700 bg-zinc-900 rounded-b-md">
                   <Button fullWidth className="bg-blue-600 hover:bg-blue-500 border-blue-600 text-white" onClick={() => setShowStudentInfoModal(false)}>
                     JDU NA TO!
                   </Button>
                </div>
             </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-zinc-400 text-xs font-mono uppercase border-t border-zinc-800">
        SYSTEM ONLINE • THE ENGLISH WORKSHOP • VER 2.1
      </footer>
    </div>
  );
}
