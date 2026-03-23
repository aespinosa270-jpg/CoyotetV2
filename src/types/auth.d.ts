import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      role: string | null;
      isEmployee: boolean;
      membershipTier: string;
      points: number;
    };
  }

  interface User {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: string | null;
    isEmployee: boolean;
    membershipTier: string;
    points: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string | null;
    isEmployee: boolean;
    membershipTier: string;
    points: number;
  }
}