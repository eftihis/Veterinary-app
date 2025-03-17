"use client";

import { useState, useEffect } from "react";
import { ProfileContent } from "@/app/profiles/profile-content";
import { ProfileSkeleton } from "@/components/skeletons/profile-skeleton";

export function ProfileContentWrapper() {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading) {
    return <ProfileSkeleton />;
  }
  
  return <ProfileContent />;
} 