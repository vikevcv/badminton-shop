import * as addressModel from '../models/address.model.js';

const isStaffOrAdmin = (role) => role === 'admin' || role === 'staff';

export const getAddresses = async (userId, role, filterUserId = null, includeDeleted = false) => {
  if (isStaffOrAdmin(role)) {
    if (filterUserId) {
      return await addressModel.findByUserId(filterUserId, includeDeleted);
    }
    return await addressModel.findAll(includeDeleted);
  }
  return await addressModel.findByUserId(userId, false);
};

export const getAddressById = async (id, userId, role, includeDeleted = false) => {
  const address = await addressModel.findById(id, includeDeleted);
  if (!address) {
    const error = new Error('Không tìm thấy địa chỉ');
    error.status = 404;
    throw error;
  }
  if (!isStaffOrAdmin(role) && address.user_id !== userId) {
    const error = new Error('Không tìm thấy địa chỉ');
    error.status = 404;
    throw error;
  }
  return address;
};

export const createAddress = async (userId, data, role) => {
  const { receiver_name, receiver_phone, address, is_default } = data;

  if (!receiver_name || !receiver_phone || !address) {
    const error = new Error('Vui lòng điền đầy đủ thông tin địa chỉ');
    error.status = 400;
    throw error;
  }

  const targetUserId = (isStaffOrAdmin(role) && data.user_id) ? data.user_id : userId;

  const id = await addressModel.create(targetUserId, {
    receiver_name, receiver_phone, address, is_default: is_default || false
  });
  return id;
};

export const updateAddress = async (id, userId, data, role) => {
  const address = await addressModel.findById(id);
  if (!address) {
    const error = new Error('Không tìm thấy địa chỉ');
    error.status = 404;
    throw error;
  }
  if (!isStaffOrAdmin(role) && address.user_id !== userId) {
    const error = new Error('Không tìm thấy địa chỉ');
    error.status = 404;
    throw error;
  }
  const updated = await addressModel.update(id, data, isStaffOrAdmin(role) ? null : userId);
  if (!updated) {
    const error = new Error('Không tìm thấy địa chỉ');
    error.status = 404;
    throw error;
  }
  return true;
};

export const deleteAddress = async (id, userId, role, deletedBy) => {
  if (role === 'staff') {
    const error = new Error('Nhân viên không có quyền xóa địa chỉ');
    error.status = 403;
    throw error;
  }
  const address = await addressModel.findById(id);
  if (!address) {
    const error = new Error('Không tìm thấy địa chỉ');
    error.status = 404;
    throw error;
  }
  if (role !== 'admin' && address.user_id !== userId) {
    const error = new Error('Không tìm thấy địa chỉ');
    error.status = 404;
    throw error;
  }
  const deleted = await addressModel.softDelete(id, isStaffOrAdmin(role) ? null : userId, deletedBy || null);
  if (!deleted) {
    const error = new Error('Không tìm thấy địa chỉ');
    error.status = 404;
    throw error;
  }
  return true;
};

export const restoreAddress = async (id) => {
  const result = await addressModel.restore(id);
  if (!result) {
    const error = new Error('Không tìm thấy địa chỉ đã xóa');
    error.status = 404;
    throw error;
  }
  return true;
};
