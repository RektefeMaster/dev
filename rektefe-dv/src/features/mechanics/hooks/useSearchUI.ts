import { useState } from 'react';
import { MechanicSearchResult } from '@/shared/types/common';

export const useSearchUI = () => {
  const [searchFocused, setSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showMapView, setShowMapView] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState<MechanicSearchResult | null>(null);

  const toggleCardExpansion = (mechanicId: string) => {
    const newExpandedCards = new Set(expandedCards);
    if (newExpandedCards.has(mechanicId)) {
      newExpandedCards.delete(mechanicId);
    } else {
      newExpandedCards.add(mechanicId);
    }
    setExpandedCards(newExpandedCards);
  };

  const isCardExpanded = (mechanicId: string) => {
    return expandedCards.has(mechanicId);
  };

  const resetUI = () => {
    setSearchFocused(false);
    setShowFilters(false);
    setExpandedCards(new Set());
    setShowMapView(false);
    setSelectedMechanic(null);
  };

  return {
    // State
    searchFocused,
    showFilters,
    expandedCards,
    showMapView,
    selectedMechanic,
    
    // Actions
    setSearchFocused,
    setShowFilters,
    setExpandedCards,
    setShowMapView,
    setSelectedMechanic,
    toggleCardExpansion,
    isCardExpanded,
    resetUI,
  };
};
