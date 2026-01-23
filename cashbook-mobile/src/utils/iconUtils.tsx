/**
 * Icon utility functions
 */

import { Ionicons } from '@expo/vector-icons';

export const getCategoryIcon = (iconName: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    restaurant: 'restaurant',
    cafe: 'cafe',
    car: 'car',
    bag: 'bag',
    flash: 'flash',
    home: 'home',
    'play-circle': 'play-circle',
    medical: 'medical',
    airplane: 'airplane',
    school: 'school',
    'ellipsis-horizontal': 'ellipsis-horizontal',
    cash: 'cash',
    'trending-up': 'trending-up',
    briefcase: 'briefcase',
    star: 'star',
    gift: 'gift',
    'add-circle': 'add-circle',
  };
  return iconMap[iconName] || 'ellipse';
};

