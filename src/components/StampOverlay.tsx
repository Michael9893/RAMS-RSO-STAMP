import React, { useRef, useState, useEffect } from 'react';
import { Move, Check, CornerDownRight } from 'lucide-react';
import { StampConfig } from '../utils/pdfStamper';

interface StampOverlayProps {
  stamp: StampConfig;
  containerWidth: number;
  containerHeight: number;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange: (xPercent: number, yPercent: number) => void;
}

export const StampOverlay: React.FC<StampOverlayProps> = ({
  stamp,
  containerWidth,
  containerHeight,
  scale,
  isSelected,
  onSelect,
  onPositionChange,
}) => {
  const stampRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startXPercent: number; startYPercent: number }>({
    x: 0,
    y: 0,
    startXPercent: 0,
    startYPercent: 0,
  });

  const fullText = `${stamp.prefix}${stamp.number}${stamp.suffix}`;

  // Font family mapping
  const getFontFamilyStyle = () => {
    switch (stamp.fontFamily) {
      case 'Courier':
        return "'JetBrains Mono', 'Courier New', Courier, monospace";
      case 'TimesRoman':
        return "'Times New Roman', Times, serif";
      default:
        return "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startXPercent: stamp.xPercent,
      startYPercent: stamp.yPercent,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.stopPropagation();

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    if (containerWidth <= 0 || containerHeight <= 0) return;

    const deltaXPercent = (deltaX / containerWidth) * 100;
    const deltaYPercent = (deltaY / containerHeight) * 100;

    const newX = Math.max(0, Math.min(95, dragStartRef.current.startXPercent + deltaXPercent));
    const newY = Math.max(0, Math.min(95, dragStartRef.current.startYPercent + deltaYPercent));

    onPositionChange(Number(newX.toFixed(2)), Number(newY.toFixed(2)));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Convert points to screen pixels based on current canvas scale
  const displayFontSize = Math.max(10, stamp.fontSize * scale);

  // Border style
  const getBoxStyleClass = () => {
    switch (stamp.boxStyle) {
      case 'box':
        return 'border-2';
      case 'double-box':
        return 'border-2 outline outline-1 outline-offset-2';
      case 'underline':
        return 'border-b-2';
      default:
        return 'border border-transparent';
    }
  };

  return (
    <div
      ref={stampRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        left: `${stamp.xPercent}%`,
        top: `${stamp.yPercent}%`,
        transform: `translate(0, 0) rotate(${stamp.rotation}deg)`,
        transformOrigin: 'top left',
        color: stamp.color,
        fontFamily: getFontFamilyStyle(),
        fontSize: `${displayFontSize}px`,
        opacity: stamp.opacity,
        borderColor: stamp.color,
        outlineColor: stamp.color,
      }}
      className={`absolute select-none cursor-move transition-shadow z-20 group px-2 py-0.5 rounded-xs leading-none font-bold tracking-wider ${getBoxStyleClass()} ${
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white shadow-md'
          : 'hover:ring-1 hover:ring-blue-300'
      } ${stamp.isStampDistressed ? 'drop-shadow-xs' : ''}`}
      title="Click and drag to position. Arrow keys nudge."
    >
      {/* Stamp text */}
      <span className="tabular-nums whitespace-nowrap inline-block pointer-events-none">
        {fullText}
      </span>

      {/* Position Tooltip indicator when selected */}
      {isSelected && (
        <div className="absolute -top-7 left-0 bg-slate-900/90 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-30 flex items-center gap-1">
          <Move className="w-2.5 h-2.5 text-blue-400" />
          <span>X: {stamp.xPercent.toFixed(1)}% · Y: {stamp.yPercent.toFixed(1)}%</span>
        </div>
      )}

      {/* Visual drag handle */}
      {isSelected && (
        <div className="absolute -right-2 -bottom-2 w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-xs flex items-center justify-center pointer-events-none">
          <Move className="w-2 h-2 text-white" />
        </div>
      )}
    </div>
  );
};
