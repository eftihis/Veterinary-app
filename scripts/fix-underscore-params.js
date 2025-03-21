#!/usr/bin/env node

/**
 * This script helps fix unused parameters in API route handlers
 * by adding underscore prefixes to these parameters.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Main function
async function main() {
  console.log('🔍 Finding files with unused request parameters...');
  
  // Get a list of all the API route files
  const apiRoutesDir = path.join(__dirname, '../app/api');
  const apiRouteFiles = findRoutesRecursively(apiRoutesDir);
  
  console.log(`Found ${apiRouteFiles.length} API route files`);
  
  let fixedCount = 0;
  
  // Process each file
  for (const file of apiRouteFiles) {
    try {
      console.log(`Processing ${file}...`);
      const content = fs.readFileSync(file, 'utf8');
      
      // Look for handler functions where the req parameter is unused
      const newContent = content.replace(
        /(export\s+async\s+function\s+\w+)\(\s*([^_]req)\s*:\s*(\w+Request|\w+)\s*\)/g,
        '$1(_$2: $3)'
      );
      
      // Also fix any other unused variables
      const fixedContent = newContent.replace(
        /import\s+{\s*([^}]+)\s*}\s+from\s+/g,
        (match, imports) => {
          // Parse imports and add underscore prefix to ones that aren't used in the file
          const importNames = imports.split(',').map(i => i.trim());
          const fixedImports = importNames.map(importName => {
            // Check if this import is used in the file (excluding the import statement itself)
            const contentAfterImport = content.substring(match.length + content.indexOf(match));
            const isUsed = new RegExp(`\\b${importName}\\b`).test(contentAfterImport);
            
            if (!isUsed && !importName.startsWith('_')) {
              return `_${importName}`;
            }
            return importName;
          });
          
          return `import { ${fixedImports.join(', ')} } from `;
        }
      );
      
      // Only write if changes were made
      if (content !== fixedContent) {
        fs.writeFileSync(file, fixedContent, 'utf8');
        fixedCount++;
        console.log(`✅ Fixed ${file}`);
      } else {
        console.log(`⏭️ No changes needed for ${file}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }
  
  console.log(`\n📊 Summary: Fixed ${fixedCount} out of ${apiRouteFiles.length} files`);
  console.log('Run ESLint again to check for remaining issues.');
}

// Helper function to find all route.ts files recursively
function findRoutesRecursively(dir) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      results = results.concat(findRoutesRecursively(fullPath));
    } else if (file === 'route.ts') {
      results.push(fullPath);
    }
  }
  
  return results;
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
}); 