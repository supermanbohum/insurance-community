'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { toggleTopDesignerLikeAction } from '@/lib/actions/top-designer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function TopDesignerLikeButton({ certificationId, initialLikeCount }: { certificationId: string; initialLikeCount: number }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialLikeCount);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await toggleTopDesignerLikeAction(certificationId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setLiked(result.liked);
      setCount((prev) => prev + (result.liked ? 1 : -1));
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={toggle}
      className={cn('gap-1.5', liked && 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100')}
    >
      <Heart className={cn('h-4 w-4', liked && 'fill-rose-500 text-rose-500')} />
      좋아요 {count}
    </Button>
  );
}
