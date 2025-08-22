#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

/**
 * Image optimization script for production
 */

const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif']
const publicDir = path.join(process.cwd(), 'public')
const imagesDir = path.join(publicDir, 'images')

// Check if required tools are installed
const checkDependencies = () => {
  const tools = ['sharp-cli', 'imagemin-cli']
  const missing = []

  tools.forEach(tool => {
    try {
      execSync(`which ${tool}`, { stdio: 'ignore' })
    } catch (error) {
      missing.push(tool)
    }
  })

  if (missing.length > 0) {
    console.log('📦 Installing missing dependencies...')
    try {
      execSync(`npm install -g ${missing.join(' ')}`, { stdio: 'inherit' })
    } catch (error) {
      console.error('❌ Failed to install dependencies:', error.message)
      console.log('💡 Please install manually: npm install -g sharp-cli imagemin-cli')
      process.exit(1)
    }
  }
}

// Get all image files recursively
const getImageFiles = (dir) => {
  const files = []
  
  const scanDir = (currentDir) => {
    const items = fs.readdirSync(currentDir)
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        scanDir(fullPath)
      } else if (imageExtensions.includes(path.extname(item).toLowerCase())) {
        files.push(fullPath)
      }
    })
  }
  
  if (fs.existsSync(dir)) {
    scanDir(dir)
  }
  
  return files
}

// Get file size in KB
const getFileSize = (filePath) => {
  const stats = fs.statSync(filePath)
  return Math.round(stats.size / 1024)
}

// Optimize single image
const optimizeImage = async (filePath) => {
  const originalSize = getFileSize(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const baseName = path.basename(filePath, ext)
  const dir = path.dirname(filePath)
  
  try {
    // Create backup
    const backupPath = path.join(dir, `${baseName}.backup${ext}`)
    fs.copyFileSync(filePath, backupPath)
    
    // Optimize based on file type
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        execSync(`imagemin ${filePath} --out-dir=${dir} --plugin=imagemin-mozjpeg --plugin.quality=80`, { stdio: 'ignore' })
        break
      case '.png':
        execSync(`imagemin ${filePath} --out-dir=${dir} --plugin=imagemin-pngquant --plugin.quality=0.8-0.9`, { stdio: 'ignore' })
        break
      case '.webp':
        execSync(`imagemin ${filePath} --out-dir=${dir} --plugin=imagemin-webp --plugin.quality=80`, { stdio: 'ignore' })
        break
    }
    
    const optimizedSize = getFileSize(filePath)
    const savings = originalSize - optimizedSize
    const savingsPercent = Math.round((savings / originalSize) * 100)
    
    // Remove backup if optimization was successful
    if (optimizedSize < originalSize) {
      fs.unlinkSync(backupPath)
      return { originalSize, optimizedSize, savings, savingsPercent }
    } else {
      // Restore from backup if no improvement
      fs.copyFileSync(backupPath, filePath)
      fs.unlinkSync(backupPath)
      return { originalSize, optimizedSize: originalSize, savings: 0, savingsPercent: 0 }
    }
    
  } catch (error) {
    console.error(`❌ Failed to optimize ${filePath}:`, error.message)
    
    // Restore from backup if exists
    const backupPath = path.join(dir, `${baseName}.backup${ext}`)
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, filePath)
      fs.unlinkSync(backupPath)
    }
    
    return { originalSize, optimizedSize: originalSize, savings: 0, savingsPercent: 0 }
  }
}

// Generate responsive image variants
const generateResponsiveImages = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase()
  const baseName = path.basename(filePath, ext)
  const dir = path.dirname(filePath)
  
  // Skip if not a common web image format
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
    return []
  }
  
  const sizes = [
    { width: 640, suffix: '-sm' },
    { width: 768, suffix: '-md' },
    { width: 1024, suffix: '-lg' },
    { width: 1280, suffix: '-xl' },
  ]
  
  const variants = []
  
  try {
    for (const size of sizes) {
      const outputPath = path.join(dir, `${baseName}${size.suffix}${ext}`)
      
      // Skip if variant already exists
      if (fs.existsSync(outputPath)) {
        continue
      }
      
      // Generate WebP variant
      const webpPath = path.join(dir, `${baseName}${size.suffix}.webp`)
      
      try {
        execSync(`sharp -i ${filePath} -o ${outputPath} resize ${size.width}`, { stdio: 'ignore' })
        execSync(`sharp -i ${filePath} -o ${webpPath} resize ${size.width} webp`, { stdio: 'ignore' })
        
        variants.push(outputPath, webpPath)
      } catch (error) {
        console.warn(`⚠️  Failed to generate ${size.width}px variant for ${filePath}`)
      }
    }
  } catch (error) {
    console.error(`❌ Failed to generate responsive images for ${filePath}:`, error.message)
  }
  
  return variants
}

// Main optimization function
const main = async () => {
  console.log('🖼️  Starting image optimization...')
  
  // Check dependencies
  checkDependencies()
  
  // Get all image files
  const imageFiles = getImageFiles(imagesDir)
  
  if (imageFiles.length === 0) {
    console.log('📁 No images found in public/images directory')
    return
  }
  
  console.log(`📊 Found ${imageFiles.length} images to optimize`)
  
  let totalOriginalSize = 0
  let totalOptimizedSize = 0
  let totalSavings = 0
  let optimizedCount = 0
  let responsiveVariants = 0
  
  // Process each image
  for (let i = 0; i < imageFiles.length; i++) {
    const filePath = imageFiles[i]
    const relativePath = path.relative(publicDir, filePath)
    
    console.log(`🔄 Processing ${i + 1}/${imageFiles.length}: ${relativePath}`)
    
    // Optimize original image
    const result = await optimizeImage(filePath)
    totalOriginalSize += result.originalSize
    totalOptimizedSize += result.optimizedSize
    totalSavings += result.savings
    
    if (result.savings > 0) {
      optimizedCount++
      console.log(`   ✅ Optimized: ${result.originalSize}KB → ${result.optimizedSize}KB (${result.savingsPercent}% savings)`)
    } else {
      console.log(`   ℹ️  No optimization needed`)
    }
    
    // Generate responsive variants
    if (process.argv.includes('--responsive')) {
      const variants = await generateResponsiveImages(filePath)
      responsiveVariants += variants.length
      
      if (variants.length > 0) {
        console.log(`   📱 Generated ${variants.length} responsive variants`)
      }
    }
  }
  
  // Summary
  console.log('\n📈 Optimization Summary:')
  console.log(`   📁 Total images processed: ${imageFiles.length}`)
  console.log(`   ✅ Images optimized: ${optimizedCount}`)
  console.log(`   💾 Original total size: ${totalOriginalSize}KB`)
  console.log(`   💾 Optimized total size: ${totalOptimizedSize}KB`)
  console.log(`   💰 Total savings: ${totalSavings}KB (${Math.round((totalSavings / totalOriginalSize) * 100)}%)`)
  
  if (responsiveVariants > 0) {
    console.log(`   📱 Responsive variants generated: ${responsiveVariants}`)
  }
  
  // Generate image manifest
  const manifest = {
    timestamp: new Date().toISOString(),
    totalImages: imageFiles.length,
    optimizedImages: optimizedCount,
    originalSize: totalOriginalSize,
    optimizedSize: totalOptimizedSize,
    savings: totalSavings,
    savingsPercent: Math.round((totalSavings / totalOriginalSize) * 100),
    responsiveVariants,
    images: imageFiles.map(filePath => ({
      path: path.relative(publicDir, filePath),
      size: getFileSize(filePath),
    }))
  }
  
  fs.writeFileSync(
    path.join(publicDir, 'image-manifest.json'),
    JSON.stringify(manifest, null, 2)
  )
  
  console.log('\n✅ Image optimization completed!')
  console.log('📄 Manifest saved to public/image-manifest.json')
}

// Handle command line arguments
const showHelp = () => {
  console.log(`
🖼️  Image Optimization Script

Usage: node scripts/optimize-images.js [options]

Options:
  --responsive    Generate responsive image variants
  --help         Show this help message

Examples:
  node scripts/optimize-images.js
  node scripts/optimize-images.js --responsive
`)
}

if (process.argv.includes('--help')) {
  showHelp()
  process.exit(0)
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Optimization failed:', error)
    process.exit(1)
  })
}

module.exports = {
  optimizeImage,
  generateResponsiveImages,
  getImageFiles,
  main
}