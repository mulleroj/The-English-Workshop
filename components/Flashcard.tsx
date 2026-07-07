import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { VocabItem } from '../types';

interface FlashcardProps {
  item: VocabItem;
}

const Flashcard: React.FC<FlashcardProps> = ({ item }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const speakText = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Fallback to British English code
    utterance.lang = 'en-GB';

    // Find and set specific British voice if available
    const voices = window.speechSynthesis.getVoices();
    const britishVoice = voices.find(voice => voice.lang.includes('en-GB'));

    if (britishVoice) {
      utterance.voice = britishVoice;
    }
    
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div 
      className="relative w-full max-w-sm h-72 sm:h-96 cursor-pointer group mx-auto select-none"
      style={{ perspective: '1000px' }}
      onClick={handleFlip}
    >
      <div 
        className="w-full h-full duration-500 transition-transform relative"
        style={{ 
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        
        {/* FRONT SIDE (Dark Steel) */}
        <div 
          className="absolute w-full h-full bg-zinc-800 rounded-md shadow-2xl border border-zinc-700 border-b-8 border-b-yellow-500 p-6 sm:p-8 flex flex-col items-center justify-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-zinc-400 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest mb-3 sm:mb-4 absolute top-4 sm:top-6">
            [ TAP TO FLIP ]
          </div>
          <div className="text-6xl sm:text-9xl mb-4 sm:mb-6 filter drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300">
            {item.emoji || '⚙️'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-mono font-bold text-zinc-100 text-center leading-tight" lang="cs">
            {item.translation}
          </h2>
        </div>

        {/* BACK SIDE (Safety Yellow) */}
        <div 
          className="absolute w-full h-full bg-yellow-500 rounded-md shadow-2xl border border-yellow-600 border-b-8 border-b-yellow-700 p-6 sm:p-8 flex flex-col items-center justify-center text-black"
          translate="no"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="text-black/50 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest mb-6 sm:mb-8 absolute top-4 sm:top-6">
            ENGLISH TERM
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-mono font-black text-center mb-6 sm:mb-8 tracking-wide">
            {item.term}
          </h2>

          <button
            onClick={(e) => speakText(e, item.term)}
            className="flex items-center gap-2 bg-black text-yellow-500 px-4 sm:px-6 py-2 sm:py-3 rounded-md font-mono font-bold shadow-lg hover:bg-zinc-900 hover:scale-105 transition-all active:scale-95 text-sm sm:text-base"
            aria-label="Přehrát výslovnost"
          >
            <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
            PRONOUNCE
          </button>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;