#!/usr/bin/env node

/**
 * This script runs all ESLint fix scripts in sequence and generates a summary report.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define the scripts to run in order
const scripts = [
  'fix-unused-vars.js',
  'fix-any-types.js',
  'fix-hook-deps.js'
];

// Main function
async function main() {
  console.log('🚀 Starting ESLint fix scripts...\n');
  
  const results = [];
  
  // Run each script in sequence
  for (const script of scripts) {
    const scriptPath = path.join(__dirname, script);
    
    console.log(`\n📝 Running ${script}...`);
    try {
      const output = execSync(`node ${scriptPath}`, { stdio: 'inherit' });
      results.push({
        script,
        success: true,
        output: output ? output.toString() : 'Script completed successfully'
      });
    } catch (error) {
      console.error(`Error running ${script}:`, error.message);
      results.push({
        script,
        success: false,
        error: error.message
      });
    }
  }
  
  // Generate summary report
  console.log('\n📊 Summary Report');
  console.log('=================\n');
  
  for (const result of results) {
    console.log(`${result.script}: ${result.success ? '✅ Success' : '❌ Failed'}`);
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Review the generated reports in the project root');
  console.log('2. Fix the "any" type issues using the suggestions in the any-types-report.md');
  console.log('3. Address React Hook dependency issues using hook-deps-report.md');
  console.log('4. Manually fix ARIA role issues, unescaped entities, and TS comments');
  console.log('5. Run ESLint again to verify remaining issues\n');
  
  console.log('Happy coding! 🎉');
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
}); 