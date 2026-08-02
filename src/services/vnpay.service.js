import crypto from 'crypto';
import vnpayConfig from '../config/vnpay.js';

const API_TIMEOUT_MS = 30000;

const pad = (n) => String(n).padStart(2, '0');

const formatVnDateTime = (date) => {
  const vn = new Date(date.getTime() + 7 * 3600 * 1000);
  return (
    `${vn.getUTCFullYear()}${pad(vn.getUTCMonth() + 1)}${pad(vn.getUTCDate())}` +
    `${pad(vn.getUTCHours())}${pad(vn.getUTCMinutes())}${pad(vn.getUTCSeconds())}`
  );
};

export const nowVnDateTime = () => formatVnDateTime(new Date());

const encode = (value) => encodeURIComponent(value).replace(/%20/g, '+');

export const buildRawQuery = (params, excludedKeys = []) => {
  const keys = Object.keys(params)
    .filter((key) => !excludedKeys.includes(key))
    .sort();
  return keys
    .map((key) => `${encode(key)}=${encode(String(params[key]))}`)
    .join('&');
};

export const buildSignature = (params, secretKey = vnpayConfig.hashSecret) => {
  const raw = buildRawQuery(params, ['vnp_SecureHash', 'vnp_SecureHashType']);
  return crypto.createHmac('sha512', secretKey).update(raw).digest('hex');
};

export const verifyReturnSignature = (payload, secretKey = vnpayConfig.hashSecret) => {
  if (!payload || !payload.vnp_SecureHash) return false;
  return payload.vnp_SecureHash === buildSignature(payload, secretKey);
};

export const createPayment = ({ amount, orderInfo, txnRef, ipAddr, bankCode }) => {
  const createDate = new Date();
  const expireDate = new Date(createDate.getTime() + 15 * 60 * 1000);
  const params = {
    vnp_Version: vnpayConfig.version,
    vnp_Command: vnpayConfig.command,
    vnp_TmnCode: vnpayConfig.tmnCode,
    vnp_Amount: Math.round(Number(amount) * 100),
    vnp_CurrCode: vnpayConfig.currencyCode,
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: vnpayConfig.orderType,
    vnp_Locale: vnpayConfig.locale,
    vnp_ReturnUrl: vnpayConfig.returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: formatVnDateTime(createDate),
    vnp_ExpireDate: formatVnDateTime(expireDate),
  };

  if (bankCode) params.vnp_BankCode = bankCode;
  params.vnp_SecureHash = buildSignature(params);

  const query = buildRawQuery(params, ['vnp_SecureHash']);
  return {
    payUrl: `${vnpayConfig.payUrl}?${query}&vnp_SecureHash=${params.vnp_SecureHash}`,
  };
};

export const normalizeStatus = (transactionStatus) => {
  if (String(transactionStatus) === '00') return 'success';
  return 'failed';
};

const postJson = async (url, body) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
};

export const queryTransaction = async ({ txnRef, amount, orderInfo, transactionDate }) => {
  const params = {
    vnp_RequestId: `REQ${Date.now()}`,
    vnp_Version: vnpayConfig.version,
    vnp_Command: 'querydr',
    vnp_TmnCode: vnpayConfig.tmnCode,
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo || `Thanh toan don hang ${txnRef}`,
    vnp_TransactionDate: transactionDate || '',
    vnp_CreateDate: nowVnDateTime(),
    vnp_IpAddr: '127.0.0.1',
  };
  if (amount) params.vnp_Amount = Math.round(Number(amount) * 100);
  params.vnp_SecureHash = buildSignature(params, vnpayConfig.hashSecret);

  return postJson(vnpayConfig.queryUrl, {
    vnp_RequestId: params.vnp_RequestId,
    vnp_Version: params.vnp_Version,
    vnp_Command: params.vnp_Command,
    vnp_TmnCode: params.vnp_TmnCode,
    vnp_TxnRef: params.vnp_TxnRef,
    vnp_OrderInfo: params.vnp_OrderInfo,
    vnp_TransactionDate: params.vnp_TransactionDate,
    vnp_CreateDate: params.vnp_CreateDate,
    vnp_IpAddr: params.vnp_IpAddr,
    vnp_Amount: params.vnp_Amount,
    vnp_SecureHash: params.vnp_SecureHash,
  });
};
