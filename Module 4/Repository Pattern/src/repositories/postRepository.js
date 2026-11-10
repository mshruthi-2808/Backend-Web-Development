// Persistence boundary for posts. Services depend only on this contract.
// When Prisma replaces this adapter, only this repository's implementation and
// database setup change. The service API, business rules, controllers, routes,
// response shapes, and repository method contract remain unchanged.

const posts = new Map([
  [1, { id: 1, title: 'First post', body: 'Repository boundaries protect change.', authorId: 7 }],
  [2, { id: 2, title: 'Second post', body: 'Services should speak in domain language.', authorId: 8 }],
]);

let nextId = 3;

function findAll() {
  return Array.from(posts.values());
}

function findById(id) {
  return posts.get(Number(id)) || null;
}

function create(fields) {
  const record = { id: nextId++, ...fields };
  posts.set(record.id, record);
  return record;
}

function update(id, patch) {
  const record = findById(id);
  if (!record) return null;

  Object.assign(record, patch);
  return record;
}

function remove(id) {
  return posts.delete(Number(id));
}

module.exports = { findAll, findById, create, update, remove };
