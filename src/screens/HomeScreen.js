import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image, ScrollView } from 'react-native';
import axios from 'axios';
import { DateTime } from 'luxon';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const PRAYER_SOURCES = [
  {
    id: 'uk',
    label: 'UK (Slough)',
    api: 'https://www.tashkeel.lk/api/uk-prayer-times.json',
    timeZone: 'Europe/London',
    accent: '#F5B400',
  },
  {
    id: 'lk',
    label: 'Sri Lanka (Colombo)',
    api: 'https://www.tashkeel.lk/api/srilanka-prayer-times.json',
    timeZone: 'Asia/Colombo',
    accent: '#FF8C42',
  },
];

const friendlyName = (playlist) =>
  playlist ? playlist.charAt(0).toUpperCase() + playlist.slice(1) : 'Next Prayer';

const formatCountdown = (diff) => {
  const totalMinutes = Math.max(Math.round(diff.as('minutes')), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
};

const computePrayers = (entries, zone) => {
  const now = DateTime.now().setZone(zone);
  const daily = {};
  const schedule = (entries || [])
    .map((item) => {
      const dt = DateTime.fromFormat(
        `${item.start_date} ${item.start_time}`,
        'yyyy-LL-dd HHmm',
        { zone }
      );
      return { ...item, dateTime: dt };
    })
    .filter((item) => item.dateTime.isValid)
    .sort((a, b) => a.dateTime - b.dateTime);

  schedule.forEach((item) => {
    const dateKey = item.start_date;
    if (!daily[dateKey]) {
      daily[dateKey] = [];
    }
    daily[dateKey].push({
      name: friendlyName(item.playlist),
      time: DateTime.fromFormat(item.start_time, 'HHmm', { zone }).toFormat('h:mm a'),
    });
  });

  let nextEntry =
    schedule.find((item) => item.dateTime >= now) ||
    (schedule.length ? { ...schedule[0] } : null);

  if (!nextEntry) {
    return null;
  }

  let adjustedDateTime = nextEntry.dateTime;
  let safety = 0;
  while (adjustedDateTime <= now && safety < 365) {
    adjustedDateTime = adjustedDateTime.plus({ days: 1 });
    safety += 1;
  }

  const countdown = adjustedDateTime.diff(now, ['hours', 'minutes']);
  const adjustedDateKey = adjustedDateTime.toFormat('yyyy-LL-dd');
  const daySchedule = daily[adjustedDateKey] || daily[nextEntry.start_date] || [];

  return {
    name: friendlyName(nextEntry.playlist),
    time: adjustedDateTime.toFormat('h:mm a'),
    dateLabel: adjustedDateTime.toFormat('MMM dd'),
    countdownLabel: formatCountdown(countdown),
    daySchedule,
    dayLabel: adjustedDateTime.toFormat('EEEE'),
  };
};

const PrayerCard = ({ label, accent, data, loading, error }) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Prayer Times</Text>
        <Ionicons name="time" size={18} color="#d0f0e4" />
      </View>
      <View style={styles.locationRow}>
        <Text style={[styles.locationPill, styles.locationActive]}>{label}</Text>
      </View>
      {loading ? (
        <View style={styles.cardBody}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : error ? (
        <View style={styles.cardBody}>
          <Text style={styles.errorText}>Unable to load prayer times.</Text>
        </View>
      ) : (
        <>
          <View style={styles.cardBody}>
            <View style={[styles.iconContainer, { backgroundColor: '#fff' }]}>
              <Ionicons name="sunny" size={24} color={accent} />
            </View>
            <View style={styles.detailColumn}>
              <Text style={styles.nextLabel}>NEXT: {data?.name}</Text>
              <View style={styles.infoRow}>
                <Ionicons name="time" size={16} color="#d0f0e4" />
                <Text style={styles.infoText}>{data?.time}</Text>
                <Text style={styles.dot}>•</Text>
                <Ionicons name="calendar" size={16} color="#d0f0e4" />
                <Text style={styles.infoText}>{data?.dateLabel}</Text>
              </View>
            </View>
            <View style={styles.countdownPill}>
              <Text style={styles.countdownText}>{data?.countdownLabel}</Text>
            </View>
          </View>
          <View style={styles.scheduleList}>
            <Text style={styles.dayHeading}>{data?.dayLabel} Schedule</Text>
            {data?.daySchedule?.map((slot) => (
              <View key={`${slot.name}-${slot.time}`} style={styles.scheduleRow}>
                <Text style={styles.scheduleName}>{slot.name}</Text>
                <Text style={styles.scheduleTime}>{slot.time}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const fetchPrayerData = async (url) => {
  const response = await axios.get(url);
  return response.data;
};

const extractLecturer = (description = '') => {
  const plain = description.replace(/\*\*/g, '');
  const match = plain.match(/Lecturer[^:–-]*[:–-]\s*(.+)/i);
  if (match && match[1]) {
    return match[1].split('\n')[0].trim();
  }
    const altMatch = plain.match(/By[:–-]\s*(.+)/i);
    if (altMatch && altMatch[1]) {
      return altMatch[1].split('\n')[0].trim();
    }
  return '';
};

const BayansStrip = ({ items, onSelect }) => (
  <View style={styles.bayansCard}>
    <View style={styles.bayansHeader}>
      <Text style={styles.bayansTitle}>Latest Bayans</Text>
      <Ionicons name="play-circle" size={20} color="#fff" />
    </View>
    {items.length === 0 ? (
      <Text style={styles.bayansEmpty}>No recent bayans available.</Text>
    ) : (
      items.map((bayan) => (
        <TouchableOpacity
          key={bayan.id}
          style={styles.bayanRow}
          onPress={() => onSelect(bayan)}
        >
          <Image source={{ uri: bayan.thumbnail }} style={styles.bayanThumb} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bayanTitle} numberOfLines={2}>
              {bayan.title}
            </Text>
            <Text style={styles.bayanDate}>
              By: {bayan.lecturer || extractLecturer(bayan.description) || 'Unknown'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#0F8D6B" />
        </TouchableOpacity>
      ))
    )}
  </View>
);

const HomeScreen = () => {
  const [prayerState, setPrayerState] = useState(
    PRAYER_SOURCES.reduce((acc, src) => {
      acc[src.id] = { loading: true, data: null, error: null };
      return acc;
    }, {})
  );
  const [latestBayans, setLatestBayans] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    PRAYER_SOURCES.forEach((source) => {
      fetchPrayerData(source.api)
        .then((data) => {
          const next = computePrayers(data, source.timeZone);
          setPrayerState((prev) => ({
            ...prev,
            [source.id]: { loading: false, data: next, error: null },
          }));
        })
        .catch(() => {
          setPrayerState((prev) => ({
            ...prev,
            [source.id]: { loading: false, data: null, error: true },
          }));
        });
    });
    axios
      .get('https://www.tashkeel.lk/api/videos.json')
      .then((response) => {
        const sorted = [...(response.data || [])].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        setLatestBayans(sorted.slice(0, 3));
      })
      .catch(() => setLatestBayans([]));
  }, []);

  const [activeTab, setActiveTab] = useState(PRAYER_SOURCES[0].id);
  const activeSource = PRAYER_SOURCES.find((src) => src.id === activeTab);
  const activeState = prayerState[activeTab];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.tabRow}>
        {PRAYER_SOURCES.map((src) => (
          <TouchableOpacity
            key={src.id}
            style={[styles.tabButton, activeTab === src.id && styles.tabButtonActive]}
            onPress={() => setActiveTab(src.id)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === src.id && styles.tabTextActive,
              ]}
            >
              {src.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <PrayerCard
        label={activeSource.label}
        accent={activeSource.accent}
        {...activeState}
      />
      <BayansStrip
        items={latestBayans}
        onSelect={(item) => navigation.navigate('Bayans', { featuredVideo: item })}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECF7F3',
  },
  listContent: {
    padding: 16,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: '#d8f4ea',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#0F8D6B',
  },
  tabText: {
    color: '#0F8D6B',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#0F8D6B',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#0f4d3a',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    borderWidth: 1,
    borderColor: '#1aa07d',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  locationRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  locationPill: {
    color: '#0F8D6B',
    backgroundColor: '#d8f4ea',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    fontWeight: '600',
  },
  locationActive: {
    backgroundColor: '#0B4733',
    color: '#fff',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#096c50',
    borderRadius: 18,
    padding: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailColumn: {
    flex: 1,
  },
  nextLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  infoText: {
    color: '#d0f0e4',
    fontSize: 14,
  },
  dot: {
    color: '#d0f0e4',
  },
  countdownPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  countdownText: {
    color: '#fff',
    fontWeight: '600',
  },
  scheduleList: {
    marginTop: 12,
    backgroundColor: '#07523d',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dayHeading: {
    color: '#dff4ec',
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  scheduleName: {
    color: '#fff',
    fontWeight: '600',
  },
  scheduleTime: {
    color: '#d0f0e4',
  },
  errorText: {
    color: '#fff',
  },
  bayansCard: {
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: '#0F8D6B',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#0f4d3a',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  bayansHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bayansTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bayansEmpty: {
    color: '#dff4ec',
    fontSize: 13,
  },
  bayanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    columnGap: 10,
  },
  bayanThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  bayanTitle: {
    color: '#0B4733',
    fontWeight: '600',
    fontSize: 14,
  },
  bayanDate: {
    color: '#4c6b5f',
    fontSize: 12,
    marginTop: 4,
  },
});

export default HomeScreen;

