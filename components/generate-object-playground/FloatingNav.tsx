import { Brain, Code, Cpu, FileJson, LayoutGrid, ArrowUpToLine, ArrowRightToLine } from 'lucide-react';
import { GenerateObjectConfig } from './types';

type SectionKey = 'models' | 'schemas' | 'system' | 'prompts' | 'results';

type FloatingNavProps = {
  showFloatingNav: boolean;
  navMode: 'vertical' | 'horizontal';
  isExiting: boolean;
  isToggling: boolean;
  activeSection: SectionKey | null;
  config: GenerateObjectConfig;
  totalCombinations: number;
  handleToggleNav: () => void;
  scrollToSection: (section: SectionKey) => void;
};

export function FloatingNav({
  showFloatingNav,
  navMode,
  isExiting,
  isToggling,
  activeSection,
  config,
  totalCombinations,
  handleToggleNav,
  scrollToSection,
}: FloatingNavProps) {
  
  const getSectionColor = (section: SectionKey) => {
    const colors = {
      models: 'text-blue-600',
      schemas: 'text-green-600',
      system: 'text-yellow-600',
      prompts: 'text-orange-600',
      results: 'text-purple-600'
    };
    return colors[section];
  };

  const getSectionGlowColor = (section: SectionKey) => {
    const glowColors = {
      models: 'rgba(59,130,246,0.5)',
      schemas: 'rgba(34,197,94,0.5)',
      system: 'rgba(234,179,8,0.5)',
      prompts: 'rgba(249,115,22,0.5)',
      results: 'rgba(168,85,247,0.5)'
    };
    return glowColors[section];
  };

  const getSectionHoverBg = (section: SectionKey) => {
    const backgrounds = {
      models: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
      schemas: 'hover:bg-green-100 dark:hover:bg-green-900/30',
      system: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
      prompts: 'hover:bg-orange-100 dark:hover:bg-orange-900/30',
      results: 'hover:bg-purple-100 dark:hover:bg-purple-900/30'
    };
    return backgrounds[section];
  };

  if (!showFloatingNav) return null;

  return (
    <>
      {/* Floating Sidebar Navigation - Vertical Layout */}
      {navMode === 'vertical' && (
        <div
          className="fixed top-1/2 right-3 z-50"
          style={{
            animation: (isExiting || isToggling)
              ? 'slideOutRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
              : 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: 'translate(0, -50%)'
          }}
        >
          <div className="relative">
            <div className="bg-gradient-to-b from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-full shadow-lg backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
              <div className="px-1 py-3">
                <div className="flex flex-col items-center gap-1">
                  {/* Models */}
                  <button
                    onClick={() => scrollToSection('models')}
                    className={`relative p-2 rounded-full transition-all cursor-pointer ${getSectionHoverBg('models')}`}
                    title="Jump to Models section"
                  >
                    <Brain className={`relative z-10 h-5 w-5 ${getSectionColor('models')} transition-all ${activeSection === 'models' ? 'brightness-110 scale-110' : ''}`} />
                    {activeSection === 'models' && (
                      <div 
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full blur-lg"
                          style={{ backgroundColor: getSectionGlowColor('models') }}
                      />
                    )}
                  </button>

                  {/* Schemas */}
                  <button
                    onClick={() => scrollToSection('schemas')}
                    className={`relative p-2 rounded-full transition-all cursor-pointer ${getSectionHoverBg('schemas')}`}
                    title="Jump to Schemas section"
                  >
                    <Code className={`relative z-10 h-5 w-5 ${getSectionColor('schemas')} transition-all ${activeSection === 'schemas' ? 'brightness-110 scale-110' : ''}`} />
                    {activeSection === 'schemas' && (
                      <div 
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full blur-lg"
                          style={{ backgroundColor: getSectionGlowColor('schemas') }}
                      />
                    )}
                  </button>

                  {/* System */}
                  <button
                    onClick={() => scrollToSection('system')}
                    className={`relative p-2 rounded-full transition-all cursor-pointer ${getSectionHoverBg('system')}`}
                    title="Jump to System Prompts section"
                  >
                    <Cpu className={`relative z-10 h-5 w-5 ${getSectionColor('system')} transition-all ${activeSection === 'system' ? 'brightness-110 scale-110' : ''}`} />
                    {activeSection === 'system' && (
                      <div 
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full blur-lg"
                          style={{ backgroundColor: getSectionGlowColor('system') }}
                      />
                    )}
                  </button>

                  {/* Prompts */}
                  <button
                    onClick={() => scrollToSection('prompts')}
                    className={`relative p-2 rounded-full transition-all cursor-pointer ${getSectionHoverBg('prompts')}`}
                    title="Jump to Prompts section"
                  >
                    <FileJson className={`relative z-10 h-5 w-5 ${getSectionColor('prompts')} transition-all ${activeSection === 'prompts' ? 'brightness-110 scale-110' : ''}`} />
                    {activeSection === 'prompts' && (
                      <div 
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full blur-lg"
                          style={{ backgroundColor: getSectionGlowColor('prompts') }}
                      />
                    )}
                  </button>

                  {/* Results */}
                  <button
                    onClick={() => scrollToSection('results')}
                    className={`relative p-2 rounded-full transition-all cursor-pointer ${getSectionHoverBg('results')}`}
                    title="Jump to Results section"
                  >
                    <LayoutGrid className={`relative z-10 h-5 w-5 ${getSectionColor('results')} transition-all ${activeSection === 'results' ? 'brightness-110 scale-110' : ''}`} />
                    {activeSection === 'results' && (
                      <div 
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full blur-lg"
                          style={{ backgroundColor: getSectionGlowColor('results') }}
                      />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Toggle button - positioned outside/below the pill as ghost button */}
            <button
              onClick={handleToggleNav}
              className="absolute -bottom-10 left-1/2 -translate-x-1/2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              title="Switch to horizontal layout"
            >
              <ArrowUpToLine className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Sidebar Navigation - Horizontal Layout */}
      {navMode === 'horizontal' && (
        <div
          className="fixed top-4 left-1/2 z-50"
          style={{
            animation: (isExiting || isToggling)
              ? 'slideOutTop 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
              : 'slideInTop 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: 'translate(-50%, 0)'
          }}
        >
          <div className="relative">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-full shadow-lg backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
              <div className="px-6 py-2">
                <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <button
                    onClick={() => scrollToSection('models')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer whitespace-nowrap ${getSectionHoverBg(
                      'models'
                    )}`}
                    title="Jump to Models section"
                  >
                    <div className="relative">
                      <Brain className={`relative z-10 h-4 w-4 ${getSectionColor('models')} transition-all ${activeSection === 'models' ? 'brightness-110' : ''}`} />
                      {activeSection === 'models' && (
                        <div
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full blur-md"
                          style={{ backgroundColor: getSectionGlowColor('models') }}
                        />
                      )}
                    </div>
                    <span className="hidden sm:inline">Models ({config.modelThreads.length})</span>
                  </button>
                  <div className="text-gray-400">➜</div>
                  <button
                    onClick={() => scrollToSection('schemas')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer whitespace-nowrap ${getSectionHoverBg(
                      'schemas'
                    )}`}
                    title="Jump to Schemas section"
                  >
                    <div className="relative">
                      <Code className={`relative z-10 h-4 w-4 ${getSectionColor('schemas')} transition-all ${activeSection === 'schemas' ? 'brightness-110' : ''}`} />
                      {activeSection === 'schemas' && (
                        <div
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full blur-md"
                          style={{ backgroundColor: getSectionGlowColor('schemas') }}
                        />
                      )}
                    </div>
                    <span className="hidden sm:inline">Schemas ({config.schemaThreads.length})</span>
                  </button>
                  <div className="text-gray-400">➜</div>
                  <button
                    onClick={() => scrollToSection('system')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer whitespace-nowrap ${getSectionHoverBg(
                      'system'
                    )}`}
                    title="Jump to System Prompts section"
                  >
                    <div className="relative">
                      <Cpu className={`relative z-10 h-4 w-4 ${getSectionColor('system')} transition-all ${activeSection === 'system' ? 'brightness-110' : ''}`} />
                      {activeSection === 'system' && (
                        <div
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full blur-md"
                          style={{ backgroundColor: getSectionGlowColor('system') }}
                        />
                      )}
                    </div>
                    <span className="hidden sm:inline">System ({config.systemPromptThreads.length})</span>
                  </button>
                  <div className="text-gray-400">➜</div>
                  <button
                    onClick={() => scrollToSection('prompts')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer whitespace-nowrap ${getSectionHoverBg(
                      'prompts'
                    )}`}
                    title="Jump to Prompts section"
                  >
                    <div className="relative">
                      <FileJson className={`relative z-10 h-4 w-4 ${getSectionColor('prompts')} transition-all ${activeSection === 'prompts' ? 'brightness-110' : ''}`} />
                      {activeSection === 'prompts' && (
                        <div
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full blur-md"
                          style={{ backgroundColor: getSectionGlowColor('prompts') }}
                        />
                      )}
                    </div>
                    <span className="hidden sm:inline">Prompts ({config.promptDataThreads.length})</span>
                  </button>
                  <div className="text-gray-400">➜</div>
                  <button
                    onClick={() => scrollToSection('results')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer whitespace-nowrap ${getSectionHoverBg(
                      'results'
                    )}`}
                    title="Jump to Results section"
                  >
                    <div className="relative">
                      <LayoutGrid className={`relative z-10 h-4 w-4 ${getSectionColor('results')} transition-all ${activeSection === 'results' ? 'brightness-110' : ''}`} />
                      {activeSection === 'results' && (
                        <div
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full blur-md"
                          style={{ backgroundColor: getSectionGlowColor('results') }}
                        />
                      )}
                    </div>
                    <span className="hidden sm:inline">Output ({totalCombinations})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Toggle button - positioned outside/right of the pill as ghost button */}
            <button
              onClick={handleToggleNav}
              className="absolute top-1/2 -right-10 -translate-y-1/2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              title="Switch to vertical layout"
            >
              <ArrowRightToLine className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
