import * as refreshTokenModel from '../models/refresh-token.model.js';

export const cleanExpired = async () => {
  return refreshTokenModel.cleanExpired();
};
