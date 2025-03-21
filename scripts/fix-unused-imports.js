#!/usr/bin/env node

/**
 * This script helps fix unused imports in component files
 * by either removing them or adding underscore prefixes.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the list of files with unused imports
function getFilesWithUnusedImports() {
  try {
    const output = execSync('npx eslint --format json "components/**/*.tsx" "app/**/*.tsx"').toString();
    const results = JSON.parse(output);
    
    // Filter files with unused imports errors
    return results
      .filter(result => 
        result.messages.some(msg => 
          msg.ruleId === '@typescript-eslint/no-unused-vars' &&
          msg.message.includes('defined but never used')
        )
      )
      .map(result => ({
        filePath: result.filePath,
        unusedVars: result.messages
          .filter(msg => msg.ruleId === '@typescript-eslint/no-unused-vars')
          .map(msg => ({
            line: msg.line,
            column: msg.column,
            varName: msg.message.match(/['"]([^'"]+)['"]/)?.[1] || msg.message.match(/'([^']+)'/)?.[1]
          }))
      }));
  } catch (error) {
    console.error('Error running ESLint:', error.message);
    return [];
  }
}

// Fix a file by removing unused imports
function fixFile(fileInfo) {
  const { filePath, unusedVars } = fileInfo;
  
  console.log(`Processing ${filePath} with ${unusedVars.length} unused imports...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find import statements and fix them
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    let modified = false;
    
    const unusedVarNames = unusedVars.map(v => v.varName).filter(v => v);
    
    // Fix each import statement
    let newContent = content.replace(importRegex, (importStatement, importList, importSource) => {
      const imports = importList.split(',').map(i => i.trim());
      
      // Filter out or prefix unused imports
      const newImports = imports
        .filter(importName => {
          // Check if this import is unused
          if (unusedVarNames.includes(importName)) {
            modified = true;
            return false; // Remove the import
          }
          return true;
        });
      
      // If there are no imports left, remove the whole statement
      if (newImports.length === 0) {
        modified = true;
        return '';
      }
      
      // Otherwise, reconstruct the import statement
      return `import { ${newImports.join(', ')} } from "${importSource}"`;
    });
    
    // Fix named imports with aliases
    newContent = newContent.replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, (importStatement, importName, importSource) => {
      if (unusedVarNames.includes(importName)) {
        modified = true;
        return ''; // Remove the import
      }
      return importStatement;
    });
    
    // Handle comments that might be left as empty lines
    newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Only write if changes were made
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Fixed ${filePath}`);
      return true;
    } else {
      console.log(`⏭️ No changes needed for ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Main function
function main() {
  console.log('🔍 Finding files with unused imports...');
  const filesWithUnusedImports = getFilesWithUnusedImports();
  
  if (filesWithUnusedImports.length === 0) {
    console.log('No files with unused imports found.');
    return;
  }
  
  console.log(`Found ${filesWithUnusedImports.length} files with unused imports.`);
  
  let fixedCount = 0;
  for (const fileInfo of filesWithUnusedImports) {
    if (fixFile(fileInfo)) {
      fixedCount++;
    }
  }
  
  console.log(`\n📊 Summary: Fixed ${fixedCount} out of ${filesWithUnusedImports.length} files`);
  console.log('Run ESLint again to check for remaining issues.');
}

main(); 