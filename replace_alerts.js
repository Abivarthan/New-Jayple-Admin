const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      if (content.includes('alert(') || content.includes('window.alert(')) {
        let original = content;
        content = content.replace(/window\.alert\(/g, 'toast.error(');
        content = content.replace(/alert\(/g, 'toast.error(');
        
        // Add import if missing
        if (!content.includes('react-hot-toast')) {
          content = "import toast from 'react-hot-toast';\n" + content;
        }
        
        if (content !== original) {
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`Updated alert to toast in: ${fullPath}`);
        }
      }
    }
  }
}

processDirectory(srcDir);
