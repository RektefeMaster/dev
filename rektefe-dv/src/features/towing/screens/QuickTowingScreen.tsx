import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import Background from '@/shared/components/Background';
// import { EmergencyTowingButton } from '../components/EmergencyTowingButton';
import { QuickTowingOptions } from '../components/QuickTowingOptions';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const QuickTowingScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <Background>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons 
              name="truck" 
              size={32} 
              color={theme.colors.error.main} 
            />
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Hızlı Çekici Çağırma
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
              Durumunuza en uygun seçeneği seçin
            </Text>
          </View>

          {/* Emergency Button */}
          <View style={styles.emergencySection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              🚨 Acil Durum
            </Text>
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={() => navigation.navigate('EmergencyTowing' as never)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons 
                name="phone-alert" 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.emergencyButtonText}>
                ACİL ÇEKİCİ ÇAĞIR
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Options */}
          <QuickTowingOptions />

          {/* Info Section */}
          <View style={[
            styles.infoSection,
            { 
              backgroundColor: theme.colors.background.card,
              borderColor: theme.colors.border.primary,
            }
          ]}>
            <MaterialCommunityIcons 
              name="information" 
              size={24} 
              color={theme.colors.primary.main} 
            />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: theme.colors.text.primary }]}>
                Hızlı Çekici Sistemi
              </Text>
              <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
                • Otomatik konum algılama{'\n'}
                • Araç bilgileri otomatik doldurma{'\n'}
                • En yakın çekici ustalarına anında bildirim{'\n'}
                • 7/24 hizmet
              </Text>
            </View>
          </View>

          {/* Tips Section */}
          <View style={[
            styles.tipsSection,
            { 
              backgroundColor: theme.colors.background.card,
              borderColor: theme.colors.border.primary,
            }
          ]}>
            <MaterialCommunityIcons 
              name="lightbulb-on" 
              size={24} 
              color={theme.colors.warning.main} 
            />
            <View style={styles.tipsContent}>
              <Text style={[styles.tipsTitle, { color: theme.colors.text.primary }]}>
                💡 İpuçları
              </Text>
              <Text style={[styles.tipsText, { color: theme.colors.text.secondary }]}>
                • Acil durumda "Acil Çekici Çağır" butonunu kullanın{'\n'}
                • Ticari araçlar için farklı çekici tipi{'\n'}
                • Konumunuz otomatik algılanır
              </Text>
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 32 }} />
        </ScrollView>
      </Background>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  emergencySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emergencyButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  infoSection: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  tipsSection: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default QuickTowingScreen;
