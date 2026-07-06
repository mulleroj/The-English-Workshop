import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestion } from '../types';
import Button from './Button';
import { Volume2, Send, CheckCircle, XCircle } from 'lucide-react';

interface QuizCardProps {
  question: QuizQuestion;
  onAnswer: (answer: string) => void;
  isAnswered: boolean;
  selectedAnswer: string | null;
}

const normalize = (s: string) => s.trim().toLowerCase();

const QuizCard: React.FC<QuizCardProps> = ({ question, onAnswer, isAnswered, selectedAnswer }) => {
  const [textInput, setTextInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset input when question changes
  useEffect(() => {
    setTextInput('');
    if (question.type === 'text-input' && !isAnswered) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [question, isAnswered]);

  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set fallback language code
    utterance.lang = 'en-GB'; 

    // Explicitly search for a British voice
    const voices = window.speechSynthesis.getVoices();
    const britishVoice = voices.find(voice => voice.lang.includes('en-GB'));
    
    if (britishVoice) {
        utterance.voice = britishVoice;
        console.debug("Using British voice:", britishVoice.name);
    } else {
        console.debug("British voice not found, using system default.");
    }
    
    utterance.rate = 0.9; 
    window.speechSynthesis.speak(utterance);
  };

  // Sound Effect Logic
  useEffect(() => {
    if (isAnswered && selectedAnswer) {
      const isCorrect = normalize(selectedAnswer) === normalize(question.correctAnswer);
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          if (isCorrect) {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(500, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.4);
            setTimeout(() => { speakText(question.correctAnswer); }, 300);
          } else {
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(150, ctx.currentTime);
            oscillator.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.3);
          }
        }
      } catch (e) { console.error("Audio play failed", e); }
    }
  }, [isAnswered, selectedAnswer, question.correctAnswer]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isAnswered) return;
    onAnswer(textInput.trim());
  };

  const renderComparison = (user: string, correct: string) => {
    const userChars = user.split('');
    const correctChars = correct.split('');

    return (
      <div className="flex flex-col gap-4 mt-2 mb-4 w-full">
        {/* User's Input */}
        <div translate="no">
           <p className="text-xs text-zinc-400 mb-2 font-mono font-bold tracking-wider uppercase">Your Answer</p>
           <div className="flex flex-wrap justify-center gap-1.5">
             {userChars.map((char, i) => {
               const match = correctChars[i] && char.toLowerCase() === correctChars[i].toLowerCase();
               return (
                 <span key={i} className={`
                   w-8 h-10 sm:w-10 sm:h-12 flex items-center justify-center rounded-sm text-xl font-bold border-b-2 font-mono
                   ${match 
                     ? 'bg-zinc-800 border-emerald-500 text-emerald-400' 
                     : 'bg-zinc-800 border-red-500 text-red-400'}
                 `}>
                   {char}
                 </span>
               )
             })}
           </div>
        </div>

        {/* Correct Answer */}
        <div translate="no">
           <p className="text-xs text-zinc-400 mb-2 font-mono font-bold tracking-wider uppercase">Correct Answer</p>
           <div className="flex flex-wrap justify-center gap-1.5">
             {correctChars.map((char, i) => (
                <span key={i} className="w-8 h-10 sm:w-10 sm:h-12 flex items-center justify-center rounded-sm text-xl font-bold border-b-2 font-mono bg-zinc-800 border-yellow-500 text-yellow-500">
                  {char}
                </span>
             ))}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl bg-zinc-800 rounded-md shadow-2xl p-4 md:p-8 border border-zinc-700 animate-fade-in-up">
      {/* Header Bar */}
      <div className="flex justify-between items-start mb-2 border-b border-zinc-700 pb-4">
        <span className={`px-3 py-1 rounded-sm text-xs font-mono font-bold uppercase tracking-wider ${
          question.difficulty === 'easy' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' :
          question.difficulty === 'medium' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800' :
          'bg-red-900/30 text-red-400 border border-red-800'
        }`}>
          {question.type === 'text-input' ? 'TYPE_INPUT' : question.difficulty.toUpperCase()}
        </span>
        <button 
          onClick={() => speakText(question.text)}
          className="p-2 bg-zinc-700 text-yellow-500 rounded-sm hover:bg-zinc-600 transition-colors"
          title="Read Question"
          aria-label="Přečíst otázku nahlas"
        >
          <Volume2 size={24} />
        </button>
      </div>

      {/* FLASHCARD DISPLAY AREA */}
      <div className="flex flex-col items-center justify-center mb-8 pt-4">
        {/* Massive Emoji */}
        <div className="text-8xl md:text-9xl mb-6 select-none animate-bounce-in filter drop-shadow-lg transform hover:scale-105 transition-transform duration-300">
          {question.emoji || '⚙️'}
        </div>

        {/* Question Text */}
        <h2 className="text-2xl md:text-3xl font-mono font-bold text-zinc-100 text-center leading-tight">
          {question.text}
        </h2>
      </div>

      {/* MULTIPLE CHOICE MODE */}
      {question.type === 'multiple-choice' && question.options && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {question.options.map((option, idx) => {
            let variant: 'secondary' | 'success' | 'danger' = 'secondary';
            
            const isThisCorrect = normalize(option) === normalize(question.correctAnswer);
            const isThisSelected = selectedAnswer !== null && normalize(option) === normalize(selectedAnswer);
            const userWasWrong = selectedAnswer !== null && normalize(selectedAnswer) !== normalize(question.correctAnswer);

            if (isAnswered) {
              if (isThisCorrect) {
                variant = 'success';
              } else if (isThisSelected && userWasWrong) {
                variant = 'danger';
              }
            } else if (isThisSelected) {
               variant = 'primary' as any;
            }

            return (
              <Button
                key={idx}
                variant={variant}
                onClick={() => !isAnswered && onAnswer(option)}
                disabled={isAnswered}
                translate="no"
                className={`text-lg py-4 font-bold ${isAnswered && !isThisCorrect && !isThisSelected ? 'opacity-30' : ''}`}
              >
                {option}
              </Button>
            );
          })}
        </div>
      )}

      {/* TEXT INPUT MODE */}
      {question.type === 'text-input' && (
        <div className="max-w-md mx-auto w-full">
          {!isAnswered ? (
            <form onSubmit={handleTextSubmit} className="flex flex-col gap-4">
              <input
                ref={inputRef}
                type="text"
                translate="no"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="> TYPE ANSWER HERE"
                className="w-full p-4 text-center text-2xl font-mono font-bold bg-zinc-900 text-yellow-400 border-2 border-zinc-600 rounded-md focus:border-yellow-500 focus:outline-none transition-colors shadow-inner placeholder-zinc-700"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <Button 
                type="submit" 
                variant="primary" 
                disabled={!textInput.trim()}
                className="flex items-center justify-center gap-2 text-xl"
              >
                SUBMIT <Send size={22} />
              </Button>
            </form>
          ) : (
            <div className="text-center w-full">
               {normalize(selectedAnswer || '') === normalize(question.correctAnswer) 
                 ? (
                   <div className="p-6 bg-emerald-900/20 rounded-md border border-emerald-800 mb-6 animate-bounce-in">
                      <p className="text-sm text-emerald-500 font-mono font-bold uppercase tracking-wide mb-2">STATUS: CORRECT</p>
                      <div className="text-3xl md:text-4xl font-mono font-black text-emerald-400 tracking-wide break-words" translate="no">
                        {question.correctAnswer}
                      </div>
                   </div>
                 )
                 : (
                    <div className="p-4 bg-red-900/20 rounded-md border border-red-800 mb-6 animate-shake">
                      {renderComparison(selectedAnswer || '', question.correctAnswer)}
                    </div>
                 )
               }
            </div>
          )}
        </div>
      )}

      {/* RESULT FEEDBACK */}
      {isAnswered && (
        <div className={`mt-6 p-4 rounded-md border text-center animate-fade-in flex flex-col md:flex-row items-center justify-center gap-3 ${
          normalize(selectedAnswer || '') === normalize(question.correctAnswer) 
            ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400'
            : 'bg-red-900/20 border-red-800 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {normalize(selectedAnswer || '') === normalize(question.correctAnswer) 
              ? <CheckCircle size={28} /> 
              : <XCircle size={28} />
            }
            <p className="font-mono font-bold text-lg">
               {question.explanation}
            </p>
          </div>
          
          {/* Replay Pronunciation Button */}
          <button 
            onClick={() => speakText(question.correctAnswer)}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors border border-zinc-600 shadow-sm text-yellow-500"
            title="Listen to pronunciation"
            aria-label="Přehrát výslovnost"
          >
             <Volume2 size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizCard;