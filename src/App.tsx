import React, { useState, useEffect, useRef, useCallback } from 'react';
import './styles/shell.css';
import { useAppStore } from './state/useAppStore';
import { TopMenuBar } from './components/TopMenuBar';
import { LeftIconRail } from './components/layout/LeftIconRail';
import { CenterViewport } from './components/CenterViewport';
import { RightSidebar } from './components/layout/RightSidebar';
import { BottomControlStrip } from './components/layout/BottomControlStrip';
import { AlgorithmReferenceModal } from './components/AlgorithmReferenceModal';

export const App: React.FC = () => {
  const activeTheme = useAppStore((state) => state.activeTheme);
  const isFullScreen = useAppStore((state) => state.isFullScreen);
  const toggleFullScreen = useAppStore((state) => state.toggleFullScreen);
  const isManualOpen = useAppStore((state) => state.isManualOpen);
  const setIsManualOpen = useAppStore((state) => state.setIsManualOpen);
  const sidebarWidth = useAppStore((state) => state.sidebarWidth);
  const setSidebarWidth = useAppStore((state) => state.setSidebarWidth);
  const isSidebarCollapsed = useAppStore((state) => state.isSidebarCollapsed);

  const [isPeekOpen, setIsPeekOpen] = useState<boolean>(false);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  const peekTimerRef = useRef<number | null>(null);

  // Sync theme with document root & body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    document.body.setAttribute('data-theme', activeTheme);
  }, [activeTheme]);

  // Bind F11 to Full-Screen toggle (Requirement #3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullScreen();
      }
      if (e.key === 'Escape' && isFullScreen) {
        toggleFullScreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, toggleFullScreen]);

  // Draggable Splitter mouse handlers (Requirement #4)
  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
  }, []);

  useEffect(() => {
    if (!isDraggingSplitter) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter, setSidebarWidth]);

  // Edge-peek logic in full-screen mode
  const handleMouseEnterPeek = () => {
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    setIsPeekOpen(true);
  };

  const handleMouseLeavePeek = () => {
    peekTimerRef.current = window.setTimeout(() => {
      setIsPeekOpen(false);
    }, 1500);
  };

  return (
    <div
      className={`app-container ${isFullScreen ? 'fullscreen' : ''} ${isPeekOpen ? 'peek-open' : ''}`}
      data-theme={activeTheme}
    >
      {/* Full-screen Edge-Peek Zone */}
      {isFullScreen && (
        <div
          className="fullscreen-peek-zone"
          onMouseEnter={handleMouseEnterPeek}
          onMouseLeave={handleMouseLeavePeek}
        >
          {!isPeekOpen && (
            <div className="fullscreen-peek-tab" onClick={() => setIsPeekOpen(true)}>
              MENU ▼
            </div>
          )}
        </div>
      )}

      {/* Top Menu Bar */}
      <div onMouseEnter={handleMouseEnterPeek} onMouseLeave={handleMouseLeavePeek}>
        <TopMenuBar onOpenManual={() => setIsManualOpen(true)} />
      </div>

      {/* Main Workspace Layout */}
      <div className="workspace-container">
        {/* Left Icon Rail (Placeholder for Phase 6/7) */}
        <LeftIconRail />

        {/* Viewport (takes remaining width, canvas centered) */}
        <CenterViewport />

        {/* 4px Draggable Splitter */}
        {!isSidebarCollapsed && (
          <div
            className={`splitter ${isDraggingSplitter ? 'dragging' : ''}`}
            onMouseDown={handleSplitterMouseDown}
            title="Drag to resize sidebar (persisted)"
          />
        )}

        {/* Single Right Panel (Algorithm, Adjustments, Palette, Effects Stack) */}
        <RightSidebar />
      </div>

      {/* Bottom Control Strip */}
      <BottomControlStrip />

      {/* Algorithm Reference Manual Modal */}
      <AlgorithmReferenceModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />
    </div>
  );
};
