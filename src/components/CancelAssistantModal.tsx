import React, { useState, useEffect } from 'react';
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
import { vibrantTheme } from '../theme/vibrantTheme';

interface Props {
  isVisible: boolean;
  onClose: () => void;
  subscriptionId: string;
  onConfirmCancel: () => void;
  subscriptionName: string;
  onRequestGuide?: () => void;
  isRequestingGuide?: boolean;
}

export const CancelAssistantModal: React.FC<Props> = ({
  isVisible,
  onClose,
  subscriptionId,
  onConfirmCancel,
  subscriptionName,
  onRequestGuide,
  isRequestingGuide = false,
}) => {
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
    <Modal visible={isVisible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={24} color="#64748B" />
          </TouchableOpacity>

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>Szukam poradnika dla {subscriptionName}...</Text>
            </View>
          ) : !guide || !hasInstructions ? (
            <View style={styles.center}>
              <AlertTriangle size={48} color="#F59E0B" style={styles.iconSpaced} />
              <Text style={styles.title}>Brak instrukcji anulowania</Text>
              <Text style={styles.desc}>
                Nie znaleźliśmy jeszcze gotowego poradnika dla {subscriptionName}. Możesz zgłosić brak instrukcji, a subskrypcję anulować samodzielnie u dostawcy.
              </Text>
              {onRequestGuide && (
                <TouchableOpacity
                  style={styles.btn}
                  onPress={onRequestGuide}
                  disabled={isRequestingGuide}
                >
                  {isRequestingGuide ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <AlertCircle size={20} color="#FFFFFF" />
                  )}
                  <Text style={styles.btnText}>Zgłoś brak instrukcji anulowania</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.btn, styles.dangerBtn]}
                onPress={() => { onConfirmCancel(); onClose(); }}
              >
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
                  <Clock size={14} color="#64748B" />
                  <Text style={styles.badgeText}>~{estimatedTimeMinutes} min</Text>
                </View>
              </View>

              <Text style={styles.title}>Jak anulować {guide.providerName}?</Text>
              
              <View style={styles.instructions}>
                {guide.instructions.map((inst, idx) => (
                  <View key={idx} style={styles.instructionRow}>
                    <View style={styles.stepCircle}><Text style={styles.stepNumber}>{idx + 1}</Text></View>
                    <Text style={styles.instructionText}>{inst}</Text>
                  </View>
                ))}
              </View>

              {guide.notes && (
                <View style={styles.notes}>
                  <ShieldAlert size={20} color="#D97706" />
                  <Text style={styles.notesText}>{guide.notes}</Text>
                </View>
              )}

              {guide.cancelUrl ? (
                <TouchableOpacity style={styles.btn} onPress={handleOpenProvider}>
                  <ExternalLink size={20} color="#FFFFFF" />
                  <Text style={styles.btnText}>Przejdź do strony anulowania</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.btn} onPress={() => setStep('confirm')}>
                  <CheckCircle size={20} color="#FFFFFF" />
                  <Text style={styles.btnText}>Przejdź do potwierdzenia</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : (
            <View style={styles.center}>
              <CheckCircle size={56} color="#10B981" style={styles.iconSpaced} />
              <Text style={styles.title}>Udało się anulować?</Text>
              <Text style={styles.desc}>
                Jeśli potwierdzisz, oznaczymy subskrypcję w aplikacji jako "Anulowana". Pamiętaj, że to nie zwalnia Cię z obowiązku faktycznego wypowiedzenia umowy u dostawcy.
              </Text>
              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: '#EF4444' }]} 
                onPress={() => { onConfirmCancel(); onClose(); }}
              >
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: vibrantTheme.colors.bg2,
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
    backgroundColor: vibrantTheme.colors.card,
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
    color: vibrantTheme.colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  iconSpaced: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: vibrantTheme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  desc: {
    fontSize: 15,
    color: vibrantTheme.colors.textMuted,
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
    backgroundColor: vibrantTheme.colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: vibrantTheme.colors.textMuted,
  },
  easy: { backgroundColor: '#ECFDF5' },
  easyText: { color: '#10B981' },
  medium: { backgroundColor: '#FFFBEB' },
  mediumText: { color: '#F59E0B' },
  hard: { backgroundColor: '#FEF2F2' },
  hardText: { color: '#EF4444' },
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
    backgroundColor: 'rgba(32,246,181,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumber: {
    color: vibrantTheme.colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: vibrantTheme.colors.text,
    lineHeight: 24,
  },
  notes: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    gap: 12,
  },
  notesText: {
    flex: 1,
    color: '#D97706',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  btn: {
    flexDirection: 'row',
    backgroundColor: vibrantTheme.colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 32,
  },
  dangerBtn: {
    backgroundColor: '#EF4444',
    marginTop: 12,
  },
  btnText: {
    color: vibrantTheme.colors.darkText,
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
    color: '#64748B',
    fontWeight: '600',
    fontSize: 16,
  },
});
