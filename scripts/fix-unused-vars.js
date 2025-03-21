#!/usr/bin/env node

/**
 * This script helps fix unused variables by finding ESLint errors
 * and applying the underscore prefix pattern to variables that are
 * unused but need to be kept in the code.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define patterns for matching different types of unused variables
const PATTERNS = {
  IMPORT: /^(\s*import\s+\{.*?)(\b([\w\d]+)\b)(.*?\}\s+from\s+.*)$/gm,
  DESTRUCTURE: /^(\s*(?:const|let)\s+\{.*?)(\b([\w\d]+)\b)(.*?\}\s+.*)$/gm,
  PARAMETER: /^(\s*(?:function|const|let)\s+[\w\d]+\s*=\s*\(.*?)(\b([\w\d]+)\b)(.*?\)\s*=>?.*)$/gm,
  VARIABLE: /^(\s*(?:const|let|var)\s+)(\b([\w\d]+)\b)(\s*=.*)$/gm,
};

// Get the list of files with ESLint errors
function getFilesWithErrors() {
  try {
    const output = execSync('npx eslint --format json .').toString();
    const results = JSON.parse(output);
    
    // Filter files with unused variable errors
    return results
      .filter(result => 
        result.messages.some(msg => 
          msg.ruleId === '@typescript-eslint/no-unused-vars'
        )
      )
      .map(result => ({
        filePath: result.filePath,
        unusedVars: result.messages
          .filter(msg => msg.ruleId === '@typescript-eslint/no-unused-vars')
          .map(msg => ({
            line: msg.line,
            column: msg.column,
            varName: msg.message.match(/['"]([^'"]+)['"]/)?.[1] || ''
          }))
      }));
  } catch (error) {
    console.error('Error running ESLint:', error.message);
    return [];
  }
}

// Fix a file by adding underscore prefix to unused variables
function fixFile(fileInfo) {
  const { filePath, unusedVars } = fileInfo;
  
  console.log(`Processing ${filePath} with ${unusedVars.length} unused variables...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let lines = content.split('\n');
    
    // Process each unused variable
    unusedVars.forEach(({ line, varName }) => {
      if (!varName) return;
      
      const lineContent = lines[line - 1];
      
      // Try different patterns
      for (const [patternName, pattern] of Object.entries(PATTERNS)) {
        pattern.lastIndex = 0;
        
        const matches = [...lineContent.matchAll(pattern)];
        if (matches.length === 0) continue;
        
        for (const match of matches) {
          if (match[3] === varName) {
            const prefixedVar = `_${varName}`;
            const newLine = lineContent.replace(
              new RegExp(`\\b${varName}\\b`, 'g'), 
              prefixedVar
            );
            
            lines[line - 1] = newLine;
            console.log(`  - Fixed ${patternName}: ${varName} -> ${prefixedVar}`);
            break;
          }
        }
      }
    });
    
    // Write changes back to file
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`✅ Updated ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

// Main function
function main() {
  console.log('🔍 Finding files with unused variable errors...');
  const filesWithErrors = getFilesWithErrors();
  
  if (filesWithErrors.length === 0) {
    console.log('No files with unused variable errors found.');
    return;
  }
  
  console.log(`Found ${filesWithErrors.length} files with unused variable errors.`);
  
  for (const fileInfo of filesWithErrors) {
    fixFile(fileInfo);
  }
  
  console.log('✅ Done fixing unused variables!');
}

main(); 