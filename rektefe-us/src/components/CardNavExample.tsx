import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { CardNav } from './index';

const CardNavExample = () => {
  const navItems = [
    {
      id: 'services',
      label: 'Servisler',
      bgColor: '#3B82F6',
      textColor: '#FFFFFF',
      links: [
        {
          label: 'Motor Servisi',
          onPress: () => Alert.alert('Motor Servisi', 'Motor servisi seçildi'),
        },
        {
          label: 'Fren Sistemi',
          onPress: () => Alert.alert('Fren Sistemi', 'Fren sistemi seçildi'),
        },
        {
          label: 'Elektrik',
          onPress: () => Alert.alert('Elektrik', 'Elektrik servisi seçildi'),
        },
      ],
    },
    {
      id: 'appointments',
      label: 'Randevular',
      bgColor: '#10B981',
      textColor: '#FFFFFF',
      links: [
        {
          label: 'Bugünkü Randevular',
          onPress: () => Alert.alert('Bugünkü Randevular', 'Bugünkü randevular gösteriliyor'),
        },
        {
          label: 'Gelecek Randevular',
          onPress: () => Alert.alert('Gelecek Randevular', 'Gelecek randevular gösteriliyor'),
        },
        {
          label: 'Randevu Oluştur',
          onPress: () => Alert.alert('Randevu Oluştur', 'Yeni randevu oluşturuluyor'),
        },
      ],
    },
    {
      id: 'financial',
      label: 'Finansal',
      bgColor: '#F59E0B',
      textColor: '#FFFFFF',
      links: [
        {
          label: 'Gelir Raporu',
          onPress: () => Alert.alert('Gelir Raporu', 'Gelir raporu açılıyor'),
        },
        {
          label: 'Ödemeler',
          onPress: () => Alert.alert('Ödemeler', 'Ödemeler gösteriliyor'),
        },
        {
          label: 'Faturalar',
          onPress: () => Alert.alert('Faturalar', 'Faturalar listeleniyor'),
        },
      ],
    },
  ];

  const handleItemPress = (item: any) => {
    console.log('Ana kategori seçildi:', item.label);
  };

  const handleLinkPress = (link: any) => {
    console.log('Alt link seçildi:', link.label);
  };

  const handleCtaPress = () => {
    Alert.alert('Başlayalım', 'Yeni işlem başlatılıyor...');
  };

  return (
    <View style={styles.container}>
      <CardNav
        logoAlt="Rektefe"
        items={navItems}
        onItemPress={handleItemPress}
        onLinkPress={handleLinkPress}
        onCtaPress={handleCtaPress}
        ctaText="Başlayalım"
        baseColor="#FFFFFF"
        menuColor="#1F2937"
        buttonBgColor="#3B82F6"
        buttonTextColor="#FFFFFF"
        maxItems={3}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
});

export default CardNavExample;
