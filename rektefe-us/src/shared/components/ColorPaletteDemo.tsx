import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/shared/context';

const ColorPaletteDemo = () => {
  const { isDark, themeColors, palette } = useTheme();

  const renderColorSwatch = (name: string, color: string, description: string) => (
    <View key={name} style={styles.colorSwatch}>
      <View style={[styles.colorBox, { backgroundColor: color }]} />
      <View style={styles.colorInfo}>
        <Text style={[styles.colorName, { color: themeColors.text }]}>{name}</Text>
        <Text style={[styles.colorCode, { color: themeColors.text }]}>{color}</Text>
        <Text style={[styles.colorDescription, { color: themeColors.text }]}>{description}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>
        Rektefe-US Renk Paleti Demo
      </Text>
      
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
        Dark Tema (31 ile biten renkler)
      </Text>
      {renderColorSwatch('Dark Blue', palette.darkBlue, 'Orta mavi - vurgu rengi')}
      {renderColorSwatch('Dark Blue Deep', palette.darkBlueDeep, 'Koyu mavi - kart arka planı')}
      {renderColorSwatch('Dark Blue Very', palette.darkBlueVery, 'Çok koyu mavi - ana arka plan')}
      {renderColorSwatch('Dark Blue Almost', palette.darkBlueAlmost, 'Neredeyse siyah - gölge')}
      {renderColorSwatch('Dark Gray', palette.darkGray, 'Koyu gri - yüzey')}
      {renderColorSwatch('Dark Brown', palette.darkBrown, 'Altın kahverengi - vurgu')}

      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
        Light Tema (29 ile biten renkler)
      </Text>
      {renderColorSwatch('Light Gray Light', palette.lightGrayLight, 'Açık gri - tab ikonu')}
      {renderColorSwatch('Light Gray Medium Dark', palette.lightGrayMediumDark, 'Orta koyu gri - ikon')}
      {renderColorSwatch('Light Gray Dark', palette.lightGrayDark, 'Koyu gri')}
      {renderColorSwatch('Light Gray Very', palette.lightGrayVery, 'Çok koyu gri - ana metin')}
      {renderColorSwatch('Light Brown', palette.lightBrown, 'Sıcak kahverengi - vurgu')}
      {renderColorSwatch('Light Gray Beige', palette.lightGrayBeige, 'Açık gri-bej - gölge')}

      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
        Ortak Renkler (28 ile biten)
      </Text>
      {renderColorSwatch('Common Blue Very', palette.commonBlueVery, 'Çok koyu lacivert')}
      {renderColorSwatch('Common Blue', palette.commonBlue, 'Orta mavi - ana renk')}
      {renderColorSwatch('Common Blue Light', palette.commonBlueLight, 'Açık mavi-gri - bilgi')}
      {renderColorSwatch('Common Gray', palette.commonGray, 'Çok açık gri')}
      {renderColorSwatch('Common Brown', palette.commonBrown, 'Orta kahverengi - ikincil')}
      {renderColorSwatch('Common Peach', palette.commonPeach, 'Açık şeftali')}

      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
        Tema Renkleri
      </Text>
      {renderColorSwatch('Text', themeColors.text, 'Ana metin rengi')}
      {renderColorSwatch('Background', themeColors.background, 'Ana arka plan')}
      {renderColorSwatch('Card', themeColors.card, 'Kart arka planı')}
      {renderColorSwatch('Surface', themeColors.surface, 'Yüzey rengi')}
      {renderColorSwatch('Border', themeColors.border, 'Kenarlık rengi')}
      {renderColorSwatch('Shadow', themeColors.shadow, 'Gölge rengi')}
      {renderColorSwatch('Accent', themeColors.accent, 'Vurgu rengi')}
      {renderColorSwatch('Divider', themeColors.divider, 'Ayırıcı rengi')}
      {renderColorSwatch('Tint', themeColors.tint, 'Tint rengi')}
      {renderColorSwatch('Icon', themeColors.icon, 'İkon rengi')}
      {renderColorSwatch('Tab Icon Default', themeColors.tabIconDefault, 'Varsayılan tab ikonu')}
      {renderColorSwatch('Tab Icon Selected', themeColors.tabIconSelected, 'Seçili tab ikonu')}
      {renderColorSwatch('Card Border', themeColors.cardBorder, 'Kart kenarlığı')}

      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    paddingBottom: 5,
  },
  colorSwatch: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  colorBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#D3DBE0',
  },
  colorInfo: {
    flex: 1,
  },
  colorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  colorCode: {
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  colorDescription: {
    fontSize: 12,
    opacity: 0.7,
  },
});

export default ColorPaletteDemo;
