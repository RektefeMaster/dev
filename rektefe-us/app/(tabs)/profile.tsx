import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Avatar, Text, Button, List, Divider } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES } from '../../constants/config';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    // Yönlendirme (tabs)/_layout.tsx içinde otomatik yapılacak
  };

  function formatAddress(location: any) {
    if (!location) return '-';
    const { street, building, floor, apartment, neighborhood, district, city } = location;
    return [
      street && `${street}`,
      building && `${building}`,
      floor && `Kat ${floor}`,
      apartment && `Daire ${apartment}`,
      neighborhood,
      district,
      city
    ].filter(Boolean).join(', ');
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Image 
          size={100} 
          source={user?.profileImage ? { uri: user.profileImage } : require('../../assets/images/default_avatar.png')} 
          style={styles.avatar}
        />
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.shopName}>{user?.shopName}</Text>
        <Button 
          mode="contained" 
          onPress={() => router.push('/profile/edit')}
          style={styles.editButton}
        >
          Profili Düzenle
        </Button>
      </View>

      <View style={styles.content}>
        <List.Section>
          <List.Subheader style={styles.subheader}>Kişisel Bilgiler</List.Subheader>
          <List.Item
            title={`Ad Soyad: ${user?.name || ''} ${user?.surname || ''}`}
            left={props => <List.Icon {...props} icon="account" />}
          />
          <List.Item
            title={`Telefon: ${user?.phone || '-'}`}
            left={props => <List.Icon {...props} icon="phone" />}
          />
          <List.Item
            title={`E-posta: ${user?.email || '-'}`}
            left={props => <List.Icon {...props} icon="email" />}
          />
        </List.Section>
        <Divider />
        <List.Section>
          <List.Subheader style={styles.subheader}>Dükkan Bilgileri</List.Subheader>
          <List.Item
            title={`Dükkan Adı: ${user?.shopName || '-'}`}
            left={props => <List.Icon {...props} icon="store" />}
          />
          <List.Item
            title={`Açıklama: ${user?.bio || '-'}`}
            left={props => <List.Icon {...props} icon="text" />}
          />
          <List.Item
            title={`Servis Kategorileri: ${(user?.serviceCategories || []).join(', ')}`}
            left={props => <List.Icon {...props} icon="wrench" />}
          />
        </List.Section>
        <Divider />
        <List.Section>
          <List.Subheader style={styles.subheader}>Adres Bilgileri</List.Subheader>
          <List.Item
            title={formatAddress(user?.location)}
            left={props => <List.Icon {...props} icon="map-marker" />}
          />
        </List.Section>
        <Divider />
        <List.Section>
          <List.Subheader style={styles.subheader}>Çalışma Saatleri</List.Subheader>
          {user?.workingHours && Object.entries(user.workingHours).map(([day, val]: any) => (
            <List.Item
              key={day}
              title={`${day.charAt(0).toUpperCase() + day.slice(1)}: ${val.isOpen ? `${val.open} - ${val.close}` : 'Kapalı'}`}
              left={props => <List.Icon {...props} icon="clock" />}
            />
          ))}
        </List.Section>
        <Divider />

        <List.Section>
          <List.Subheader style={styles.subheader}>Hesap Ayarları</List.Subheader>
          <List.Item
            title="Kişisel Bilgiler"
            left={props => <List.Icon {...props} icon="account-edit" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => console.log('Kişisel Bilgiler')}
          />
          <List.Item
            title="Dükkan Bilgileri"
            left={props => <List.Icon {...props} icon="store-edit" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => console.log('Dükkan Bilgileri')}
          />
           <List.Item
            title="Çalışma Saatleri"
            left={props => <List.Icon {...props} icon="clock-edit" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => console.log('Çalışma Saatleri')}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader style={styles.subheader}>Diğer</List.Subheader>
          <List.Item
            title="Yardım & Destek"
            left={props => <List.Icon {...props} icon="help-circle" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => console.log('Yardım')}
          />
          <List.Item
            title="Hakkında"
            left={props => <List.Icon {...props} icon="information" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => console.log('Hakkında')}
          />
        </List.Section>

        <Button 
          mode="outlined" 
          onPress={handleLogout} 
          style={styles.logoutButton}
          textColor={COLORS.error}
        >
          Çıkış Yap
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    paddingVertical: SIZES.padding * 2,
    borderBottomLeftRadius: SIZES.radius * 2,
    borderBottomRightRadius: SIZES.radius * 2,
    marginBottom: SIZES.padding,
  },
  avatar: {
    marginBottom: SIZES.padding,
  },
  name: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  shopName: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    marginBottom: SIZES.padding,
  },
  editButton: {
    backgroundColor: COLORS.primary,
  },
  content: {
    paddingHorizontal: SIZES.padding,
  },
  subheader: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  logoutButton: {
    marginTop: SIZES.padding * 2,
    borderColor: COLORS.error,
    borderWidth: 1,
  }
}); 