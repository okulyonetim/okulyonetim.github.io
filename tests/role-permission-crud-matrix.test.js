/* Role permission CRUD matrix regression tests.
 * Source of truth: js/app-loader.js (PermissionService.catalog / aliases).
 * role-permission-catalog.js no longer keeps a second copy of the catalog — it mirrors
 * PermissionService at runtime — so these checks now read the real single source.
 */
const fs = require('fs');
const path = require('path');

const loaderPath = path.join(__dirname, '..', 'js', 'app-loader.js');
const source = fs.readFileSync(loaderPath, 'utf8');

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
