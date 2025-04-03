"use client"

import { useState, useEffect, useCallback } from "react"
import { format, parseISO, differenceInMonths, differenceInYears } from "date-fns"
import { supabase } from "@/lib/supabase"
import { Animal } from "@/components/animals-data-table"
import { AnimalTimeline } from "@/components/animal-timeline"
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Dog, 
  Cat, 
  Bird, 
  Rabbit, 
  Rat, 
  HelpCircle, 
  User,
  Clipboard,
  FileEdit,
  AlertCircle,
  Paperclip
} from "lucide-react"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { AttachmentsViewer, Attachment } from "@/components/ui/attachments-viewer"

// Define Contact interface for type safety
interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  roles?: string[];
  [key: string]: string | string[] | number | boolean | null | undefined; // Instead of 'any'
}

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
  const [ownerDetails, setOwnerDetails] = useState<Contact | null>(null)
  const [loadingOwner, setLoadingOwner] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [currentWeight, setCurrentWeight] = useState<number | null>(null)
  const [lastWeightDate, setLastWeightDate] = useState<string | null>(null)
  const [loadingWeight, setLoadingWeight] = useState(false)
  
  const fetchAnimalDetails = useCallback(async () => {
    if (!animalId) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Fetch animal details
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('id', animalId)
        .single()
      
      if (error) throw error
      
      setAnimal(data)
      
      // Fetch current weight from events
      setLoadingWeight(true)
      try {
        const { data: weightData, error: weightError } = await supabase
          .from("animal_events")
          .select("details, event_date")
          .eq("animal_id", animalId)
          .eq("event_type", "weight")
          .eq("is_deleted", false)
          .order("event_date", { ascending: false })
          .limit(1)
        
        if (!weightError && weightData && weightData.length > 0) {
          setCurrentWeight(weightData[0].details?.weight ?? null)
          setLastWeightDate(weightData[0].event_date ?? null)
        } else {
          setCurrentWeight(null)
          setLastWeightDate(null)
        }
      } catch (weightErr) {
        console.error("Error fetching weight:", weightErr)
        setCurrentWeight(null)
        setLastWeightDate(null)
      } finally {
        setLoadingWeight(false)
      }
      
      // If animal has an owner, fetch owner details
      if (data.owner_id) {
        setLoadingOwner(true)
        
        const { data: ownerData, error: ownerError } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', data.owner_id)
          .single()
        
        if (ownerError) {
          console.error("Error fetching owner details:", ownerError)
          setOwnerDetails(null)
        } else {
          setOwnerDetails(ownerData)
        }
        
        setLoadingOwner(false)
      } else {
        setOwnerDetails(null)
      }

      // Fetch event attachments for this animal
      const { data: events, error: eventsError } = await supabase
        .from('animal_events')
        .select('id')
        .eq('animal_id', animalId)
      
      if (eventsError) {
        console.error("Error fetching animal events:", eventsError)
      } else if (events && events.length > 0) {
        const eventIds = events.map(event => event.id)
        
        const { data: attachmentData, error: attachmentError } = await supabase
          .from('animal_event_attachments')
          .select('*')
          .in('event_id', eventIds)
        
        if (attachmentError) {
          console.error("Error fetching attachments:", attachmentError)
          setAttachments([])
        } else {
          setAttachments(attachmentData || [])
        }
      } else {
        setAttachments([])
      }
    } catch (error) {
      console.error("Error fetching animal details:", error)
      setError("Failed to load animal details")
    } finally {
      setLoading(false)
    }
  }, [animalId])
  
  useEffect(() => {
    fetchAnimalDetails()
    
    // Add event listener for refreshing animal details when status changes
    const handleStatusChange = () => {
      console.log("Animal status change detected, refreshing animal details")
      fetchAnimalDetails()
    }
    
    // Listen for status change events
    window.addEventListener('animal-status-changed', handleStatusChange)
    
    // Clean up event listener
    return () => {
      window.removeEventListener('animal-status-changed', handleStatusChange)
    }
  }, [fetchAnimalDetails])
  
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
  
  function handleEdit() {
    if (animal && onEdit) {
      onEdit(animal)
      onOpenChange(false)
    }
  }
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 sm:max-w-xl">
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-6">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-2 mb-1">
              <SheetTitle className="text-2xl font-bold flex items-center">
                {!loading && animal && getAnimalTypeIcon(animal.type)}
                {loading ? <Skeleton className="h-8 w-48" /> : animal?.name}
              </SheetTitle>
              
              {!loading && animal && (
                <Badge variant="outline" className="capitalize">
                  {animal.status || (animal.is_deceased ? 'Deceased' : 'Active')}
                </Badge>
              )}
            </div>
            
            {!loading && animal && (
              <p className="text-xs text-muted-foreground mt-1">
                Created {format(parseISO(animal.created_at), 'PP')} • Updated {format(parseISO(animal.updated_at), 'PP')}
              </p>
            )}
          </SheetHeader>
          
          {loading ? (
            <div className="space-y-6 px-1">
              <Tabs defaultValue="overview">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="overview" disabled>
                    <Skeleton className="h-4 w-16" />
                  </TabsTrigger>
                  <TabsTrigger value="timeline" disabled>
                    <Skeleton className="h-4 w-16" />
                  </TabsTrigger>
                </TabsList>
                
                <div className="space-y-5 mt-4">
                  {/* Image Placeholder (optional) */}
                  <Card className="overflow-hidden p-0">
                    <CardContent className="p-0">
                      <AspectRatio ratio={4 / 3}>
                        <Skeleton className="h-full w-full" />
                      </AspectRatio>
                    </CardContent>
                  </Card>
                  
                  {/* Basic Information Skeleton */}
                  <Card className="overflow-hidden">
                    <CardHeader className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    </CardHeader>
                    <CardContent className="py-4 px-5 pt-0">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i}>
                            <Skeleton className="h-3 w-16 mb-1" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Attachments Skeleton */}
                  <Card className="overflow-hidden">
                    <CardHeader className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-5 w-28" />
                      </div>
                    </CardHeader>
                    <CardContent className="py-4 px-5 pt-0">
                      <Skeleton className="h-20 w-full rounded-md" />
                    </CardContent>
                  </Card>
                  
                  {/* Notes Skeleton */}
                  <Card className="overflow-hidden">
                    <CardHeader className="py-4 px-5">
                      <Skeleton className="h-5 w-16" />
                    </CardHeader>
                    <CardContent className="py-4 px-5 pt-0">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Owner Information Skeleton */}
                  <Card className="overflow-hidden">
                    <CardHeader className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-5 w-36" />
                      </div>
                    </CardHeader>
                    <CardContent className="py-4 px-5 pt-0">
                      <div className="space-y-2">
                        <div>
                          <Skeleton className="h-3 w-12 mb-1" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                        <div>
                          <Skeleton className="h-3 w-12 mb-1" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                        <div>
                          <Skeleton className="h-3 w-12 mb-1" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </Tabs>
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
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-5 mt-4">
                  {animal.image_url && (
                    <Card className="overflow-hidden p-0">
                      <CardContent className="p-0">
                        <AspectRatio ratio={4 / 3}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={animal.image_url} 
                            alt={`Photo of ${animal.name}`}
                            className="object-cover w-full h-full"
                          />
                        </AspectRatio>
                      </CardContent>
                    </Card>
                  )}
                  
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
                          <dd className="font-medium">
                            {loadingWeight ? (
                              <Skeleton className="h-4 w-16" />
                            ) : currentWeight ? (
                              <>
                                {currentWeight} kg 
                                <span className="text-xs text-muted-foreground ml-1">
                                  {lastWeightDate ? `as of ${format(parseISO(lastWeightDate), 'PP')}` : ''}
                                </span>
                              </>
                            ) : '-'}
                          </dd>
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
                      <CardTitle className="text-base font-medium flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Owner Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-4 px-5 pt-0">
                      {animal.owner_id ? (
                        loadingOwner ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                        ) : ownerDetails ? (
                          <div className="text-sm space-y-2">
                            <div>
                              <dt className="text-muted-foreground">Name</dt>
                              <dd className="font-medium">
                                {ownerDetails.first_name} {ownerDetails.last_name}
                              </dd>
                            </div>
                            {ownerDetails.email && (
                              <div>
                                <dt className="text-muted-foreground">Email</dt>
                                <dd className="font-medium">{ownerDetails.email}</dd>
                              </div>
                            )}
                            {ownerDetails.phone && (
                              <div>
                                <dt className="text-muted-foreground">Phone</dt>
                                <dd className="font-medium">{ownerDetails.phone}</dd>
                              </div>
                            )}
                            {ownerDetails.roles && ownerDetails.roles.length > 0 && (
                              <div>
                                <dt className="text-muted-foreground">Role</dt>
                                <dd className="font-medium capitalize">
                                  {ownerDetails.roles.join(', ')}
                                </dd>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-orange-500">
                            Owner ID exists but details could not be loaded
                          </p>
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No owner information available</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card className="overflow-hidden">
                    <CardHeader className="py-4 px-5">
                      <CardTitle className="text-base font-medium flex items-center">
                        <Paperclip className="h-4 w-4 mr-2" />
                        Attachments
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-4 px-5 pt-0">
                      {attachments.length > 0 ? (
                        <AttachmentsViewer 
                          attachments={attachments}
                          showTitle={false}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No attachments available</p>
                      )}
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
                </TabsContent>
                
                <TabsContent value="timeline" className="mt-4">
                  <div className="px-1">
                    <AnimalTimeline 
                      animalId={animal.id}
                      showAddButton={true}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </div>
        
        {/* Fixed footer that doesn't scroll */}
        <div className="border-t border-border pt-4 px-6 pb-4 bg-background">
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Close
            </Button>
            
            <Button
              size="sm"
              onClick={handleEdit}
              className="w-full flex items-center justify-center"
              disabled={loading || !animal || !onEdit}
            >
              <FileEdit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 