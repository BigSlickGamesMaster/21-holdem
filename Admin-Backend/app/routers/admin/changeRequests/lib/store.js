const STATUS_OPTIONS = ['Draft', 'Scoped', 'In Progress', 'Ready for Review', 'Done'];

let memoryItems = [];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isEnabled() {
  return process.env.CHANGE_REQUEST_STORAGE === 'memory';
}

function assertEnabled() {
  if (!isEnabled()) {
    const error = new Error('Change request storage is not enabled. Configure a non-database adapter before using server-side persistence.');
    error.code = 'CHANGE_REQUEST_STORAGE_DISABLED';
    throw error;
  }
}

function sortItems(items) {
  return [...items].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

function createId() {
  return `CR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

function list() {
  assertEnabled();
  return sortItems(memoryItems);
}

function view(id) {
  assertEnabled();
  return memoryItems.find((item) => item.id === id) || null;
}

function create(payload) {
  assertEnabled();
  const now = new Date().toISOString();
  const item = {
    ...clone(payload),
    id: payload.id || createId(),
    status: payload.status || 'Draft',
    createdAt: payload.createdAt || now,
    updatedAt: now,
  };

  memoryItems = [item, ...memoryItems.filter((entry) => entry.id !== item.id)];
  return clone(item);
}

function updateStatus(id, status) {
  assertEnabled();
  if (!STATUS_OPTIONS.includes(status)) {
    const error = new Error('Invalid change request status');
    error.code = 'INVALID_CHANGE_REQUEST_STATUS';
    throw error;
  }

  let updatedItem = null;
  memoryItems = memoryItems.map((item) => {
    if (item.id !== id) return item;
    updatedItem = {
      ...item,
      status,
      updatedAt: new Date().toISOString(),
    };
    return updatedItem;
  });

  return updatedItem ? clone(updatedItem) : null;
}

function remove(id) {
  assertEnabled();
  const existingItem = memoryItems.find((item) => item.id === id) || null;
  memoryItems = memoryItems.filter((item) => item.id !== id);
  return existingItem ? clone(existingItem) : null;
}

module.exports = {
  STATUS_OPTIONS,
  isEnabled,
  list,
  view,
  create,
  updateStatus,
  remove,
};
