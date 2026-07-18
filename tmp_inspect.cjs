const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/data/effects.json', 'utf8'));
let total = 0, withPsy = 0;
for (const e of Object.values(data)) {
  total++;
  const idx = e.description.findIndex(b => b.type.startsWith('h') && /psychoactive substances/i.test(b.text));
  if (idx >= 0) {
    withPsy++;
    console.log(e.name, 'idx', idx, 'len', e.description.length);
    console.log(e.description.slice(idx, idx + 5).map(b => b.type + ': ' + (b.text || b.items?.[0] || '').slice(0, 60)).join(' | '));
  }
}
console.log('---', withPsy, '/', total);
