import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '@/constants/config';
import { useFocusEffect } from '@react-navigation/native';
import Background from '@/shared/components/Background';
import { BackButton } from '@/shared/components';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import carData from '@/constants/carData.json';
import { validateForm, validationRules } from '@/shared/utils/validation';
import toastService from '@/shared/services/toastService';
import { odometerService, OdometerEventResponse } from '@/shared/services/modules/odometerService';
import OdometerSummary from '../components/OdometerSummary';
import OdometerQuickUpdateModal, { OdometerQuickUpdatePayload } from '../components/OdometerQuickUpdateModal';
import { odometerQueue } from '@/shared/utils/odometerQueue';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { analytics } from '@/shared/utils/analytics';
import ErrorState from '@/shared/components/ErrorState';
import LoadingSkeleton from '@/shared/components/LoadingSkeleton';
import EmptyState from '@/shared/components/NoDataCard';
import { formatDateValue } from '../../home/utils/dateHelpers';

interface Vehicle {
  _id: string;
  userId: string;
  brand: string;
  modelName: string;
  package: string;
  year: number;
  engineType: string;
  fuelType: string;
  transmission: string;
  mileage: number;
  plateNumber: string;
  image?: string;
  createdAt: string;
  isFavorite?: boolean;
  odometerEstimate?: {
    estimateKm: number;
    displayKm: number;
    lastTrueKm: number;
    lastTrueTsUtc: string;
    sinceDays: number;
    rateKmPerDay: number;
    confidence: number;
    isApproximate: boolean;
    seriesId: string;
    status: {
      code: 'OK' | 'NO_BASELINE' | 'STALE' | 'LOW_CONFIDENCE';
      severity: 'info' | 'warning' | 'critical';
      message: string;
    };
    warnings: string[];
  };
  odometerVerification?: {
    status?: 'verified' | 'missing' | 'failed';
    message?: string;
    warnings?: string[];
    lastUpdated?: string;
  };
}

type VehicleStatusPresentation = {
  label: string;
  badgeColor: string;
  cardBackgroundColor: string;
  cardBorderColor: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const DEFAULT_VEHICLE_STATUS_PRESENTATION: VehicleStatusPresentation = {
  label: 'Bilinmiyor',
  badgeColor: '#6B7280',
  cardBackgroundColor: '#FFFFFF',
  cardBorderColor: '#E5E7EB',
  icon: 'shield-outline',
};

const VEHICLE_STATUS_MAP: Record<string, VehicleStatusPresentation> = {
  excellent: {
    label: 'Mükemmel',
    badgeColor: '#2563EB',
    cardBackgroundColor: '#EEF2FF',
    cardBorderColor: '#C7D2FE',
    icon: 'shield-star',
  },
  good: {
    label: 'İyi',
    badgeColor: '#0A8754',
    cardBackgroundColor: '#F0FFF4',
    cardBorderColor: '#BBF7D0',
    icon: 'shield-check',
  },
  warning: {
    label: 'Uyarı',
    badgeColor: '#FF9F1C',
    cardBackgroundColor: '#FFF8EB',
    cardBorderColor: '#FFE5B4',
    icon: 'shield-alert',
  },
  critical: {
    label: 'Kritik',
    badgeColor: '#D7263D',
    cardBackgroundColor: '#FFF5F5',
    cardBorderColor: '#F8B4B4',
    icon: 'shield-alert-outline',
  },
};

const formatFallbackStatusLabel = (raw: string) =>
  raw
    .toString()
    .trim()
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR'))
    .join(' ');

const getVehicleStatusPresentation = (status?: string): VehicleStatusPresentation => {
  if (!status) {
    return DEFAULT_VEHICLE_STATUS_PRESENTATION;
  }

  const normalized = status.toString().trim().toLowerCase();
  const mapped = VEHICLE_STATUS_MAP[normalized];

  if (mapped) {
    return { ...mapped };
  }

  const fallbackLabel = formatFallbackStatusLabel(status);

  return {
    ...DEFAULT_VEHICLE_STATUS_PRESENTATION,
    label: fallbackLabel || DEFAULT_VEHICLE_STATUS_PRESENTATION.label,
  };
};

const GarageScreen = () => {
  const { token, userId } = useAuth();
  const { theme } = useTheme();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicleStatus, setVehicleStatus] = useState<any | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [odometerModalVisible, setOdometerModalVisible] = useState(false);
  const [odometerSubmitting, setOdometerSubmitting] = useState(false);
  const [odometerError, setOdometerError] = useState<string | null>(null);
  const [pendingQueue, setPendingQueue] = useState<Record<string, boolean>>({});
  const { isConnected } = useNetworkStatus();
  const hasFetchedRef = useRef(false);
  const viewTrackedRef = useRef(false);

  const vehicleStatusPresentation = useMemo(
    () => getVehicleStatusPresentation(vehicleStatus?.overallStatus),
    [vehicleStatus?.overallStatus]
  );

  const applyOdometerResult = useCallback(
    (vehicleId: string, response: OdometerEventResponse) => {
      setVehicles((prev) =>
        prev.map((vehicle) =>
          vehicle._id === vehicleId
            ? {
                ...vehicle,
                mileage: response.event.km,
                odometerEstimate: response.estimate,
                odometerVerification: {
                  status: response.pendingReview ? 'failed' : 'verified',
                  message: response.pendingReview
                    ? 'Kilometre kaydı incelemeye alındı.'
                    : 'Kilometre başarıyla güncellendi.',
                  warnings: response.warnings,
                  lastUpdated: new Date().toISOString(),
                },
              }
            : vehicle
        )
      );
      analytics.track(response.pendingReview ? 'odo_update_reject_outlier' : 'odo_calibrated', {
        vehicleId,
        pendingReview: response.pendingReview,
        outlierClass: response.outlierClass,
      });
    },
    []
  );

  useEffect(() => {
    (async () => {
      const queued = await odometerQueue.list();
      const map = queued.reduce<Record<string, boolean>>((acc, item) => {
        acc[item.vehicleId] = true;
        return acc;
      }, {});
      setPendingQueue(map);
    })();
  }, []);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    let cancelled = false;

    (async () => {
      const remaining = await odometerQueue.flush(async (event) => {
        const response = await odometerService.submitEvent(event.vehicleId, event.payload);
        if (cancelled) {
          return;
        }
        applyOdometerResult(event.vehicleId, response);
        setPendingQueue((prev) => {
          const next = { ...prev };
          delete next[event.vehicleId];
          return next;
        });
        analytics.track('odo_update_submit', {
          vehicleId: event.vehicleId,
          offline: false,
          source: 'flush',
        });
      });

      if (!cancelled) {
        const map = remaining.reduce<Record<string, boolean>>((acc, item) => {
          acc[item.vehicleId] = true;
          return acc;
        }, {});
        setPendingQueue(map);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isConnected, applyOdometerResult]);

  // Refs for scroll
  const scrollViewRef = useRef<ScrollView>(null);

  // Form state
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    package: '',
    year: '',
    fuelType: '',
    transmission: '',
    mileage: '',
    plateNumber: ''
  });

  // Search states
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  // Available options
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [availablePackages, setAvailablePackages] = useState<string[]>([]);
  const [availableFuelTypes, setAvailableFuelTypes] = useState<string[]>([]);
  const [availableTransmissions, setAvailableTransmissions] = useState<string[]>([]);

  const fetchVehicleStatus = useCallback(async () => {
    if (!token || !userId) {
      setVehicleStatus(null);
      setStatusError(null);
      return;
    }

    setStatusLoading(true);
    setStatusError(null);

    try {
      const response = await axios.get(`${API_URL}/home/overview`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });

      if (response.data?.success && response.data.data?.vehicleStatus) {
        setVehicleStatus(response.data.data.vehicleStatus);
      } else {
        setVehicleStatus(null);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Araç durumu alınırken bir hata oluştu.';
      setStatusError(message);
      setVehicleStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, [token, userId]);

  // Filtered brands based on search
  const filteredBrands = carData.filter(brand => 
    brand.brand.toLowerCase().includes(brandSearch.toLowerCase())
  );

  // Filtered models based on search
  const filteredModels = availableModels.filter(model =>
    model.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

  const fetchVehicles = useCallback(async () => {
    if (!token) {
      setVehicles([]);
      setVehicleStatus(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [vehiclesRes, userRes] = await Promise.all([
        axios.get(`${API_URL}/vehicles`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000,
        }),
        axios.get(`${API_URL}/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000,
        }),
      ]);

      const favoriteVehicleId = userRes.data.data?.favoriteVehicle;
      if (vehiclesRes.data && vehiclesRes.data.success && vehiclesRes.data.data) {
        setVehicles(
          vehiclesRes.data.data.map((v: any) => ({ ...v, isFavorite: v._id === favoriteVehicleId })),
        );
      } else {
        setVehicles([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Araçlar yüklenirken bir hata oluştu.');
      setVehicles([]);
    } finally {
      setLoading(false);
      await fetchVehicleStatus();
    }
  }, [token, fetchVehicleStatus]);

  const handleOpenOdometerModal = useCallback((vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setOdometerError(null);
    setOdometerModalVisible(true);
    analytics.track('odo_update_open', { vehicleId });
  }, []);

  const handleCloseOdometerModal = useCallback(() => {
    setOdometerModalVisible(false);
    setSelectedVehicleId(null);
    setOdometerError(null);
  }, []);

  const handleSubmitOdometer = useCallback(
    async (payload: OdometerQuickUpdatePayload, options?: { offline?: boolean }) => {
      if (!selectedVehicleId) {
        return;
      }

      const offline = options?.offline;
      setOdometerSubmitting(true);
      setOdometerError(null);

      analytics.track('odo_update_submit', {
        vehicleId: selectedVehicleId,
        offline,
        km: payload.km,
      });

      if (offline) {
        await odometerQueue.enqueue(selectedVehicleId, payload);
        setPendingQueue((prev) => ({ ...prev, [selectedVehicleId]: true }));
        toastService.info('Kilometre güncellemesi sıraya alındı.');
        setOdometerSubmitting(false);
        setOdometerModalVisible(false);
        setSelectedVehicleId(null);
        return;
      }

      try {
        const response = await odometerService.submitEvent(selectedVehicleId, payload);
        applyOdometerResult(selectedVehicleId, response);
        toastService.success('Kilometre güncellendi.');
        if (response.backPressureWarning) {
          toastService.info(response.backPressureWarning);
        }
        if (response.warnings && response.warnings.length > 0) {
          response.warnings.forEach((warning) => toastService.info(warning));
        }
        setOdometerModalVisible(false);
        setSelectedVehicleId(null);
      } catch (error: any) {
        if (!isConnected) {
          await odometerQueue.enqueue(selectedVehicleId, payload);
          setPendingQueue((prev) => ({ ...prev, [selectedVehicleId]: true }));
          toastService.info('Bağlantı yok, güncelleme sıraya alındı.');
          setOdometerModalVisible(false);
          setSelectedVehicleId(null);
        } else {
          const errorCode = error?.response?.data?.error?.code;
          const message =
            error?.response?.data?.error?.message ||
            error?.message ||
            'Kilometre güncellenemedi.';
          setOdometerError(message);
          toastService.error(message);
          if (errorCode) {
            const errorEventMap: Record<string, string> = {
              ERR_ODO_DECREASING: 'odo_update_reject_decreasing',
              ERR_ODO_NEGATIVE: 'odo_update_reject_negative',
              ERR_ODO_FUTURE_TS: 'odo_update_reject_future',
              ERR_ODO_OUTLIER_SOFT: 'odo_update_reject_outlier_soft',
              ERR_ODO_OUTLIER_HARD: 'odo_update_reject_outlier_hard',
                ERR_ODO_RATE_TOO_HIGH: 'odo_update_reject_rate_limit',
            };
            const eventName = errorEventMap[errorCode];
            if (eventName) {
              analytics.track(eventName, {
                vehicleId: selectedVehicleId,
                errorCode,
              });
            }
          }
        }
      } finally {
        setOdometerSubmitting(false);
      }
    },
    [selectedVehicleId, isConnected, applyOdometerResult]
  );

  useFocusEffect(
    React.useCallback(() => {
      if (userId && !hasFetchedRef.current) {
        hasFetchedRef.current = true;
        fetchVehicles();
      }
    }, [userId, fetchVehicles])
  );

  const selectedVehicle = selectedVehicleId
    ? vehicles.find((vehicle) => vehicle._id === selectedVehicleId)
    : undefined;

  useEffect(() => {
    if (vehicles.length > 0 && !viewTrackedRef.current) {
      analytics.track('odo_view', { screen: 'garage', vehicleCount: vehicles.length });
      viewTrackedRef.current = true;
    }
  }, [vehicles]);

  // Brand seçildiğinde modelleri güncelle ve model seçimine geç
  const handleBrandChange = (brand: string) => {
    setFormData(prev => ({
      ...prev,
      brand,
      model: '',
      package: '',
      fuelType: '',
      transmission: ''
    }));

    const selectedBrand = carData.find(b => b.brand === brand);
    if (selectedBrand) {
      setAvailableModels(selectedBrand.models);
    } else {
      setAvailableModels([]);
    }
    setAvailablePackages([]);
    setAvailableFuelTypes([]);
    setAvailableTransmissions([]);

    // Model seçimine kaydır
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 200, animated: true });
    }, 100);
  };

  // Model seçildiğinde paket, yakıt ve vites seçeneklerini güncelle ve paket seçimine geç
  const handleModelChange = (model: string) => {
    setFormData(prev => ({
      ...prev,
      model,
      package: '',
      fuelType: '',
      transmission: ''
    }));

    const selectedBrand = carData.find(b => b.brand === formData.brand);
    const selectedModel = selectedBrand?.models.find(m => m.name === model);
    
    if (selectedModel) {
      setAvailablePackages(selectedModel.packages);
      setAvailableFuelTypes(selectedModel.fuelTypes);
      setAvailableTransmissions(selectedModel.transmissions);
    } else {
      setAvailablePackages([]);
      setAvailableFuelTypes([]);
      setAvailableTransmissions([]);
    }

    // Paket seçimine kaydır
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 400, animated: true });
    }, 100);
  };

  // Paket seçildiğinde yakıt türü seçimine geç
  const handlePackageChange = (packageName: string) => {
    setFormData(prev => ({ ...prev, package: packageName }));
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 600, animated: true });
    }, 100);
  };

  // Yakıt türü seçildiğinde vites türü seçimine geç
  const handleFuelTypeChange = (fuelType: string) => {
    setFormData(prev => ({ ...prev, fuelType }));
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 800, animated: true });
    }, 100);
  };

  // Vites türü seçildiğinde yıl inputuna odaklan
  const handleTransmissionChange = (transmission: string) => {
    setFormData(prev => ({ ...prev, transmission }));
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 1000, animated: true });
    }, 100);
  };

  const resetForm = () => {
    setFormData({
      brand: '',
      model: '',
      package: '',
      year: '',
      fuelType: '',
      transmission: '',
      mileage: '',
      plateNumber: ''
    });
    setBrandSearch('');
    setModelSearch('');
    setAvailableModels([]);
    setAvailablePackages([]);
    setAvailableFuelTypes([]);
    setAvailableTransmissions([]);
  };

  const handleCloseModal = () => {
    // Klavyeyi kapat
    Keyboard.dismiss();
    
    // Form doluysa onay iste
    const hasData = formData.brand || formData.model || formData.package || 
                    formData.year || formData.plateNumber || formData.mileage;
    
    if (hasData) {
      Alert.alert(
        'Formu Kapat',
        'Girdiğiniz bilgiler kaybolacak. Emin misiniz?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { 
            text: 'Kapat', 
            style: 'destructive',
            onPress: () => {
              resetForm();
              setShowAddModal(false);
            }
          }
        ]
      );
    } else {
      resetForm();
      setShowAddModal(false);
    }
  };

  const handleAddVehicle = async () => {
    // Form validation using validation utility
    const validationResult = validateForm([
      { field: 'brand', value: formData.brand, rules: [validationRules.required('Marka seçimi zorunludur')] },
      { field: 'model', value: formData.model, rules: [validationRules.required('Model seçimi zorunludur')] },
      { field: 'package', value: formData.package, rules: [validationRules.required('Paket seçimi zorunludur')] },
      { field: 'year', value: formData.year, rules: [
        validationRules.required('Yıl bilgisi zorunludur'),
        validationRules.pattern(/^\d{4}$/, 'Geçerli bir yıl giriniz (örn: 2024)'),
        validationRules.custom((val) => {
          const year = parseInt(val);
          return year >= 1900 && year <= new Date().getFullYear() + 1;
        }, `Yıl 1900 ile ${new Date().getFullYear() + 1} arasında olmalıdır`)
      ]},
      { field: 'fuelType', value: formData.fuelType, rules: [validationRules.required('Yakıt türü seçimi zorunludur')] },
      { field: 'transmission', value: formData.transmission, rules: [validationRules.required('Vites türü seçimi zorunludur')] },
      { field: 'plateNumber', value: formData.plateNumber, rules: [
        validationRules.required('Plaka numarası zorunludur'),
        validationRules.pattern(/^[0-9]{2}[A-Z]{1,3}[0-9]{1,4}$/, 'Geçerli bir plaka numarası giriniz (örn: 34ABC123)')
      ]},
      { field: 'mileage', value: formData.mileage, rules: [
        validationRules.custom((val) => {
          if (!val || val === '') return true; // Optional
          const mileage = parseInt(val);
          return !isNaN(mileage) && mileage >= 0;
        }, 'Kilometre geçerli bir sayı olmalıdır')
      ]},
    ]);

    if (!validationResult.isValid) {
      setFormErrors(validationResult.errors);
      toastService.error('Lütfen formdaki hataları düzeltin.');
      return;
    }

    setFormErrors({});
    setSubmitting(true);
    
    const vehicleData = {
      brand: formData.brand,
      modelName: formData.model,
      package: formData.package,
      year: Number(formData.year),
      engineType: 'Bilinmiyor',
      fuelType: formData.fuelType === 'LPG' ? 'Benzin/Tüp' : formData.fuelType === 'Plug-in Hybrid' ? 'Hybrid' : formData.fuelType,
      transmission: formData.transmission,
      plateNumber: formData.plateNumber.toUpperCase(),
      mileage: Number(formData.mileage) || 0,
    };
    
    try {
      const response = await axios.post(`${API_URL}/vehicles`, vehicleData, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (response.data && response.data.success && response.data.data) {
        setVehicles([...vehicles, response.data.data]);
      } else {
        setVehicles([...vehicles, response.data]);
      }
      
      resetForm();
      setShowAddModal(false);
      toastService.success('Araç başarıyla eklendi.');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Araç eklenirken bir hata oluştu.';
      toastService.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      await axios.delete(`${API_URL}/vehicles/${vehicleId}`, { headers: { Authorization: `Bearer ${token}` } });
      setVehicles(vehicles.filter(vehicle => vehicle._id !== vehicleId));
      toastService.success('Araç başarıyla silindi.');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Araç silinirken bir hata oluştu.';
      toastService.error(errorMessage);
    }
  };

  const handleSetFavorite = async (vehicleId: string) => {
    setVehicles(prev =>
      prev.map(v => ({ ...v, isFavorite: v._id === vehicleId ? !v.isFavorite : false }))
    );

    try {
      await axios.put(`${API_URL}/vehicles/${vehicleId}/favorite`, {}, { headers: { Authorization: `Bearer ${token}` } });
      await fetchVehicles();
      toastService.success('Favori araç güncellendi.');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Favori araç seçilirken bir hata oluştu.';
      toastService.error(errorMessage);
      await fetchVehicles();
    }
  };

  const renderVehicleCard = (vehicle: Vehicle) => (
    <View key={vehicle._id} style={[styles.vehicleCard, vehicle.isFavorite && styles.favoriteCard]}>
      <View style={styles.vehicleHeader}>
        <View style={styles.carIconContainer}>
          <MaterialCommunityIcons name="car-side" size={28} color="#007AFF" />
        </View>
        <View style={styles.vehicleTitle}>
          <Text style={styles.vehicleBrand}>{vehicle.brand}</Text>
          <Text style={styles.vehicleModel}>{vehicle.modelName}</Text>
          <Text style={styles.vehiclePlate}>{vehicle.plateNumber}</Text>
        </View>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => handleSetFavorite(vehicle._id)}
        >
          <MaterialCommunityIcons 
            name={vehicle.isFavorite ? 'star' : 'star-outline'} 
            size={24} 
            color={vehicle.isFavorite ? '#FFD700' : '#ccc'} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            Alert.alert(
              'Araç Sil',
              'Bu aracı silmek istediğinizden emin misiniz?',
              [
                { text: 'İptal', style: 'cancel' },
                { text: 'Sil', onPress: () => handleDeleteVehicle(vehicle._id), style: 'destructive' }
              ]
            );
          }}
        >
          <MaterialCommunityIcons name="delete-outline" size={22} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.vehicleDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailLabelContainer}>
            <MaterialCommunityIcons name="package-variant" size={16} color="#666" />
            <Text style={styles.detailLabel}>Paket</Text>
          </View>
          <Text style={styles.detailValue}>{vehicle.package}</Text>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailLabelContainer}>
            <MaterialCommunityIcons name="calendar" size={16} color="#666" />
            <Text style={styles.detailLabel}>Yıl</Text>
          </View>
          <Text style={styles.detailValue}>{vehicle.year}</Text>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailLabelContainer}>
            <MaterialCommunityIcons name="gas-station" size={16} color="#666" />
            <Text style={styles.detailLabel}>Yakıt</Text>
          </View>
          <Text style={styles.detailValue}>{vehicle.fuelType}</Text>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailLabelContainer}>
            <MaterialCommunityIcons name="car-shift-pattern" size={16} color="#666" />
            <Text style={styles.detailLabel}>Vites</Text>
          </View>
          <Text style={styles.detailValue}>{vehicle.transmission}</Text>
        </View>
        <OdometerSummary
          estimate={vehicle.odometerEstimate}
          verification={vehicle.odometerVerification}
          onUpdatePress={() => handleOpenOdometerModal(vehicle._id)}
          hasOfflineSubmission={Boolean(pendingQueue[vehicle._id])}
        />
      </View>
    </View>
  );

  if (loading && vehicles.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Background>
          <LoadingSkeleton variant="list" count={3} />
        </Background>
      </SafeAreaView>
    );
  }

  if (error && vehicles.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Background>
          <ErrorState
            message={error}
            onRetry={fetchVehicles}
            title="Yükleme Hatası"
          />
        </Background>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex:1}}>
      <Background>
        <ScrollView style={{flex:1}} contentContainerStyle={{paddingBottom: 100}} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <BackButton />
              <Text style={styles.title}>Garajım</Text>
              <View style={{ width: 40 }} />
            </View>
            <TouchableOpacity
              style={[styles.addButton, !token && styles.disabledButton]}
              onPress={() => setShowAddModal(true)}
              disabled={!token}
            >
              <MaterialCommunityIcons name="plus" size={24} color={token ? "#fff" : "#ccc"} />
              <Text style={[styles.addButtonText, !token && styles.disabledButtonText]}>Yeni Araç Ekle</Text>
            </TouchableOpacity>
          </View>

          {token && (
            <View style={styles.statusSection}>
              <Text style={styles.statusSectionTitle}>Araç Durumu Özeti</Text>
              {statusLoading ? (
                <View style={[styles.statusCard, styles.statusCardCentered]}>
                  <ActivityIndicator color="#007AFF" />
                  <Text style={[styles.statusLoadingText, { marginLeft: 12 }]}>
                    Araç durumu yükleniyor...
                  </Text>
                </View>
              ) : statusError ? (
                <TouchableOpacity style={[styles.statusCard, styles.statusCardError]} onPress={fetchVehicleStatus}>
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={22}
                    color="#FF3B30"
                    style={{ marginRight: 12 }}
                  />
                  <View style={styles.statusErrorContent}>
                    <Text style={styles.statusErrorText}>{statusError}</Text>
                    <Text style={styles.statusHintText}>Tekrar denemek için dokunun</Text>
                  </View>
                  <MaterialCommunityIcons
                    name="refresh"
                    size={22}
                    color="#FF3B30"
                    style={{ marginLeft: 12 }}
                  />
                </TouchableOpacity>
              ) : vehicleStatus ? (
                <View
                  style={[
                    styles.statusCard,
                    {
                      backgroundColor: vehicleStatusPresentation.cardBackgroundColor,
                      borderColor: vehicleStatusPresentation.cardBorderColor,
                    },
                  ]}
                >
                  <View style={styles.statusCardHeader}>
                    <View>
                      <Text style={styles.statusLabel}>Genel Durum</Text>
                      <Text style={styles.statusValue}>{vehicleStatusPresentation.label}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: vehicleStatusPresentation.badgeColor },
                      ]}
                    >
                      <MaterialCommunityIcons name={vehicleStatusPresentation.icon} size={20} color="#fff" />
                    </View>
                  </View>

                  <View style={styles.statusInfoRow}>
                    <View style={styles.statusInfoItem}>
                      <MaterialCommunityIcons
                        name="calendar-check"
                        size={18}
                        color="#666"
                        style={styles.statusInfoIcon}
                      />
                      <View style={styles.statusInfoText}>
                        <Text style={styles.statusInfoLabel}>Son Kontrol</Text>
                        <Text style={styles.statusInfoValue}>
                          {formatDateValue(vehicleStatus.lastCheck ?? null) ?? '—'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusInfoItem, styles.statusInfoItemLast]}>
                      <MaterialCommunityIcons
                        name="calendar-plus"
                        size={18}
                        color="#666"
                        style={styles.statusInfoIcon}
                      />
                      <View style={styles.statusInfoText}>
                        <Text style={styles.statusInfoLabel}>Sonraki Servis</Text>
                        <Text style={styles.statusInfoValue}>
                          {formatDateValue(vehicleStatus.nextServiceDate ?? null) ?? '—'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.statusInfoRow}>
                    <View style={styles.statusInfoItem}>
                      <MaterialCommunityIcons
                        name="speedometer"
                        size={18}
                        color="#666"
                        style={styles.statusInfoIcon}
                      />
                      <View style={styles.statusInfoText}>
                        <Text style={styles.statusInfoLabel}>Kilometre</Text>
                        <Text style={styles.statusInfoValue}>
                          {typeof vehicleStatus.mileage === 'number'
                            ? `${vehicleStatus.mileage.toLocaleString('tr-TR')} km`
                            : '—'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusInfoItem, styles.statusInfoItemLast]}>
                      <MaterialCommunityIcons
                        name="wrench"
                        size={18}
                        color="#666"
                        style={styles.statusInfoIcon}
                      />
                      <View style={styles.statusInfoText}>
                        <Text style={styles.statusInfoLabel}>Kontroller</Text>
                        <Text style={styles.statusInfoValue}>
                          {Array.isArray(vehicleStatus.issues) && vehicleStatus.issues.length > 0
                            ? `${vehicleStatus.issues.length} madde`
                            : 'Sorun yok'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {Array.isArray(vehicleStatus.issues) && vehicleStatus.issues.length > 0 && (
                    <View style={styles.statusIssues}>
                      {vehicleStatus.issues.slice(0, 4).map((issue: string, index: number) => (
                        <View key={`${issue}-${index}`} style={styles.statusIssueChip}>
                          <MaterialCommunityIcons
                            name="alert-circle-outline"
                            size={16}
                            color="#FF9500"
                            style={styles.statusIssueIcon}
                          />
                          <Text style={styles.statusIssueText}>{issue}</Text>
                        </View>
                      ))}
                      {vehicleStatus.issues.length > 4 && (
                        <Text style={styles.statusIssueMoreText}>
                          +{vehicleStatus.issues.length - 4} daha
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <TouchableOpacity style={[styles.statusCard, styles.statusCardEmpty]} onPress={fetchVehicleStatus}>
                  <MaterialCommunityIcons
                    name="information-outline"
                    size={22}
                    color="#007AFF"
                    style={{ marginRight: 12 }}
                  />
                  <View style={styles.statusErrorContent}>
                    <Text style={styles.statusErrorText}>Araç durumu bilgisi bulunamadı.</Text>
                    <Text style={styles.statusHintText}>Verileri yenilemek için dokunun</Text>
                  </View>
                  <MaterialCommunityIcons
                    name="refresh"
                    size={22}
                    color="#007AFF"
                    style={{ marginLeft: 12 }}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {vehicles.length === 0 ? (
            <EmptyState
              icon="car-outline"
              title={!token ? 'Oturum Gerekli' : 'Henüz Araç Eklenmemiş'}
              subtitle={!token ? 'Araç eklemek için lütfen oturum açın.' : 'Yeni bir araç eklemek için "Yeni Araç Ekle" butonuna tıklayın.'}
              actionText={token ? 'Araç Ekle' : undefined}
              onActionPress={token ? () => setShowAddModal(true) : undefined}
            />
          ) : (
            <View style={styles.vehiclesContainer}>
              {vehicles.map(renderVehicleCard)}
            </View>
          )}

          {/* Araç Ekleme Modal */}
          <Modal
            visible={showAddModal}
            animationType="slide"
            transparent={true}
            onRequestClose={handleCloseModal}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoidingView}
                  >
                    <View style={styles.modalContainer}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Yeni Araç Ekle</Text>
                        <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                          <MaterialCommunityIcons name="close" size={24} color="#1a1a1a" />
                        </TouchableOpacity>
                      </View>

                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressStep}>
                    <View style={[styles.progressDot, formData.brand && styles.progressDotActive]}>
                      <Text style={[styles.progressDotText, formData.brand && styles.progressDotTextActive]}>1</Text>
                    </View>
                    <Text style={[styles.progressLabel, formData.brand && styles.progressLabelActive]}>Marka</Text>
                  </View>
                  <View style={[styles.progressLine, formData.brand && styles.progressLineActive]} />
                  <View style={styles.progressStep}>
                    <View style={[styles.progressDot, formData.model && styles.progressDotActive]}>
                      <Text style={[styles.progressDotText, formData.model && styles.progressDotTextActive]}>2</Text>
                    </View>
                    <Text style={[styles.progressLabel, formData.model && styles.progressLabelActive]}>Model</Text>
                  </View>
                  <View style={[styles.progressLine, formData.model && styles.progressLineActive]} />
                  <View style={styles.progressStep}>
                    <View style={[styles.progressDot, formData.package && formData.fuelType && formData.transmission && styles.progressDotActive]}>
                      <Text style={[styles.progressDotText, formData.package && formData.fuelType && formData.transmission && styles.progressDotTextActive]}>3</Text>
                    </View>
                    <Text style={[styles.progressLabel, formData.package && formData.fuelType && formData.transmission && styles.progressLabelActive]}>Özellikler</Text>
                  </View>
                  <View style={[styles.progressLine, formData.package && formData.fuelType && formData.transmission && styles.progressLineActive]} />
                  <View style={styles.progressStep}>
                    <View style={[styles.progressDot, formData.year && formData.plateNumber && styles.progressDotActive]}>
                      <Text style={[styles.progressDotText, formData.year && formData.plateNumber && styles.progressDotTextActive]}>4</Text>
                    </View>
                    <Text style={[styles.progressLabel, formData.year && formData.plateNumber && styles.progressLabelActive]}>Detay</Text>
                  </View>
                </View>
                
                <ScrollView 
                  ref={scrollViewRef}
                  style={styles.modalContent} 
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Marka Seçimi */}
                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Text style={styles.inputLabel}>Marka</Text>
                      {formData.brand && <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />}
                    </View>
                    <View style={styles.searchInputContainer}>
                      <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Marka ara (örn: Ford, Audi)"
                        placeholderTextColor="#999"
                        value={brandSearch}
                        onChangeText={setBrandSearch}
                        autoCapitalize="none"
                      />
                      {brandSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setBrandSearch('')}>
                          <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                      )}
                    </View>
                    {formData.brand && (
                      <View style={styles.selectedValueContainer}>
                        <Text style={styles.selectedValueLabel}>Seçilen:</Text>
                        <Text style={styles.selectedValue}>{formData.brand}</Text>
                      </View>
                    )}
                    <ScrollView 
                      style={styles.pickerScrollContainer} 
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={false}
                    >
                      <View style={styles.pickerContainer}>
                        {filteredBrands.length > 0 ? (
                          filteredBrands.map((brand, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.pickerItem,
                                formData.brand === brand.brand && styles.pickerItemSelected
                              ]}
                              onPress={() => {
                                handleBrandChange(brand.brand);
                                setBrandSearch('');
                              }}
                            >
                              <Text style={[
                                styles.pickerItemText,
                                formData.brand === brand.brand && styles.pickerItemTextSelected
                              ]}>
                                {brand.brand}
                              </Text>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <Text style={styles.noResultText}>Sonuç bulunamadı</Text>
                        )}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Model Seçimi */}
                  {formData.brand && (
                    <View style={styles.inputGroup}>
                      <View style={styles.labelContainer}>
                        <Text style={styles.inputLabel}>Model</Text>
                        {formData.model && <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />}
                      </View>
                      <View style={styles.searchInputContainer}>
                        <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Model ara (örn: Focus, Corolla)"
                          placeholderTextColor="#999"
                          value={modelSearch}
                          onChangeText={setModelSearch}
                          autoCapitalize="none"
                        />
                        {modelSearch.length > 0 && (
                          <TouchableOpacity onPress={() => setModelSearch('')}>
                            <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
                          </TouchableOpacity>
                        )}
                      </View>
                      {formData.model && (
                        <View style={styles.selectedValueContainer}>
                          <Text style={styles.selectedValueLabel}>Seçilen:</Text>
                          <Text style={styles.selectedValue}>{formData.model}</Text>
                        </View>
                      )}
                      <ScrollView 
                        style={styles.pickerScrollContainer} 
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={false}
                      >
                        <View style={styles.pickerContainer}>
                          {filteredModels.length > 0 ? (
                            filteredModels.map((model, index) => (
                              <TouchableOpacity
                                key={index}
                                style={[
                                  styles.pickerItem,
                                  formData.model === model.name && styles.pickerItemSelected
                                ]}
                                onPress={() => {
                                  handleModelChange(model.name);
                                  setModelSearch('');
                                }}
                              >
                                <Text style={[
                                  styles.pickerItemText,
                                  formData.model === model.name && styles.pickerItemTextSelected
                                ]}>
                                  {model.name}
                                </Text>
                              </TouchableOpacity>
                            ))
                          ) : (
                            <Text style={styles.noResultText}>Sonuç bulunamadı</Text>
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  )}

                  {/* Paket, Yakıt ve Vites */}
                  {formData.model && (
                    <>
                      <View style={styles.inputGroup}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>Paket</Text>
                          {formData.package && <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />}
                        </View>
                        {formData.package && (
                          <View style={styles.selectedValueContainer}>
                            <Text style={styles.selectedValueLabel}>Seçilen:</Text>
                            <Text style={styles.selectedValue}>{formData.package}</Text>
                          </View>
                        )}
                        <ScrollView 
                          style={styles.pickerScrollContainer} 
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={false}
                        >
                          <View style={styles.pickerContainer}>
                            {availablePackages.map((packageName, index) => (
                              <TouchableOpacity
                                key={index}
                                style={[
                                  styles.pickerItem,
                                  formData.package === packageName && styles.pickerItemSelected
                                ]}
                                onPress={() => handlePackageChange(packageName)}
                              >
                                <Text style={[
                                  styles.pickerItemText,
                                  formData.package === packageName && styles.pickerItemTextSelected
                                ]}>
                                  {packageName}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>
                      </View>

                      <View style={styles.inputGroup}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>Yakıt Türü</Text>
                          {formData.fuelType && <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />}
                        </View>
                        {formData.fuelType && (
                          <View style={styles.selectedValueContainer}>
                            <Text style={styles.selectedValueLabel}>Seçilen:</Text>
                            <Text style={styles.selectedValue}>{formData.fuelType}</Text>
                          </View>
                        )}
                        <View style={styles.pickerContainer}>
                          {availableFuelTypes.map((fuelType, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.pickerItem,
                                formData.fuelType === fuelType && styles.pickerItemSelected
                              ]}
                              onPress={() => handleFuelTypeChange(fuelType)}
                            >
                              <Text style={[
                                styles.pickerItemText,
                                formData.fuelType === fuelType && styles.pickerItemTextSelected
                              ]}>
                                {fuelType}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>Vites Türü</Text>
                          {formData.transmission && <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />}
                        </View>
                        {formData.transmission && (
                          <View style={styles.selectedValueContainer}>
                            <Text style={styles.selectedValueLabel}>Seçilen:</Text>
                            <Text style={styles.selectedValue}>{formData.transmission}</Text>
                          </View>
                        )}
                        <View style={styles.pickerContainer}>
                          {availableTransmissions.map((transmission, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.pickerItem,
                                formData.transmission === transmission && styles.pickerItemSelected
                              ]}
                              onPress={() => handleTransmissionChange(transmission)}
                            >
                              <Text style={[
                                styles.pickerItemText,
                                formData.transmission === transmission && styles.pickerItemTextSelected
                              ]}>
                                {transmission}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </>
                  )}

                  {/* Yıl, Kilometre, Plaka */}
                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Text style={styles.inputLabel}>Yıl</Text>
                      {formData.year && <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />}
                    </View>
                    <TextInput
                      style={[styles.textInput, formErrors.year && styles.textInputError]}
                      placeholder="2024"
                      placeholderTextColor="#999"
                      value={formData.year}
                      onChangeText={(text) => {
                        setFormData(prev => ({ ...prev, year: text }));
                        if (formErrors.year) {
                          setFormErrors(prev => ({ ...prev, year: '' }));
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={4}
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    {formErrors.year && (
                      <Text style={styles.errorText}>{formErrors.year}</Text>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Text style={styles.inputLabel}>Kilometre (İsteğe bağlı)</Text>
                      {formData.mileage && <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />}
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="150000"
                      placeholderTextColor="#999"
                      value={formData.mileage}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, mileage: text }))}
                      keyboardType="numeric"
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Text style={styles.inputLabel}>Plaka Numarası</Text>
                      {formData.plateNumber && <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />}
                    </View>
                    <TextInput
                      style={[styles.textInput, formErrors.plateNumber && styles.textInputError]}
                      placeholder="34ABC123"
                      placeholderTextColor="#999"
                      value={formData.plateNumber}
                      onChangeText={(text) => {
                        setFormData(prev => ({ ...prev, plateNumber: text.toUpperCase() }));
                        if (formErrors.plateNumber) {
                          setFormErrors(prev => ({ ...prev, plateNumber: '' }));
                        }
                      }}
                      autoCapitalize="characters"
                      maxLength={9}
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    {formErrors.plateNumber && (
                      <Text style={styles.errorText}>{formErrors.plateNumber}</Text>
                    )}
                  </View>
                </ScrollView>
                
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCloseModal}>
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
                    onPress={handleAddVehicle}
                    disabled={submitting}
                  >
                    <Text style={styles.saveButtonText}>
                      {submitting ? 'Ekleniyor...' : 'Araç Ekle'}
                    </Text>
                  </TouchableOpacity>
                </View>
                    </View>
                  </KeyboardAvoidingView>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </ScrollView>
        <OdometerQuickUpdateModal
          visible={odometerModalVisible}
          onClose={handleCloseOdometerModal}
          onSubmit={handleSubmitOdometer}
          submitting={odometerSubmitting}
          errorMessage={odometerError}
          initialKm={
            selectedVehicle?.odometerEstimate?.displayKm ??
            selectedVehicle?.odometerEstimate?.lastTrueKm ??
            selectedVehicle?.mileage
          }
          defaultUnit="km"
          lastVerifiedAt={selectedVehicle?.odometerEstimate?.lastTrueTsUtc}
        />
      </Background>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyStateText: {
    marginTop: 20,
    fontSize: 17,
    color: '#f5f7fa',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
  },
  vehiclesContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  statusSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statusSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  statusCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  statusCardCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLoadingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusCardError: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ffd6d6',
    backgroundColor: '#fff5f5',
    borderWidth: 1.5,
  },
  statusCardEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f9ff',
    borderColor: '#d6e4ff',
    borderWidth: 1.5,
  },
  statusErrorContent: {
    flex: 1,
  },
  statusErrorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusHintText: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  statusCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statusValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusInfoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  statusInfoItemLast: {
    marginRight: 0,
  },
  statusInfoIcon: {
    marginRight: 10,
  },
  statusInfoText: {
    flex: 1,
  },
  statusInfoLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    color: '#666',
  },
  statusInfoValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statusIssues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  statusIssueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1e6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  statusIssueIcon: {
    marginRight: 6,
  },
  statusIssueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b45b00',
  },
  statusIssueMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    alignSelf: 'center',
    marginBottom: 8,
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  carIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#e8f4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleTitle: {
    flex: 1,
    marginLeft: 14,
  },
  vehicleBrand: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  vehicleModel: {
    fontSize: 16,
    color: '#666',
    marginTop: 3,
    fontWeight: '500',
  },
  vehiclePlate: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1,
  },
  deleteButton: {
    padding: 10,
    backgroundColor: '#fff0f0',
    borderRadius: 12,
  },
  vehicleDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 18,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '700',
  },
  favoriteButton: {
    marginHorizontal: 10,
    backgroundColor: '#fff9e6',
    padding: 10,
    borderRadius: 12,
  },
  favoriteCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#fffef8',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowColor: '#ccc',
  },
  disabledButtonText: {
    color: '#999',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    width: '100%',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    minHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecf0',
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8ecf0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
  },
  progressDotText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#999',
  },
  progressDotTextActive: {
    color: '#fff',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
  },
  progressLabelActive: {
    color: '#007AFF',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e8ecf0',
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: '#007AFF',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  selectedValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f4ff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  selectedValueLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 8,
  },
  selectedValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e8ecf0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fafbfc',
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  pickerScrollContainer: {
    maxHeight: 140,
    marginBottom: 8,
  },
  noResultText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  pickerItemSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  pickerItemTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#e8ecf0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fafbfc',
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
    minHeight: 52,
  },
  textInputError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
    backgroundColor: '#fff',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#666',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
});

export default GarageScreen;