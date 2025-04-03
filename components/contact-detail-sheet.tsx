"use client"

import { useState, useEffect, useCallback } from "react"
import { format, parseISO } from "date-fns"
import { supabase } from "@/lib/supabase"
import { Contact } from "@/components/contacts-data-table"
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
  User,
  Clipboard,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileEdit,
  Tag,
  AlertCircle,
} from "lucide-react"

interface ContactDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string | null
  onEdit?: (contact: Contact) => void
}

export function ContactDetailSheet({
  open,
  onOpenChange,
  contactId,
  onEdit
}: ContactDetailSheetProps) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  
  const fetchContactDetails = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single()
        
      if (error) throw error
      
      setContact(data)
    } catch (err) {
      console.error("Error fetching contact details:", err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }, [contactId])
  
  useEffect(() => {
    if (open && contactId) {
      fetchContactDetails()
    } else {
      // Reset state when closed
      setContact(null)
      setLoading(true)
      setError(null)
      setActiveTab("overview")
    }
  }, [open, contactId, fetchContactDetails])
  
  function handleEdit() {
    if (contact && onEdit) {
      onEdit(contact)
      onOpenChange(false)
    }
  }
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 sm:max-w-xl">
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-6">
          <SheetHeader className="pb-4 mb-6">
            <SheetTitle className="text-2xl font-bold flex items-center">
              {loading ? (
                <Skeleton className="h-8 w-48" />
              ) : contact ? (
                <div className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  {`${contact.first_name} ${contact.last_name}`}
                </div>
              ) : null}
            </SheetTitle>
            
            {!loading && contact && (
              <div className="flex items-center gap-2 mt-1">
                {contact.roles && contact.roles.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {contact.roles.map((role) => (
                      <Badge key={role} variant="outline" className="capitalize">
                        {role}
                      </Badge>
                    ))}
                  </div>
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
                <p className="text-sm text-destructive">Failed to load contact details</p>
              </div>
              <Button 
                onClick={fetchContactDetails} 
                variant="outline" 
                size="sm"
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          ) : contact ? (
            <div className="space-y-6 px-1">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="relations">Relations</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-5 mt-4">
                  <Card className="overflow-hidden">
                    <CardHeader className="py-4 px-5">
                      <CardTitle className="text-base font-medium flex items-center">
                        <Clipboard className="h-4 w-4 mr-2" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-4 px-5 pt-0">
                      <dl className="grid grid-cols-1 gap-y-4 text-sm">
                        {contact.email && (
                          <div className="flex items-start">
                            <dt className="flex items-center w-24 text-muted-foreground">
                              <Mail className="h-4 w-4 mr-2" />
                              Email
                            </dt>
                            <dd className="font-medium">{contact.email}</dd>
                          </div>
                        )}
                        
                        {contact.phone && (
                          <div className="flex items-start">
                            <dt className="flex items-center w-24 text-muted-foreground">
                              <Phone className="h-4 w-4 mr-2" />
                              Phone
                            </dt>
                            <dd className="font-medium">{contact.phone}</dd>
                          </div>
                        )}
                        
                        {(contact.address || contact.city || contact.state || contact.postal_code || contact.country) && (
                          <div className="flex items-start">
                            <dt className="flex items-center w-24 text-muted-foreground">
                              <MapPin className="h-4 w-4 mr-2" />
                              Address
                            </dt>
                            <dd className="font-medium">
                              <div className="flex flex-col">
                                {contact.address && <span>{contact.address}</span>}
                                {(contact.city || contact.state || contact.postal_code) && (
                                  <span>
                                    {[
                                      contact.city,
                                      contact.state,
                                      contact.postal_code
                                    ].filter(Boolean).join(", ")}
                                  </span>
                                )}
                                {contact.country && <span>{contact.country}</span>}
                              </div>
                            </dd>
                          </div>
                        )}
                        
                        {contact.roles && contact.roles.length > 0 && (
                          <div className="flex items-start">
                            <dt className="flex items-center w-24 text-muted-foreground">
                              <Tag className="h-4 w-4 mr-2" />
                              Roles
                            </dt>
                            <dd className="font-medium">
                              <div className="flex flex-wrap gap-1">
                                {contact.roles.map((role) => (
                                  <Badge key={role} variant="outline" className="capitalize">
                                    {role}
                                  </Badge>
                                ))}
                              </div>
                            </dd>
                          </div>
                        )}
                      </dl>
                    </CardContent>
                  </Card>
                  
                  {contact.notes && (
                    <Card className="overflow-hidden">
                      <CardHeader className="py-4 px-5">
                        <CardTitle className="text-base font-medium">Notes</CardTitle>
                      </CardHeader>
                      <CardContent className="py-4 px-5 pt-0">
                        <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                      </CardContent>
                    </Card>
                  )}
                  
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
                          <dt className="text-muted-foreground">Created At</dt>
                          <dd className="font-medium">
                            {format(parseISO(contact.created_at), 'PP')}
                          </dd>
                        </div>
                        
                        <div>
                          <dt className="text-muted-foreground">Last Updated</dt>
                          <dd className="font-medium">
                            {format(parseISO(contact.updated_at), 'PP')}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="relations" className="mt-4">
                  <Card className="overflow-hidden">
                    <CardHeader className="py-4 px-5">
                      <CardTitle className="text-base font-medium">Related Animals</CardTitle>
                    </CardHeader>
                    <CardContent className="py-4 px-5 pt-0">
                      <p className="text-sm text-muted-foreground italic">
                        No related animals yet.
                      </p>
                    </CardContent>
                  </Card>
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
              onClick={handleEdit}
              className="w-full flex items-center justify-center"
              disabled={loading || !contact || !onEdit}
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