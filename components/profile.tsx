"use client";

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { Loader2, Upload, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { authService } from '@/lib/auth-service';
import imageCompression from 'browser-image-compression';

// Profile form schema
const profileFormSchema = z.object({
  fullName: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  firstName: z.string().min(1, {
    message: "First name is required.",
  }),
  lastName: z.string().min(1, {
    message: "Last name is required.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }).optional(),
});

// Password form schema
const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, {
    message: "Current password must be at least 6 characters.",
  }),
  newPassword: z.string().min(8, {
    message: "New password must be at least 8 characters.",
  }),
  confirmPassword: z.string().min(8, {
    message: "Please confirm your new password.",
  }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface UserProfileProps {
  initialFullName: string;
  initialFirstName: string;
  initialLastName: string;
  initialEmail: string;
  avatarUrl: string;
  role: string;
  onProfileUpdate: () => Promise<void>;
}

export default function UserProfile({
  initialFullName,
  initialFirstName,
  initialLastName,
  initialEmail,
  avatarUrl,
  role,
  onProfileUpdate,
}: UserProfileProps) {
  const { user } = useAuth();
  const { updateProfile } = useProfile();
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState(avatarUrl);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toggle functions for password visibility
  const toggleCurrentPassword = () => setShowCurrentPassword(!showCurrentPassword);
  const toggleNewPassword = () => setShowNewPassword(!showNewPassword);
  const toggleConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  // Add a handler to trigger file input click
  const handleAvatarClick = () => {
    console.log("Avatar click handler triggered");
    if (fileInputRef.current && !isUpdatingAvatar) {
      console.log("Triggering file input click");
      fileInputRef.current.click();
    }
  };

  // Profile form
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: initialFullName,
      firstName: initialFirstName,
      lastName: initialLastName,
      email: initialEmail,
    },
  });

  // Reset form when initialFullName changes
  useEffect(() => {
    profileForm.reset({
      fullName: initialFullName,
      firstName: initialFirstName,
      lastName: initialLastName,
      email: initialEmail,
    });
  }, [initialFullName, initialFirstName, initialLastName, initialEmail, profileForm]);

  // Password form
  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Profile form submission
  const onProfileSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    try {
      // Trim whitespace and capitalize first and last names
      const first_name = values.firstName.trim().charAt(0).toUpperCase() + values.firstName.trim().slice(1);
      const last_name = values.lastName.trim().charAt(0).toUpperCase() + values.lastName.trim().slice(1);

      const { success, error } = await updateProfile({
        display_name: values.fullName,
        contact: {
          first_name,
          last_name
        }
      });

      if (success) {
        await onProfileUpdate();
        toast.success("Profile updated successfully");
      } else {
        toast.error(`Failed to update profile: ${error}`);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Profile update error:", error);
    }
  };

  // Password form submission
  const onPasswordSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
    try {
      // Show loading toast
      const loadingToastId = toast.loading("Updating password...");
      
      // Use the auth service instead of direct Supabase call
      const { error } = await authService.updatePassword(values.newPassword);
      
      // Dismiss loading toast
      toast.dismiss(loadingToastId);
      
      if (error) {
        // Handle specific error cases
        if (error.message?.includes('timed out')) {
          toast.warning(
            "Password update is taking longer than expected. The update may still complete in the background. You may need to log out and log back in with your new password.",
            { duration: 8000 }
          );
        } else {
          toast.error(`Failed to update password: ${error.message || 'Unknown error'}`);
        }
        
        // Keep form values in case user wants to retry
        passwordForm.setValue("currentPassword", values.currentPassword);
        passwordForm.setValue("newPassword", values.newPassword);
        passwordForm.setValue("confirmPassword", values.confirmPassword);
      } else {
        toast.success("Password updated successfully. You will be signed out in a moment.");
        
        // Reset the form
        passwordForm.reset({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        
        // Sign out after delay
        setTimeout(async () => {
          try {
            await authService.signOut();
            toast.info("You have been signed out. Please sign in with your new password.");
          } catch (signOutError) {
            console.error("Error during sign out:", signOutError);
            toast.error("Failed to sign out automatically. Please sign out manually and log in with your new password.");
          }
        }, 3000);
      }
    } catch (outerError) {
      console.error("Unexpected error in password update:", outerError);
      toast.error("An unexpected error occurred. Please try again later.");
    }
  };

  // Avatar upload handler
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user) {
      return;
    }

    try {
      const file = files[0];
      
      // Check file size (200KB = 200 * 1024 bytes)
      const MAX_FILE_SIZE = 200 * 1024; // 200KB
      
      // Create a new image element to get dimensions
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      
      // Wait for image to load
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      // Create a canvas to crop the image to a square
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Determine the size of the square (use the smaller dimension)
      const size = Math.min(img.width, img.height);
      canvas.width = size;
      canvas.height = size;
      
      // Calculate crop position (center of the image)
      const offsetX = (img.width - size) / 2;
      const offsetY = (img.height - size) / 2;
      
      // Draw the cropped image
      ctx?.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);
      
      // Convert canvas to Blob
      const croppedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else throw new Error("Failed to create image blob");
        }, file.type);
      });
      
      // Free memory
      URL.revokeObjectURL(img.src);
      
      // Configure compression options
      const options = {
        maxSizeMB: 0.2, // 200KB
        maxWidthOrHeight: 400, // Max width/height of 400px
        useWebWorker: true,
        fileType: file.type,
        initialQuality: 0.8,
        alwaysKeepResolution: true,
        signal: undefined,
        onProgress: undefined,
        onStart: undefined,
        onEnd: undefined,
        onError: undefined,
      };

      // Compress the cropped image
      const compressedFile = await imageCompression(
        new File([croppedBlob], file.name, { type: file.type }),
        options
      );
      
      // Check if compression was successful
      if (compressedFile.size > MAX_FILE_SIZE) {
        toast.error("Image is too large even after compression. Please try a smaller image.");
        return;
      }

      setIsUpdatingAvatar(true);

      // Delete previous avatar if it exists
      if (profileAvatar && !profileAvatar.includes('/placeholder.svg')) {
        try {
          // Extract the file path from the URL
          const urlParts = profileAvatar.split('/');
          const filePath = urlParts.slice(urlParts.indexOf('avatars')).join('/');
          
          // Delete the previous avatar
          const { error: deleteError } = await supabase.storage
            .from('profile-avatars')
            .remove([filePath]);

          if (deleteError) {
            console.warn('Failed to delete previous avatar:', deleteError);
            // Continue with upload even if deletion fails
          }
        } catch (error) {
          console.warn('Error deleting previous avatar:', error);
          // Continue with upload even if deletion fails
        }
      }
      
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      // Upload to Supabase storage using the compressed file
      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(filePath, compressedFile);
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-avatars')
        .getPublicUrl(filePath);
      
      // Update profile with new avatar URL
      const { success, error } = await updateProfile({
        avatar_url: publicUrl,
      });
      
      if (!success) {
        throw error;
      }
      
      // Update local state with new avatar
      setProfileAvatar(publicUrl);
      await onProfileUpdate();
      
      toast.success("Avatar updated successfully");
    } catch (error) {
      toast.error("Failed to update avatar");
      console.error("Avatar upload error:", error);
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      
      {/* Profile Tab */}
      <TabsContent value="profile">
        <Card className="border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Profile Information</CardTitle>
            <CardDescription>
              Update your account information and how your profile appears
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center md:flex-row md:items-start gap-6 pb-6 border-b">
              <div 
                className="relative group" 
                onClick={handleAvatarClick} 
                style={{ cursor: 'pointer' }}
              >
                <Avatar className="h-24 w-24 md:h-28 md:w-28 border-2 border-border">
                  <AvatarImage src={profileAvatar} alt={initialFullName} />
                  <AvatarFallback>
                    {initialFullName
                      ? initialFullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                      : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="flex flex-col gap-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                  <h3 className="text-lg font-semibold text-foreground">{initialFullName || 'Your Profile'}</h3>
                  <span className="inline-block px-2 py-0.5 bg-muted rounded-sm text-xs font-medium self-center md:self-auto">{role}</span>
                </div>
                <p className="text-sm text-muted-foreground">{initialEmail}</p>
                <div className="mt-2">
                  <button 
                    type="button"
                    onClick={handleAvatarClick}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-md text-xs font-medium cursor-pointer transition-colors"
                    disabled={isUpdatingAvatar}
                  >
                    {isUpdatingAvatar ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        <span>Change avatar</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    JPG, GIF or PNG. 200KB max.
                  </p>
                </div>
              </div>
            </div>

            {/* Hidden file input for avatar upload */}
            <input
              id="avatar-upload"
              type="file"
              className="hidden"
              accept="image/png, image/jpeg, image/gif"
              onChange={handleAvatarUpload}
              disabled={isUpdatingAvatar}
              ref={fileInputRef}
            />

            {/* Profile Form */}
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={profileForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={profileForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your display name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Your email address" {...field} disabled />
                      </FormControl>
                      <FormDescription>
                        Contact support to change your email address.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="mt-6 w-full sm:w-auto" disabled={profileForm.formState.isSubmitting}>
                  {profileForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* Password Tab */}
      <TabsContent value="password">
        <Card className="border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Change Password</CardTitle>
            <CardDescription>
              Update your password to maintain account security
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showCurrentPassword ? "text" : "password"} 
                            placeholder="Enter current password" 
                            {...field} 
                          />
                          <button
                            type="button"
                            onClick={toggleCurrentPassword}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                          >
                            {showCurrentPassword ? 
                              <EyeOff className="h-4 w-4" /> : 
                              <Eye className="h-4 w-4" />
                            }
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showNewPassword ? "text" : "password"} 
                            placeholder="Enter new password" 
                            {...field} 
                          />
                          <button
                            type="button"
                            onClick={toggleNewPassword}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                          >
                            {showNewPassword ? 
                              <EyeOff className="h-4 w-4" /> : 
                              <Eye className="h-4 w-4" />
                            }
                          </button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Password must be at least 8 characters.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showConfirmPassword ? "text" : "password"} 
                            placeholder="Confirm new password" 
                            {...field} 
                          />
                          <button
                            type="button"
                            onClick={toggleConfirmPassword}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                          >
                            {showConfirmPassword ? 
                              <EyeOff className="h-4 w-4" /> : 
                              <Eye className="h-4 w-4" />
                            }
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="mt-6 mb-4 w-full sm:w-auto" disabled={passwordForm.formState.isSubmitting}>
                  {passwordForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="border-t bg-muted/20 px-6 py-4">
            <p className="text-xs text-muted-foreground">
              For security purposes, you&apos;ll be required to log in again after changing your password.
            </p>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
} 