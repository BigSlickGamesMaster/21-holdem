const customMessages = {
  user_not_found: { code: 404, message: "Sorry, we didn't find any account with that Email id/Mobile number" },
  insufficient_chips: { code: 406, message: 'Insufficient Chips!' },
  table_not_found: { code: 404, message: 'Table Not Found!' },
  max_board_join_limit: { code: 419, message: 'You have reached the maximum limit of joining boards' },
  wait_for_turn: { code: 419, message: 'Please wait for your turn' },
  no_player_found: { code: 409, message: 'Oops! Not enough players joined.' },
  invalid_code: { code: 404, message: 'Invalid code or board has been started already!' },
  can_not_join_board: { code: 401, message: 'can not join board.' },
  login_otp_success: { code: 205, message: 'Verification OTP sent to your registered mobile number.' },
  daily_reward_already_claimed: { code: 406, message: 'You have already claimed today reward' },
  reset_password_link_sent: { code: 200, message: 'Reset password link sent to your email id' },
  user_blocked: { code: 419, message: 'Your account is blocked. Please contact to the support.' },
  user_deleted: { code: 419, message: 'Your account is deleted. Please contact to the support.' },
  invalid_credentials: { code: 403, message: 'Invalid credentials!' },
  forgot_password_link_expired: { code: 406, message: 'Reset password link expired. Request a new one.' },
  daily_reward_claimed: { code: 200, message: 'Reward claimed! Come back tomorrow for the next one!' },
};
/**
 * Push notification messages
 */
const notifications = {};

const builder = {
  invalid_req: prefix => builder.prepare(406, prefix, 'invalid Request'),
  wrong_otp: prefix => builder.prepare(403, prefix, 'entered OTP is invalid'),
  wrong_format: prefix => builder.prepare(403, prefix, 'wrong format'),
  wrong_password: prefix => builder.prepare(403, prefix, 'wrong password'),
  insufficient_chips: prefix => builder.prepare(403, prefix, 'insufficient_chips'),
  server_error: prefix => builder.prepare(500, prefix, 'server error'),
  server_maintenance: prefix => builder.prepare(500, prefix, 'maintenance mode is active'),
  unauthorized: prefix => builder.prepare(401, prefix, 'authentication Error, please try logging again'),
  inactive: prefix => builder.prepare(403, prefix, 'inactive'),
  not_found: prefix => builder.prepare(404, prefix, 'not found'),
  not_matched: prefix => builder.prepare(406, prefix, 'not matched'),
  not_verified: prefix => builder.prepare(406, prefix, 'not verified'),
  already_exists: prefix => builder.prepare(409, prefix, 'already exists'),
  user_deleted: prefix => builder.prepare(406, prefix, 'deleted by admin'),
  user_blocked: prefix => builder.prepare(406, prefix, 'blocked by admin'),
  required_field: prefix => builder.prepare(419, prefix, 'field required'),
  not_valid: prefix => builder.prepare(419, prefix, 'not valid'),
  invalid: prefix => builder.prepare(419, prefix, 'invalid'),
  too_many_request: prefix => builder.prepare(429, prefix, 'too many request'),
  expired: prefix => builder.prepare(417, prefix, 'expired'),
  canceled: prefix => builder.prepare(419, prefix, 'canceled'),
  created: prefix => builder.prepare(200, prefix, 'created'),
  updated: prefix => builder.prepare(200, prefix, 'updated'),
  deleted: prefix => builder.prepare(417, prefix, 'deleted'),
  blocked: prefix => builder.prepare(401, prefix, 'blocked'),
  success: prefix => builder.prepare(200, prefix, 'success'),
  successfully: prefix => builder.prepare(200, prefix, 'successfully'),
  error: prefix => builder.prepare(500, prefix, 'error'),
  no_prefix: prefix => builder.prepare(200, prefix, ''),
  custom: { ...customMessages },
  notifications,

  // custom messages
  successCM: message => ({ code: 200, message }),
  unauthorizedCM: message => ({ code: 401, message }),
  forbiddenCM: message => ({ code: 403, message }),
  notFoundCM: message => ({ code: 404, message }),
  invalidRequestCM: message => ({ code: 406, message }),
  alreadyExistsCM: message => ({ code: 409, message }),
  invalidCM: message => ({ code: 419, message }),
  serverErrorCM: message => ({ code: 500, message }),
  customCodeAndMessage: (code, message) => ({ code, message }),
};

Object.defineProperty(builder, 'prepare', {
  enumerable: false,
  configurable: false,
  writable: false,
  value: (code, prefix, message) => ({
    code,
    message: `${prefix ? `${prefix} ${message}` : message}`,
  }),
});

module.exports = builder;
