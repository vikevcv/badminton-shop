import * as dashboardModel from '../models/dashboard.model.js';

export const getDashboard = async () => {
  const [revenue, orders, users, topProducts, recentOrders, revenueByDay, statusDistribution] =
    await Promise.all([
      dashboardModel.getRevenueStats(),
      dashboardModel.getOrderStats(),
      dashboardModel.getUserStats(),
      dashboardModel.getTopProducts(),
      dashboardModel.getRecentOrders(),
      dashboardModel.getRevenueByDay(),
      dashboardModel.getStatusDistribution()
    ]);

  return {
    revenue,
    orders,
    users,
    topProducts,
    recentOrders,
    revenueByDay,
    statusDistribution
  };
};
