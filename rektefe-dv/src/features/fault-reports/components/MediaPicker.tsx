import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ScrollView } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';

interface MediaPickerProps {
  photos: string[];
  videos: string[];
  onAddPhoto: (photoUri: string) => void;
  onRemovePhoto: (index: number) => void;
  onAddVideo: (videoUri: string) => void;
  onRemoveVideo: (index: number) => void;
}

export const MediaPicker: React.FC<MediaPickerProps> = ({
  photos,
  videos,
  onAddPhoto,
  onRemovePhoto,
  onAddVideo,
  onRemoveVideo,
}) => {
  const { theme } = useTheme();

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'İzin Gerekli',
        'Fotoğraf ve video eklemek için galeri erişim izni gereklidir.',
        [{ text: 'Tamam' }]
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    if (photos.length >= 5) {
      Alert.alert('Uyarı', 'En fazla 5 fotoğraf ekleyebilirsiniz.');
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onAddPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('Uyarı', 'En fazla 5 fotoğraf ekleyebilirsiniz.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'İzin Gerekli',
        'Fotoğraf çekmek için kamera erişim izni gereklidir.',
        [{ text: 'Tamam' }]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onAddPhoto(result.assets[0].uri);
    }
  };

  const pickVideo = async () => {
    if (videos.length >= 2) {
      Alert.alert('Uyarı', 'En fazla 2 video ekleyebilirsiniz.');
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.5,
      videoMaxDuration: 60, // 60 saniye maksimum
    });

    if (!result.canceled && result.assets[0]) {
      onAddVideo(result.assets[0].uri);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert(
      'Fotoğraf Ekle',
      'Fotoğrafı nereden eklemek istiyorsunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Galeri', onPress: pickImage },
        { text: 'Kamera', onPress: takePhoto },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Fotoğraf ve Video Ekleyin (Opsiyonel)
      </Text>
      
      <Text style={[styles.description, { color: theme.colors.text.secondary }]}>
        Arızanızı daha iyi anlamamız için fotoğraf ve video ekleyebilirsiniz.
      </Text>

      {/* Photos Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Fotoğraflar ({photos.length}/5)
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.primary.main }]}
            onPress={showPhotoOptions}
            disabled={photos.length >= 5}
          >
            <MaterialCommunityIcons name="camera-plus" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Ekle</Text>
          </TouchableOpacity>
        </View>

        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.mediaItem}>
                <Image source={{ uri: photo }} style={styles.photoThumbnail} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemovePhoto(index)}
                >
                  <MaterialCommunityIcons name="close-circle" size={20} color="#FF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Videos Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Videolar ({videos.length}/2)
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.primary.main }]}
            onPress={pickVideo}
            disabled={videos.length >= 2}
          >
            <MaterialCommunityIcons name="video-plus" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Ekle</Text>
          </TouchableOpacity>
        </View>

        {videos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
            {videos.map((video, index) => (
              <View key={index} style={styles.mediaItem}>
                <View style={[styles.videoThumbnail, { backgroundColor: theme.colors.background.secondary }]}>
                  <MaterialCommunityIcons name="play" size={32} color={theme.colors.text.secondary} />
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemoveVideo(index)}
                >
                  <MaterialCommunityIcons name="close-circle" size={20} color="#FF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.tip}>
        <MaterialCommunityIcons name="lightbulb-outline" size={16} color={theme.colors.text.secondary} />
        <Text style={[styles.tipText, { color: theme.colors.text.secondary }]}>
          İpucu: Net ve aydınlık fotoğraflar ustalarımızın sorunu daha iyi anlamasına yardımcı olur.
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  mediaScroll: {
    marginTop: 8,
  },
  mediaItem: {
    marginRight: 12,
    position: 'relative',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  videoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginTop: 16,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    marginLeft: 8,
    lineHeight: 16,
  },
});
