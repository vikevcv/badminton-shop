# Sử dụng image Node.js 24 Alpine siêu nhẹ
FROM node:24-alpine

# Cài đặt thư mục làm việc trong container
WORKDIR /usr/src/app

# Copy package.json và package-lock.json vào trước để tận dụng Docker cache
COPY package*.json ./

# Cài đặt các dependencies (chỉ dùng cho production nếu cần, ở đây cài full để chạy build)
RUN npm install

# Copy toàn bộ mã nguồn vào container
COPY . .

# Expose port mà ứng dụng sẽ chạy
EXPOSE 3000

# Lệnh khởi chạy ứng dụng
CMD ["npm", "start"]