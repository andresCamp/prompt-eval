import { LucideIcon } from 'lucide-react';
import { RefObject } from 'react';

/**
 * Configuration for a single navigation section
 */
export interface NavSection {
  /** Unique key for the section */
  key: string;
  /** Display label for the section */
  label: string;
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Number of items/threads in this section (optional) */
  count?: number;
  /** Color scheme for the section */
  color: {
    /** Tailwind text color class (e.g., 'text-blue-600') */
    text: string;
    /** RGB color for glow effect (e.g., 'rgba(59,130,246,0.5)') */
    glow: string;
    /** Tailwind hover background classes */
    hoverBg: string;
  };
  /** Ref to the section element for scrolling */
  ref: RefObject<HTMLDivElement>;
}

/**
 * Navigation display mode
 */
export type NavMode = 'horizontal' | 'vertical';

/**
 * Props for the FloatingNav component
 */
export interface FloatingNavProps {
  /** Array of navigation sections */
  sections: NavSection[];
  /** Whether to show the floating nav */
  showFloatingNav: boolean;
  /** Current navigation mode */
  navMode: NavMode;
  /** Whether exit animation is playing */
  isExiting: boolean;
  /** Whether toggle animation is playing */
  isToggling: boolean;
  /** Currently active section key */
  activeSection: string | null;
  /** Handler for toggling navigation mode */
  onToggleNav: () => void;
  /** Handler for scrolling to a section */
  onScrollToSection: (sectionKey: string) => void;
}
