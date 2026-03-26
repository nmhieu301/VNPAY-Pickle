This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Deployment on Linux Server

To deploy this Next.js application on a Linux server (e.g., Ubuntu, CentOS), follow these instructions:

### Prerequisites
- Node.js (v18 or newer)
- npm, yarn, or pm2 installed
- Git
- Nginx (for reverse proxy)

### Step-by-Step Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nmhieu301/VNPAY-Pickle.git
   cd VNPAY-Pickle
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file and fill in your Supabase and other project details:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your preferred editor (e.g., nano .env.local) to add the real credentials.
   ```

4. **Build the application:**
   ```bash
   npm run build
   ```

5. **Run with PM2:**
   Install PM2 globally if you haven't already: `npm install -g pm2`
   Start the application:
   ```bash
   pm2 start npm --name "vnpay-pickle" -- run start
   # To ensure it restarts on server reboot:
   pm2 startup
   pm2 save
   ```

6. **Set up Nginx as Reverse Proxy:**
   Create an Nginx configuration file (e.g., `/etc/nginx/sites-available/vnpay-pickle`) to route traffic from port 80/443 to your Next.js app running on port 3000:
   ```nginx
   server {
       listen 80;
       server_name your_domain_or_IP;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   Enable the site and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/vnpay-pickle /etc/nginx/sites-enabled/
   sudo systemctl restart nginx
   ```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
