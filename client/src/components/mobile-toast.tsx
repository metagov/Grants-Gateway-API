import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Monitor } from 'lucide-react';

export default function MobileToast() {
  const isMobile = useIsMobile();
  const { toast } = useToast();

  useEffect(() => {
    if (isMobile) {
      // Small delay to ensure the app is fully loaded
      const timer = setTimeout(() => {
        toast({
          title: "Best Experience on Desktop",
          description: "While this app works on mobile, it's optimized for desktop usage for better experience.",
          duration: 8000,
          action: (
            <div className="flex items-center">
              <Monitor className="h-4 w-4" />
            </div>
          ),
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isMobile, toast]);

  return null;
}