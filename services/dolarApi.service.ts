/**
 * Servicio para consultar la API de tasas de cambio oficial en Venezuela
 * Endpoint: https://ve.dolarapi.com/v1/dolares/oficial
 */

export interface DolarApiResponse {
  moneda: string;
  fuente: string;
  nombre: string;
  compra: number | null;
  venta: number | null;
  promedio: number;
  fechaActualizacion: string;
}

export interface FetchOfficialRateResult {
  rate: number;
  updatedAt: string;
  source: string;
  sourceDate?: string;
}

export class DolarApiService {
  public static readonly OFFICIAL_ENDPOINT = 'https://ve.dolarapi.com/v1/dolares/oficial';

  /**
   * Consulta la tasa oficial y devuelve el valor promedio numérico.
   */
  public static async fetchOfficialRate(): Promise<FetchOfficialRateResult> {
    try {
      const response = await fetch(this.OFFICIAL_ENDPOINT, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Servidor respondió con código ${response.status}`);
      }

      const data = (await response.json()) as DolarApiResponse;

      if (!data || typeof data.promedio !== 'number' || isNaN(data.promedio) || data.promedio <= 0) {
        throw new Error('La respuesta de la API no contiene una tasa válida en el campo promedio.');
      }

      return {
        rate: Number(data.promedio.toFixed(4)),
        updatedAt: new Date().toISOString(),
        source: data.fuente || 'oficial',
        sourceDate: data.fechaActualizacion,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al consultar la API';
      throw new Error(`No se pudo obtener la tasa oficial: ${msg}`);
    }
  }
}
