import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/config';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState((prevState) => ({
      error,
      errorInfo,
      retryCount: prevState.retryCount + 1,
    }));

    // Log error for debugging
    this.logError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private async logError(error: Error, errorInfo: ErrorInfo) {
    try {
      const errorLog = {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        errorInfo: {
          componentStack: errorInfo.componentStack,
        },
        timestamp: new Date().toISOString(),
        retryCount: this.state.retryCount,
        userAgent: 'React Native Driver App',
        appVersion: '1.0.0',
      };

      // Store error log for later reporting
      const existingLogs = await AsyncStorage.getItem(STORAGE_KEYS.ERROR_LOGS);
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(errorLog);
      
      // Keep only last 10 error logs
      if (logs.length > 10) {
        logs.splice(0, logs.length - 10);
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.ERROR_LOGS, JSON.stringify(logs));

      // In production, this could be sent to an error reporting service
      if (!__DEV__) {
        }
    } catch (logError) {
      }
  }

  private handleRestart = () => {
    // If too many retries, suggest clearing data
    if (this.state.retryCount >= 3) {
      Alert.alert(
        'Sürekli Hata',
        'Uygulama sürekli hata veriyor. Uygulama verilerini temizlemek ister misiniz?',
        [
          { text: 'Hayır', style: 'cancel', onPress: this.doRestart },
          { text: 'Veri Temizle', style: 'destructive', onPress: this.handleClearData },
        ]
      );
    } else {
      this.doRestart();
    }
  };

  private doRestart = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleClearData = async () => {
    try {
      // Clear sensitive data but keep error logs for debugging
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.TOKEN_ISSUED_AT,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.USER_DATA_LEGACY,
        STORAGE_KEYS.ONBOARDING_COMPLETED,
      ]);
      
      Alert.alert(
        'Veriler Temizlendi',
        'Uygulama verileri temizlendi. Uygulama yeniden başlatılacak.',
        [{ text: 'Tamam', onPress: this.doRestart }]
      );
    } catch (error) {
      this.doRestart();
    }
  };

  private handleShowDetails = () => {
    if (this.state.error) {
      const errorDetails = `
Hata: ${this.state.error.name}
Mesaj: ${this.state.error.message}
Zaman: ${new Date().toLocaleString('tr-TR')}
Deneme Sayısı: ${this.state.retryCount}

Stack Trace:
${this.state.error.stack}
${__DEV__ ? `\nComponent Stack:\n${this.state.errorInfo?.componentStack}` : ''}
      `;

      Alert.alert(
        'Hata Detayları',
        errorDetails,
        [
          { text: 'Tamam', style: 'default' },
          ...__DEV__ ? [{ 
            text: 'Konsola Yazdır', 
            onPress: () => console.log('Error Details:', errorDetails) 
          }] : [],
        ]
      );
    }
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons 
              name="alert-circle-outline" 
              size={80} 
              color="#EF4444" 
            />
            
            <Text style={styles.title}>Bir Hata Oluştu</Text>
            
            <Text style={styles.message}>
              Üzgünüz, beklenmeyen bir hata oluştu. Lütfen uygulamayı yeniden başlatmayı deneyin.
            </Text>

            {this.state.retryCount > 1 && (
              <Text style={styles.retryInfo}>
                Deneme sayısı: {this.state.retryCount}
                {this.state.retryCount >= 3 && ' (Veri temizleme öneriliyor)'}
              </Text>
            )}

            <View style={styles.buttonContainer}>
              <Pressable
                style={[styles.button, styles.primaryButton]}
                onPress={this.handleRestart}
              >
                <MaterialCommunityIcons name="restart" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  {this.state.retryCount >= 3 ? 'Veri Temizle ve Başlat' : 'Yeniden Başlat'}
                </Text>
              </Pressable>

              {__DEV__ && (
                <Pressable
                  style={[styles.button, styles.secondaryButton]}
                  onPress={this.handleShowDetails}
                >
                  <MaterialCommunityIcons name="information-outline" size={20} color="#6B7280" />
                  <Text style={styles.secondaryButtonText}>Detayları Göster</Text>
                </Pressable>
              )}

              {this.state.retryCount >= 2 && this.state.retryCount < 3 && (
                <Pressable
                  style={[styles.button, styles.warningButton]}
                  onPress={this.handleClearData}
                >
                  <MaterialCommunityIcons name="delete-outline" size={20} color="#F59E0B" />
                  <Text style={styles.warningButtonText}>Veri Temizle</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  retryInfo: {
    fontSize: 14,
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  warningButton: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningButtonText: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
