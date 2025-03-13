import SupabaseTest from "@/components/supabase-test";

export default function SupabaseTestPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Supabase Connection Test
      </h1>
      <SupabaseTest />
    </div>
  );
} 