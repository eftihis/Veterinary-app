// Helper functions for timeline rendering

/**
 * Safely converts any value to a string representation
 */
export function safeToString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }
  
  return String(value);
}

/**
 * Type guard to check if a key exists in an object
 */
export function hasKey<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  return key in obj;
}

/**
 * Structures an object with mandatory fields first
 */
export function structureObjectWithMandatoryFirst(obj: Record<string, unknown>): Record<string, unknown> {
  // This ensures a consistent order for rendering
  const result: Record<string, unknown> = {};
  
  // Known mandatory fields for different event types
  const mandatoryFields = [
    'new_status',   // For status changes
    'weight',       // For weight records
    'name',         // For vaccinations, medications
    'content',      // For notes
    'reason',       // For visits and status changes
    'contact_id',   // For status changes when adopted/fostered
    'veterinarian_id' // For visits
  ];
  
  // Add mandatory fields first (if they exist in the object)
  for (const field of mandatoryFields) {
    if (obj[field] !== undefined) {
      result[field] = obj[field];
    }
  }
  
  // Then add all other fields
  for (const [key, value] of Object.entries(obj)) {
    if (!mandatoryFields.includes(key)) {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Get the event details in a structured order
 */
export function getStructuredDetails(details: Record<string, unknown>): Record<string, string> {
  // Create a new object with string values
  const structured: Record<string, string> = {};
  
  // Convert all values to strings
  Object.entries(structureObjectWithMandatoryFirst(details)).forEach(([key, value]) => {
    structured[key] = safeToString(value);
  });
  
  return structured;
} 