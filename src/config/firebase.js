import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, get, onValue, push, remove, update } from 'firebase/database'
import { getAnalytics } from 'firebase/analytics'

// Firebase configuration for Crescent Staffing Utility
const firebaseConfig = {
  apiKey: "AIzaSyBqup0Oux6YfzxehTr44x1Gpquv79hUdxM",
  authDomain: "crescent-staffing-utility.firebaseapp.com",
  databaseURL: "https://crescent-staffing-utility-default-rtdb.firebaseio.com",
  projectId: "crescent-staffing-utility",
  storageBucket: "crescent-staffing-utility.firebasestorage.app",
  messagingSenderId: "830105932572",
  appId: "1:830105932572:web:4107c143bec0d6687c60d9",
  measurementId: "G-V418GQXK3R"
}

// Initialize Firebase
let app = null
let db = null
let analytics = null
let isFirebaseConfigured = false

try {
  app = initializeApp(firebaseConfig)
  db = getDatabase(app)

  // Only initialize analytics in browser environment
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app)
  }

  isFirebaseConfigured = true
  console.log('Firebase initialized successfully')
} catch (error) {
  console.error('Firebase initialization error:', error)
}

// Database reference paths
export const DB_PATHS = {
  STAFFING: 'staffing',
  CORE_ASSOCIATES: 'settings/coreAssociates',
  ACTIVE_ASSOCIATES: 'activeAssociates',
  ASSIGNMENTS: 'assignments',
  SCAN_LOG: 'scanLog',
  KIOSK_SETTINGS: 'kioskSettings'
}

// Export Firebase utilities
export {
  app,
  db,
  analytics,
  isFirebaseConfigured,
  ref,
  set,
  get,
  onValue,
  push,
  remove,
  update
}

// Helper function to create a document reference
export const getRef = (path) => {
  if (!db) return null
  return ref(db, path)
}

// Helper function to save data
export const saveData = async (path, data) => {
  if (!db) {
    console.warn('Firebase not configured, saving to localStorage only')
    return false
  }

  try {
    await set(ref(db, path), data)
    return true
  } catch (error) {
    console.error('Firebase save error:', error)
    throw error
  }
}

// Helper function to load data
export const loadData = async (path) => {
  if (!db) {
    console.warn('Firebase not configured')
    return null
  }

  try {
    const snapshot = await get(ref(db, path))
    return snapshot.exists() ? snapshot.val() : null
  } catch (error) {
    console.error('Firebase load error:', error)
    throw error
  }
}

// Subscribe to real-time updates
export const subscribeToData = (path, callback) => {
  if (!db) {
    console.warn('Firebase not configured')
    return () => {}
  }

  const unsubscribe = onValue(ref(db, path), (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null)
  }, (error) => {
    console.error('Firebase subscription error:', error)
  })

  return unsubscribe
}
