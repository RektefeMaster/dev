import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const ColorPaletteDemo = () => {
  const { isDark, colors: themeColors } = useTheme();

  const renderColorSwatch = (name: string, color: string, description: string) => (
    <View key={name} style={styles.colorSwatch}>
      <View style={[styles.colorBox, { backgroundColor: color }]} />
      <View style={styles.colorInfo}>
        <Text style={[styles.colorName, { color: themeColors.text.primary }]}>{name}</Text>
        <Text style={[styles.colorCode, { color: themeColors.text.secondary }]}>{color}</Text>
        <Text style={[styles.colorDescription, { color: themeColors.text.tertiary }]}>{description}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background.primary }]}>
      <Text style={[styles.title, { color: themeColors.text.primary }]}>
        Rektefe-DV Renk Paleti Demo
      </Text>
      
      <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>Örnek Renkler</Text>
      {renderColorSwatch('Primary', themeColors.primary.main, 'Ana vurgu rengi')}
      {renderColorSwatch('Secondary', themeColors.secondary.main, 'İkincil vurgu rengi')}
      {renderColorSwatch('Accent', themeColors.accent.main, 'Aksiyon rengi')}
      {renderColorSwatch('Success', themeColors.success.main, 'Başarı')}
      {renderColorSwatch('Warning', themeColors.warning.main, 'Uyarı')}
      {renderColorSwatch('Error', themeColors.error.main, 'Hata')}

      <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>Tema Renkleri</Text>
      {renderColorSwatch('Text Primary', themeColors.text.primary, 'Ana metin')}
      {renderColorSwatch('Text Secondary', themeColors.text.secondary, 'İkincil metin')}
      {renderColorSwatch('Background', themeColors.background.primary, 'Arka plan')}
      {renderColorSwatch('Card', themeColors.background.card, 'Kart arka planı')}
      {renderColorSwatch('Border', themeColors.border.primary, 'Kenarlık')}

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
