"use client"

import { createContext, useContext, useMemo, useState } from "react"
import { useRemoteStorage } from "../hooks/use-remote-storage"
import { useData } from "../hooks/use-data"
import { EinkaufModule } from "../lib/remotestorage-module"
import RemoteStorageWidget from "../components/RemoteStorageWidget"

const RemoteStorageContext = createContext(null)

/**
 * RemoteStorageProvider using the hook-based architecture
 * Wraps your app to provide RemoteStorage functionality
 */
export function RemoteStorageProvider({ children }) {
  // Initialize RemoteStorage with your module
  const remoteStorage = useRemoteStorage({
    modules: [EinkaufModule],
    accessClaims: {
      'einkauf': 'rw'  // Read-write access to the "einkauf" scope
    }
  })

  // Allow forcing a widget re-mount if the user can't see it
  const [widgetRefreshKey, setWidgetRefreshKey] = useState(0)
  const refreshWidget = () => setWidgetRefreshKey((key) => key + 1)

  // Initialize data sync
  const data = useData(remoteStorage)

  // Memoize context value to prevent unnecessary rerenders
  const value = useMemo(() => ({
    // RemoteStorage instance
    remoteStorage,
    refreshWidget,

    // Connection state
    isConnected: data.isConnected,
    isLoading: data.isLoading,

    // Data and methods from useData hook
    ...data
  }), [remoteStorage, data, refreshWidget])

  return (
    <RemoteStorageContext.Provider value={value}>
      {children}
      {/* Widget for connecting to RemoteStorage */}
      {remoteStorage && (
        <RemoteStorageWidget
          remoteStorage={remoteStorage}
          refreshKey={widgetRefreshKey}
        />
      )}
    </RemoteStorageContext.Provider>
  )
}

/**
 * Hook to access RemoteStorage context
 * @returns {Object} RemoteStorage context value
 */
export function useRemoteStorageContext() {
  const context = useContext(RemoteStorageContext)
  if (!context) {
    throw new Error("useRemoteStorageContext must be used within a RemoteStorageProvider")
  }
  return context
}
