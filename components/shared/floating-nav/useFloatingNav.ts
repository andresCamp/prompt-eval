import { useState, useEffect, RefObject } from 'react';
import { NavMode } from './types';

interface UseFloatingNavProps {
  /** Reference to the horizontal/inline navigation bar */
  horizontalNavRef: RefObject<HTMLDivElement>;
  /** Array of section keys in display order */
  sectionKeys: string[];
  /** Whether the component is mounted */
  mounted: boolean;
}

interface UseFloatingNavReturn {
  /** Current navigation mode */
  navMode: NavMode;
  /** Whether to show the floating nav */
  showFloatingNav: boolean;
  /** Whether exit animation is playing */
  isExiting: boolean;
  /** Whether toggle animation is playing */
  isToggling: boolean;
  /** Currently active section key */
  activeSection: string | null;
  /** Set the active section */
  setActiveSection: (section: string | null) => void;
  /** Toggle between horizontal and vertical modes */
  handleToggleNav: () => void;
}

/**
 * Custom hook to manage floating navigation state and behavior
 */
export function useFloatingNav({
  horizontalNavRef,
  sectionKeys,
  mounted,
}: UseFloatingNavProps): UseFloatingNavReturn {
  const [navMode, setNavMode] = useState<NavMode>('vertical');
  const [showFloatingNav, setShowFloatingNav] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(sectionKeys[0] || null);

  // IntersectionObserver for nav visibility (show floating nav when inline bar scrolls out of view)
  useEffect(() => {
    if (!mounted || !horizontalNavRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && !showFloatingNav) {
          // Show floating nav when inline bar scrolls out of view
          setIsExiting(false);
          setShowFloatingNav(true);
        } else if (entry.isIntersecting && showFloatingNav) {
          // Start exit animation
          setIsExiting(true);
          // Wait for animation to complete before hiding
          setTimeout(() => {
            setShowFloatingNav(false);
            setIsExiting(false);
          }, 400); // Match animation duration
        }
      },
      { threshold: 0, rootMargin: '0px' }
    );

    observer.observe(horizontalNavRef.current);

    return () => {
      observer.disconnect();
    };
  }, [mounted, showFloatingNav, horizontalNavRef]);

  // Dual-sentinel IntersectionObserver for active section tracking
  useEffect(() => {
    if (!mounted) return;

    const startObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const key = entry.target.getAttribute('data-section');
          if (key) setActiveSection(key);
        }
      },
      { rootMargin: '-1px 0px 0px 0px', threshold: 0 }
    );

    const endObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const key = entry.target.getAttribute('data-section');
          if (!key) return;
          const idx = sectionKeys.indexOf(key);
          const next = sectionKeys[idx + 1] || key;
          setActiveSection(next);
        }
      },
      { rootMargin: '0px 0px -50% 0px', threshold: 0 }
    );

    const startSentinels = document.querySelectorAll<HTMLSpanElement>('.scroll-sentinel-start');
    const endSentinels = document.querySelectorAll<HTMLSpanElement>('.scroll-sentinel-end');
    startSentinels.forEach((s) => startObserver.observe(s));
    endSentinels.forEach((s) => endObserver.observe(s));

    return () => {
      startSentinels.forEach((s) => startObserver.unobserve(s));
      endSentinels.forEach((s) => endObserver.unobserve(s));
      startObserver.disconnect();
      endObserver.disconnect();
    };
  }, [mounted, sectionKeys]);

  // Toggle navigation layout (vertical <-> horizontal)
  const handleToggleNav = () => {
    // Start exit animation
    setIsToggling(true);

    // Wait for exit animation to complete, then switch mode
    setTimeout(() => {
      setNavMode((prevMode) => (prevMode === 'horizontal' ? 'vertical' : 'horizontal'));
      setIsToggling(false);
    }, 400); // Match animation duration
  };

  return {
    navMode,
    showFloatingNav,
    isExiting,
    isToggling,
    activeSection,
    setActiveSection,
    handleToggleNav,
  };
}
