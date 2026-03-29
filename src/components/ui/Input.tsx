import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors, borderRadius, typography, shadows } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, style, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.focused,
          error && styles.errorBorder,
        ]}
      >
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.gray[400]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    ...typography.bodyBold,
    color: colors.gray[600],
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.input,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 16,
    width: '100%',
    minHeight: 52,
    ...shadows.sm,
  },
  focused: {
    borderColor: colors.green[400],
    backgroundColor: 'rgba(255,255,255,0.90)',
    ...shadows.glass,
    shadowColor: colors.green[500],
    shadowOpacity: 0.12,
  },
  errorBorder: {
    borderColor: colors.error,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    ...typography.body,
    color: colors.gray[900],
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: 6,
    marginLeft: 4,
  },
});
