// src/geocoding/geocoding.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class GeocodingService {
  private readonly axiosInstance: AxiosInstance;

  constructor(private configService: ConfigService) {
    // ===== CONFIGURAÇÃO DO AXIOS =====
    this.axiosInstance = axios.create({
      baseURL: 'https://nominatim.openstreetmap.org',
      timeout: 10000, // 10 segundos
      headers: {
        // 🔥 USER-AGENT INFORMATIVO (OBRIGATÓRIO)
        'User-Agent': 'StandardApp/1.0 (https://github.com/matheushmg2/standard; matheushmg2@gmail.com)',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
  }

  // ===== GEOCODIFICAR ENDEREÇO =====
  async geocodeAddress(address: string) {
    if (!address || address.trim().length < 3) {
      throw new BadRequestException('Endereço inválido');
    }

    try {
      // 🔥 DELAY DE 1 SEGUNDO (RESPEITANDO O LIMITE DE 1 REQUISIÇÃO/SEGUNDO)
      await this.delay(1000);

      const response = await this.axiosInstance.get('/search', {
        params: {
          q: address,
          format: 'json',
          addressdetails: 1,
          limit: 1,
          'accept-language': 'pt-BR',
        },
      });

      if (response.data.length === 0) {
        return null;
      }

      const result = response.data[0];
      const addressDetails = result.address || {};

      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formattedAddress: result.display_name,
        city: addressDetails.city || addressDetails.town || addressDetails.village || addressDetails.locality || addressDetails.municipality,
        state: addressDetails.state || addressDetails.region,
        country: addressDetails.country,
        postalCode: addressDetails.postcode,
        neighborhood: addressDetails.neighbourhood || addressDetails.suburb,
        street: addressDetails.road,
        houseNumber: addressDetails.house_number,
        confidence: parseFloat(result.importance || 0).toFixed(2),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new BadRequestException('Limite de requisições excedido. Tente novamente em alguns minutos.');
        }
        if (error.response?.status === 403) {
          throw new BadRequestException('Acesso negado ao serviço de geocodificação. Verifique o User-Agent.');
        }
        console.error('Erro ao geocodificar endereço:', error.message);
        throw new BadRequestException('Erro ao processar o endereço. Tente novamente.');
      }
      throw error;
    }
  }

  // ===== GEOCODIFICAR REVERSO (LAT/LNG → ENDEREÇO) =====
  async reverseGeocode(lat: number, lng: number) {
    try {
      await this.delay(1000);

      const response = await this.axiosInstance.get('/reverse', {
        params: {
          lat,
          lon: lng,
          format: 'json',
          addressdetails: 1,
          'accept-language': 'pt-BR',
        },
      });

      if (!response.data || !response.data.address) {
        return null;
      }

      const address = response.data.address;

      return {
        formattedAddress: response.data.display_name,
        city: address.city || address.town || address.village || address.locality || address.municipality,
        state: address.state || address.region,
        country: address.country,
        postalCode: address.postcode,
        street: address.road,
        houseNumber: address.house_number,
        neighborhood: address.neighbourhood || address.suburb,
      };
    } catch (error: any) {
      console.error('Erro no geocoding reverso:', error.message);
      return null;
    }
  }

  // ===== BUSCAR CIDADES POR NOME =====
  async searchCities(query: string, limit: number = 5) {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      await this.delay(1000);

      const response = await this.axiosInstance.get('/search', {
        params: {
          q: query,
          format: 'json',
          addressdetails: 1,
          limit,
          'accept-language': 'pt-BR',
          featuretype: 'city',
          class: 'boundary',
        },
      });

      return response.data.map((item: any) => ({
        name: item.display_name,
        city: item.address?.city || item.address?.town || item.address?.village || item.display_name,
        state: item.address?.state || item.address?.region,
        country: item.address?.country,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));
    } catch (error: any) {
      console.error('Erro ao buscar cidades:', error.message);
      return [];
    }
  }

  // ===== UTILITÁRIO: DELAY =====
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}