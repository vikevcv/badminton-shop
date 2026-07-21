import * as productService from '../../services/product.service.js';

export const index = async (req, res, next) => {
    try {
        const [newestVot, newestGiay, newestAo, newestQuan, newestBalo, newestPhuKien] = await Promise.all([
            productService.getNewestByCategory('vot-cau-long', 8),
            productService.getNewestByCategory('giay-cau-long', 8),
            productService.getNewestByCategory('ao-cau-long', 8),
            productService.getNewestByCategory('quan-cau-long', 8),
            productService.getNewestByCategory('balo', 8),
            productService.getNewestByCategory('phu-kien', 8)
        ]);
        res.render(
            'home', 
            { 
                title: 'Trang chủ | Badminton Shop', 
                newestVot, 
                newestGiay, 
                newestAo, 
                newestQuan, 
                newestBalo, 
                newestPhuKien });
    } catch (error) {
        next(error);
    }
};
