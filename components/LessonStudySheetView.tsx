import React from 'react';
import { Lesson, VocabItem } from '../types';
import Button from './Button';
import { ArrowLeft, Printer } from 'lucide-react';

interface LessonStudySheetViewProps {
  lesson: Lesson;
  onBack: () => void;
}

const LessonStudySheetView: React.FC<LessonStudySheetViewProps> = ({ lesson, onBack }) => {
  const vocabList = Array.isArray(lesson.content) ? (lesson.content as VocabItem[]) : [];
  
  // Limit worksheet to maximum of first 15 vocabulary words (stable & deterministic)
  const totalWords = vocabList.slice(0, 15);
  
  // Distribute words to exercises safely
  const task1Words = totalWords.slice(0, 8);
  const task2Words = totalWords.slice(8, 11);
  const task3Words = totalWords.slice(11, 15);

  // Deterministic sorting for matching exercise (Task 1)
  const englishSide = [...task1Words].sort((a, b) => a.term.localeCompare(b.term));
  const czechSide = [...task1Words].sort((a, b) => a.translation.localeCompare(b.translation));

  const handlePrint = () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  const getCourseTitle = (course: string) => {
    switch (course) {
      case 'elementary':
        return 'Solutions Elementary';
      case 'pre-intermediate':
        return 'Solutions Pre-Intermediate';
      default:
        return 'Maturita Solutions';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 animate-fade-in print-container">
      {/* COMPONENT-LEVEL PRINT STYLES */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Enforce white background and black text on all levels */
          html, body, #root, #app, .App {
            background: white !important;
            background-color: white !important;
            background-image: none !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Hide non-printable elements */
          .no-print {
            display: none !important;
          }
          
          /* Reset container margins/spacings */
          .print-container {
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          
          .print-card {
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          
          .print-title {
            color: black !important;
          }
          
          .print-text {
            color: black !important;
          }
          
          /* Table and Exercise print styling */
          .print-table {
            color: black !important;
            border-color: #000000 !important;
          }
          
          .print-table th {
            background-color: #f3f4f6 !important;
            color: black !important;
            border: 1px solid #000000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-table td {
            border: 1px solid #e5e7eb !important;
            color: black !important;
          }
          
          .print-line {
            border-bottom: 1px dashed #000000 !important;
          }
        }
      ` }} />

      {/* HEADER CONTROLS (Hidden during printing) */}
      <div className="no-print flex justify-between items-center mb-8 bg-zinc-800/80 border border-zinc-700 p-4 rounded-md shadow-md">
        <Button onClick={onBack} variant="secondary" className="flex items-center gap-2">
          <ArrowLeft size={18} /> Zpět do lekce
        </Button>
        
        <h2 className="text-xl font-mono font-bold text-yellow-500 hidden md:block">
          WORKSHEET PREVIEW
        </h2>

        <Button onClick={handlePrint} variant="primary" className="flex items-center gap-2">
          <Printer size={18} /> Vytisknout pracovní list
        </Button>
      </div>

      {/* PRINT SHEET WRAPPER */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-md shadow-2xl p-6 sm:p-8 print-card">
        
        {/* Lesson metadata header */}
        <div className="border-b-2 border-zinc-700 pb-4 mb-6 print-table">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-mono font-black text-zinc-100 uppercase tracking-tight print-title">
                The English Workshop
              </h1>
              <p className="text-zinc-400 font-mono text-sm mt-1 uppercase print-title">
                Pracovní list / Worksheet &bull; {getCourseTitle(lesson.course)} &bull; {lesson.title}
              </p>
            </div>
            {lesson.emoji && (
              <span className="text-4xl hidden sm:inline no-print" role="img" aria-label="Lesson Emoji">
                {lesson.emoji}
              </span>
            )}
          </div>
        </div>

        {/* Paper blank fields for Student name and Date */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8 text-zinc-300 font-mono text-sm print-text">
          <div className="flex-1 flex items-end gap-2">
            <span>Jméno / Name:</span>
            <div className="flex-1 border-b border-zinc-600 border-dashed h-5 print-line"></div>
          </div>
          <div className="w-full sm:w-64 flex items-end gap-2">
            <span>Datum / Date:</span>
            <div className="flex-1 border-b border-zinc-600 border-dashed h-5 print-line"></div>
          </div>
        </div>

        {vocabList.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 font-mono">
            Pro tuto lekci nejsou dostupná žádná slovíčka pro pracovní list.
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* TASK 1: Match English and Czech */}
            {task1Words.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-mono font-bold text-yellow-500 border-b border-zinc-700 pb-1 print-title">
                  Task 1: Match English and Czech
                </h3>
                <p className="text-zinc-400 text-xs font-mono mb-2 print-text">
                  Přiřaď správná čísla z levého sloupce do rámečků v pravém sloupci. / Match the numbers from the left column to the boxes in the right column.
                </p>
                <div className="grid grid-cols-2 gap-8 border border-zinc-700/60 p-4 rounded-md print-table">
                  {/* English list (A-Z sorted) */}
                  <div className="space-y-3">
                    {englishSide.map((item, idx) => (
                      <div key={idx} className="font-mono text-sm text-zinc-200 print-text">
                        <span className="font-bold inline-block w-6 text-yellow-500 print-title">{idx + 1}.</span>
                        <span translate="no">{item.term}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Czech list (A-Z sorted translations with empty boxes) */}
                  <div className="space-y-3">
                    {czechSide.map((item, idx) => (
                      <div key={idx} className="font-mono text-sm text-zinc-200 print-text flex items-center gap-2">
                        <span className="inline-block w-8 h-6 border border-zinc-500 rounded-sm flex items-center justify-center print-table text-zinc-600 bg-transparent text-xs font-bold font-mono">
                          &nbsp;&nbsp;&nbsp;
                        </span>
                        <span lang="cs">{item.translation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TASK 2: Fill in Czech */}
            {task2Words.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-mono font-bold text-yellow-500 border-b border-zinc-700 pb-1 print-title">
                  Task 2: Translate to Czech
                </h3>
                <p className="text-zinc-400 text-xs font-mono mb-2 print-text">
                  Doplň správný český překlad. / Write the correct Czech translation.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse print-table">
                    <thead>
                      <tr className="border-b border-zinc-700 print-table text-zinc-400 font-mono text-xs uppercase">
                        <th className="py-2.5 px-4 print-table w-1/2">English</th>
                        <th className="py-2.5 px-4 print-table w-1/2">Czech / Česky</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-700/50 print-table">
                      {task2Words.map((item, idx) => (
                        <tr key={idx} className="text-zinc-200 print-table">
                          <td className="py-3 px-4 font-mono font-bold tracking-wide print-table" translate="no">
                            {item.term}
                          </td>
                          <td className="py-3 px-4 print-table border-l border-zinc-700/30">
                            {/* Empty space for student input */}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TASK 3: Fill in English */}
            {task3Words.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-mono font-bold text-yellow-500 border-b border-zinc-700 pb-1 print-title">
                  Task 3: Translate to English
                </h3>
                <p className="text-zinc-400 text-xs font-mono mb-2 print-text">
                  Doplň správný anglický výraz. / Write the correct English term.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse print-table">
                    <thead>
                      <tr className="border-b border-zinc-700 print-table text-zinc-400 font-mono text-xs uppercase">
                        <th className="py-2.5 px-4 print-table w-1/2">Czech / Česky</th>
                        <th className="py-2.5 px-4 print-table w-1/2">English</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-700/50 print-table">
                      {task3Words.map((item, idx) => (
                        <tr key={idx} className="text-zinc-200 print-table">
                          <td className="py-3 px-4 font-mono print-table" lang="cs">
                            {item.translation}
                          </td>
                          <td className="py-3 px-4 print-table border-l border-zinc-700/30">
                            {/* Empty space for student input */}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TASK 4: My Sentences */}
            <div className="space-y-3">
              <h3 className="text-lg font-mono font-bold text-yellow-500 border-b border-zinc-700 pb-1 print-title">
                Task 4: Write Your Own Sentences
              </h3>
              <p className="text-zinc-400 text-xs font-mono mb-4 print-text">
                Napiš 3 věty s použitím slovíček z této lekce. / Write 3 sentences using any vocabulary words from this lesson.
              </p>
              <div className="space-y-6 pt-2">
                <div className="flex items-end gap-2">
                  <span className="font-mono text-sm text-zinc-400 print-text">1.</span>
                  <div className="flex-1 border-b border-zinc-700 border-dashed h-5 print-line"></div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="font-mono text-sm text-zinc-400 print-text">2.</span>
                  <div className="flex-1 border-b border-zinc-700 border-dashed h-5 print-line"></div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="font-mono text-sm text-zinc-400 print-text">3.</span>
                  <div className="flex-1 border-b border-zinc-700 border-dashed h-5 print-line"></div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default LessonStudySheetView;
