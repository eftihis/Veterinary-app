"use client"

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Image as ImageIcon, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AspectRatio } from '@/components/ui/aspect-ratio'

interface ImageUploadProps {
  bucket: string
  imageUrl: string | null
  onImageUploaded: (url: string) => void
  onImageRemoved: () => void
  maxSizeMB?: number
}

export function ImageUpload({
  bucket,
  imageUrl,
  onImageUploaded,
  onImageRemoved,
  maxSizeMB = 2
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.')
      return
    }
    
    // Check file size (convert MB to bytes)
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      toast.error(`File is too large. Maximum size is ${maxSizeMB}MB.`)
      return
    }

    try {
      setIsUploading(true)

      // Create a simple filename with a unique ID
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      console.log('Uploading file to bucket:', bucket, 'with filename:', fileName)
      
      // Upload directly to bucket root for simplicity
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file)
      
      if (uploadError) {
        throw uploadError
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)
      
      console.log('Upload successful, public URL:', publicUrl)
      
      onImageUploaded(publicUrl)
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = async () => {
    if (!imageUrl) return

    try {
      setIsRemoving(true)
      
      // Extract just the filename from the URL
      const urlParts = imageUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      
      if (fileName) {
        console.log('Removing image:', fileName)
        
        const { error } = await supabase.storage
          .from(bucket)
          .remove([fileName])
        
        if (error) {
          console.error('Error removing image:', error)
          throw error
        }
      }
      
      onImageRemoved()
      toast.success('Image removed')
    } catch (error) {
      console.error('Error removing image:', error)
      toast.error('Failed to remove image')
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Animal Image</label>
        {imageUrl && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={handleRemoveImage}
            disabled={isUploading || isRemoving}
          >
            {isRemoving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <X className="h-3.5 w-3.5 mr-1" />
                Remove
              </>
            )}
          </Button>
        )}
      </div>

      {imageUrl ? (
        <div className="rounded-md overflow-hidden border">
          <AspectRatio ratio={1}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Animal photograph"
              className="object-cover w-full h-full" 
            />
          </AspectRatio>
        </div>
      ) : (
        <div 
          className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors min-h-[200px]"
          onClick={handleUploadClick}
        >
          <div className="rounded-full bg-primary/10 p-2">
            <ImageIcon className="h-4 w-4 text-primary" />
          </div>
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">Uploading...</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium">Click to upload</p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, GIF or WebP (max. {maxSizeMB}MB)
              </p>
            </>
          )}
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={isUploading || isRemoving}
      />
    </div>
  )
} 