const BALANCE_ERROR_PATTERN = /insufficient[_\s-]*(quota|balance|credit)|quota[_\s-]*(exceeded|exhausted)|credit[_\s-]*(balance|exhausted)|billing|payment required|余额不足|额度不足|账户余额/i;

export const isInsufficientModelBalance = (status, payload) => {
  if (status === 402) return true;

  const error = payload?.error;
  const searchable = [
    typeof error === 'string' ? error : '',
    error?.code,
    error?.type,
    error?.message,
    payload?.code,
    payload?.message,
  ].filter(Boolean).join(' ');

  return BALANCE_ERROR_PATTERN.test(searchable);
};
