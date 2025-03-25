import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { supabase } from "@/lib/supabase"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format column names for display in column visibility dropdowns
 */
export function formatColumnName(columnId: string): string {
  // Map of specific column IDs to friendly names
  const columnNameMap: Record<string, string> = {
    // Common columns
    "created_at": "Created Date",
    "updated_at": "Updated Date",
    
    // Animal table columns
    "date_of_birth": "Date of Birth",
    "is_deceased": "Deceased",
    "microchip_number": "Microchip ID",
    
    // Contact table columns
    "is_active": "Active Status",
    "first_name": "First Name",
    "last_name": "Last Name",
    "postal_code": "Postal Code",
    
    // Event columns
    "event_type": "Event Type",
    "event_date": "Event Date",
    "contact_id": "Contact",
    "status_change": "Status Change",
  };

  // Return the mapped name if it exists
  if (columnNameMap[columnId]) {
    return columnNameMap[columnId];
  }

  // Default formatting: capitalize and replace underscores with spaces
  return columnId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format event types for display in the animal timeline
 */
export function formatEventType(eventType: string): string {
  // Map of specific event types to friendly names
  const eventTypeMap: Record<string, string> = {
    "visit": "Veterinary Visit",
    "medication": "Medication",
    "surgery": "Surgery",
    "vaccination": "Vaccination",
    "status_change": "Status Change",
    "treatment": "Treatment",
    "diagnosis": "Diagnosis",
    "test": "Lab Test",
    "check_in": "Check In",
    "check_out": "Check Out",
    "adoption": "Adoption",
    "foster": "Foster Placement",
    "transfer": "Transfer",
    "return": "Return to Shelter",
    "microchip": "Microchip",
    "spay_neuter": "Spay/Neuter",
    "weight": "Weight Check",
    "dental": "Dental Care",
    "note": "Note"
  };

  // Return the mapped name if it exists
  if (eventTypeMap[eventType]) {
    return eventTypeMap[eventType];
  }

  // Default formatting: capitalize and replace underscores with spaces
  return eventType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Get the animal's current weight from the most recent weight event
export async function getCurrentWeight(animalId: string): Promise<number | null> {
  if (!animalId) return null;
  
  try {
    const { data, error } = await supabase
      .from("animal_events")
      .select("details")
      .eq("animal_id", animalId)
      .eq("event_type", "weight")
      .eq("is_deleted", false)
      .order("event_date", { ascending: false })
      .limit(1);
    
    if (error) {
      console.error("Error fetching current weight:", error);
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    const weight = data[0].details?.weight;
    return weight !== undefined && weight !== null ? Number(weight) : null;
  } catch (err) {
    console.error("Exception fetching current weight:", err);
    return null;
  }
}
