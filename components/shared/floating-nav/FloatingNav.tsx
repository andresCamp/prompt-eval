import { ArrowUpToLine, ArrowRightToLine } from 'lucide-react';
import { FloatingNavProps } from './types';

export function FloatingNav({
  sections,
  showFloatingNav,
  navMode,
  isExiting,
  isToggling,
  activeSection,
  onToggleNav,
  onScrollToSection,
}: FloatingNavProps) {

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
                  {sections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.key;

                    return (
                      <button
                        key={section.key}
                        onClick={() => onScrollToSection(section.key)}
                        className={`relative p-2 rounded-full transition-all cursor-pointer ${section.color.hoverBg}`}
                        title={`Jump to ${section.label} section`}
                      >
                        <Icon
                          className={`relative z-10 h-5 w-5 ${section.color.text} transition-all ${
                            isActive ? 'brightness-110 scale-110' : ''
                          }`}
                        />
                        {isActive && (
                          <div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full blur-lg"
                            style={{ backgroundColor: section.color.glow }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Toggle button - positioned outside/below the pill as ghost button */}
            <button
              onClick={onToggleNav}
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
                  {sections.map((section, index) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.key;
                    const isLast = index === sections.length - 1;

                    return (
                      <div key={section.key} className="flex items-center gap-1">
                        <button
                          onClick={() => onScrollToSection(section.key)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer whitespace-nowrap ${section.color.hoverBg}`}
                          title={`Jump to ${section.label} section`}
                        >
                          <div className="relative">
                            <Icon
                              className={`relative z-10 h-4 w-4 ${section.color.text} transition-all ${
                                isActive ? 'brightness-110' : ''
                              }`}
                            />
                            {isActive && (
                              <div
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full blur-md"
                                style={{ backgroundColor: section.color.glow }}
                              />
                            )}
                          </div>
                          <span className="hidden sm:inline">
                            {section.label} {section.count !== undefined && `(${section.count})`}
                          </span>
                        </button>
                        {!isLast && <div className="text-gray-400">➜</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Toggle button - positioned outside/right of the pill as ghost button */}
            <button
              onClick={onToggleNav}
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
