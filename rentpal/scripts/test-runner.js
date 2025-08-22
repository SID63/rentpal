#!/usr/bin/env node

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

/**
 * Test runner script for comprehensive testing
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`)
}

const runCommand = (command, args = [], options = {}) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code)
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

const checkTestFiles = () => {
  const testDirs = [
    'src/test/unit',
    'src/test/integration',
    'src/test/e2e',
    'src/test/performance',
    'src/components/*/__tests__',
    'src/lib/__tests__',
    'src/hooks/__tests__',
  ]

  let totalTests = 0
  
  testDirs.forEach(dir => {
    const pattern = dir.includes('*') ? dir : `${dir}/**/*.test.{ts,tsx}`
    try {
      const files = require('glob').sync(pattern)
      totalTests += files.length
      log(`Found ${files.length} test files in ${dir}`, colors.cyan)
    } catch (error) {
      // Directory might not exist yet
    }
  })

  return totalTests
}

const generateTestReport = async () => {
  log('\n📊 Generating Test Coverage Report...', colors.blue)
  
  try {
    await runCommand('npm', ['run', 'test:coverage'])
    log('✅ Coverage report generated successfully', colors.green)
  } catch (error) {
    log('❌ Failed to generate coverage report', colors.red)
    throw error
  }
}

const runUnitTests = async () => {
  log('\n🧪 Running Unit Tests...', colors.blue)
  
  try {
    await runCommand('npm', ['run', 'test:run', '--', '--reporter=verbose'])
    log('✅ Unit tests completed successfully', colors.green)
  } catch (error) {
    log('❌ Unit tests failed', colors.red)
    throw error
  }
}

const runIntegrationTests = async () => {
  log('\n🔗 Running Integration Tests...', colors.blue)
  
  try {
    await runCommand('npm', ['run', 'test:run', '--', 'src/test/integration', '--reporter=verbose'])
    log('✅ Integration tests completed successfully', colors.green)
  } catch (error) {
    log('❌ Integration tests failed', colors.red)
    throw error
  }
}

const runE2ETests = async () => {
  log('\n🌐 Running End-to-End Tests...', colors.blue)
  
  try {
    // Start the development server in the background
    log('Starting development server...', colors.yellow)
    const serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      shell: true,
    })

    // Wait for server to be ready
    await new Promise((resolve) => {
      setTimeout(resolve, 10000) // Wait 10 seconds for server to start
    })

    try {
      await runCommand('npm', ['run', 'test:e2e'])
      log('✅ E2E tests completed successfully', colors.green)
    } finally {
      // Kill the server process
      serverProcess.kill()
    }
  } catch (error) {
    log('❌ E2E tests failed', colors.red)
    throw error
  }
}

const runPerformanceTests = async () => {
  log('\n⚡ Running Performance Tests...', colors.blue)
  
  try {
    await runCommand('npm', ['run', 'test:run', '--', 'src/test/performance', '--reporter=verbose'])
    log('✅ Performance tests completed successfully', colors.green)
  } catch (error) {
    log('❌ Performance tests failed', colors.red)
    throw error
  }
}

const runLinting = async () => {
  log('\n🔍 Running Linting...', colors.blue)
  
  try {
    await runCommand('npm', ['run', 'lint'])
    log('✅ Linting completed successfully', colors.green)
  } catch (error) {
    log('❌ Linting failed', colors.red)
    throw error
  }
}

const runTypeChecking = async () => {
  log('\n📝 Running Type Checking...', colors.blue)
  
  try {
    await runCommand('npx', ['tsc', '--noEmit'])
    log('✅ Type checking completed successfully', colors.green)
  } catch (error) {
    log('❌ Type checking failed', colors.red)
    throw error
  }
}

const main = async () => {
  const args = process.argv.slice(2)
  const testType = args[0] || 'all'

  log(`${colors.bright}🚀 RentPal Test Suite Runner${colors.reset}`)
  log(`Running: ${testType}`)
  log('=' * 50)

  const startTime = Date.now()
  let passed = 0
  let failed = 0

  const runTest = async (name, testFn) => {
    try {
      await testFn()
      passed++
    } catch (error) {
      failed++
      log(`\n❌ ${name} failed:`, colors.red)
      log(error.message, colors.red)
    }
  }

  try {
    // Check test files
    const totalTestFiles = checkTestFiles()
    log(`\nFound ${totalTestFiles} test files total`, colors.cyan)

    // Run tests based on type
    switch (testType) {
      case 'unit':
        await runTest('Unit Tests', runUnitTests)
        break
      
      case 'integration':
        await runTest('Integration Tests', runIntegrationTests)
        break
      
      case 'e2e':
        await runTest('E2E Tests', runE2ETests)
        break
      
      case 'performance':
        await runTest('Performance Tests', runPerformanceTests)
        break
      
      case 'lint':
        await runTest('Linting', runLinting)
        break
      
      case 'type-check':
        await runTest('Type Checking', runTypeChecking)
        break
      
      case 'coverage':
        await runTest('Coverage Report', generateTestReport)
        break
      
      case 'all':
      default:
        await runTest('Type Checking', runTypeChecking)
        await runTest('Linting', runLinting)
        await runTest('Unit Tests', runUnitTests)
        await runTest('Integration Tests', runIntegrationTests)
        await runTest('Performance Tests', runPerformanceTests)
        await runTest('E2E Tests', runE2ETests)
        await runTest('Coverage Report', generateTestReport)
        break
    }

    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    log('\n' + '=' * 50)
    log(`${colors.bright}📋 Test Summary${colors.reset}`)
    log(`Total time: ${duration}s`)
    log(`Passed: ${passed}`, colors.green)
    log(`Failed: ${failed}`, failed > 0 ? colors.red : colors.green)

    if (failed > 0) {
      log('\n❌ Some tests failed. Please check the output above.', colors.red)
      process.exit(1)
    } else {
      log('\n✅ All tests passed successfully!', colors.green)
      process.exit(0)
    }

  } catch (error) {
    log(`\n💥 Test runner failed: ${error.message}`, colors.red)
    process.exit(1)
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\n🛑 Test runner interrupted', colors.yellow)
  process.exit(1)
})

process.on('SIGTERM', () => {
  log('\n\n🛑 Test runner terminated', colors.yellow)
  process.exit(1)
})

if (require.main === module) {
  main()
}

module.exports = {
  runUnitTests,
  runIntegrationTests,
  runE2ETests,
  runPerformanceTests,
  runLinting,
  runTypeChecking,
  generateTestReport,
}