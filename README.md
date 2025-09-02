# Uutiset • High-Performance News Platform with Next.js 14

![Lighthouse performance screenshot, showing 100 in Performance, Accessibility, Best Practices, and SEO](https://i.imgur.com/rM3Y3kH.png)

**Uutiset** (Finnish for "News") is a high-performance, fully SEO-optimized news platform built with the most modern technologies in the Next.js ecosystem. The project was developed with a strong focus on scalability, maintainability, and an exceptional user experience, achieving perfect scores on Google Lighthouse.

## ✨ Key Features & Highlights

- **🚀 Exceptional Performance**: Perfect **100/100** scores across Performance, Accessibility, Best Practices, and SEO in Lighthouse.
- **🌐 Internationalization (i18n)**: Native support for multiple languages (FI, EN) with prefixed routes and intelligent language fallbacks.
- **🔒 Comprehensive Admin Panel**: A secure administrative area with NextAuth (Credentials) for managing all site content.
- **✍️ Content Management System (CMS)**:
    - Full CRUD for Posts and static Pages.
    - Dynamic management of the main Menu and Footer links for each language.
    - Full support for Web Stories (AMP), including generation and bulk publishing.
- **🖼️ Media Uploads**: Integration with Vercel Blob for uploading and importing cover images from external URLs.
- **⚡️ Intelligent Caching**: Utilizes Upstash Redis to cache critical data (site settings, UI translations), ensuring top performance and reducing database load.
- **📊 Real-time Analytics**: A custom-built system for tracking pageviews and read-time using Redis, powering an internal analytics dashboard without relying on third-party services.
- **📈 Professional-Grade SEO**:
    - Dynamic generation of `robots.txt`, `sitemap-index.xml`, and specific sitemaps for Google News.
    - Dynamic metadata and structured data (JSON-LD) for maximum search engine visibility.
    - A built-in, Yoast-inspired SEO analysis tool within the post editor.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 14 (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (fully compatible with [Neon](https://neon.tech/))
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Caching**: [Upstash Redis](https://upstash.com/)
- **File Storage**: [Vercel Blob](https://vercel.com/storage/blob)
- **Deployment**: [Vercel](https://vercel.com/)

## 🚀 Running the Project Locally

Follow the steps below to set up and run the project in your local development environment.

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (version >=18.18.0)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A PostgreSQL database instance.

### 2. Clone the Repository

```bash
git clone https://github.com/your-username/your-repository.git
cd your-repository
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Set Up Environment Variables

Copy the `.env.example` file to a new file named `.env.local` and fill it with your own credentials.

```bash
cp .env.example .env.local
```

Open the `.env.local` file and replace the placeholder values. **NEVER commit your `.env.local` file to Git!**

### 5. Set Up the Database

Run the Prisma migrations to create the necessary tables in your database, then seed it with initial data (admin user, categories, etc.).

```bash
# Generate the Prisma Client
npx prisma generate

# Apply migrations to the database
npx prisma migrate dev

# Seed the database with initial data
npm run prisma:seed
```

### 6. Start the Development Server

```bash
npm run dev
```

The site will be available at [http://localhost:3000](http://localhost:3000).

## 📁 Project Structure

- **/app**: Application routes (App Router).
  - **/[locale]**: Internationalized public routes.
  - **/(admin)**: Route group for the admin panel layout.
  - **/api**: API endpoints, including admin and service-only routes.
- **/prisma**: Database schema, migrations, and seed script.
- **/src/components**: Reusable React components.
  - **/admin**: Components specific to the admin panel.
- **/src/lib**: Core application logic (auth, i18n, database, SEO, etc.).
- **/src/locales**: JSON translation files for i18n.

## ☁️ Deployment

This project is optimized for deployment on [Vercel](https://vercel.com/). To deploy:

1.  Push your code to a Git repository (GitHub, GitLab, Bitbucket).
2.  Import the project into Vercel.
3.  Configure the same environment variables from your `.env.local` file in the Vercel project settings.

The build process (`next build`) and other optimizations will be handled automatically by Vercel.