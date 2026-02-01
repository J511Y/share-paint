'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { Painting } from '@/types/database';

interface PaintingGridProps {
  userId: string;
}

export function PaintingGrid({ userId }: PaintingGridProps) {
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaintings = async () => {
      try {
        const res = await fetch(`/api/paintings?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setPaintings(data);
        }
      } catch (error) {
        console.error('Failed to fetch paintings', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaintings();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-[4/3] bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (paintings.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">아직 등록된 그림이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {paintings.map((painting) => (
        <Card key={painting.id} className="group cursor-pointer overflow-hidden hover:shadow-md transition-all">
          <div className="aspect-[4/3] bg-gray-100 relative">
            <img 
              src={painting.image_url} 
              alt={painting.topic}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-between p-3 opacity-0 group-hover:opacity-100">
              <div className="flex items-center gap-1 text-white text-xs font-medium">
                <Heart className="w-3.5 h-3.5 fill-current" />
                {painting.likes_count}
              </div>
              <div className="flex items-center gap-1 text-white text-xs font-medium">
                <MessageCircle className="w-3.5 h-3.5" />
                {painting.comments_count}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
