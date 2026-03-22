export const validationErrors = {
  required: 'This field is required.',
  currentPasswordReq: 'Current Password is required.',
  newPasswordReq: 'New Password is required.',
  confirmPasswordReq: 'Confirm New Password is required.',
  email: 'Please enter a valid email address.',
  passwordRegEx: 'Password must contain No Space, 1 number, uppercase, lowercase, and special character.',
  passwordNotMatch: 'Password does not match',
  rangeLength: (min, max) => `Please enter a value between ${min} and ${max} characters long.`,
  maxLength: (length) => `Please enter a value less than or equal to ${length}.`,
  minLength: (length) => `Please enter a value greater than or equal to ${length}.`
}
