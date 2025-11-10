import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

/**
 * Cleans and formats notes for display in the interface
 * @param notes - Text of the notes to format
 * @returns Formatted text or undefined if no valid content
 */
export const formatNotes = (notes?: string | null): string | undefined => {
  if (!notes) return undefined;
  
  try {
    return String(notes)
      .trim()
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .substring(0, 500);
  } catch (error) {
    console.warn('Error formatting notes:', error, notes);
    return undefined;
  }
};

interface SafeNotesProps {
  notes?: string | null;
  style?: TextStyle | TextStyle[];
  maxLength?: number;
  showEmpty?: boolean;
}

export const SafeNotes: React.FC<SafeNotesProps> = ({
  notes,
  style,
  maxLength = 500,
  showEmpty = false
}) => {
  const formattedNotes = React.useMemo(() => {
    const cleaned = formatNotes(notes);
    if (!cleaned) return null;
    return maxLength && cleaned.length > maxLength
      ? `${cleaned.substring(0, maxLength)}...`
      : cleaned;
  }, [notes, maxLength]);

  if (!formattedNotes) {
    if (showEmpty) {
      return <Text style={[styles.emptyText, style]}>No notes</Text>;
    }
    return null;
  }

  return <Text style={[styles.notesText, style]}>{formattedNotes}</Text>;
};

const styles = StyleSheet.create({
  emptyText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  notesText: {
    fontSize: 14,
    color: '#4B5563',
  },
});

export const useNotesField = (initialValue = '') => {
  const [value, setValue] = React.useState(initialValue);

  const onChangeText = (text: string) => {
    if (text.length <= 500) {
      setValue(text);
    }
  };

  const cleanValue = React.useCallback((): string => {
    return formatNotes(value) || '';
  }, [value]);

  return {
    value,
    onChangeText,
    cleanValue,
    setValue,
    maxLength: 500,
    characterCount: value.length,
  };
};
