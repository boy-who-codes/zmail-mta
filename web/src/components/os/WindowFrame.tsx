"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { WindowInstance } from "../../types/os";
import { useWindowManager } from "../../context/WindowManagerContext";
import { Minus, Square, X, RefreshCw } from "lucide-react";

interface WindowFrameProps {
  instance: WindowInstance;
  children: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({ instance, children }) => {
  const {
    activeWindowId,
    focusWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximizeWindow,
    updateWindowBounds,
    accessibility,
  } = useWindowManager();

  const isFocused = activeWindowId === instance.id;
  const isDragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, winX: 0, winY: 0 });

  const isResizing = useRef(false);
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

  const handleMouseDown = () => {
    focusWindow(instance.id);
  };

  // Title bar drag
  const handleTitleBarMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (instance.isMaximized) return;

    focusWindow(instance.id);
    isDragging.current = true;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      winX: instance.x,
      winY: instance.y,
    };

    e.preventDefault();
  };

  // Resize handle
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (instance.isMaximized) return;

    focusWindow(instance.id);
    isResizing.current = true;
    resizeStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: instance.width,
      height: instance.height,
    };

    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging.current) {
        const deltaX = e.clientX - dragStart.current.mouseX;
        const deltaY = e.clientY - dragStart.current.mouseY;

        const newX = Math.max(-instance.width + 100, Math.min(window.innerWidth - 100, dragStart.current.winX + deltaX));
        const newY = Math.max(36, Math.min(window.innerHeight - 100, dragStart.current.winY + deltaY));

        updateWindowBounds(instance.id, { x: newX, y: newY });
      }

      if (isResizing.current) {
        const deltaX = e.clientX - resizeStart.current.mouseX;
        const deltaY = e.clientY - resizeStart.current.mouseY;

        const newWidth = Math.max(640, Math.min(window.innerWidth, resizeStart.current.width + deltaX));
        const newHeight = Math.max(420, Math.min(window.innerHeight - 100, resizeStart.current.height + deltaY));

        updateWindowBounds(instance.id, { width: newWidth, height: newHeight });
      }
    },
    [instance.id, instance.width, updateWindowBounds]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    isResizing.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (instance.isMinimized) {
    return null;
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      style={
        instance.isMaximized
          ? {
              position: "fixed",
              top: "36px",
              left: "0px",
              width: "100vw",
              height: "calc(100vh - 36px)",
              zIndex: 10000 + (instance.zIndex % 100),
            }
          : {
              transform: `translate3d(${instance.x}px, ${instance.y}px, 0)`,
              width: `${instance.width}px`,
              height: `${instance.height}px`,
              zIndex: instance.zIndex,
            }
      }
      className={`${
        instance.isMaximized
          ? "fixed top-9 left-0 w-screen h-[calc(100vh-36px)] rounded-none border-x-0 border-b-0 border-t"
          : "absolute top-0 left-0 rounded-xl border"
      } flex flex-col overflow-hidden shadow-2xl transition-all duration-150 ${
        isFocused
          ? accessibility?.enhancedFocus
            ? "border-white/50 shadow-black/90 ring-2 ring-white/30"
            : accessibility?.highContrast
            ? "border-[#4a4e58] shadow-black/80 ring-1 ring-white/20"
            : "border-[#34343a] shadow-black/80 ring-1 ring-white/10"
          : accessibility?.dimInactiveWindows
          ? "border-[#23252a] opacity-65 hover:opacity-95 shadow-black/40"
          : "border-[#23252a] opacity-95 shadow-black/40"
      } bg-[#0f1011]`}
    >
      {/* OS Title Bar */}
      <div
        onMouseDown={handleTitleBarMouseDown}
        onDoubleClick={() => toggleMaximizeWindow(instance.id)}
        className={`h-10 px-3.5 flex items-center justify-between select-none cursor-default border-b ${
          isFocused ? "bg-[#141516] border-[#23252a]" : "bg-[#0f1011] border-[#1c1d20]"
        }`}
      >
        {/* macOS Traffic Lights */}
        <div className="flex items-center gap-2 group/lights w-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(instance.id);
            }}
            title="Close"
            className="w-3 h-3 rounded-full bg-[#ff5f56] hover:brightness-110 flex items-center justify-center text-black/70 transition-transform active:scale-90"
          >
            <X className="w-2 h-2 opacity-0 group-hover/lights:opacity-100 transition-opacity" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(instance.id);
            }}
            title="Minimize"
            className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:brightness-110 flex items-center justify-center text-black/70 transition-transform active:scale-90"
          >
            <Minus className="w-2 h-2 opacity-0 group-hover/lights:opacity-100 transition-opacity" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMaximizeWindow(instance.id);
            }}
            title="Zoom / Maximize"
            className="w-3 h-3 rounded-full bg-[#27c93f] hover:brightness-110 flex items-center justify-center text-black/70 transition-transform active:scale-90"
          >
            <Square className="w-2 h-2 opacity-0 group-hover/lights:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Window Title & Sync Status */}
        <div className="flex items-center gap-2 text-xs font-medium tracking-tight truncate max-w-[60%]">
          <span className={isFocused ? "text-[#f7f8f8]" : "text-[#8a8f98]"}>
            {instance.title}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18191a] text-[#8a8f98] border border-[#23252a] font-mono">
            live
          </span>
        </div>

        {/* Right Action placeholder */}
        <div className="w-20 flex justify-end items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Refresh simulation
            }}
            title="Refresh App State"
            className="p-1 rounded text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#1f2022] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Window Body */}
      <div className="flex-1 overflow-auto bg-[#0a0a0c] relative flex flex-col text-[#f7f8f8]">
        {children}
      </div>

      {/* Resize Handle (bottom-right) */}
      {!instance.isMaximized && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center group"
        >
          <div className="w-1.5 h-1.5 border-r border-b border-[#3e3e44] group-hover:border-[#ff69b4] transition-colors" />
        </div>
      )}
    </div>
  );
};
