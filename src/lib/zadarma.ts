import crypto from 'crypto';

// Jalamos las llaves directo del entorno seguro del servidor
const ZADARMA_KEY = process.env.ZADARMA_KEY;
const ZADARMA_SECRET = process.env.ZADARMA_SECRET;

export function getZadarmaHeaders(method: string, apiRoute: string, params: Record<string, string> = {}) {
    if (!ZADARMA_KEY || !ZADARMA_SECRET) {
        throw new Error('Faltan las credenciales de Zadarma en las variables de entorno.');
    }

    const sortedKeys = Object.keys(params).sort();
    const sortedParams: Record<string, string> = {};
    sortedKeys.forEach(k => {
        sortedParams[k] = params[k];
    });

    const queryString = new URLSearchParams(sortedParams).toString();
    const md5String = crypto.createHash('md5').update(queryString).digest('hex');
    const dataToSign = method.toUpperCase() + apiRoute + queryString + md5String;
    
    const signature = crypto.createHmac('sha1', ZADARMA_SECRET).update(dataToSign).digest('base64');

    return {
        'Authorization': `${ZADARMA_KEY}:${signature}`,
        'Content-Type': 'application/x-www-form-urlencoded'
    };
}