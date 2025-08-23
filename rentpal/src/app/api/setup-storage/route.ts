import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface BucketResult {
  name: string
  status: 'created' | 'exists' | 'error'
  error?: string
  data?: any
}

interface PolicyResult {
  bucket: string
  policy: string
  status: 'created' | 'exists' | 'error'
  error?: string
}

interface StorageSetupResult {
  success: boolean
  message: string
  results: BucketResult[]
  policies: PolicyResult[]
}

export async function POST(): Promise<NextResponse<StorageSetupResult>> {
  try {
    console.log('Setting up storage buckets and RLS policies...')
    
    // List existing buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return NextResponse.json({
        success: false,
        message: `Failed to list buckets: ${listError.message}`,
        results: [],
        policies: []
      })
    }

    console.log('Existing buckets:', existingBuckets?.map(b => b.name))

    const bucketsToCreate = [
      {
        name: 'item-images',
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      },
      {
        name: 'avatars',
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: 2097152 // 2MB
      }
    ]

    const results: BucketResult[] = []

    // Create buckets
    for (const bucket of bucketsToCreate) {
      const exists = existingBuckets?.some(b => b.name === bucket.name)
      
      if (exists) {
        console.log(`Bucket ${bucket.name} already exists`)
        results.push({ name: bucket.name, status: 'exists' })
        continue
      }

      console.log(`Creating bucket: ${bucket.name}`)
      
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        allowedMimeTypes: bucket.allowedMimeTypes,
        fileSizeLimit: bucket.fileSizeLimit
      })

      if (error) {
        console.error(`Error creating bucket ${bucket.name}:`, error)
        results.push({ 
          name: bucket.name, 
          status: 'error', 
          error: error.message 
        })
      } else {
        console.log(`Successfully created bucket: ${bucket.name}`)
        results.push({ name: bucket.name, status: 'created', data })
      }
    }

    // Check if RLS policies exist by attempting to query storage.objects
    const policies: PolicyResult[] = []
    
    const policyChecks = [
      { bucket: 'item-images', policy: 'item_images_public_read' },
      { bucket: 'item-images', policy: 'item_images_authenticated_upload' },
      { bucket: 'item-images', policy: 'item_images_authenticated_update' },
      { bucket: 'item-images', policy: 'item_images_authenticated_delete' },
      { bucket: 'avatars', policy: 'avatars_public_read' },
      { bucket: 'avatars', policy: 'avatars_authenticated_upload' },
      { bucket: 'avatars', policy: 'avatars_authenticated_update' },
      { bucket: 'avatars', policy: 'avatars_authenticated_delete' }
    ]

    // Test if RLS policies are working by checking if we can query the storage.objects table
    try {
      const { data, error } = await supabase
        .from('storage.objects')
        .select('bucket_id')
        .limit(1)
      
      if (error) {
        console.log('RLS policies may not be configured - unable to query storage.objects:', error.message)
        // Add all policies as needing creation
        for (const check of policyChecks) {
          policies.push({
            bucket: check.bucket,
            policy: check.policy,
            status: 'error',
            error: 'RLS policies need to be created manually. Please run the SQL in supabase/storage_policies.sql'
          })
        }
      } else {
        console.log('Storage RLS policies appear to be configured')
        // Mark all policies as existing since we can query the table
        for (const check of policyChecks) {
          policies.push({
            bucket: check.bucket,
            policy: check.policy,
            status: 'exists'
          })
        }
      }
    } catch (err) {
      console.error('Error checking RLS policies:', err)
      for (const check of policyChecks) {
        policies.push({
          bucket: check.bucket,
          policy: check.policy,
          status: 'error',
          error: 'Unable to verify RLS policies. Please run the SQL in supabase/storage_policies.sql'
        })
      }
    }

    const bucketSuccessCount = results.filter(r => r.status === 'created' || r.status === 'exists').length
    const bucketErrorCount = results.filter(r => r.status === 'error').length
    const policySuccessCount = policies.filter(p => p.status === 'created' || p.status === 'exists').length
    const policyErrorCount = policies.filter(p => p.status === 'error').length

    const overallSuccess = bucketErrorCount === 0 && policyErrorCount === 0

    return NextResponse.json({
      success: overallSuccess,
      message: `Storage setup complete. Buckets: ${bucketSuccessCount} ready, ${bucketErrorCount} errors. Policies: ${policySuccessCount} ready, ${policyErrorCount} errors.`,
      results,
      policies
    })

  } catch (error) {
    console.error('Exception during storage setup:', error)
    return NextResponse.json({
      success: false,
      message: `Exception: ${error}`,
      results: [],
      policies: []
    })
  }
}