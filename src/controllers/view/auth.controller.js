import * as AuthService from '../../services/auth.service.js';

export const loginForm = (req, res) => {
  res.render('login', {
    title: 'Đăng nhập | Badminton Shop',
    layout: 'main'
  });
};

export const registerForm = (req, res) => {
  res.render('register', {
    title: 'Đăng ký | Badminton Shop',
    layout: 'main'
  });
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('login', {
        title: 'Đăng nhập | Badminton Shop',
        error: 'Vui lòng nhập email và mật khẩu.'
      });
    }

    const result = await AuthService.login(email, password);

    req.session.user = result.user;
    req.session.token = result.token;

    req.session.save((err) => {
      if (err) return next(err);
      const redirectTo = req.session.returnTo || '/';
      delete req.session.returnTo;
      res.redirect(redirectTo);
    });
  } catch (error) {
    res.render('login', {
      title: 'Đăng nhập | Badminton Shop',
      error: error.message
    });
  }
};

export const register = async (req, res, next) => {
  try {
    const { fullName, email, password, confirmPassword, phone } = req.body;

    if (!fullName || !email || !password) {
      return res.render('register', {
        title: 'Đăng ký | Badminton Shop',
        error: 'Vui lòng điền đầy đủ thông tin bắt buộc.'
      });
    }

    if (password !== confirmPassword) {
      return res.render('register', {
        title: 'Đăng ký | Badminton Shop',
        error: 'Mật khẩu xác nhận không khớp.'
      });
    }

    await AuthService.register({ fullName, email, password, phone });

    const result = await AuthService.login(email, password);

    req.session.user = result.user;
    req.session.token = result.token;

    req.session.save((err) => {
      if (err) return next(err);
      res.redirect('/');
    });
  } catch (error) {
    res.render('register', {
      title: 'Đăng ký | Badminton Shop',
      error: error.message
    });
  }
};

export const logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('badminton_shop_session');
    res.redirect('/login');
  });
};
