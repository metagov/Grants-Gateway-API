import { useEffect, useState } from 'react';

export function useMobileDetection() {
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