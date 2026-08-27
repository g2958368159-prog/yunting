const fs = require('fs');
let code = fs.readFileSync('src/components/Auth.tsx', 'utf8');

// The first pass might have corrupted the class, let's just make it robust
code = code.replace(/className=\"w-full.*?\"/g, 'className="w-full px-4 py-2 bg-surface border border-tertiary/20 rounded-[8px] outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 text-primary transition-all [&:-webkit-autofill]:shadow-[0_0_0_30px_#EEF2E9_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#3C4139]"');

// Password restrictions
if (!code.includes('minLength={6}')) {
  code = code.replace(/type="password"/, 'type="password" minLength={6} maxLength={64}');
}

// Email restrictions
if (!code.includes('maxLength={64}')) {
  code = code.replace(/type="email"/, 'type="email" maxLength={64}');
}

fs.writeFileSync('src/components/Auth.tsx', code);
console.log('Success');
