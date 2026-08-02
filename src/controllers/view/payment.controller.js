import * as vnpayService from '../../services/vnpay.service.js';

export const paymentReturn = async (req, res) => {
  const payload = req.query;
  try {
    if (!vnpayService.verifyReturnSignature(payload)) {
      return res.render('payment/return', {
        title: 'Kết quả thanh toán | Badminton Shop',
        layout: 'main',
        success: false,
        message: 'Chữ ký xác thực không hợp lệ.'
      });
    }

    const responseCode = String(payload.vnp_ResponseCode || '');
    const success = responseCode === '00';

    res.render('payment/return', {
      title: 'Kết quả thanh toán | Badminton Shop',
      layout: 'main',
      success,
      message: success
        ? 'Thanh toán thành công.'
        : (responseCode === '24' ? 'Giao dịch đã bị hủy.' : 'Thanh toán chưa thành công.'),
      orderId: payload.vnp_TxnRef,
      amount: payload.vnp_Amount ? Math.round(Number(payload.vnp_Amount) / 100) : null,
      transId: payload.vnp_TransactionNo,
      orderInfo: payload.vnp_OrderInfo
    });
  } catch (error) {
    res.render('payment/return', {
      title: 'Kết quả thanh toán | Badminton Shop',
      layout: 'main',
      success: false,
      message: error.message || 'Có lỗi xảy ra khi xử lý thanh toán.'
    });
  }
};
