import React from 'react';
import { Lesson, VocabItem } from '../types';
import Button from './Button';
import { ArrowLeft, Printer } from 'lucide-react';

interface VocabularyPrintViewProps {
  lesson: Lesson;
  onBack: () => void;
}

const VocabularyPrintView: React.FC<VocabularyPrintViewProps> = ({ lesson, onBack }) => {
  const vocabList = Array.isArray(lesson.content) ? (lesson.content as VocabItem[]) : [];

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
          
          /* Table print styling */
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
        }
      ` }} />

      {/* HEADER CONTROLS (Hidden during printing) */}
      <div className="no-print flex justify-between items-center mb-8 bg-zinc-800/80 border border-zinc-700 p-4 rounded-md shadow-md">
        <Button onClick={onBack} variant="secondary" className="flex items-center gap-2">
          <ArrowLeft size={18} /> Zpět do lekce
        </Button>
        
        <h2 className="text-xl font-mono font-bold text-yellow-500 hidden md:block">
          PRINTER PREVIEW
        </h2>

        <Button onClick={handlePrint} variant="primary" className="flex items-center gap-2">
          <Printer size={18} /> Vytisknout slovíčka
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
                {getCourseTitle(lesson.course)} &bull; {lesson.title}
              </p>
            </div>
            {lesson.emoji && (
              <span className="text-4xl hidden sm:inline no-print" role="img" aria-label="Lesson Emoji">
                {lesson.emoji}
              </span>
            )}
          </div>
          {lesson.description && (
            <p className="text-zinc-400 text-xs font-mono mt-3 print-title italic">
              {lesson.description}
            </p>
          )}
        </div>

        {vocabList.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 font-mono">
            Pro tuto lekce nejsou dostupná žádná slovíčka k tisku. / No vocabulary available for this lesson.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse print-table">
              <thead>
                <tr className="border-b border-zinc-700 print-table text-zinc-400 font-mono text-xs uppercase">
                  <th className="py-3 px-4 w-16 text-center print-table">Umím</th>
                  <th className="py-3 px-4 print-table">English</th>
                  <th className="py-3 px-4 print-table">Czech</th>
                  <th className="py-3 px-4 w-1/3 print-table">Poznámky</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50 print-table">
                {vocabList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-750/30 transition-colors text-zinc-200 print-table">
                    <td className="py-3 px-4 text-center text-lg print-table select-none font-mono">
                      □
                    </td>
                    <td className="py-3 px-4 font-mono font-bold tracking-wide print-table" translate="no">
                      {item.term}
                    </td>
                    <td className="py-3 px-4 font-mono print-table">
                      {item.translation}
                    </td>
                    <td className="py-3 px-4 print-table">
                      {/* Empty slot for writing notes */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VocabularyPrintView;
