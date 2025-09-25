import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchFocused: boolean;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  showMapView: boolean;
  onToggleMapView: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  searchFocused,
  onSearchFocus,
  onSearchBlur,
  showFilters,
  onToggleFilters,
  showMapView,
  onToggleMapView,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.searchContainer}>
      <View style={[
        styles.searchInputContainer,
        { backgroundColor: theme.colors.background.card },
        searchFocused && { borderColor: theme.colors.primary.main, borderWidth: 1 }
      ]}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={theme.colors.text.secondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text.primary }]}
          placeholder="Usta ara (isim, şehir, hizmet...)"
          placeholderTextColor={theme.colors.text.secondary}
          value={searchQuery}
          onChangeText={onSearchChange}
          onFocus={onSearchFocus}
          onBlur={onSearchBlur}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => onSearchChange('')}
            style={styles.clearButton}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color={theme.colors.text.secondary}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: showFilters ? theme.colors.primary.main : theme.colors.background.card }
          ]}
          onPress={onToggleFilters}
        >
          <MaterialCommunityIcons
            name="filter-variant"
            size={20}
            color={showFilters ? '#FFFFFF' : theme.colors.text.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mapButton,
            { backgroundColor: showMapView ? theme.colors.primary.main : theme.colors.background.card }
          ]}
          onPress={onToggleMapView}
        >
          <MaterialCommunityIcons
            name={showMapView ? "format-list-bulleted" : "map"}
            size={20}
            color={showMapView ? '#FFFFFF' : theme.colors.text.primary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'System',
  },
  clearButton: {
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mapButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
