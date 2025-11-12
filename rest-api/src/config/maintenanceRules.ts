import { ServiceType } from '../../../shared/types/enums';

export type MaintenanceSeverity = 'info' | 'warning' | 'critical';

export interface MaintenanceRule {
  id: string;
  title: string;
  description: string;
  serviceTypes: ServiceType[];
  kmInterval?: number;
  monthInterval?: number;
  severity: MaintenanceSeverity;
  recommendedActions: string[];
  applicableFuelTypes?: Array<
    'Benzin' | 'Dizel' | 'Elektrik' | 'Benzin/Tüp' | 'Hibrit' | 'Hybrid' | 'gasoline' | 'diesel' | 'electric' | 'hybrid'
  >;
  applicableTransmissions?: string[];
  minVehicleAgeYears?: number;
  minMileage?: number;
  tags?: string[];
}

export const MAINTENANCE_RULES: MaintenanceRule[] = [
  {
    id: 'engine_oil_service',
    title: 'Motor Yağı ve Filtre Değişimi',
    description:
      'Motor yağının düzenli aralıklarla değiştirilmesi motor sağlığı için kritik öneme sahiptir. Yağ filtresiyle birlikte değişim önerilir.',
    serviceTypes: [ServiceType.GENERAL_MAINTENANCE],
    kmInterval: 10000,
    monthInterval: 12,
    severity: 'warning',
    recommendedActions: ['Motor yağı ve yağ filtresi değişimi', 'Hava filtresi kontrolü'],
    tags: ['yağ', 'motor', 'general_maintenance'],
  },
  {
    id: 'brake_system_check',
    title: 'Fren Sistemi Kontrolü',
    description:
      'Fren sistemi bileşenleri aşınmaya karşı düzenli olarak kontrol edilmelidir. Balata ve disk kalınlıkları ölçülmeli, hidrolik sıvısı kontrol edilmelidir.',
    serviceTypes: [ServiceType.GENERAL_MAINTENANCE],
    kmInterval: 20000,
    monthInterval: 18,
    severity: 'warning',
    recommendedActions: [
      'Fren balataları ve disklerin görsel muayenesi',
      'Fren hidroliği seviyesinin kontrolü',
    ],
    tags: ['fren', 'general_maintenance'],
  },
  {
    id: 'transmission_fluid_service',
    title: 'Şanzıman Yağı Değişimi',
    description:
      'Otomatik şanzımanlarda yağın belirli aralıklarla değiştirilmesi gerekir. Manuel şanzımanlarda kontrol yeterli olabilir.',
    serviceTypes: [ServiceType.GENERAL_MAINTENANCE],
    kmInterval: 60000,
    monthInterval: 48,
    severity: 'info',
    recommendedActions: ['Şanzıman yağının durumu ve seviyesinin kontrolü', 'Gerekirse yağ değişimi'],
    applicableTransmissions: ['Otomatik', 'Automatic', 'CVT', 'DSG'],
    tags: ['vites', 'şanzıman', 'general_maintenance'],
  },
  {
    id: 'battery_health_check',
    title: 'Batarya Sağlık Kontrolü',
    description:
      'Elektrikli ve hibrit araçlarda çekiş bataryasının kondüsyonu düzenli olarak ölçülmelidir. Soğutma sistemi ve yazılım güncellemeleri kontrol edilmelidir.',
    serviceTypes: [ServiceType.ELECTRICAL],
    monthInterval: 12,
    severity: 'warning',
    recommendedActions: [
      'Batarya sağlık raporu alın',
      'Batarya soğutma sistemi ve kablolarını kontrol edin',
      'Araç yazılım güncellemelerini uygulayın',
    ],
    applicableFuelTypes: ['Elektrik', 'electric', 'Hibrit', 'Hybrid', 'hybrid'],
    tags: ['batarya', 'elektrik', 'electrical'],
  },
  {
    id: 'tire_rotation_alignment',
    title: 'Lastik Rotasyon ve Balans',
    description:
      'Düzgün aşınma ve daha iyi yol tutuş için lastiklerin belirli kilometrelerde rotasyonu ve balans kontrolü önerilir.',
    serviceTypes: [ServiceType.TIRE_SERVICE],
    kmInterval: 15000,
    monthInterval: 12,
    severity: 'info',
    recommendedActions: ['Rot-balans ayarı', 'Lastik diş derinliği kontrolü', 'Hava basınçlarının ölçümü'],
    tags: ['lastik', 'tire_service'],
  },
  {
    id: 'timing_belt_inspection',
    title: 'Triger Kayışı Kontrolü',
    description:
      'Triger kayışı bulunan motorlarda kayışın belirli kilometre veya yaş aralığında değiştirilmesi gerekir. Kopması durumunda motor hasar görebilir.',
    serviceTypes: [ServiceType.GENERAL_MAINTENANCE],
    kmInterval: 90000,
    monthInterval: 60,
    severity: 'critical',
    recommendedActions: ['Triger kayışı ve gergi rulmanlarının değişimi', 'Su pompası kontrolü'],
    tags: ['triger', 'motor', 'general_maintenance'],
  },
];

