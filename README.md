# File Transfer App

A secure file transfer application built with Next.js, Prisma, and MinIO for easy file sharing with password protection and email notifications.

Live Demo: https://transfer.cwx-dev.com

Features

- Upload single or multiple files with folder structure support
- Password protection for shared files
- Email notifications for file downloads
- Configurable expiration times (1-14 days)
- Chunked uploads for large files (30MB chunks)
- Pause and resume upload capability
- Multi-language support (English, German, French, Italian)
- Responsive design for mobile and desktop
- Email verification for senders

Tech Stack
Frontend: Next.js 15, React, TypeScript, Tailwind CSS
Backend: Next.js API Routes
Database: PostgreSQL with Prisma ORM
Storage: MinIO (S3-compatible object storage)
Internationalization: next-intl
Email: Nodemailer
Prerequisites
Node.js 18+ (included in dev container)
Docker and Docker Compose
npm or yarn

## Getting Started

### Environment Setup

Copy the example environment file and configure it:

```bash
cp env.example .env
```

### Start Infrastructure Services

Start PostgreSQL and MinIO using Docker Compose:

```bash
docker compose up -d
```

This will start:

- PostgreSQL database on port 5432
- MinIO object storage on port 9000
- MinIO console on port 9001 (admin UI)
- 
### Install Dependencies
```bash
npm install
```

### Initialize the Database
Generate Prisma client and run migrations:
```bash
npx prisma generate
npx prisma migrate dev
```

### Run the Development Server
```bash
npm run dev
```

The application runs now on http://localhost:3000

## Development with DevContainer
This project includes a devcontainer configuration for VS Code:

- Install the Dev Containers extension
- Open the project in VS Code
- Click "Reopen in Container" when prompted
- The container will automatically install dependencies and set up the environment

## MinIO Console
Access the MinIO admin console at http://localhost:9001

Default credentials:

- Username: minio_devel
- Password: minio_devel