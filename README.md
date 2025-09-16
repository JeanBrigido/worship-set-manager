# Worship Set Manager

A comprehensive church worship set management application built with modern web technologies.

## 🎵 Features

- **Song Management**: Organize and manage your church's worship songs and hymns
- **Set Planning**: Create and schedule worship sets for services and events
- **Team Coordination**: Coordinate with musicians and worship team members
- **Analytics**: Track song usage and worship metrics

## 🏗️ Tech Stack

### Frontend

- **Next.js 14** with TypeScript
- **Tailwind CSS** for styling
- **NextAuth.js** for authentication

### Backend

- **Express.js** with TypeScript
- **Prisma** ORM
- **PostgreSQL** database

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0 or higher
- npm 9.0 or higher
- PostgreSQL database

### Installation

1. Clone the repository:

```bash
git clone https://github.com/JeanBrigido/worship-set-manager.git
cd worship-set-manager
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
# Copy example environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit the .env files with your actual values
```

4. Set up the database:

```bash
cd backend
npm run db:generate
npm run db:push
```

### Running the Application

#### Development Mode

```bash
# Run both frontend and backend simultaneously
npm run dev

# Or run them separately:
npm run dev:frontend  # Frontend on http://localhost:3000
npm run dev:backend   # Backend on http://localhost:3001
```

#### Production Mode

```bash
# Build both applications
npm run build

# Start both applications
npm run start
```

## 📁 Project Structure

```
worship-set-manager/
├── frontend/           # Next.js frontend application
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── components/ # Reusable components
│   │   └── lib/       # Utility functions
│   ├── package.json
│   └── tsconfig.json
├── backend/            # Express.js backend API
│   ├── src/
│   │   ├── routes/    # API routes
│   │   ├── middleware/ # Custom middleware
│   │   └── types/     # TypeScript type definitions
│   ├── prisma/        # Database schema and migrations
│   ├── package.json
│   └── tsconfig.json
├── package.json        # Root package.json with workspace config
└── README.md
```

## 🛠️ Available Scripts

### Root Level Scripts

- `npm run dev` - Run both frontend and backend in development mode
- `npm run build` - Build both applications
- `npm run start` - Start both applications in production mode
- `npm run lint` - Lint all workspaces
- `npm run format` - Format code with Prettier

### Frontend Scripts

- `npm run dev:frontend` - Start frontend development server
- `npm run build --workspace=frontend` - Build frontend for production
- `npm run lint --workspace=frontend` - Lint frontend code

### Backend Scripts

- `npm run dev:backend` - Start backend development server
- `npm run build --workspace=backend` - Build backend for production
- `npm run lint --workspace=backend` - Lint backend code
- `npm run db:generate --workspace=backend` - Generate Prisma client
- `npm run db:push --workspace=backend` - Push schema to database
- `npm run db:studio --workspace=backend` - Open Prisma Studio

## 🔧 Environment Variables

### Backend (.env)

```env
DATABASE_URL="postgresql://username:password@localhost:5432/worship_set_manager"
PORT=3001
```

### Frontend (.env)

```env
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
DATABASE_URL="postgresql://username:password@localhost:5432/worship_set_manager"
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

## 📝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for churches and worship teams to better organize their worship services
- Inspired by the need for modern, user-friendly worship management tools
