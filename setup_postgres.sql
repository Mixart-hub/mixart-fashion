-- Mixart Fashion PostgreSQL setup
-- Run as postgres superuser: psql -U postgres -f setup_postgres.sql

-- Database va user yaratish
CREATE USER mixart_user WITH PASSWORD 'STRONG_PASSWORD_HERE';
CREATE DATABASE mixart_db
    WITH OWNER = mixart_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

GRANT ALL PRIVILEGES ON DATABASE mixart_db TO mixart_user;

-- Connectionga ruxsat berish
\connect mixart_db
GRANT ALL ON SCHEMA public TO mixart_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mixart_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mixart_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mixart_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mixart_user;

-- Kerakli kengaytmalar
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- matn qidirish uchun

\echo 'PostgreSQL tayyor! Endi migratsiyani ishga tushiring:'
\echo 'cd backend && alembic upgrade head && python seed.py'
