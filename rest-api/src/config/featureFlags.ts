export enum FeatureFlagKey {
  AKILLI_KILOMETRE = 'akilli_kilometre',
  AKILLI_KILOMETRE_SHADOW = 'akilli_kilometre_shadow',
  AKILLI_BAKIM_ONERI = 'akilli_bakim_oneri',
}

export const CRITICAL_FEATURE_FLAGS: FeatureFlagKey[] = [
  FeatureFlagKey.AKILLI_KILOMETRE,
  FeatureFlagKey.AKILLI_KILOMETRE_SHADOW,
];

export interface FeatureFlagSeedDefinition {
  key: FeatureFlagKey;
  defaultOn: boolean;
  description: string;
}

export const FEATURE_FLAG_SEED_DATA: FeatureFlagSeedDefinition[] = [
  {
    key: FeatureFlagKey.AKILLI_KILOMETRE,
    defaultOn: false,
    description: 'Akıllı kilometre tahmini ana özelliği',
  },
  {
    key: FeatureFlagKey.AKILLI_KILOMETRE_SHADOW,
    defaultOn: false,
    description: 'Akıllı kilometre gölge modu; metrik toplar fakat UI göstermeden çalışır',
  },
  {
    key: FeatureFlagKey.AKILLI_BAKIM_ONERI,
    defaultOn: false,
    description: 'Araç bakım önerilerini kademeli açmak için kullanılır',
  },
];


