import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import BottomTabBar from '@/components/BottomTabBar';
import {
  getMatchById,
  getAttendance,
  getGuests,
  getPlayers,
  getCurrentUser,
  getPlayerStats,
  getAllPlayerRatings,
  getPayments,
  generateTeams,
  lockTeams,
  submitScore,
  upsertAttendance,
  removeGuest,
  finaliseMatch,
  markPayment,
  markReminderSent,
} from '@/lib/data';
import AddGuestModal from '@/components/AddGuestModal';
import RatingBadge from '@/components/RatingBadge';
import UpgradeBanner from '@/components/UpgradeBanner';
import { FEATURES, Plan } from '@/lib/plan';
import { getGroup } from '@/lib/data';

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [scoreModalVisible, setScoreModalVisible] = useState(false);
  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const [finaliseModal, setFinaliseModal] = useState(false);
  const [pitchCostInput, setPitchCostInput] = useState('60');
  const [actualPlayersInput, setActualPlayersInput] = useState('');

  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: ['match', id],
    queryFn: () => getMatchById(id),
    enabled: !!id,
  });

  const { data: attendance } = useQuery({
    queryKey: ['attendance', id],
    queryFn: () => getAttendance(id),
    enabled: !!id,
  });

  const { data: guests } = useQuery({
    queryKey: ['guests', id],
    queryFn: () => getGuests(id),
    enabled: !!id,
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: getPlayers,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  const { data: playerStats } = useQuery({
    queryKey: ['playerStats', currentUser?.id],
    queryFn: () => getPlayerStats(currentUser!.id),
    enabled: !!currentUser?.id,
  });

  const { data: ratings } = useQuery({
    queryKey: ['allPlayerRatings'],
    queryFn: getAllPlayerRatings,
  });

  const { data: payments } = useQuery({
    queryKey: ['payments', id],
    queryFn: () => getPayments(id),
    enabled: !!id,
  });

  const { data: group } = useQuery({
    queryKey: ['group'],
    queryFn: () => getGroup(),
  });
  const plan = (group as any)?.plan as Plan | undefined;

  const generateMutation = useMutation({
    mutationFn: () => generateTeams(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', id] });
      queryClient.invalidateQueries({ queryKey: ['guests', id] });
    },
  });

  const lockMutation = useMutation({
    mutationFn: () => lockTeams(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['match', id] }),
  });

  const scoreMutation = useMutation({
    mutationFn: () => submitScore(id, parseInt(scoreA), parseInt(scoreB)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match', id] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      setScoreModalVisible(false);
      Alert.alert('Score submitted!');
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: (status: string) => upsertAttendance(id, currentUser!.id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance', id] }),
  });

  const removeGuestMutation = useMutation({
    mutationFn: (guestId: string) => removeGuest(guestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guests', id] }),
  });

  const finaliseMutation = useMutation({
    mutationFn: () => finaliseMatch(
      id,
      parseFloat(pitchCostInput) || 60,
      parseInt(actualPlayersInput) || yesAttendance.length,
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match', id] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['payments', id] });
      setFinaliseModal(false);
    },
    onError: (e: any) => {
      if (Platform.OS === 'web') window.alert('Error: ' + e.message);
      else Alert.alert('Error', e.message);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (paymentId: string) => markPayment(paymentId, 'paid'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments', id] }),
  });

  const markUnpaidMutation = useMutation({
    mutationFn: (paymentId: string) => markPayment(paymentId, 'pending'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments', id] }),
  });

  const reminderMutation = useMutation({
    mutationFn: (paymentId: string) => markReminderSent(paymentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments', id] }),
  });

  const handleRemoveGuest = (guestId: string, guestName: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${guestName} from this match?`)) {
        removeGuestMutation.mutate(guestId);
      }
    } else {
      Alert.alert('Remove Guest', `Remove ${guestName} from this match?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeGuestMutation.mutate(guestId) },
      ]);
    }
  };

  const getPlayer = (playerId: string) => players?.find((p) => p.id === playerId);
  const isAdmin = currentUser?.role === 'admin';

  const yesAttendance = (attendance ?? []).filter((a) => a.status === 'yes');
  const maybeAttendance = (attendance ?? []).filter((a) => a.status === 'maybe');
  const myAttendance = (attendance ?? []).find((a) => a.player_id === currentUser?.id);

  const formatDate = (date: string) => {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (matchLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!match) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Match not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Match Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Match Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroInfo}>
              <Text style={styles.heroDate}>{formatDate(match.date)}</Text>
              <View style={styles.heroMeta}>
                <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.heroMetaText}>{match.time}</Text>
                <Text style={styles.heroMetaDot}>·</Text>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.heroMetaText} numberOfLines={1}>{match.location}</Text>
              </View>
            </View>
            {match.status === 'closed' && match.scoreA !== null && match.scoreB !== null ? (
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreA}>{match.scoreA}</Text>
                <Text style={styles.scoreDash}>–</Text>
                <Text style={styles.scoreB}>{match.scoreB}</Text>
              </View>
            ) : (
              <Text style={styles.heroCost}>£{match.costPerPlayer?.toFixed(2)}</Text>
            )}
          </View>

          {/* Stats */}
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{yesAttendance.length}</Text>
              <Text style={styles.heroStatLabel}>Going</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{maybeAttendance.length}</Text>
              <Text style={styles.heroStatLabel}>Maybe</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{guests?.length ?? 0}</Text>
              <Text style={styles.heroStatLabel}>Guests</Text>
            </View>
          </View>
        </View>

        {/* Attendance buttons */}
        {match.status !== 'closed' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your RSVP</Text>
            <View style={styles.rsvpRow}>
              {(['yes', 'no', 'maybe'] as const).map((s) => {
                const isActive = myAttendance?.status === s;
                const cfg = {
                  yes: { icon: 'checkmark-circle', activeColor: colors.accentDark, label: 'Yes' },
                  no: { icon: 'close-circle', activeColor: '#EF4444', label: 'No' },
                  maybe: { icon: 'help-circle', activeColor: '#D97706', label: 'Maybe' },
                }[s];
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.rsvpBtn, isActive && { backgroundColor: cfg.activeColor, borderColor: cfg.activeColor }]}
                    onPress={() => attendanceMutation.mutate(s)}
                  >
                    <Ionicons name={cfg.icon as any} size={18} color={isActive ? colors.white : colors.textSecondary} />
                    <Text style={[styles.rsvpBtnText, isActive && styles.rsvpBtnTextActive]}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Player List */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Players Going ({yesAttendance.length})</Text>
          </View>
          {yesAttendance.map((att) => {
            const player = getPlayer(att.playerId);
            return (
              <TouchableOpacity
                key={att.id}
                style={styles.playerRow}
                onPress={() => router.push(`/player/${att.playerId}`)}
                activeOpacity={0.8}
              >
                <View style={styles.playerAvatar}>
                  <Text style={styles.playerAvatarText}>{(player?.name ?? '?').charAt(0)}</Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{player?.name ?? att.playerId}</Text>
                  <Text style={styles.playerPos}>{player?.position}</Text>
                </View>
                {ratings?.[att.playerId] !== undefined && (
                  <RatingBadge score={ratings[att.playerId]} size="sm" />
                )}
                {att.team && (
                  <View style={[styles.teamBadge, { backgroundColor: att.team === 'A' ? colors.primaryTint : '#FEE2E2' }]}>
                    <Text style={[styles.teamBadgeText, { color: att.team === 'A' ? colors.primary : '#DC2626' }]}>Team {att.team}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            );
          })}

          {maybeAttendance.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Maybe ({maybeAttendance.length})</Text>
              {maybeAttendance.map((att) => {
                const player = getPlayer(att.playerId);
                return (
                  <TouchableOpacity
                    key={att.id}
                    style={[styles.playerRow, styles.playerRowMaybe]}
                    onPress={() => router.push(`/player/${att.playerId}`)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.playerAvatar, styles.playerAvatarMaybe]}>
                      <Text style={[styles.playerAvatarText, { color: colors.textSecondary }]}>{(player?.name ?? '?').charAt(0)}</Text>
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={[styles.playerName, { color: colors.textSecondary }]}>{player?.name ?? att.playerId}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </View>

        {/* Guests */}
        {(guests?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guests ({guests?.length})</Text>
            {(guests ?? []).map((g) => {
              const sponsor = getPlayer(g.sponsor_id);
              return (
                <View key={g.id} style={styles.guestRow}>
                  <View style={[styles.playerAvatar, { backgroundColor: '#EDE9FE' }]}>
                    <Text style={[styles.playerAvatarText, { color: '#7C3AED' }]}>{g.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{g.name}</Text>
                    <Text style={styles.guestMeta}>via {sponsor?.name ?? g.sponsor_id} · {g.type.replace('_', ' ')}</Text>
                  </View>
                  {g.team && (
                    <View style={[styles.teamBadge, { backgroundColor: g.team === 'A' ? colors.primaryTint : '#FEE2E2' }]}>
                      <Text style={[styles.teamBadgeText, { color: g.team === 'A' ? colors.primary : '#DC2626' }]}>Team {g.team}</Text>
                    </View>
                  )}
                  {(isAdmin || g.sponsor_id === currentUser?.id) && match.status !== 'closed' && (
                    <TouchableOpacity
                      onPress={() => handleRemoveGuest(g.id, g.name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ marginLeft: 4 }}
                    >
                      <Ionicons name="close-circle" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Player Stats */}
        {currentUser && playerStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Stats</Text>
            <View style={styles.playerStatsCard}>
              <View style={styles.playerStatItem}>
                <Text style={styles.playerStatValue}>{playerStats.attendanceRate}%</Text>
                <Text style={styles.playerStatLabel}>Attendance</Text>
              </View>
              <View style={styles.playerStatDivider} />
              <View style={styles.playerStatItem}>
                <Ionicons name="trophy-outline" size={18} color="#D97706" style={{ marginBottom: 2 }} />
                <Text style={styles.playerStatValue}>{playerStats.motmWins}</Text>
                <Text style={styles.playerStatLabel}>MOTM Awards</Text>
              </View>
              <View style={styles.playerStatDivider} />
              <View style={styles.playerStatItem}>
                <Text style={styles.playerStatValue}>{playerStats.matchesPlayed}</Text>
                <Text style={styles.playerStatLabel}>Played</Text>
              </View>
            </View>
          </View>
        )}

        {/* Admin Controls */}
        {isAdmin && match.status !== 'closed' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Controls</Text>
            <View style={styles.adminGrid}>
              <TouchableOpacity
                style={styles.adminCard}
                onPress={() => {
                  generateMutation.mutate();
                }}
              >
                <Ionicons name="shuffle" size={22} color={colors.primary} />
                <Text style={styles.adminCardTitle}>Generate Teams</Text>
                <Text style={styles.adminCardDesc}>Auto-balance players</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.adminCard, match.teamsLocked && styles.adminCardLocked]}
                onPress={() => {
                  if (!match.teamsLocked) {
                    Alert.alert('Lock Teams?', 'This will finalise the teams.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Lock', onPress: () => lockMutation.mutate() },
                    ]);
                  }
                }}
              >
                <Ionicons name={match.teamsLocked ? 'lock-closed' : 'lock-open-outline'} size={22} color={match.teamsLocked ? colors.accent : colors.primary} />
                <Text style={styles.adminCardTitle}>{match.teamsLocked ? 'Teams Locked' : 'Lock Teams'}</Text>
                <Text style={styles.adminCardDesc}>{match.teamsLocked ? 'Finalised' : 'Confirm teams'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adminCard}
                onPress={() => router.push(`/teams/${match.id}`)}
              >
                <Ionicons name="eye-outline" size={22} color={colors.primary} />
                <Text style={styles.adminCardTitle}>View Teams</Text>
                <Text style={styles.adminCardDesc}>See full lineup</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adminCard}
                onPress={() => setGuestModalVisible(true)}
              >
                <Ionicons name="person-add-outline" size={22} color={colors.primary} />
                <Text style={styles.adminCardTitle}>Add Guest</Text>
                <Text style={styles.adminCardDesc}>Add a player</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Post-Match actions */}
        {match.status === 'closed' && (
          <View style={styles.section}>
            {FEATURES.playerRatings(plan)
              ? (
                <TouchableOpacity style={styles.rateBtn} onPress={() => router.push(`/rate/${match.id}`)}>
                  <Ionicons name="star-outline" size={18} color="#7C3AED" />
                  <Text style={styles.rateBtnText}>Rate Players</Text>
                </TouchableOpacity>
              )
              : <UpgradeBanner feature="Player Ratings" compact />
            }
            {FEATURES.motmVoting(plan)
              ? (
                <TouchableOpacity style={[styles.motmBtn, { marginTop: spacing.sm }]} onPress={() => router.push(`/motm/${match.id}`)}>
                  <Ionicons name="trophy-outline" size={18} color="#D97706" />
                  <Text style={styles.motmBtnText}>MOTM Voting</Text>
                </TouchableOpacity>
              )
              : <UpgradeBanner feature="MOTM Voting" compact />
            }
            {isAdmin && (
              <TouchableOpacity style={[styles.submitScoreBtn, { marginTop: spacing.sm }]} onPress={() => setScoreModalVisible(true)}>
                <Ionicons name="create-outline" size={18} color={colors.white} />
                <Text style={styles.submitScoreBtnText}>Edit Score</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Pre-match admin controls */}
        {isAdmin && match.status !== 'closed' && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.finaliseBtn}
              onPress={() => {
                setActualPlayersInput(String(yesAttendance.length));
                setPitchCostInput(match.pitchCost ? String(match.pitchCost) : '60');
                setFinaliseModal(true);
              }}
            >
              <Ionicons name="cash-outline" size={18} color={colors.white} />
              <Text style={styles.submitScoreBtnText}>Close Match & Split Costs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitScoreBtn, { marginTop: spacing.sm }]} onPress={() => setScoreModalVisible(true)}>
              <Ionicons name="checkmark-done-outline" size={18} color={colors.white} />
              <Text style={styles.submitScoreBtnText}>Submit Final Score</Text>
            </TouchableOpacity>
            {FEATURES.motmVoting(plan)
              ? (
                <TouchableOpacity style={[styles.motmBtn, { marginTop: spacing.sm }]} onPress={() => router.push(`/motm/${match.id}`)}>
                  <Ionicons name="trophy-outline" size={18} color="#D97706" />
                  <Text style={styles.motmBtnText}>MOTM Voting</Text>
                </TouchableOpacity>
              )
              : <UpgradeBanner feature="MOTM Voting" compact />
            }
          </View>
        )}

        {/* ── Payments Section (after match is closed) ── */}
        {match.status === 'closed' && isAdmin && (payments?.length ?? 0) === 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.finaliseBtn}
              onPress={() => {
                setActualPlayersInput(String(yesAttendance.length));
                setPitchCostInput(match.pitchCost ? String(match.pitchCost) : '60');
                setFinaliseModal(true);
              }}
            >
              <Ionicons name="cash-outline" size={18} color={colors.white} />
              <Text style={styles.submitScoreBtnText}>Calculate & Split Costs</Text>
            </TouchableOpacity>
          </View>
        )}

        {(payments?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Payments — £{match.pitchCost ?? '?'} pitch · £{match.costPerPlayer?.toFixed(2)} p/p
            </Text>

            {/* Summary chips */}
            <View style={styles.paymentSummaryRow}>
              <View style={[styles.paymentChip, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
                <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                <Text style={[styles.paymentChipText, { color: '#16A34A' }]}>
                  {(payments ?? []).filter((p) => p.status === 'paid').length} paid
                </Text>
              </View>
              <View style={[styles.paymentChip, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Ionicons name="time-outline" size={14} color="#DC2626" />
                <Text style={[styles.paymentChipText, { color: '#DC2626' }]}>
                  {(payments ?? []).filter((p) => p.status === 'pending').length} pending
                </Text>
              </View>
            </View>

            {(payments ?? []).map((payment) => {
              const player = getPlayer(payment.player_id);
              const isPaid = payment.status === 'paid';
              return (
                <View key={payment.id} style={styles.paymentRow}>
                  <View style={styles.playerAvatar}>
                    <Text style={styles.playerAvatarText}>{(player?.name ?? '?').charAt(0)}</Text>
                  </View>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player?.name ?? payment.player_id}</Text>
                    <Text style={styles.paymentAmount}>£{Number(payment.amount ?? match.costPerPlayer ?? 0).toFixed(2)}</Text>
                  </View>

                  {isAdmin && (
                    <View style={styles.paymentActions}>
                      {/* Paid / Unpaid toggle */}
                      <TouchableOpacity
                        style={[styles.paidToggle, isPaid ? styles.paidToggleActive : styles.unpaidToggle]}
                        onPress={() => isPaid
                          ? markUnpaidMutation.mutate(payment.id)
                          : markPaidMutation.mutate(payment.id)
                        }
                      >
                        <Ionicons
                          name={isPaid ? 'checkmark-circle' : 'ellipse-outline'}
                          size={16}
                          color={isPaid ? '#16A34A' : '#6B7280'}
                        />
                        <Text style={[styles.paidToggleText, isPaid && styles.paidToggleTextActive]}>
                          {isPaid ? 'Paid' : 'Mark paid'}
                        </Text>
                      </TouchableOpacity>

                      {/* Reminder button — only for unpaid, PRO+ only */}
                      {!isPaid && FEATURES.paymentReminders(plan) && (
                        <TouchableOpacity
                          style={[styles.reminderBtn, payment.reminder_sent && styles.reminderBtnSent]}
                          onPress={() => {
                            if (!payment.reminder_sent) {
                              reminderMutation.mutate(payment.id);
                              if (Platform.OS === 'web') {
                                window.alert(`Reminder marked for ${player?.name ?? 'player'}`);
                              } else {
                                Alert.alert('Reminder sent', `${player?.name ?? 'Player'} has been notified.`);
                              }
                            }
                          }}
                        >
                          <Ionicons
                            name={payment.reminder_sent ? 'mail' : 'mail-outline'}
                            size={14}
                            color={payment.reminder_sent ? '#6B7280' : '#D97706'}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Player sees their own payment status */}
                  {!isAdmin && payment.player_id === currentUser?.id && (
                    <View style={[styles.paidToggle, isPaid ? styles.paidToggleActive : styles.unpaidToggle]}>
                      <Ionicons name={isPaid ? 'checkmark-circle' : 'time-outline'} size={16} color={isPaid ? '#16A34A' : '#DC2626'} />
                      <Text style={[styles.paidToggleText, isPaid && styles.paidToggleTextActive]}>
                        {isPaid ? 'Paid' : 'Owes £' + Number(payment.amount ?? match.costPerPlayer ?? 0).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ── Finalise / Cost Split Modal ── */}
      <Modal visible={finaliseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Split Match Costs</Text>
            <Text style={styles.modalSub}>Enter the actual pitch cost and the number of players who showed up. The app will divide the cost equally.</Text>

            <View style={styles.finaliseInputRow}>
              <View style={styles.finaliseInputBlock}>
                <Text style={styles.finaliseInputLabel}>Pitch Cost (£)</Text>
                <TextInput
                  style={styles.finaliseInput}
                  value={pitchCostInput}
                  onChangeText={setPitchCostInput}
                  keyboardType="decimal-pad"
                  placeholder="60"
                />
              </View>
              <View style={styles.finaliseInputBlock}>
                <Text style={styles.finaliseInputLabel}>Players Present</Text>
                <TextInput
                  style={styles.finaliseInput}
                  value={actualPlayersInput}
                  onChangeText={setActualPlayersInput}
                  keyboardType="number-pad"
                  placeholder={String(yesAttendance.length)}
                />
              </View>
            </View>

            {/* Live preview */}
            {pitchCostInput && actualPlayersInput && Number(actualPlayersInput) > 0 && (
              <View style={styles.costPreview}>
                <Text style={styles.costPreviewLabel}>Cost per player</Text>
                <Text style={styles.costPreviewValue}>
                  £{(parseFloat(pitchCostInput) / parseInt(actualPlayersInput)).toFixed(2)}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitScoreBtn, { marginTop: spacing.lg }]}
              onPress={() => finaliseMutation.mutate()}
              disabled={finaliseMutation.isPending}
            >
              {finaliseMutation.isPending
                ? <ActivityIndicator color={colors.white} />
                : <>
                    <Ionicons name="cash-outline" size={18} color={colors.white} />
                    <Text style={styles.submitScoreBtnText}>Calculate & Notify Players</Text>
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity style={[styles.motmBtn, { marginTop: spacing.sm }]} onPress={() => setFinaliseModal(false)}>
              <Text style={styles.motmBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Score Modal */}
      <Modal visible={scoreModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Submit Score</Text>
            <View style={styles.scoreInputRow}>
              <View style={styles.scoreInputBlock}>
                <Text style={styles.scoreInputLabel}>Team A</Text>
                <TextInput
                  style={styles.scoreInput}
                  value={scoreA}
                  onChangeText={setScoreA}
                  keyboardType="number-pad"
                  placeholder="0"
                  maxLength={2}
                />
              </View>
              <Text style={styles.scoreInputVs}>–</Text>
              <View style={styles.scoreInputBlock}>
                <Text style={styles.scoreInputLabel}>Team B</Text>
                <TextInput
                  style={styles.scoreInput}
                  value={scoreB}
                  onChangeText={setScoreB}
                  keyboardType="number-pad"
                  placeholder="0"
                  maxLength={2}
                />
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setScoreModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => scoreMutation.mutate()}>
                <Text style={styles.confirmBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AddGuestModal
        visible={guestModalVisible}
        onClose={() => setGuestModalVisible(false)}
        matchId={id}
        sponsorId={currentUser?.id ?? 'p1'}
        onAdded={() => {
          setGuestModalVisible(false);
          queryClient.invalidateQueries({ queryKey: ['guests', id] });
        }}
      />

      <BottomTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { ...typography.body, color: colors.textSecondary },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', ...shadows.sm },
  navTitle: { ...typography.captionBold, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },

  heroCard: { backgroundColor: colors.primary, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.lg },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  heroInfo: { flex: 1, paddingRight: spacing.md },
  heroDate: { ...typography.h4, color: colors.white, marginBottom: spacing.xs },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  heroMetaText: { ...typography.small, color: 'rgba(255,255,255,0.75)' },
  heroMetaDot: { color: 'rgba(255,255,255,0.5)' },
  heroCost: { ...typography.h3, color: colors.accentLight },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreA: { ...typography.h2, color: colors.accentLight },
  scoreDash: { ...typography.h3, color: 'rgba(255,255,255,0.5)' },
  scoreB: { ...typography.h2, color: '#FCA5A5' },
  heroStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.lg, padding: spacing.md },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatValue: { ...typography.h4, color: colors.white },
  heroStatLabel: { ...typography.tiny, color: 'rgba(255,255,255,0.6)' },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  section: { marginBottom: spacing.md },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { ...typography.captionBold, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },

  rsvpRow: { flexDirection: 'row', gap: spacing.sm },
  rsvpBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 13, borderRadius: borderRadius.lg, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, ...shadows.xs },
  rsvpBtnText: { ...typography.captionBold, color: colors.textSecondary },
  rsvpBtnTextActive: { color: colors.white },

  playerRow: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm, ...shadows.xs },
  playerRowMaybe: { opacity: 0.7 },
  playerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryTint, justifyContent: 'center', alignItems: 'center' },
  playerAvatarMaybe: { backgroundColor: colors.backgroundTertiary },
  playerAvatarText: { ...typography.captionBold, color: colors.primary },
  playerInfo: { flex: 1 },
  playerName: { ...typography.captionBold, color: colors.text },
  playerPos: { ...typography.small, color: colors.textSecondary },
  teamBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
  teamBadgeText: { ...typography.tiny, fontWeight: '700' },

  guestRow: { backgroundColor: '#FAF5FF', borderRadius: borderRadius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: '#EDE9FE' },
  guestMeta: { ...typography.small, color: '#7C3AED' },

  adminGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  adminCard: { flex: 1, minWidth: '45%', backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, alignItems: 'center', gap: spacing.xs, ...shadows.sm, borderWidth: 1.5, borderColor: colors.border },
  adminCardLocked: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  adminCardTitle: { ...typography.smallBold, color: colors.primary, textAlign: 'center' },
  adminCardDesc: { ...typography.tiny, color: colors.textSecondary, textAlign: 'center' },

  postMatchRow: { flexDirection: 'row', gap: spacing.sm },
  postMatchBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: '#FEF3C7', borderWidth: 1.5, borderColor: '#FDE68A' },
  postMatchBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  postMatchBtnText: { ...typography.captionBold, color: '#D97706' },

  submitScoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.primary, marginBottom: spacing.sm },
  submitScoreBtnText: { ...typography.captionBold, color: colors.white },
  motmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: '#FEF3C7', borderWidth: 1.5, borderColor: '#FDE68A' },
  motmBtnText: { ...typography.captionBold, color: '#D97706' },
  rateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: '#F5F3FF', borderWidth: 1.5, borderColor: '#DDD6FE' },
  rateBtnText: { ...typography.captionBold, color: '#7C3AED' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, padding: spacing.lg, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  modalTitle: { ...typography.h3, color: colors.primary, marginBottom: spacing.lg },
  scoreInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, marginBottom: spacing.lg },
  scoreInputBlock: { alignItems: 'center' },
  scoreInputLabel: { ...typography.captionBold, color: colors.textSecondary, marginBottom: spacing.sm },
  scoreInput: { width: 72, height: 72, borderWidth: 2, borderColor: colors.border, borderRadius: borderRadius.xl, textAlign: 'center', fontSize: 32, fontWeight: '700', color: colors.primary },
  scoreInputVs: { ...typography.h3, color: colors.textTertiary, marginTop: spacing.lg },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.backgroundTertiary, alignItems: 'center' },
  cancelBtnText: { ...typography.captionBold, color: colors.textSecondary },
  confirmBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.primary, alignItems: 'center' },
  confirmBtnText: { ...typography.captionBold, color: colors.white },

  playerStatsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playerStatItem: { flex: 1, alignItems: 'center', gap: 2 },
  playerStatValue: { ...typography.h4, color: colors.primary },
  playerStatLabel: { ...typography.tiny, color: colors.textSecondary },
  playerStatDivider: { width: 1, height: 36, backgroundColor: colors.border },

  // Finalise / payments
  finaliseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.lg,
    backgroundColor: '#16A34A', marginBottom: spacing.sm,
  },
  modalSub: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 },
  finaliseInputRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  finaliseInputBlock: { flex: 1, alignItems: 'center' },
  finaliseInputLabel: { ...typography.smallBold, color: colors.textSecondary, marginBottom: spacing.sm },
  finaliseInput: {
    width: '100%', height: 56,
    borderWidth: 2, borderColor: colors.border, borderRadius: borderRadius.xl,
    textAlign: 'center', fontSize: 22, fontWeight: '700', color: colors.primary,
  },
  costPreview: {
    backgroundColor: '#F0FDF4', borderRadius: borderRadius.xl,
    padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm,
    borderWidth: 1.5, borderColor: '#86EFAC',
  },
  costPreviewLabel: { ...typography.small, color: '#16A34A' },
  costPreviewValue: { ...typography.h2, color: '#16A34A', marginTop: 2 },

  paymentSummaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  paymentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: borderRadius.full, borderWidth: 1.5,
  },
  paymentChipText: { ...typography.tiny, fontWeight: '700' },

  paymentRow: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    padding: spacing.md, flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, marginBottom: spacing.sm, ...shadows.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  paymentAmount: { ...typography.smallBold, color: '#16A34A', marginTop: 2 },
  paymentActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  paidToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.backgroundTertiary,
  },
  paidToggleActive: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  unpaidToggle:     { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  paidToggleText:   { ...typography.tiny, fontWeight: '700', color: '#6B7280' },
  paidToggleTextActive: { color: '#16A34A' },
  reminderBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FDE68A',
    justifyContent: 'center', alignItems: 'center',
  },
  reminderBtnSent: { backgroundColor: colors.backgroundTertiary, borderColor: colors.border },
});
