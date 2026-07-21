-- =====================================================
-- BN Badminton Shop
-- File: 01_create_database.sql
-- Description: Create Database
-- =====================================================

-- Xóa database cũ (chỉ dùng trong môi trường development)
DROP DATABASE IF EXISTS bn_badminton_shop;

-- Tạo database
CREATE DATABASE bn_badminton_shop
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE bn_badminton_shop;

-- =====================================================
-- MySQL Session Settings
-- =====================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

-- =====================================================
-- Verify
-- =====================================================

SELECT DATABASE() AS current_database;

-- =====================================================
-- Enable Checks
-- (Tables sẽ được tạo ở File 02)
-- =====================================================

SET UNIQUE_CHECKS = 1;
SET FOREIGN_KEY_CHECKS = 1;