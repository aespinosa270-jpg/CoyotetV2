// src/app/api/auth/[...nextauth]/route.ts
// En v5 esto es literalmente 2 líneas

import { handlers } from "../../../../auth";

export const { GET, POST } = handlers;