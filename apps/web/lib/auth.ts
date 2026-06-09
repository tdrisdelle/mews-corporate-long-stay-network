// URL param mock auth: ?as=booker&id=BUYER_ID, ?as=operator&id=PROPERTY_ID, etc.
export type Role = "booker" | "operator" | "mews" | "resident";

export interface AuthContext {
  role: Role;
  id: string;
}

// Used in client components reading searchParams
export function parseAuth(searchParams: { as?: string; id?: string }): AuthContext {
  return {
    role: (searchParams.as as Role) || "booker",
    id: searchParams.id || "a0000000-0000-0000-0000-000000000001",
  };
}

// Hardcoded IDs for demo
export const DEMO_IDS = {
  buyer: "a0000000-0000-0000-0000-000000000001", // Stanford Healthcare
  property: "c0000000-0000-0000-0000-000000000001", // Revisn Nashville
  resident: "b0000000-0000-0000-0000-000000000001", // Maria Santos
};
