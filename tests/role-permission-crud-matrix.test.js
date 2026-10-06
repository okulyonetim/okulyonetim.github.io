/* Role permission CRUD matrix regression tests.
 * Source of truth: js/core/role-permission-catalog.js
 */
const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '..', 'js', 'core', 'role-permission-catalog.js');
const source = fs.readFileSync(catalogPath, 'utf8');

const required = [
  'people.students',
  'people.students.edit',
  'people.students.delete',
  'people.classes',
  'people.classes.edit'
];

for (const permission of required) {
  if (!source.includes(`'${permission}'`)) {
    throw new Error(`Missing permission: ${permission}`);
  }
}

// The catalog deliberately keeps legacy aliases for backward compatibility.
for (const legacy of ['ogrenciler', 'siniflar']) {
  if (!source.includes(`'${legacy}'`)) {
    throw new Error(`Missing legacy alias: ${legacy}`);
  }
}

console.log('role-permission-crud-matrix: OK');
