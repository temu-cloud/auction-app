"use client";

import Image from "next/image";

interface ItemSidebarProps {
  item: {
    name: string;
    imageUrl: string | null;
    startingPrice: number;
  };
  visible: boolean;
}

export default function ItemSidebar({ item, visible }: ItemSidebarProps) {
  if (!visible) return null;

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto">
      {item.imageUrl && (
        <div className="relative w-full aspect-square bg-zinc-800 rounded-lg overflow-hidden">
          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" unoptimized />
        </div>
      )}
      <h2 className="text-2xl font-bold text-white">{item.name}</h2>
      <div className="space-y-1">
        <p className="text-sm text-zinc-400 uppercase tracking-wide">Starting Price</p>
        <p className="text-3xl font-bold text-amber-400">{item.startingPrice.toLocaleString()}</p>
      </div>
    </div>
  );
}
