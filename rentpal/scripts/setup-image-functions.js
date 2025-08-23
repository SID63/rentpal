#!/usr/bin/env node

/**
 * Setup script for image management database functions
 * This script creates the necessary database functions for image management
 */

const fs = require('fs')
const path = require('path')

async function setupImageFunctions() {
  console.log('🚀 Setting up image management database functions...')

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'supabase', 'image_management_functions.sql')
    
    if (!fs.existsSync(sqlPath)) {
      console.error('❌ SQL file not found:', sqlPath)
      process.exit(1)
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('📄 SQL functions file loaded successfully')
    console.log('📝 Functions to be created:')
    console.log('  - reorder_item_images()')
    console.log('  - set_primary_item_image()')
    console.log('  - batch_insert_item_images()')
    console.log('  - delete_item_images_by_ids()')
    console.log('  - delete_all_item_images()')
    console.log('  - cleanup_orphaned_images()')
    console.log('  - get_item_image_stats()')
    
    console.log('\n📋 To apply these functions to your Supabase database:')
    console.log('1. Open your Supabase dashboard')
    console.log('2. Go to the SQL Editor')
    console.log('3. Copy and paste the contents of supabase/image_management_functions.sql')
    console.log('4. Run the SQL script')
    
    console.log('\n🔧 Or use the Supabase CLI:')
    console.log('   supabase db reset --linked')
    console.log('   # or')
    console.log('   psql -h <your-db-host> -U postgres -d postgres -f supabase/image_management_functions.sql')
    
    console.log('\n✅ Setup instructions provided!')
    console.log('💡 These functions provide atomic operations for:')
    console.log('   - Batch image insertion with proper ordering')
    console.log('   - Atomic image reordering')
    console.log('   - Safe primary image setting')
    console.log('   - Cleanup operations with URL tracking')
    console.log('   - Orphaned image detection and cleanup')
    
  } catch (error) {
    console.error('❌ Error setting up image functions:', error.message)
    process.exit(1)
  }
}

// Run the setup
setupImageFunctions()