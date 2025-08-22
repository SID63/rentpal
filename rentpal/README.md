# RentPal - Peer-to-Peer Rental Marketplace

RentPal is a modern web application built with Next.js and Supabase that allows users to rent out their personal items to others and discover items to rent from the community.

## Features Implemented

### ✅ Task 1: Project Foundation and Authentication

- **Next.js 13+ Project Setup**: Initialized with TypeScript, Tailwind CSS, and App Router
- **Supabase Integration**: Complete authentication system with email verification
- **Authentication Components**:
  - LoginForm with form validation
  - RegisterForm with email verification flow
  - PasswordReset component
  - AuthGuard for route protection
- **User Profile Management**:
  - ProfileSetup component for initial profile completion
  - ProfileEdit component with form validation
  - Image upload functionality for profile pictures
  - Complete user profile data model

## Tech Stack

- **Frontend**: Next.js 13+, React 18+, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Forms**: React Hook Form with Zod validation
- **State Management**: React Context API
- **Authentication**: Supabase Auth with email verification

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd rentpal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your Supabase project:
   - Create a new project at [supabase.com](https://supabase.com)
   - Get your project URL and anon key from the API settings
   - Update `.env.local` with your Supabase credentials

5. Set up the database schema:
   ```sql
   -- Create profiles table
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users(id) PRIMARY KEY,
     email TEXT NOT NULL,
     full_name TEXT NOT NULL,
     avatar_url TEXT,
     phone TEXT,
     address TEXT NOT NULL,
     city TEXT NOT NULL,
     state TEXT NOT NULL,
     zip_code TEXT NOT NULL,
     latitude DECIMAL,
     longitude DECIMAL,
     bio TEXT,
     verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
     rating DECIMAL DEFAULT 0,
     total_reviews INTEGER DEFAULT 0,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Enable Row Level Security
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

   -- Create policies
   CREATE POLICY "Users can view their own profile" ON profiles
     FOR SELECT USING (auth.uid() = id);

   CREATE POLICY "Users can update their own profile" ON profiles
     FOR UPDATE USING (auth.uid() = id);

   CREATE POLICY "Users can insert their own profile" ON profiles
     FOR INSERT WITH CHECK (auth.uid() = id);

   -- Create storage bucket for avatars
   INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

   -- Create storage policies
   CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
     FOR SELECT USING (bucket_id = 'avatars');

   CREATE POLICY "Users can upload their own avatar" ON storage.objects
     FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

   CREATE POLICY "Users can update their own avatar" ON storage.objects
     FOR UPDATE WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

   CREATE POLICY "Users can delete their own avatar" ON storage.objects
     FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

6. Run the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   └── profile/           # Profile management pages
├── components/            # React components
│   ├── auth/             # Authentication components
│   └── profile/          # Profile management components
├── contexts/             # React contexts
│   └── AuthContext.tsx   # Authentication context
└── lib/                  # Utility libraries
    └── supabase.ts       # Supabase client configuration
```

## Authentication Flow

1. **Registration**: Users register with email and password
2. **Email Verification**: Users receive a confirmation email
3. **Profile Setup**: After verification, users complete their profile
4. **Dashboard Access**: Authenticated users can access the dashboard

## Available Routes

- `/` - Landing page
- `/auth/login` - User login
- `/auth/register` - User registration
- `/auth/forgot-password` - Password reset
- `/auth/callback` - Auth callback handler
- `/profile/setup` - Initial profile setup
- `/profile/edit` - Profile editing
- `/dashboard` - User dashboard (protected)

## Environment Variables

Required environment variables (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `NEXTAUTH_SECRET` - Secret for NextAuth (32+ characters)
- `NEXTAUTH_URL` - Your application URL

## Next Steps

This implementation covers the foundation and authentication system. The next tasks in the implementation plan include:

- Database schema and data models
- Item listing functionality
- Search and discovery features
- Booking and reservation system
- Payment processing
- Communication and messaging
- Reviews and ratings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.