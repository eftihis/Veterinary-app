"use client"

import { useState, useEffect } from "react"
import { format, parseISO, formatDistanceToNow, differenceInMonths, differenceInYears } from "date-fns"
import { supabase } from "@/lib/supabase"
import { Animal } from "@/components/animals-data-table"
import { AnimalTimeline } from "@/components/animal-timeline"
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Dog, 
  Cat, 
  Bird, 
  Rabbit, 
  Rat, 
  HelpCircle, 
  Calendar,
  User,
  Clipboard,
  Weight,
  FileEdit,
  History,
  Activity,
  Stethoscope,
  AlertCircle,
  XCircle
} from "lucide-react"

interface AnimalDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  animalId: string | null
  onEdit?: (animal: Animal) => void
}

export function AnimalDetailSheet({
  open,
  onOpenChange,
  animalId,
  onEdit
}: AnimalDetailSheetProps) {
  const [animal, setAnimal] = useState<Animal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  
  useEffect(() => {
    if (open && animalId) {
      fetchAnimalDetails()
    } else {
      // Reset state when closed
      setAnimal(null)
      setLoading(true)
      setError(null)
      setActiveTab("overview")
    }
  }, [open, animalId])
  
  async function fetchAnimalDetails() {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('id', animalId)
        .single()
        
      if (error) throw error
      
      setAnimal(data)
    } catch (err) {
      console.error("Error fetching animal details:", err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  // Get animal type icon
  function getAnimalTypeIcon(type: string) {
    const iconProps = { className: "h-5 w-5 mr-2" }
    
    switch(type?.toLowerCase()) {
      case 'dog':
        return <Dog {...iconProps} />
      case 'cat':
        return <Cat {...iconProps} />
      case 'bird':
        return <Bird {...iconProps} />
      case 'rabbit':
        return <Rabbit {...iconProps} />
      case 'rodent':
        return <Rat {...iconProps} />
      default:
        return <HelpCircle {...iconProps} />
    }
  }
  
  // Get status badge variant based on status
  function getStatusBadgeVariant(status: string | null) {
    switch(status?.toLowerCase()) {
      case 'active':
        return "default"
      case 'adopted':
        return "secondary"
      case 'foster':
        return "secondary"
      case 'treatment':
        return "destructive"
      case 'quarantine':
        return "outline"
      case 'deceased':
        return "destructive"
      default:
        return "outline"
    }
  }
  
  function handleEdit() {
    if (animal && onEdit) {
      onEdit(animal)
      onOpenChange(false)
    }
  }
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto p-6">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-2xl font-bold flex items-center">
            {!loading && animal && getAnimalTypeIcon(animal.type)}
            {loading ? <Skeleton className="h-8 w-48" /> : animal?.name}
          </SheetTitle>
          
          {!loading && animal && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getStatusBadgeVariant(animal.status)}>
                {animal.status || (animal.is_deceased ? 'Deceased' : 'Active')}
              </Badge>
              {animal.breed && (
                <Badge variant="outline">{animal.breed}</Badge>
              )}
            </div>
          )}
        </SheetHeader>
        
        {loading ? (
          <div className="space-y-6 px-1">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error ? (
          <div className="rounded-md bg-destructive/10 p-5 mx-1">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-destructive mr-2" />
              <p className="text-sm text-destructive">Failed to load animal details</p>
            </div>
            <Button 
              onClick={fetchAnimalDetails} 
              variant="outline" 
              size="sm"
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        ) : animal ? (
          <div className="space-y-6 px-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="medical">Medical</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-5 mt-4">
                <Card className="overflow-hidden">
                  <CardHeader className="py-4 px-5">
                    <CardTitle className="text-base font-medium flex items-center">
                      <Clipboard className="h-4 w-4 mr-2" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-4 px-5 pt-0">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Type</dt>
                        <dd className="font-medium capitalize">{animal.type}</dd>
                      </div>
                      
                      <div>
                        <dt className="text-muted-foreground">Breed</dt>
                        <dd className="font-medium">{animal.breed || '-'}</dd>
                      </div>
                      
                      <div>
                        <dt className="text-muted-foreground">Gender</dt>
                        <dd className="font-medium capitalize">{animal.gender || '-'}</dd>
                      </div>
                      
                      <div>
                        <dt className="text-muted-foreground">Weight</dt>
                        <dd className="font-medium">{animal.weight ? `${animal.weight} kg` : '-'}</dd>
                      </div>
                      
                      <div>
                        <dt className="text-muted-foreground">Age</dt>
                        <dd className="font-medium">
                          {animal.date_of_birth ? (
                            (() => {
                              const birthDate = parseISO(animal.date_of_birth)
                              const now = new Date()
                              const years = differenceInYears(now, birthDate)
                              const months = differenceInMonths(now, birthDate) % 12
                              
                              if (years > 0) {
                                return months > 0 
                                  ? `${years} ${years === 1 ? 'year' : 'years'}, ${months} ${months === 1 ? 'month' : 'months'}`
                                  : `${years} ${years === 1 ? 'year' : 'years'}`
                              } else {
                                return `${months} ${months === 1 ? 'month' : 'months'}`
                              }
                            })()
                          ) : '-'}
                        </dd>
                      </div>
                      
                      <div>
                        <dt className="text-muted-foreground">Microchip</dt>
                        <dd className="font-medium truncate">{animal.microchip_number || '-'}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                
                <Card className="overflow-hidden">
                  <CardHeader className="py-4 px-5">
                    <CardTitle className="text-base font-medium">Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="py-4 px-5 pt-0">
                    {animal.notes ? (
                      <p className="text-sm whitespace-pre-wrap">{animal.notes}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No notes available</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="overflow-hidden">
                  <CardHeader className="py-4 px-5">
                    <CardTitle className="text-base font-medium flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Owner Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-4 px-5 pt-0">
                    <div className="text-sm">
                      {animal.owner_id ? (
                        <p className="font-medium">Owner information available</p>
                      ) : (
                        <p className="text-muted-foreground italic">No owner information available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base font-medium flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Dates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-3">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Date of Birth</dt>
                        <dd className="font-medium">
                          {animal.date_of_birth ? 
                            format(parseISO(animal.date_of_birth), 'PP') : 
                            '-'
                          }
                        </dd>
                      </div>
                      
                      {animal.is_deceased && (
                        <div>
                          <dt className="text-muted-foreground">Date of Death</dt>
                          <dd className="font-medium">
                            {animal.date_of_death ? 
                              format(parseISO(animal.date_of_death), 'PP') : 
                              '-'
                            }
                          </dd>
                        </div>
                      )}
                      
                      <div>
                        <dt className="text-muted-foreground">Created At</dt>
                        <dd className="font-medium">
                          {format(parseISO(animal.created_at), 'PP')}
                        </dd>
                      </div>
                      
                      <div>
                        <dt className="text-muted-foreground">Last Updated</dt>
                        <dd className="font-medium">
                          {format(parseISO(animal.updated_at), 'PP')}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                
                {/* Recent events for overview */}
                <AnimalTimeline
                  animalId={animal.id}
                  limit={3}
                  showAddButton={false}
                />
              </TabsContent>
              
              <TabsContent value="timeline" className="mt-4">
                <div className="px-1">
                  <AnimalTimeline 
                    animalId={animal.id}
                    showAddButton={true}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="medical" className="mt-4 space-y-5">
                <Card className="overflow-hidden">
                  <CardHeader className="py-4 px-5">
                    <CardTitle className="text-base font-medium flex items-center">
                      <Stethoscope className="h-4 w-4 mr-2" />
                      Medical Records
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-4 px-5 pt-0">
                    <p className="text-sm text-muted-foreground">
                      Medical records will appear here.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
        
        <SheetFooter className="flex justify-between mt-6 pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Close
            </Button>
          </div>
          
          {animal && !loading && (
            <Button
              size="sm"
              onClick={handleEdit}
              className="flex items-center"
            >
              <FileEdit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
} 