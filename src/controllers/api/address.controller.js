import * as addressService from '../../services/address.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';

export const getAddresses = async (req, res, next) => {
  try {
    const role = req.user.role;
    const filterUserId = req.query.user_id ? parseInt(req.query.user_id) : null;
    const includeDeleted = req.query.display_deleted === 'true';
    const addresses = await addressService.getAddresses(req.user.userId, role, filterUserId, includeDeleted);
    sendSuccess(res, addresses);
  } catch (error) {
    next(error);
  }
};

export const getAddressById = async (req, res, next) => {
  try {
    const includeDeleted = req.query.display_deleted === 'true';
    const address = await addressService.getAddressById(
      parseInt(req.params.id), req.user.userId, req.user.role, includeDeleted
    );
    sendSuccess(res, address);
  } catch (error) {
    next(error);
  }
};

export const createAddress = async (req, res, next) => {
  try {
    const addressId = await addressService.createAddress(req.user.userId, req.body, req.user.role);
    sendSuccess(res, { addressId }, 'Thêm địa chỉ thành công', {}, 201);
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req, res, next) => {
  try {
    await addressService.updateAddress(
      parseInt(req.params.id), req.user.userId, req.body, req.user.role
    );
    sendSuccess(res, null, 'Cập nhật địa chỉ thành công');
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req, res, next) => {
  try {
    await addressService.deleteAddress(
      parseInt(req.params.id), req.user.userId, req.user.role, req.user.userId
    );
    sendSuccess(res, null, 'Xóa địa chỉ thành công');
  } catch (error) {
    next(error);
  }
};

export const restoreAddress = async (req, res, next) => {
  try {
    await addressService.restoreAddress(parseInt(req.params.id));
    sendSuccess(res, null, 'Khôi phục địa chỉ thành công');
  } catch (error) {
    next(error);
  }
};
