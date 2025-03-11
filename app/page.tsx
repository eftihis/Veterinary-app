import VeterinaryForm from "@/components/veterinary-form";

export default function Home() {
  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Veterinary Clinic Invoice</h1>
      <VeterinaryForm />
    </div>
  );
}
