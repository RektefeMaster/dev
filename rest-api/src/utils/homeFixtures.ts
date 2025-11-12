import { Types } from 'mongoose';

type Maybe<T> = T | null | undefined;

export const createSampleMaintenanceRecords = (userId: Maybe<string>) => [
  {
    _id: new Types.ObjectId(),
    userId,
    vehicleId: null,
    date: new Date('2025-01-20'),
    mileage: 62450,
    type: 'Motor Bakımı',
    details: ['Yağ değişimi', 'Yağ filtresi değişimi', 'Hava filtresi kontrolü'],
    serviceName: 'Rektefe Servis Merkezi',
    cost: 2850,
    workshopName: 'Rektefe Servis Merkezi',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new Types.ObjectId(),
    userId,
    vehicleId: null,
    date: new Date('2024-11-05'),
    mileage: 58000,
    type: 'Fren Bakımı',
    details: ['Ön balata değişimi', 'Fren hidroliği kontrolü'],
    serviceName: 'Şehir Fren Uzmanı',
    cost: 1650,
    workshopName: 'Şehir Fren Uzmanı',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const createSampleInsurancePolicy = (userId: Maybe<string>) => ({
  _id: new Types.ObjectId(),
  userId,
  company: 'Anadolu Sigorta',
  type: 'Kasko',
  startDate: new Date('2024-09-01'),
  endDate: new Date('2025-09-01'),
  policyNumber: 'AS-2024-TR-987654',
  coverage: ['Kasko', 'Mini Onarım', 'İkame Araç', 'Cam Onarım'],
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const createSampleVehicleStatus = (userId: Maybe<string>) => ({
  _id: new Types.ObjectId(),
  userId,
  overallStatus: 'good',
  lastCheck: new Date('2025-01-28'),
  issues: ['Ön sileceklerde hafif aşınma'],
  mileage: 64200,
  nextServiceDate: new Date('2025-03-15'),
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const createSampleTireStatus = (userId: Maybe<string>) => ({
  _id: new Types.ObjectId(),
  userId,
  status: 'good',
  lastCheck: new Date('2025-01-25'),
  issues: ['Arka sağ lastikte hafif basınç düşüklüğü'],
  recommendedActions: ['Haftalık basınç kontrolü yapın', 'Yaz lastiği randevusu planlayın'],
  frontLeftDepth: 5.8,
  frontRightDepth: 5.7,
  rearLeftDepth: 5.3,
  rearRightDepth: 5.1,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const getSampleCampaigns = () => [
  {
    id: 1,
    title: 'Kış Lastiği Değişim Kampanyası',
    description: 'Tüm marka lastiklerde %25 indirim. Profesyonel montaj ve balans dahil.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop',
    company: 'Lastik Dünyası',
    companyLogo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop',
    validUntil: '2025-03-31',
    discount: '%25 İndirim',
    conditions: ['Minimum 4 lastik alımı', 'Montaj ve balans dahil', 'Geçerli tarih: 31 Mart 2025'],
    serviceType: 'Lastik Değişimi',
    location: {
      city: 'İstanbul',
      district: 'Kadıköy',
    },
    contactInfo: {
      phone: '+90 216 123 45 67',
      address: 'Moda Caddesi No:123, Kadıköy/İstanbul',
    },
    rating: 4.8,
    reviewCount: 156,
    isVerified: true,
  },
  {
    id: 2,
    title: 'Motor Yağı Değişim Paketi',
    description: 'Premium motor yağı + filtre değişimi + kontrol. Tüm markalar için geçerli.',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&h=400&fit=crop',
    company: 'Oto Servis Merkezi',
    companyLogo: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=100&h=100&fit=crop',
    validUntil: '2025-02-28',
    discount: '%30 İndirim',
    conditions: ['Sadece randevulu hizmet', 'Yağ ve filtre dahil', 'Geçerli tarih: 28 Şubat 2025'],
    serviceType: 'Motor Bakımı',
    location: {
      city: 'Ankara',
      district: 'Çankaya',
    },
    contactInfo: {
      phone: '+90 312 987 65 43',
      address: 'Tunalı Hilmi Caddesi No:456, Çankaya/Ankara',
    },
    rating: 4.6,
    reviewCount: 89,
    isVerified: true,
  },
  {
    id: 3,
    title: 'Rektefe Sadakat Programı',
    description: 'Her 3. yıkama ücretsiz. Mobil hizmetler için de geçerli.',
    image: 'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=800&h=400&fit=crop',
    company: 'Rektefe Wash',
    companyLogo: 'https://images.unsplash.com/photo-1529429617124-aee711219cf3?w=100&h=100&fit=crop',
    validUntil: '2025-04-30',
    discount: '3\'te 1 Ücretsiz',
    conditions: ['Sadece kayıtlı müşteriler için', 'Mobil hizmet dahil', 'Geçerli tarih: 30 Nisan 2025'],
    serviceType: 'Araç Yıkama',
    location: {
      city: 'İzmir',
      district: 'Bornova',
    },
    contactInfo: {
      phone: '+90 232 456 78 90',
      address: 'Bornova Ankara Caddesi No:78, İzmir',
    },
    rating: 4.9,
    reviewCount: 214,
    isVerified: true,
  },
];

export const getSampleAds = () => [
  {
    id: 1,
    title: 'Özel Bakım Kampanyası',
    description: 'Tüm araçlar için %20 indirim',
    imageUrl: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=600&h=400&fit=crop',
    link: 'https://rektefe.com/kampanyalar/bakim',
    active: true,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
  },
  {
    id: 2,
    title: 'Yeni Müşteri İndirimi',
    description: 'İlk randevunuzda %15 indirim',
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=400&fit=crop',
    link: 'https://rektefe.com/kampanyalar/yeni-musteri',
    active: true,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
  },
  {
    id: 3,
    title: 'Rektefe Cüzdan Bonus',
    description: 'Cüzdanınıza yüklediğiniz her 1000 TL için 100 TefePuan hediye',
    imageUrl: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=600&h=400&fit=crop',
    link: 'https://rektefe.com/tefepuan',
    active: true,
    startDate: '2025-02-01',
    endDate: '2025-05-31',
  },
];

