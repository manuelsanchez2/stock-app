"use client"
import "./globals.css"
import { RemoteStorageProvider } from "../contexts/RemoteStorageContext"

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Haushaltsbestand · einkauf/stock</title>
        <meta name="description" content="Minimaler Haushalts-Tracker mit RemoteStorage im Scope einkauf/stock." />
      </head>
      <body className="min-h-screen bg-white text-neutral-900">
        <RemoteStorageProvider>
          <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </RemoteStorageProvider>
      </body>
    </html>
  )
}
