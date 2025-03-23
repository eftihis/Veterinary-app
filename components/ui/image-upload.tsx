"use client"

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Image as ImageIcon, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AspectRatio } from '@/components/ui/aspect-ratio'

// Maximum file size: 200KB (in bytes)
const MAX_FILE_SIZE = 200 * 1024;
// Target width for resizing
const TARGET_WIDTH = 1200;

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
  maxSizeMB = 0.2 // Default to 200KB
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Function to resize an image
  const resizeImage = async (file: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      // Create an image element to load the file
      const img = new Image();
      img.src = URL.createObjectURL(file);
      
      img.onload = () => {
        // Revoke object URL to free memory
        URL.revokeObjectURL(img.src);
        
        // If image is already smaller than target, return the original file
        if (img.width <= TARGET_WIDTH) {
          resolve(file);
          return;
        }
        
        // Calculate new height maintaining aspect ratio
        const scaleFactor = TARGET_WIDTH / img.width;
        const targetHeight = img.height * scaleFactor;
        
        // Create a canvas for resizing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions to the resized image dimensions
        canvas.width = TARGET_WIDTH;
        canvas.height = targetHeight;
        
        // Draw the resized image on the canvas
        ctx?.drawImage(img, 0, 0, TARGET_WIDTH, targetHeight);
        
        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              console.log(`Resized image from ${img.width}x${img.height} to ${TARGET_WIDTH}x${targetHeight}`);
              resolve(blob);
            } else {
              console.error('Failed to create blob from canvas');
              resolve(null);
            }
          },
          file.type,
          0.8 // Quality setting - 0.8 is a good balance between quality and file size
        );
      };
      
      img.onerror = () => {
        console.error('Error loading image for resizing');
        URL.revokeObjectURL(img.src);
        resolve(null);
      };
    });
  };

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
    
    setIsUploading(true)
    setProcessingProgress(10)
    
    try {
      // First resize the image
      const resizedBlob = await resizeImage(file);
      if (!resizedBlob) {
        throw new Error('Failed to resize image');
      }
      setProcessingProgress(50)
      
      // Check file size after resize (must be under 200KB)
      if (resizedBlob.size > MAX_FILE_SIZE) {
        setIsUploading(false)
        setProcessingProgress(0)
        toast.error(`Image is too large (${(resizedBlob.size/1024).toFixed(1)}KB). 
          Maximum size is 200KB. Please use a smaller or more compressible image.`)
        return
      }
      
      setProcessingProgress(70)
      
      // Create file from blob for upload
      const resizedFile = new File([resizedBlob], file.name, { 
        type: file.type,
        lastModified: Date.now()
      });
      
      // Create a simple filename with a unique ID
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      console.log(`Uploading resized image (${(resizedFile.size/1024).toFixed(1)}KB) to bucket:`, bucket)
      
      // Upload directly to bucket root for simplicity
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, resizedFile)
      
      if (uploadError) {
        throw uploadError
      }
      
      setProcessingProgress(90)
      
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
      setProcessingProgress(0)
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
              <p className="text-xs text-muted-foreground mt-1">
                {processingProgress < 100 
                  ? `Processing image... ${processingProgress}%` 
                  : 'Uploading...'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium">Click to upload</p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, GIF or WebP (max. 200KB)
              </p>
              <p className="text-xs text-muted-foreground">
                Images will be resized to 1200px width
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