#!/usr/bin/env node

/**
 * This script helps identify and fix React Hook dependency issues.
 * It generates a report with suggestions for fixing dependencies in hooks.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the list of files with ESLint hook dependency errors
function getFilesWithErrors() {
  try {
    const output = execSync('npx eslint --format json .').toString();
    const results = JSON.parse(output);
    
    // Filter files with hook dependency errors
    return results
      .filter(result => 
        result.messages.some(msg => 
          msg.ruleId === 'react-hooks/exhaustive-deps'
        )
      )
      .map(result => ({
        filePath: result.filePath,
        hookErrors: result.messages
          .filter(msg => msg.ruleId === 'react-hooks/exhaustive-deps')
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

// Extract missing dependencies from error message
function extractMissingDeps(message) {
  const match = message.match(/React Hook .* has (a missing|missing) dependenc(y|ies): '([^']+)'/);
  if (match) {
    return match[3].split(', ').map(dep => dep.trim().replace(/'/g, ''));
  }
  return [];
}

// Generate a report of hook dependency issues with fixes
function generateReport(filesWithErrors) {
  let report = '# React Hook Dependency Issues Report\n\n';
  
  for (const fileInfo of filesWithErrors) {
    const { filePath, hookErrors } = fileInfo;
    const relativePath = path.relative(process.cwd(), filePath);
    
    report += `## ${relativePath}\n\n`;
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n');
      
      hookErrors.forEach(({ line, column, message }) => {
        const missingDeps = extractMissingDeps(message);
        const lineContent = lines[line - 1];
        
        report += `### Line ${line}, Column ${column}\n\n`;
        report += '```jsx\n';
        
        // Show context (5 lines before and after)
        const startLine = Math.max(0, line - 6);
        const endLine = Math.min(lines.length - 1, line + 5);
        
        for (let i = startLine; i <= endLine; i++) {
          if (i === line - 1) {
            report += `> ${lines[i]}\n`;
          } else {
            report += `  ${lines[i]}\n`;
          }
        }
        
        report += '```\n\n';
        report += `**Issue:** ${message}\n\n`;
        
        if (missingDeps.length > 0) {
          // Find the dependency array line
          let depArrayLine = null;
          for (let i = line - 1; i < Math.min(lines.length, line + 10); i++) {
            if (lines[i].includes('[]') || lines[i].includes('[') && lines[i + 1] && lines[i + 1].includes(']')) {
              depArrayLine = i;
              break;
            }
          }
          
          if (depArrayLine !== null) {
            const currentLine = lines[depArrayLine];
            let newLine;
            
            if (currentLine.includes('[]')) {
              // Empty array
              newLine = currentLine.replace('[]', `[${missingDeps.join(', ')}]`);
            } else if (currentLine.includes('[') && !currentLine.includes(']')) {
              // Multi-line array - handle first line
              const existingDeps = currentLine.replace(/.*\[\s*/, '').replace(/[,\s]*$/, '');
              newLine = currentLine.replace(/\[\s*/, `[${existingDeps ? existingDeps + ', ' : ''}${missingDeps.join(', ')}, `);
            } else {
              // Single line with existing deps
              const start = currentLine.indexOf('[');
              const end = currentLine.indexOf(']');
              if (start !== -1 && end !== -1) {
                const existingDepsStr = currentLine.substring(start + 1, end).trim();
                const existingDeps = existingDepsStr ? existingDepsStr.split(',').map(d => d.trim()) : [];
                
                // Add missing deps to existing ones
                const updatedDeps = [...new Set([...existingDeps, ...missingDeps])];
                newLine = `${currentLine.substring(0, start)}[${updatedDeps.join(', ')}]${currentLine.substring(end + 1)}`;
              }
            }
            
            report += `**Suggested Fix:**\n\n`;
            report += '```jsx\n';
            report += `- ${currentLine}\n`;
            report += `+ ${newLine}\n`;
            report += '```\n\n';
          } else {
            report += `**Suggested Fix:** Add the following dependencies to the dependency array: ${missingDeps.join(', ')}\n\n`;
          }
        } else if (message.includes('move it inside')) {
          report += `**Suggested Fix:** Move the identified declaration inside the hook callback to avoid dependency changes on each render.\n\n`;
        } else {
          report += `**Suggested Fix:** Either include the identified dependencies or remove the dependency array if they're not needed.\n\n`;
        }
        
        report += '---\n\n';
      });
    } catch (error) {
      report += `Error reading file: ${error.message}\n\n`;
    }
  }
  
  return report;
}

// Main function
function main() {
  console.log('🔍 Finding files with React Hook dependency errors...');
  const filesWithErrors = getFilesWithErrors();
  
  if (filesWithErrors.length === 0) {
    console.log('No files with React Hook dependency errors found.');
    return;
  }
  
  console.log(`Found ${filesWithErrors.length} files with React Hook dependency errors.`);
  
  const report = generateReport(filesWithErrors);
  const reportPath = path.join(process.cwd(), 'hook-deps-report.md');
  
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`✅ Report generated at ${reportPath}`);
}

main(); 