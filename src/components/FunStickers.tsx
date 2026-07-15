"use client";

import { PlayProvider, CanMoveElement, CanSpinElement } from "@playhtml/react";

const stickers = [
  { id: "sticker-rocket", emoji: "🚀", className: "left-[8%] top-[15%]" },
  { id: "sticker-bulb", emoji: "💡", className: "right-[12%] top-[10%]" },
  { id: "sticker-sparkles", emoji: "✨", className: "left-[20%] top-[65%]" },
  { id: "sticker-target", emoji: "🎯", className: "right-[8%] top-[55%]" },
];

export default function FunStickers() {
  return (
    <PlayProvider>
      <div className="pointer-events-none absolute inset-0 hidden overflow-visible sm:block">
        {stickers.map((sticker) => (
          <div
            key={sticker.id}
            className={`pointer-events-auto absolute select-none ${sticker.className}`}
          >
            <CanMoveElement>
              <span id={sticker.id} className="block cursor-grab text-4xl active:cursor-grabbing">
                {sticker.emoji}
              </span>
            </CanMoveElement>
          </div>
        ))}
        <div className="pointer-events-auto absolute right-[30%] top-[75%] select-none">
          <CanSpinElement>
            <span
              id="sticker-star"
              className="block cursor-grab text-3xl active:cursor-grabbing"
            >
              ⭐
            </span>
          </CanSpinElement>
        </div>
      </div>
    </PlayProvider>
  );
}
