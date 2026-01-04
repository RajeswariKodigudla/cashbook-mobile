import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { transactionsAPI } from '../services/api';
import { filterByRange } from '../utils/dateFilters';
import Header from '../components/Header';
import Drawer from '../components/Drawer';
import SummaryBar from '../components/SummaryBar';
import AddAccountModal from '../components/AddAccountModal';
import { getCurrentAccount } from '../utils/accounts';

export default function HomeScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [range, setRange] = useState('all');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [summary, setSummary] = useState({
    total_income: 0,
    total_expense: 0,
    net_total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Reload data when screen comes into focus (e.g., returning from EditTransaction)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 Home screen focused - reloading data...');
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [transactionsData, summaryData] = await Promise.all([
        transactionsAPI.getAll(),
        transactionsAPI.getSummary(),
      ]);
      
      // Handle transactions response
      let transactionsArray = [];
      if (Array.isArray(transactionsData)) {
        transactionsArray = transactionsData;
      } else if (transactionsData?.results) {
        transactionsArray = transactionsData.results;
      } else if (transactionsData?.data?.results) {
        transactionsArray = transactionsData.data.results;
      } else if (transactionsData?.data && Array.isArray(transactionsData.data)) {
        transactionsArray = transactionsData.data;
      }
      
      setTransactions(transactionsArray);
      
      // Handle summary response - normalize field names
      let normalizedSummary = {
        total_income: 0,
        total_expense: 0,
        net_total: 0,
      };
      
      if (summaryData) {
        // Handle different response formats
        normalizedSummary = {
          total_income: summaryData.total_income || summaryData.totalIncome || 0,
          total_expense: summaryData.total_expense || summaryData.totalExpense || 0,
          net_total: summaryData.net_total || summaryData.balance || 
                     (summaryData.total_income || summaryData.totalIncome || 0) - 
                     (summaryData.total_expense || summaryData.totalExpense || 0),
        };
      }
      
      console.log('📊 Summary loaded:', normalizedSummary);
      setSummary(normalizedSummary);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', error.message || 'Failed to load data');
      // Set default values on error
      setSummary({
        total_income: 0,
        total_expense: 0,
        net_total: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter transactions when range or search changes
  useEffect(() => {
    let filtered = filterByRange(transactions, range);
    
    // Apply search filter
    if (search) {
      filtered = filtered.filter(
        (t) =>
          (t.name && t.name.toLowerCase().includes(search.toLowerCase())) ||
          (t.remark && t.remark.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    setFilteredTransactions(filtered);
  }, [transactions, range, search]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderTransaction = ({ item }) => {
    const isIncome = item.type === 'Income' || item.type === 'income';
    const amount = parseFloat(item.amount);
    const timeStr = item.time ? item.time.substring(0, 8) : '';
    
    return (
      <TouchableOpacity
        style={styles.transactionRow}
        onPress={() => {
          navigation.navigate('EditTransaction', { id: item.id });
        }}
      >
        <View style={styles.transactionLeft}>
          <Text style={styles.transactionName}>{item.name || item.type || 'No name'}</Text>
          <Text style={styles.transactionTime}>
            {item.date} · {timeStr || '00:00:00'}
          </Text>
        </View>
        <View style={styles.transactionCenter}>
          <Text style={styles.transactionAccount}>{item.mode || 'Cash'}</Text>
        </View>
        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.transactionAmount,
              isIncome ? styles.incomeAmount : styles.expenseAmount,
            ]}
          >
            {isIncome ? '+' : '-'}₹{amount.toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER - Matching web app */}
      <Header
        navigation={navigation}
        onOpenDrawer={() => setDrawerOpen(true)}
        onSearch={() => setSearchOpen(true)}
        onExport={() => navigation.navigate('Export')}
        onCalendar={() => navigation.navigate('Calendar')}
        onMoreMenu={(action) => {
          if (action === 'sort') {
            Alert.alert('Sort', 'Sort functionality coming soon');
          }
        }}
      />

      {/* SEARCH MODAL */}
      {searchOpen && (
        <View style={styles.searchModal}>
          <View style={styles.searchHeader}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
              value={search}
              onChangeText={setSearch}
              autoFocus
              placeholderTextColor="#999"
            />
            <View style={{ width: 10 }} />
            <TouchableOpacity
              onPress={() => {
                setSearch('');
                setSearchOpen(false);
              }}
            >
              <Text style={styles.searchClose}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FILTER TABS - Matching web app */}
      <View style={styles.filterTabs}>
        {['all', 'daily', 'weekly', 'monthly', 'yearly'].map((tab, index) => (
          <React.Fragment key={tab}>
            {index > 0 && <View style={{ width: 10 }} />}
            <TouchableOpacity
              style={[
                styles.filterTab,
                range === tab && styles.filterTabActive,
              ]}
              onPress={() => setRange(tab)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  range === tab && styles.filterTabTextActive,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      {/* LOADING STATE */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2f80ed" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      )}

      {/* TRANSACTIONS LIST - Matching web app */}
      {!loading && (
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.bookIconWrapper}>
                <Text style={styles.bookIcon}>📖</Text>
                <Text style={styles.bookC}>C</Text>
              </View>
              <Text style={styles.emptyText}>No Transaction Yet</Text>
              <Text style={styles.downArrow}>↓</Text>
            </View>
          }
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: 120 }, // Space for summary bar
          ]}
        />
      )}

      {/* SUMMARY BAR - Matching web app (fixed at bottom) */}
      <SummaryBar
        summary={summary}
        onIncome={() => navigation.navigate('Income')}
        onExpense={() => navigation.navigate('Expense')}
      />

      {/* DRAWER */}
      <Drawer
        show={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
        onAddAccount={() => {
          setDrawerOpen(false);
          setShowAddAccount(true);
        }}
      />

      {/* ADD ACCOUNT MODAL */}
      <AddAccountModal
        visible={showAddAccount}
        onClose={() => setShowAddAccount(false)}
        onSaved={async (accountName) => {
          // Reload header to update account name
          await loadData();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  filterTabs: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  filterTabActive: {
    backgroundColor: '#2f80ed',
    borderColor: '#2f80ed',
  },
  filterTabText: {
    fontSize: 14,
    color: '#000',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 10,
    paddingHorizontal: 14,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  transactionLeft: {
    flex: 2,
  },
  transactionName: {
    fontWeight: '500',
    fontSize: 16,
    color: '#000',
  },
  transactionTime: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  transactionCenter: {
    flex: 1,
    alignItems: 'center',
  },
  transactionAccount: {
    color: '#555',
    fontSize: 14,
  },
  transactionRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontWeight: '600',
    fontSize: 16,
  },
  incomeAmount: {
    color: 'green',
  },
  expenseAmount: {
    color: '#f44336',
  },
  emptyState: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  bookIconWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookIcon: {
    fontSize: 100,
    color: '#e0e0e0',
  },
  bookC: {
    position: 'absolute',
    fontSize: 36,
    fontWeight: '600',
    color: '#555',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#777',
  },
  downArrow: {
    fontSize: 32,
    color: '#aaa',
    marginTop: 6,
  },
  searchModal: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    zIndex: 1000,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  searchClose: {
    fontSize: 20,
    color: '#666',
    padding: 5,
  },
});
