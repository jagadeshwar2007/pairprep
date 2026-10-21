const fs = require('fs');
const Papa = require('papaparse');

const csv = fs.readFileSync('data/mnnit_btech_subjects.csv', 'utf8');
const result = Papa.parse(csv, { header: true, skipEmptyLines: true });

console.log('Total parsed rows:', result.data.length);
console.log('Headers:', result.meta.fields);

const branches = {};
const missingCodeRows = [];
const questionableCodeRows = [];
const missingTitleRows = [];
const duplicateRecords = [];
const seen = new Set();

result.data.forEach((row, i) => {
  const branch = row.branch?.trim();
  const sem = row.semester?.trim();
  const yr = row.year?.trim();
  const code = row.course_code?.trim();
  const title = row.title?.trim();
  const note = row.note?.trim() || '';

  if (!branches[branch]) {
    branches[branch] = { semesters: new Set(), total: 0 };
  }
  branches[branch].semesters.add(sem);
  branches[branch].total++;

  if (!code) {
    missingCodeRows.push({ index: i + 2, branch, sem, title, type: row.type });
  }

  if (note.toLowerCase().includes('typo') || note.toLowerCase().includes('code as printed') || note.toLowerCase().includes('duplicate')) {
    questionableCodeRows.push({ index: i + 2, branch, sem, code, title, note });
  }

  if (!title) {
    missingTitleRows.push({ index: i + 2, branch, sem, code });
  }

  const key = `${branch}|${sem}|${code}|${title}`;
  if (seen.has(key)) {
    duplicateRecords.push({ index: i + 2, key });
  }
  seen.add(key);
});

console.log('Branches summary:');
for (const b in branches) {
  console.log(`- ${b}: ${branches[b].total} subjects, semesters: [${Array.from(branches[b].semesters).sort((a,b)=>a-b).join(', ')}]`);
}

console.log('\nMissing codes count:', missingCodeRows.length);
console.log('Sample missing code rows:', missingCodeRows.slice(0, 5));

console.log('\nQuestionable code notes count:', questionableCodeRows.length);
console.log('Sample questionable rows:', questionableCodeRows);

console.log('\nMissing titles count:', missingTitleRows.length);
console.log('Duplicates count:', duplicateRecords.length);
if (duplicateRecords.length) console.log('Duplicates:', duplicateRecords);
