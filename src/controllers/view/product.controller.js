import * as productService from '../../services/product.service.js';

export const index = async (req, res, next) => {
  try {
    const queryObj = req.query;

    const result = await productService.getFilteredProducts(queryObj);

    res.render('products', {
      title: 'Tất cả sản phẩm | Badminton Shop',
      products: result.products,
      pagination: result.pagination,
      query: queryObj 
    });
  } catch (error) {
    next(error);
  }
};

export const getDetail = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const product = await productService.getProductDetail(slug);

    res.render('product-detail', {
      title: `${product.name} | Badminton Shop`,
      product: product,
    });
  } catch (error) {
    next(error);
  }
};
