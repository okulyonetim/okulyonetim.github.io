const fs = require('fs');
const path = require('path');

describe('student and class granular permissions', () => {
  const catalog = fs.readFileSync(path.join(__dirname, '..', 'js', 'core', 'role-permission-catalog.js'), 'utf8');

  test('student CRUD permissions are catalogued', () => {
    expect(catalog).toContain("['people.students','Öğrenciler','section']");
    expect(catalog).toContain("['people.students.create','Öğrenci ekleme','action']");
    expect(catalog).toContain("['people.students.edit','Öğrenci düzenleme','action']");
    expect(catalog).toContain("['people.students.delete','Öğrenci silme','action']");
  });

  test('class CRUD permissions are catalogued', () => {
    expect(catalog).toContain("['people.classes','Sınıflar','section']");
    expect(catalog).toContain("['people.classes.create','Sınıf oluşturma','action']");
    expect(catalog).toContain("['people.classes.edit','Sınıf düzenleme','action']");
    expect(catalog).toContain("['people.classes.delete','Sınıf silme','action']");
  });

  test('legacy aliases remain available for migration compatibility', () => {
    expect(catalog).toContain("'people.students.create':['ogrenciler']");
    expect(catalog).toContain("'people.classes.create':['siniflar']");
  });
});
