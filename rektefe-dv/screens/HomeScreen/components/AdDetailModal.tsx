import React from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AdDetailModalProps {
  visible: boolean;
  ad: {
    title: string;
    image: string;
    detailText: string;
    company: string;
    validUntil?: string;
  } | null;
  onClose: () => void;
}

export const AdDetailModal: React.FC<AdDetailModalProps> = ({
  visible,
  ad,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {ad && (
            <>
              <Image source={{ uri: ad.image }} style={styles.image} />
              <Text style={styles.title}>{ad.title}</Text>
              <Text style={styles.company}>{ad.company}</Text>
              <Text style={styles.detail}>{ad.detailText}</Text>
              {ad.validUntil && (
                <Text style={styles.validUntil}>Geçerlilik: {ad.validUntil}</Text>
              )}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <MaterialCommunityIcons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '88%',
    backgroundColor: '#23242a',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: 180,
    height: 180,
    borderRadius: 18,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
  },
  company: {
    fontSize: 16,
    color: '#B0B3C6',
    marginBottom: 10,
    textAlign: 'center',
  },
  detail: {
    fontSize: 15,
    color: '#F5F7FA',
    marginBottom: 10,
    textAlign: 'center',
  },
  validUntil: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 16,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 16,
    padding: 4,
  },
}); 