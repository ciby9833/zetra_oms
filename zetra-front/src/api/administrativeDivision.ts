import request from './request';
import type { ApiResponse } from './types';

export interface AdministrativeDivision {
  province_code: string;
  province_name: string;
  city_code: string;
  city_name: string;
  district_code: string;
  district_name: string;
  township_code: string;
  township_name: string;
}

export const administrativeDivisionApi = {
  // 获取省份列表
  getProvinces() {
    return request.get<ApiResponse>('/administrative-divisions/provinces');
  },

  // 获取城市列表
  getCities(provinceCode: string) {
    return request.get<ApiResponse>(`/administrative-divisions/cities/${provinceCode}`);
  },

  // 获取区县列表
  getDistricts(provinceCode: string, cityCode: string) {
    return request.get(`/administrative-divisions/districts/${provinceCode}/${cityCode}`);
  },

  // 获取乡镇列表
  getTownships(provinceCode: string, cityCode: string, districtCode: string) {
    return request.get<ApiResponse>(`/administrative-divisions/townships/${provinceCode}/${cityCode}/${districtCode}`);
  }
};
