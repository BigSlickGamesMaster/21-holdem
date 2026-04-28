const store = require('./store');

const ALLOWED_FIELDS = [
  'id',
  'title',
  'module',
  'requestType',
  'priority',
  'status',
  'requestedBy',
  'owner',
  'targetRelease',
  'summary',
  'businessValue',
  'userStory',
  'acceptanceCriteria',
  'impactedAreas',
  'dependencies',
  'risks',
  'docsNeeded',
  'codeAreas',
  'testPlan',
  'generated',
  'createdAt',
  'updatedAt',
];

const controllers = {};

function replyStorageDisabled(res) {
  return res.reply(messages.serverErrorCM('Change request API is scaffolded but storage is disabled. No database writes have been configured.'));
}

controllers.meta = async (req, res) => {
  try {
    return res.reply(messages.success(), {
      storageMode: process.env.CHANGE_REQUEST_STORAGE || 'disabled',
      persistenceEnabled: store.isEnabled(),
      dbWritesEnabled: false,
      notes: [
        'This API scaffold is ready for a future non-memory adapter.',
        'No MongoDB writes are performed by this module.',
      ],
    });
  } catch (error) {
    return res.reply(messages.server_error('changeRequests/meta'), error.toString());
  }
};

controllers.list = async (req, res) => {
  try {
    if (!store.isEnabled()) return replyStorageDisabled(res);
    return res.reply(messages.success(), store.list());
  } catch (error) {
    return res.reply(messages.server_error('changeRequests/list'), error.toString());
  }
};

controllers.view = async (req, res) => {
  try {
    if (!store.isEnabled()) return replyStorageDisabled(res);
    const { id } = _.pick(req.params, ['id']);
    if (!id) return res.reply(messages.required_field('id'));
    const item = store.view(id);
    if (!item) return res.reply(messages.not_found('change request'));
    return res.reply(messages.success(), item);
  } catch (error) {
    return res.reply(messages.server_error('changeRequests/view'), error.toString());
  }
};

controllers.create = async (req, res) => {
  try {
    if (!store.isEnabled()) return replyStorageDisabled(res);
    const body = _.pick(req.body, ALLOWED_FIELDS);
    if (!body.title) return res.reply(messages.required_field('title'));
    if (!body.module) return res.reply(messages.required_field('module'));
    if (!body.summary) return res.reply(messages.required_field('summary'));
    const item = store.create(body);
    return res.reply(messages.created('change request'), item);
  } catch (error) {
    return res.reply(messages.server_error('changeRequests/create'), error.toString());
  }
};

controllers.updateStatus = async (req, res) => {
  try {
    if (!store.isEnabled()) return replyStorageDisabled(res);
    const { id } = _.pick(req.params, ['id']);
    const { status } = _.pick(req.body, ['status']);
    if (!id) return res.reply(messages.required_field('id'));
    if (!status) return res.reply(messages.required_field('status'));
    const item = store.updateStatus(id, status);
    if (!item) return res.reply(messages.not_found('change request'));
    return res.reply(messages.updated('change request'), item);
  } catch (error) {
    if (error.code === 'INVALID_CHANGE_REQUEST_STATUS') return res.reply(messages.invalidCM(error.message));
    return res.reply(messages.server_error('changeRequests/updateStatus'), error.toString());
  }
};

controllers.remove = async (req, res) => {
  try {
    if (!store.isEnabled()) return replyStorageDisabled(res);
    const { id } = _.pick(req.params, ['id']);
    if (!id) return res.reply(messages.required_field('id'));
    const item = store.remove(id);
    if (!item) return res.reply(messages.not_found('change request'));
    return res.reply(messages.deleted('change request'), item);
  } catch (error) {
    return res.reply(messages.server_error('changeRequests/remove'), error.toString());
  }
};

module.exports = controllers;
