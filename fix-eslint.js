// Quick fix for ESLint errors
const fs = require('fs');
const path = require('path');

// Files to fix
const fixes = [
  {
    file: 'src/components/AddDebtModal.tsx',
    changes: [
      { from: '} catch (error: any) {', to: '} catch (error: unknown) {' },
      { from: 'error.message', to: 'error instanceof Error ? error.message : "An error occurred"' }
    ]
  },
  {
    file: 'src/components/AddExpenseModal.tsx',
    changes: [
      { from: '} catch (error: any) {', to: '} catch (error: unknown) {' },
      { from: 'error.message', to: 'error instanceof Error ? error.message : "An error occurred"' }
    ]
  },
  {
    file: 'src/components/AddExpenseModalAdvanced.tsx',
    changes: [
      { from: '} catch (error: any) {', to: '} catch (error: unknown) {' },
      { from: 'error.message', to: 'error instanceof Error ? error.message : "An error occurred"' }
    ]
  },
  {
    file: 'src/components/AuthForm.tsx',
    changes: [
      { from: '} catch (error: any) {', to: '} catch (error: unknown) {' },
      { from: 'error.message', to: 'error instanceof Error ? error.message : "An error occurred"' }
    ]
  },
  {
    file: 'src/components/CarDetailModal.tsx',
    changes: [
      { from: 'import { Calendar } from \'lucide-react\'', to: '' },
      { from: 'import { MapPin } from \'lucide-react\'', to: '' },
      { from: ', Calendar', to: '' },
      { from: ', MapPin', to: '' },
      { from: '} catch (error: any) {', to: '} catch (error: unknown) {' },
      { from: 'error.message', to: 'error instanceof Error ? error.message : "An error occurred"' }
    ]
  }
];

console.log('Fixing ESLint errors...');

fixes.forEach(fix => {
  const filePath = path.join(__dirname, fix.file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    fix.changes.forEach(change => {
      content = content.replace(new RegExp(change.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), change.to);
    });
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${fix.file}`);
  }
});

console.log('ESLint fixes completed!');
