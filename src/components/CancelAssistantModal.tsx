import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
} from 'react-native';
import { X, ExternalLink, Clock, AlertTriangle, CheckCircle, ShieldAlert, AlertCircle } from 'lucide-react-native';
import { useCancelGuide } from '../hooks/useCancelGuide';
import type { AppTheme } from '../theme/ThemeContext';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/themeUtils';

interface Props {
  isVisible: boolean;
  onClose: () => void;
  subscriptionId: string;
  onConfirmCancel: () => void;
  subscriptionName: string;
  onRequestGuide?: () => void;
  isRequestingGuide?: boolean;
  isConfirmingCancel?: boolean;
}

export const CancelAssistantModal: React.FC<Props> = ({
  isVisible,
  onClose,
  subscriptionId,
  onConfirmCancel,
  subscriptionName,
  onRequestGuide,
  isRequestingGuide = false,
  isConfirmingCancel = false,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data: guide, isLoading } = useCancelGuide(subscriptionId);
  const [step, setStep] = useState<'info' | 'confirm'>('info');

  // Reset step when opened
  useEffect(() => {
    if (isVisible) setStep('info');
  }, [isVisible]);

  if (!isVisible) return null;

  const handleOpenProvider = () => {
    if (!guide?.cancelUrl) return;

    Linking.openURL(guide.cancelUrl).catch(() => {});
    setStep('confirm');
  };

  const difficulty = guide?.difficulty ?? 'medium';
  const estimatedTimeMinutes = guide?.estimatedTimeMinutes ?? 5;
  const hasInstructions = !!guide?.instructions?.length;

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: withAlpha(theme.colors.bg, 0.72) }]}>
        <View style={[styles.container, { backgroundColor: theme.colors.bg2 }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={24} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Szukam poradnika dla {subscriptionName}...</Text>
            </View>
          ) : !guide || !hasInstructions ? (
            <View style={styles.center}>
              <AlertTriangle size={48} color={theme.colors.warning} style={styles.iconSpaced} />
              <Text style={styles.title}>Brak instrukcji anulowania</Text>
              <Text style={styles.desc}>
                Nie znaleźliśmy jeszcze gotowego poradnika dla {subscriptionName}. Możesz zgłosić brak instrukcji, a subskrypcję anulować samodzielnie u dostawcy.
              </Text>
              {onRequestGuide && (
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.colors.primary }]}
                  onPress={onRequestGuide}
                  disabled={isRequestingGuide}
                >
                  {isRequestingGuide ? (
                    <ActivityIndicator size="small" color={theme.colors.darkText} />
                  ) : (
                    <AlertCircle size={20} color={theme.colors.darkText} />
                  )}
                  <Text style={styles.btnText}>Zgłoś brak instrukcji anulowania</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.colors.danger }, isConfirmingCancel && styles.btnDisabled]}
                onPress={() => { onConfirmCancel(); onClose(); }}
                disabled={isConfirmingCancel}
              >
                {isConfirmingCancel ? <ActivityIndicator size="small" color={theme.colors.darkText} /> : null}
                <Text style={styles.btnText}>Oznacz jako anulowaną</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineBtn} onPress={onClose}>
                <Text style={styles.outlineBtnText}>Powrót</Text>
              </TouchableOpacity>
            </View>
          ) : step === 'info' ? (
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.badgeContainer}>
                <View style={[styles.badge, 
                  difficulty === 'hard' ? styles.hard : 
                  difficulty === 'medium' ? styles.medium : styles.easy
                ]}>
                  <Text style={[styles.badgeText, 
                    difficulty === 'hard' ? styles.hardText : 
                    difficulty === 'medium' ? styles.mediumText : styles.easyText
                  ]}>
                    Trudność: {difficulty === 'hard' ? 'Wysoka' : difficulty === 'medium' ? 'Średnia' : 'Niska'}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Clock size={14} color={theme.colors.textMuted} />
                  <Text style={styles.badgeText}>~{estimatedTimeMinutes} min</Text>
                </View>
              </View>

              <Text style={styles.title}>Jak anulować {guide.providerName}?</Text>
              
              <View style={styles.instructions}>
                {guide.instructions.map((inst, idx) => (
                  <View key={idx} style={styles.instructionRow}>
                    <View style={[styles.stepCircle, { backgroundColor: `${theme.colors.primary}22` }]}><Text style={[styles.stepNumber, { color: theme.colors.primary }]}>{idx + 1}</Text></View>
                    <Text style={styles.instructionText}>{inst}</Text>
                  </View>
                ))}
              </View>

              {guide.notes && (
                <View style={styles.notes}>
                  <ShieldAlert size={20} color={theme.colors.warning} />
                  <Text style={styles.notesText}>{guide.notes}</Text>
                </View>
              )}

              {guide.cancelUrl ? (
                <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.primary }]} onPress={handleOpenProvider}>
                  <ExternalLink size={20} color={theme.colors.darkText} />
                  <Text style={styles.btnText}>Przejdź do strony anulowania</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.primary }]} onPress={() => setStep('confirm')}>
                  <CheckCircle size={20} color={theme.colors.darkText} />
                  <Text style={styles.btnText}>Przejdź do potwierdzenia</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : (
            <View style={styles.center}>
              <CheckCircle size={56} color={theme.colors.primary} style={styles.iconSpaced} />
              <Text style={styles.title}>Udało się anulować?</Text>
              <Text style={styles.desc}>
                Jeśli potwierdzisz, oznaczymy subskrypcję w aplikacji jako "Anulowana". Pamiętaj, że to nie zwalnia Cię z obowiązku faktycznego wypowiedzenia umowy u dostawcy.
              </Text>
              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: theme.colors.danger }, isConfirmingCancel && styles.btnDisabled]} 
                onPress={() => { onConfirmCancel(); onClose(); }}
                disabled={isConfirmingCancel}
              >
                {isConfirmingCancel ? <ActivityIndicator size="small" color={theme.colors.darkText} /> : null}
                <Text style={styles.btnText}>Tak, oznacz jako anulowaną</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineBtn} onPress={onClose}>
                <Text style={styles.outlineBtnText}>Zrobię to później</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: withAlpha(theme.colors.bg, 0.72),
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.bg2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    minHeight: 400,
    maxHeight: '90%',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    zIndex: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  iconSpaced: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  desc: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  content: {
    paddingBottom: 20,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  easy: { backgroundColor: withAlpha(theme.colors.success, 0.14) },
  easyText: { color: theme.colors.success },
  medium: { backgroundColor: withAlpha(theme.colors.warning, 0.14) },
  mediumText: { color: theme.colors.warning },
  hard: { backgroundColor: withAlpha(theme.colors.danger, 0.14) },
  hardText: { color: theme.colors.danger },
  instructions: {
    marginTop: 20,
    gap: 16,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: withAlpha(theme.colors.text, 0.14),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumber: {
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
  },
  notes: {
    flexDirection: 'row',
    backgroundColor: withAlpha(theme.colors.warning, 0.14),
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    gap: 12,
  },
  notesText: {
    flex: 1,
    color: theme.colors.warning,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  btn: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 32,
  },
  dangerBtn: {
    backgroundColor: theme.colors.danger,
    marginTop: 12,
  },
  btnDisabled: {
    opacity: 0.58,
  },
  btnText: {
    color: theme.colors.darkText,
    fontWeight: '700',
    fontSize: 16,
  },
  outlineBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  outlineBtnText: {
    color: theme.colors.textMuted,
    fontWeight: '600',
    fontSize: 16,
  },
});
