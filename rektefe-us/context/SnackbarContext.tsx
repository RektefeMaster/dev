import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Snackbar } from 'react-native-paper';
import { StyleSheet } from 'react-native';

interface SnackbarContextType {
  showSnackbar: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

interface SnackbarProviderProps {
  children: ReactNode;
}

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'success' | 'error' | 'info'>('info');

  const showSnackbar = (msg: string, msgType: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setType(msgType);
    setVisible(true);
  };

  const onDismissSnackBar = () => setVisible(false);

  const getBackgroundColor = () => {
    if (type === 'success') return '#4CAF50';
    if (type === 'error') return '#F44336';
    return '#2196F3'; // Info
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar
        visible={visible}
        onDismiss={onDismissSnackBar}
        duration={3000}
        style={[styles.snackbar, { backgroundColor: getBackgroundColor() }]}
        action={{
          label: 'Kapat',
          onPress: onDismissSnackBar,
        }}>
        {message}
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

const styles = StyleSheet.create({
    snackbar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        margin: 16,
    }
}); 