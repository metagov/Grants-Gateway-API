import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Monitor } from 'lucide-react';

function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Check user agent for mobile devices
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i;
      
      // Also check screen width as a secondary indicator
      const isSmallScreen = window.innerWidth <= 768;
      
      // Check for touch capability
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      const isMobileDevice = mobileRegex.test(userAgent) || (isSmallScreen && isTouchDevice);
      setIsMobile(isMobileDevice);
    };

    // Check on mount
    checkMobile();

    // Check on resize
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export default function MobileToast() {
  const isMobile = useMobileDetection();
  const { toast } = useToast();

  useEffect(() => {
    if (isMobile) {
      // Small delay to ensure the app is fully loaded
      const timer = setTimeout(() => {
        toast({
          title: "Best Experience on Desktop",
          description: "While this app works on mobile, it's optimized for desktop usage with better query building and data visualization.",
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