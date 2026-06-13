const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

// Excluded files
const excludeFiles = ['Sidebar.tsx', 'TopBar.tsx'];

// Replacements
const replacements = [
  // Backgrounds
  { regex: /bg-\[#0f172a\]/g, replace: 'bg-gray-50' },
  { regex: /bg-\[#0c1524\]/g, replace: 'bg-gray-50' }, // Any other deep navies leaking in
  { regex: /bg-slate-900/g, replace: 'bg-gray-50' },
  { regex: /bg-slate-800(\/\d+)?/g, replace: 'bg-white' },
  { regex: /bg-slate-850/g, replace: 'bg-white' },
  
  // Borders
  { regex: /border-slate-800/g, replace: 'border-gray-200' },
  { regex: /border-slate-700(\/\d+)?/g, replace: 'border-gray-200' },
  { regex: /border-slate-600(\/\d+)?/g, replace: 'border-gray-200' },
  { regex: /border-slate-500(\/\d+)?/g, replace: 'border-gray-300' },

  // Primary Text
  { regex: /text-slate-100/g, replace: 'text-gray-900' },
  { regex: /text-slate-200/g, replace: 'text-gray-900' },
  { regex: /text-slate-250/g, replace: 'text-gray-900' },
  { regex: /text-slate-300/g, replace: 'text-gray-800' },
  { regex: /text-white/g, replace: 'text-gray-900' },

  // Secondary/Muted Text
  { regex: /text-slate-350/g, replace: 'text-gray-600' },
  { regex: /text-slate-400/g, replace: 'text-gray-500' },
  { regex: /text-slate-500/g, replace: 'text-gray-500' },
  { regex: /text-slate-550/g, replace: 'text-gray-400' },
  { regex: /text-slate-600/g, replace: 'text-gray-400' },

  // Hover states
  { regex: /hover:bg-slate-700(\/\d+)?/g, replace: 'hover:bg-gray-100' },
  { regex: /hover:bg-slate-750(\/\d+)?/g, replace: 'hover:bg-gray-100' },
  { regex: /hover:bg-slate-800(\/\d+)?/g, replace: 'hover:bg-gray-50' },
  { regex: /hover:text-slate-200/g, replace: 'hover:text-gray-900' },
  { regex: /hover:text-slate-250/g, replace: 'hover:text-gray-900' },
  { regex: /hover:text-slate-300/g, replace: 'hover:text-gray-800' },

  // Buttons/Highlights (Primary violet -> Black)
  { regex: /bg-violet-600(\/\d+)?/g, replace: 'bg-black text-white' },
  { regex: /hover:bg-violet-500(\/\d+)?/g, replace: 'hover:bg-gray-900' },
  { regex: /hover:bg-violet-700(\/\d+)?/g, replace: 'hover:bg-gray-800' },
  { regex: /border-violet-500(\/\d+)?/g, replace: 'border-black' },
  { regex: /text-violet-400/g, replace: 'text-black font-semibold' },
  { regex: /text-violet-300/g, replace: 'text-black font-semibold' },
  { regex: /focus:border-violet-500/g, replace: 'focus:border-black focus:ring-black' },
  
  // Tables
  // (In Dashboard we likely use bg-slate-800 for rows, already covered. Header bg is often bg-slate-800/50 or bg-slate-900, covered.)
  
  // Adding shadows to cards (this is harder to regex exactly, but we can target common card patterns if needed)
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      if (excludeFiles.some(ex => file === ex)) {
        console.log(`Skipping excluded file: ${file}`);
        continue;
      }
      
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      
      // Additional specific fix for 'bg-white text-black text-white' that might occur
      // from blind replacement. We'll clean up overlapping text colors later.

      for (const { regex, replace } of replacements) {
        content = content.replace(regex, replace);
      }
      
      // Cleanup duplicate text-gray-900 text-white or similar collisions
      content = content.replace(/text-gray-900 text-white/g, 'text-white');
      content = content.replace(/bg-black text-white text-white/g, 'bg-black text-white');

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log('Theme replacement complete.');
