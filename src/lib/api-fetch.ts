// src/lib/api-fetch.ts
// Wrapper seguro sobre fetch que garantiza que la respuesta sea JSON.
// Si el servidor devuelve HTML (página de error de Next.js), text/plain,
// o cualquier otro Content-Type, lanza un error legible en lugar de
// explotar con "JSON.parse: unexpected character".

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name   = "ApiError"
    this.status = status
  }
}

export async function apiFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  let res: Response

  try {
    res = await fetch(url, options)
  } catch (networkErr: any) {
    throw new ApiError(`Error de red: ${networkErr.message}`, 0)
  }

  const contentType = res.headers.get("content-type") ?? ""

  // Si el servidor devolvió algo que no es JSON (HTML de error, texto plano,
  // página de login, etc.), leemos el body como texto para dar un mensaje útil.
  if (!contentType.includes("application/json")) {
    const raw = await res.text()
    const preview = raw.replace(/<[^>]+>/g, " ").trim().slice(0, 200)
    throw new ApiError(
      `El servidor devolvió ${res.status} (${contentType || "sin content-type"}). ` +
      `Revisa la consola del servidor. Preview: ${preview || "(body vacío)"}`,
      res.status
    )
  }

  const data = await res.json()

  if (!res.ok) {
    throw new ApiError(
      data.error ?? data.message ?? `Error ${res.status}`,
      res.status
    )
  }

  return data as T
}