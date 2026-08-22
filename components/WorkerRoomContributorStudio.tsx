'use client';

import { useEffect, useState } from 'react';
import FeaturedStoryStudio from './FeaturedStoryStudio';
import NewsroomStudio from './NewsroomStudio';

export default function WorkerRoomContributorStudio() {
  const [worker, setWorker] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    fetch('/api/worker/workspace', { cache: 'no-store' })
      .then(async (response) => { const result = await response.json(); if (!response.ok) return; setWorker(result.worker || null); })
      .catch(() => undefined);
  }, []);

  if (!worker) return null;
  const viewer = { ...worker, role: 'worker' as const };
  return <div className="mx-auto max-w-4xl space-y-6 px-5 pb-10 sm:px-8"><NewsroomStudio viewer={viewer} /><FeaturedStoryStudio viewer={viewer} /></div>;
}
