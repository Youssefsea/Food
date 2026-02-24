const store = new Map();

const CLEANUP_INTERVAL_MS = Number(process.env.OTP_CLEANUP_INTERVAL_MS || 60_000);

const makeKey = ({ email, accountType }) => `${String(accountType).toLowerCase()}::${String(email).toLowerCase()}`;

const saveOtp = ({ email, accountType, code, ttlMs, signupData = null, resendAvailableAt = null }) => {
  const expiresAt = Date.now() + ttlMs;
  const key = makeKey({ email, accountType });

  store.set(key, {
    email: String(email).toLowerCase(),
    accountType: String(accountType).toLowerCase(),
    code: String(code),
    expiresAt,
    signupData,
    resendAvailableAt,
  });
};

const getOtp = ({ email, accountType }) => {
  const key = makeKey({ email, accountType });
  const entry = store.get(key);

  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }

  return entry;
};

const deleteOtp = ({ email, accountType }) => {
  const key = makeKey({ email, accountType });
  store.delete(key);
};

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();

module.exports = {
  saveOtp,
  getOtp,
  deleteOtp,
};
