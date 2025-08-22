// This file is for a secondary Firebase app instance used for maintenance mode.
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getDatabase } from '@firebase/database';

const maintenanceFirebaseConfig = {
  apiKey: "AIzaSyBAMw5PYgRjyfiXpacWRNbx3GAY2xm08Zc",
  authDomain: "disable-93155.firebaseapp.com",
  databaseURL: "https://disable-93155-default-rtdb.firebaseio.com",
  projectId: "disable-93155",
  storageBucket: "disable-93155.firebasestorage.app",
  messagingSenderId: "843565872569",
  appId: "1:843565872569:web:118231d4e8066d27a93268"
};

// Initialize the secondary Firebase app for maintenance mode
const maintenanceApp = !getApps().some(app => app.name === 'maintenance')
  ? initializeApp(maintenanceFirebaseConfig, 'maintenance')
  : getApp('maintenance');

const maintenanceDb = getDatabase(maintenanceApp);

export { maintenanceDb };
