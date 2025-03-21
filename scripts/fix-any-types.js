#!/usr/bin/env node

/**
 * This script helps identify and document 'any' type issues in the codebase.
 * It produces a markdown report with suggested fixes.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the list of files with ESLint any-type errors
function getFilesWithErrors() {
  try {
    const output = execSync('npx eslint --format json .').toString();
    const results = JSON.parse(output);
    
    // Filter files with any-type errors
    return results
      .filter(result => 
        result.messages.some(msg => 
          msg.ruleId === '@typescript-eslint/no-explicit-any'
        )
      )
      .map(result => ({
        filePath: result.filePath,
        anyTypes: result.messages
          .filter(msg => msg.ruleId === '@typescript-eslint/no-explicit-any')
          .map(msg => ({
            line: msg.line,
            column: msg.column,
            message: msg.message
          }))
      }));
  } catch (error) {
    console.error('Error running ESLint:', error.message);
    return [];
  }
}

// Get suggestions for common any types
function getSuggestion(line, fileContent) {
  const lineContent = line.trim();
  
  // For state variables
  if (lineContent.includes('useState<any>') || lineContent.includes('useState<any[]>')) {
    if (lineContent.includes('[]')) {
      return 'Replace with appropriate array type, e.g., `useState<Array<{ id: string, name: string }>>([])` or create a proper interface';
    } else {
      return 'Replace with appropriate type, e.g., `useState<string | null>(null)` or create a proper interface';
    }
  }
  
  // For function parameters
  if (lineContent.match(/\(.*?\bany\b.*?\)/)) {
    return 'Define a proper interface or type for this parameter';
  }
  
  // For API responses
  if (lineContent.includes('response:') || lineContent.includes('.then(') || lineContent.includes('await')) {
    return 'Define a proper interface for the API response';
  }
  
  // General case
  return 'Replace with a more specific type or create a dedicated interface';
}

// Generate a report of any type issues
function generateReport(filesWithErrors) {
  let report = '# Any Type Issues Report\n\n';
  
  for (const fileInfo of filesWithErrors) {
    const { filePath, anyTypes } = fileInfo;
    const relativePath = path.relative(process.cwd(), filePath);
    
    report += `## ${relativePath}\n\n`;
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n');
      
      anyTypes.forEach(({ line, column, message }) => {
        const lineContent = lines[line - 1];
        const suggestion = getSuggestion(lineContent, fileContent);
        
        report += `### Line ${line}, Column ${column}\n\n`;
        report += '```typescript\n';
        
        // Show context (3 lines before and after)
        const startLine = Math.max(0, line - 4);
        const endLine = Math.min(lines.length - 1, line + 2);
        
        for (let i = startLine; i <= endLine; i++) {
          if (i === line - 1) {
            report += `> ${lines[i]}\n`;
          } else {
            report += `  ${lines[i]}\n`;
          }
        }
        
        report += '```\n\n';
        report += `**Issue:** ${message}\n\n`;
        report += `**Suggestion:** ${suggestion}\n\n`;
      });
    } catch (error) {
      report += `Error reading file: ${error.message}\n\n`;
    }
  }
  
  return report;
}

// Main function
function main() {
  console.log('🔍 Finding files with any-type errors...');
  const filesWithErrors = getFilesWithErrors();
  
  if (filesWithErrors.length === 0) {
    console.log('No files with any-type errors found.');
    return;
  }
  
  console.log(`Found ${filesWithErrors.length} files with any-type errors.`);
  
  const report = generateReport(filesWithErrors);
  const reportPath = path.join(process.cwd(), 'any-types-report.md');
  
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`✅ Report generated at ${reportPath}`);
}

main(); 