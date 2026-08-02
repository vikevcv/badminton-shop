const vnpayConfig = {
  tmnCode: process.env.VNP_TMN_CODE,
  hashSecret: process.env.VNP_HASH_SECRET,
  payUrl: process.env.VNP_PAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  queryUrl: process.env.VNP_QUERY_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
  returnUrl: process.env.VNP_RETURN_URL,
  ipnUrl: process.env.VNP_IPN_URL,
  version: process.env.VNP_VERSION || '2.1.0',
  command: 'pay',
  orderType: 'billpayment',
  currencyCode: 'VND',
  locale: 'vn',
};

export default vnpayConfig;
