"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VeterinaryForm from "@/components/veterinary-form";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  // Don't render anything until we're on the client and have checked auth
  if (!isClient || isLoading) {
    return <div className="container max-w-full py-10 px-4">Loading...</div>;
  }

  // If no user, don't render the protected content (we'll redirect in the useEffect)
  if (!user) {
    return null;
  }

  return (
    <div className="container max-w-full py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-1xl font-bold text-center">Veterinary Clinic Invoice</h1>
        <Button onClick={handleSignOut} variant="outline">Sign Out</Button>
      </div>
      <VeterinaryForm />
    </div>
  );
}
