import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
    
    // Invoice columns
    "is_public": "Shared",
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
