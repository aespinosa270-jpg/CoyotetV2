import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name?: string | null;
    employeeId?: string | null;
    employeeRole?: string | null;
    userType: string;
  }

  interface Session {
    user: {
      id: string;
      employeeId?: string | null;
      employeeRole?: string | null;
      userType: string;
    } & import("next-auth").DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    employeeId?: string | null;
    employeeRole?: string | null;
    userType: string;
  }
}