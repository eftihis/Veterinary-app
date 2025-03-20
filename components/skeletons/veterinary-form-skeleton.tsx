import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function VeterinaryFormSkeleton() {
  return (
    <form className="space-y-8 max-w-4xl mx-auto">
      {/* Patient Information Section */}
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-7 w-48 mb-6" /> {/* Section Title */}
          
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document Number */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" /> {/* Label */}
                <Skeleton className="h-9 w-full" /> {/* Input */}
              </div>
              
              {/* Reference */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" /> {/* Label */}
                <Skeleton className="h-9 w-full" /> {/* Input */}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Animal Name */}
            <div className="h-[72px] flex flex-col gap-2">
              <div className="h-4 w-28 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="h-10 w-full bg-gray-200 rounded-md animate-pulse"></div>
            </div>

            {/* Check-in Date */}
            <div className="h-[72px] flex flex-col gap-2">
              <div className="h-4 w-28 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="h-10 w-full bg-gray-200 rounded-md animate-pulse"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Check-out Date */}
            <div className="h-[72px] flex flex-col gap-2">
              <div className="h-4 w-28 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="h-10 w-full bg-gray-200 rounded-md animate-pulse"></div>
            </div>
            
            {/* Empty space where a field might be added later */}
            <div className="hidden md:block"></div>
          </div>
        </CardContent>
      </Card>
      
      {/* Line Items Section */}
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-7 w-32 mb-6" /> {/* Section Title */}
          
          {/* Line items header */}
          <div className="grid grid-cols-[40px_1fr_120px_120px_120px_40px] gap-2 mb-4 px-2">
            <Skeleton className="h-4 w-8" /> {/* # column */}
            <Skeleton className="h-4 w-24" /> {/* Description column */}
            <Skeleton className="h-4 w-16" /> {/* Quantity column */}
            <Skeleton className="h-4 w-16" /> {/* Price column */}
            <Skeleton className="h-4 w-16" /> {/* Amount column */}
            <div /> {/* Actions column */}
          </div>
          
          {/* Line items rows - render 3 skeleton rows */}
          {[1, 2, 3].map((item) => (
            <div 
              key={item} 
              className="grid grid-cols-[40px_1fr_120px_120px_120px_40px] gap-2 mb-4 items-center"
            >
              <Skeleton className="h-9 w-8" /> {/* # column */}
              <Skeleton className="h-9 w-full" /> {/* Description dropdown */}
              <Skeleton className="h-9 w-full" /> {/* Quantity input */}
              <Skeleton className="h-9 w-full" /> {/* Price input */}
              <Skeleton className="h-9 w-full" /> {/* Amount (calculated) */}
              <Skeleton className="h-8 w-8 rounded-full" /> {/* Action button */}
            </div>
          ))}
          
          {/* Add item button */}
          <div className="flex justify-start mt-4">
            <Skeleton className="h-9 w-32" /> {/* Add item button */}
          </div>
          
          {/* Totals section */}
          <div className="flex flex-col items-end gap-2 mt-6">
            <div className="flex w-full max-w-[240px] justify-between">
              <Skeleton className="h-4 w-16" /> {/* Subtotal label */}
              <Skeleton className="h-4 w-20" /> {/* Subtotal value */}
            </div>
            <div className="flex w-full max-w-[240px] justify-between">
              <Skeleton className="h-4 w-16" /> {/* Total label */}
              <Skeleton className="h-5 w-24" /> {/* Total value */}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Submit button */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32" /> {/* Submit button */}
      </div>
    </form>
  );
} 