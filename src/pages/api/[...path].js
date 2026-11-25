// Toda la API (/api/*) pasa por aquí. La lógica está en server/.
import { handleApi } from '../../../server/api.js';

export const prerender = false;
export const ALL = (ctx) => handleApi(ctx);
