import * as dashboardService from '../../services/dashboard.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';

export const getDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboard();
    sendSuccess(res, data);
  } catch (error) { next(error); }
};
