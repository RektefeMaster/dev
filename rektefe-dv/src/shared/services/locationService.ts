import { Alert, Platform, PermissionsAndroid } from 'react-native';
import Geolocation, { GeoPosition } from 'react-native-geolocation-service';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

class LocationService {
  private static instance: LocationService;
  private currentLocation: UserLocation | null = null;
  private permissionStatus: LocationPermissionStatus | null = null;

  private constructor() {}

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Konum izni iste (platforma göre). Başarısız olursa denied döner.
   */
  public async requestLocationPermission(): Promise<LocationPermissionStatus> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Konum Erişimi İzni',
            message: 'Yakındaki ustaları göstermek için konumunuza erişmemiz gerekiyor.',
            buttonPositive: 'Tamam',
            buttonNegative: 'İptal',
          }
        );
        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        this.permissionStatus = {
          granted: isGranted,
          canAskAgain: true,
          status: isGranted ? 'granted' : 'denied',
        };
        return this.permissionStatus;
      } else {
        const auth = await Geolocation.requestAuthorization('whenInUse');
        const isGranted = auth === 'granted';
        this.permissionStatus = {
          granted: isGranted,
          canAskAgain: true,
          status: isGranted ? 'granted' : auth === 'denied' ? 'denied' : 'undetermined',
        };
        return this.permissionStatus;
      }
    } catch (error) {
      this.permissionStatus = {
        granted: false,
        canAskAgain: false,
        status: 'denied'
      };
      return this.permissionStatus;
    }
  }

  /**
   * Mevcut konumu al. Başarısız olursa null döner.
   */
  public async getCurrentLocation(): Promise<UserLocation | null> {
    try {
      // İzin yoksa iste
      if (!this.permissionStatus?.granted) {
        await this.requestLocationPermission();
      }

      if (!this.permissionStatus?.granted) {
        return null;
      }

      const position: GeoPosition = await new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          pos => resolve(pos),
          err => reject(err),
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000,
            forceRequestLocation: true,
            showLocationDialog: true,
          }
        );
      });

      this.currentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };
      return this.currentLocation;
    } catch (error) {
      return null;
    }
  }

  /**
   * Son alınan konumu getir
   */
  public getLastKnownLocation(): UserLocation | null {
    return this.currentLocation;
  }

  /**
   * Konum izin durumunu getir
   */
  public getPermissionStatus(): LocationPermissionStatus | null {
    return this.permissionStatus;
  }

  /**
   * Konum izni verilmiş mi?
   */
  public hasLocationPermission(): boolean {
    return this.permissionStatus?.granted || false;
  }

  /**
   * Konum iznini sıfırla
   */
  public async resetLocationPermission(): Promise<void> {
    this.permissionStatus = null;
    this.currentLocation = null;
    await this.requestLocationPermission();
  }
}

export default LocationService;
