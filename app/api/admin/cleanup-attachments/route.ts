import { NextResponse } from 'next/server';
import { cleanupOrphanedFiles } from '@/lib/cloudflare-r2';
import { supabase } from '@/lib/supabase';

// API endpoint to clean up orphaned attachment files
export async function POST() {
  try {
    // Get the authenticated user and verify they have admin permissions
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has admin role (you would need to customize this based on your auth model)
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);
    
    const isAdmin = userRoles?.some(r => r.role === 'admin');
    
    if (roleError || !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Run the cleanup process
    const result = await cleanupOrphanedFiles();
    
    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Removed ${result.removedFiles} orphaned files.`,
      details: result
    });
  } catch (error) {
    console.error('Error in cleanup process:', error);
    return NextResponse.json({ 
      error: 'Failed to run cleanup process',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 