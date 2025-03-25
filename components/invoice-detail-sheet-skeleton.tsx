import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function InvoiceDetailSheetSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 px-1">
      {/* Public Sharing Card Skeleton */}
      <Card className="border-dashed py-2 shadow-none">
        <CardHeader className="py-1 px-4 sm:py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-5 w-24" />
          </div>
        </CardHeader>
        <CardContent className="py-2 px-4 sm:py-4 sm:px-5 pt-0">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-10" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Invoice Information Skeleton */}
      <Card>
        <CardHeader className="py-4 px-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-5 w-36" />
          </div>
        </CardHeader>
        <CardContent className="py-4 px-5 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-4 w-30" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Patient Information Skeleton */}
      <Card>
        <CardHeader className="py-4 px-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-5 w-36" />
          </div>
        </CardHeader>
        <CardContent className="py-4 px-5 pt-0">
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Veterinarian Information Skeleton */}
      <Card>
        <CardHeader className="py-4 px-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-5 w-48" />
          </div>
        </CardHeader>
        <CardContent className="py-4 px-5 pt-0">
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Line Items Skeleton */}
      <Card>
        <CardHeader className="py-4 px-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-5 w-24" />
          </div>
        </CardHeader>
        <CardContent className="py-4 px-5 pt-0">
          <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]"><Skeleton className="h-4 w-12" /></TableHead>
                  <TableHead className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableHead>
                  <TableHead className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableHead>
                  <TableHead className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableHead>
                  <TableHead className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell colSpan={3} className="sm:hidden text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell colSpan={4} className="hidden sm:table-cell text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                </TableRow>
                <TableRow className="font-bold">
                  <TableCell colSpan={3} className="sm:hidden text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  <TableCell colSpan={4} className="hidden sm:table-cell text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Attachments Section Skeleton */}
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-5 w-28" />
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 pt-0 pb-4">
          <div className="flex justify-center items-center py-4">
            <Skeleton className="h-20 w-full rounded-md" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 