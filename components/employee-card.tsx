import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useColorScheme } from '../src/hooks/use-color-scheme';
import { ThemedText } from './themed-text';

export interface EmployeeCardProps {
  name: string;
  status: 'active' | 'inactive';
  onPress?: () => void;
}

export function EmployeeCard({ name, status, onPress }: EmployeeCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.card }]}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.leftContent}>
          <View 
            style={[
              styles.statusIndicator, 
              { 
                backgroundColor: status === 'active' ? '#4CAF50' : '#9E9E9E',
                opacity: status === 'active' ? 0.2 : 0.1
              }
            ]}
          >
            <Ionicons 
              name="person-outline" 
              size={24} 
              color={status === 'active' ? '#4CAF50' : '#9E9E9E'} 
            />
          </View>
          <View style={styles.textContainer}>
            <ThemedText style={styles.name} numberOfLines={1}>
              {name}
            </ThemedText>
            <ThemedText 
              style={[
                styles.statusText, 
                { color: status === 'active' ? '#4CAF50' : '#9E9E9E' }
              ]}
            >
              {status === 'active' ? 'Activo' : 'Inactivo'}
            </ThemedText>
          </View>
        </View>
        <Ionicons 
          name="chevron-forward-outline" 
          size={20} 
          color={colors.secondaryText} 
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
