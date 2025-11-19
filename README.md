File Transfer App by CWX-Development.
Deployment URL: https://transfer.cwx-dev.com

## Getting Started

# Start the database and minio with docker
Run
```bash
docker compose up -d
```

# Prepare the database
Run
```bash
npx prisma generate
npx prisma migrate dev
```

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the page.
The Backend is on [http://localhost:3000/api](http://localhost:3000/api)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.