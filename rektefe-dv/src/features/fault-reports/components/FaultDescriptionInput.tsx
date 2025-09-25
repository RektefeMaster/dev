import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface FaultDescriptionInputProps {
  description: string;
  onDescriptionChange: (description: string) => void;
  placeholder?: string;
}

export const FaultDescriptionInput: React.FC<FaultDescriptionInputProps> = ({
  description,
  onDescriptionChange,
  placeholder = 'Arıza açıklamanızı detaylı bir şekilde yazın...',
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Arıza Açıklaması
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
        Arızanızı mümkün olduğunca detaylı açıklayın. Bu, ustaların size daha doğru fiyat teklifi vermesini sağlar.
      </Text>
      
      <View style={[styles.inputContainer, { backgroundColor: theme.colors.background.secondary }]}>
        <TextInput
          style={[styles.textInput, { color: theme.colors.text.primary }]}
          value={description}
          onChangeText={onDescriptionChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.placeholder}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={[styles.characterCount, { color: theme.colors.text.secondary }]}>
          {description.length}/500
        </Text>
      </View>
      
      <View style={styles.tipsContainer}>
        <Text style={[styles.tipsTitle, { color: theme.colors.text.primary }]}>
          İpuçları:
        </Text>
        <Text style={[styles.tip, { color: theme.colors.text.secondary }]}>
          • Arızanın ne zaman başladığını belirtin
        </Text>
        <Text style={[styles.tip, { color: theme.colors.text.secondary }]}>
          • Hangi durumlarda ortaya çıktığını açıklayın
        </Text>
        <Text style={[styles.tip, { color: theme.colors.text.secondary }]}>
          • Daha önce yapılan bakımları belirtin
        </Text>
        <Text style={[styles.tip, { color: theme.colors.text.secondary }]}>
          • Araçta duyulan sesleri veya kokuları yazın
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  textInput: {
    padding: 16,
    fontSize: 16,
    minHeight: 120,
  },
  characterCount: {
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontSize: 12,
  },
  tipsContainer: {
    paddingVertical: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  tip: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 18,
  },
});
