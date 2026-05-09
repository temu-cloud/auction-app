"use client";

import Image from "next/image";

interface ItemSidebarProps {
  item: {
    name: string;
    hostedBy:string;
    imageUrl: string | null;
    startingPrice: number;
  };
  visible: boolean;
}

export default function ItemSidebar({ item, visible }: ItemSidebarProps) {
  if (!visible) return null;

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto">
         <span className="text-5xl font-bold text-amber-400">{item.hostedBy} </span>  
      {item.imageUrl && (
        <div className="relative w-full aspect-square bg-zinc-800 rounded-lg overflow-hidden">
          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" unoptimized />
        </div>
      )}
      <h2 className="text-4xl font-bold text-white">{item.name}</h2>
      <div className="space-y-1">
        <span className="text-3xl text-white font-bold   tracking-wide"> መነሻ ዋጋ ፡ </span>
        <span className="text-3xl font-bold text-amber-400">{item.startingPrice.toLocaleString()} ብር</span>
      </div>
    </div>
  );
}
