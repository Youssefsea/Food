const data = require('./data');

const ensureUserVerificationColumns = async () => {
  await data.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_verified TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS verification_code VARCHAR(16) NULL,
    ADD COLUMN IF NOT EXISTS verification_expires_at DATETIME NULL
  `);
};

module.exports = {
  ensureUserVerificationColumns,
};
