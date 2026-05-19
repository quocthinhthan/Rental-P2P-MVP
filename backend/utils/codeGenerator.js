const crypto = require('crypto');

const DEFAULT_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_CODE_LENGTH = 8;
const DEFAULT_MAX_ATTEMPTS = 20;

const generateCode = ({ prefix = '', length = DEFAULT_CODE_LENGTH, alphabet = DEFAULT_ALPHABET } = {}) => {
  let value = '';

  for (let index = 0; index < length; index += 1) {
    value += alphabet[crypto.randomInt(0, alphabet.length)];
  }

  return `${prefix}${value}`;
};

const isDuplicateCodeError = (error) => (
  error?.code === 11000 &&
  (error?.keyPattern?.code || error?.keyValue?.code || String(error?.message || '').includes('code'))
);

const generateUniqueCode = async (Model, options = {}) => {
  const maxAttempts = options.maxAttempts || DEFAULT_MAX_ATTEMPTS;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateCode(options);
    const existing = await Model.exists({ code });

    if (!existing) {
      return code;
    }
  }

  throw new Error('Unable to generate a unique code');
};

const saveWithUniqueCode = async (document, options = {}) => {
  const maxAttempts = options.maxAttempts || DEFAULT_MAX_ATTEMPTS;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (!document.code) {
      document.code = await generateUniqueCode(document.constructor, options);
    }

    try {
      return await document.save();
    } catch (error) {
      if (!isDuplicateCodeError(error)) {
        throw error;
      }

      document.code = undefined;
    }
  }

  throw new Error('Unable to save with a unique code');
};

module.exports = {
  generateUniqueCode,
  saveWithUniqueCode
};
