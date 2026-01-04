import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { removeAuthToken } from '../config/api';
import { drawerMenu } from '../data/drawerMenu';

export default function Drawer({ show, onClose, navigation, user, onAddAccount }) {
  const handleClick = (item) => {
    if (item.label === 'Add Account') {
      // Handle add account
      if (onAddAccount) {
        onAddAccount();
      }
      onClose();
      return;
    }

    if (item.path) {
      // Navigate to screen
      const routeName = item.path.replace('/', '');
      if (routeName === '') {
        navigation?.navigate('Home');
      } else {
        // Map paths to screen names
        const routeMap = {
          'calendar': 'Calendar',
          'summary': 'Summary',
          'alltransactions': 'Alltransactions',
          'export': 'Export',
          'bookmark': 'Bookmark',
          'notebook': 'Notebook',
          'cash-counter': 'Cashcounter',
          'calculator': 'Calculator',
          'backup-restore': 'BackupRestore',
          'app-lock': 'Applock',
          'settings': 'Settings',
          'faq': 'Faq',
        };
        
        const screenName = routeMap[routeName] || 
          routeName.charAt(0).toUpperCase() + routeName.slice(1).replace(/-/g, '');
        navigation?.navigate(screenName);
      }
    }
    onClose();
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await removeAuthToken();
            navigation?.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={show}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.drawer}>
          {/* HEADER */}
          <View style={styles.drawerHeader}>
            <View style={styles.drawerLeft}>
              <MaterialIcons name="menu" size={24} color="#4a90a4" />
              <View style={{ width: 8 }} />
              <Text style={styles.drawerTitle}>Cashbook</Text>
              <View style={{ width: 8 }} />
              <MaterialIcons name="expand-more" size={20} color="#4a90a4" />
            </View>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* USER INFO */}
          {user && (
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.username || 'User'}</Text>
              <Text style={styles.userStatus}>Logged in</Text>
            </View>
          )}

          {/* MENU ITEMS */}
          <ScrollView style={styles.menuContainer}>
            {drawerMenu.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.drawerItem}
                onPress={() => handleClick(item)}
              >
                <MaterialIcons name={getIconName(item.icon)} size={22} color="#000" />
                <View style={{ width: 18 }} />
                <Text style={styles.drawerItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* LOGOUT BUTTON */}
          <TouchableOpacity
            style={[styles.drawerItem, styles.logoutItem]}
            onPress={handleLogout}
          >
            <MaterialIcons name="logout" size={22} color="#d32f2f" />
            <View style={{ width: 18 }} />
            <Text style={[styles.drawerItemText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Map Material Icons names
function getIconName(icon) {
  const iconMap = {
    home: 'home',
    'calendar-month': 'calendar-month',
    description: 'description',
    'list-alt': 'list-alt',
    'person-add': 'person-add',
    'file-upload': 'file-upload',
    'bookmark-border': 'bookmark-border',
    'menu-book': 'menu-book',
    payments: 'payments',
    calculate: 'calculate',
    'cloud-upload': 'cloud-upload',
    lock: 'lock',
    settings: 'settings',
    'help-outline': 'help-outline',
    'mail-outline': 'mail-outline',
  };
  return iconMap[icon] || 'circle';
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    width: '85%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  drawerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerTitle: {
    fontSize: 28,
    color: '#4a90a4',
    fontWeight: '500',
  },
  userInfo: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 10,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 12,
    color: '#666',
  },
  menuContainer: {
    flex: 1,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    fontSize: 16,
  },
  drawerItemText: {
    fontSize: 16,
    color: '#000',
  },
  logoutItem: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  logoutText: {
    color: '#d32f2f',
  },
});

