import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CreatePostScreen = () => {
  return (
    <View style={styles.container}>
      <Text>Gönderi Oluştur</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CreatePostScreen; 