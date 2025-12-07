"use client"

import { useMemo, useState } from "react"
import { useRemoteStorageContext } from "../contexts/RemoteStorageContext"

const CATEGORY_OPTIONS = [
  { id: "lebensmittel", label: "Lebensmittel", requiresExpiration: true },
  { id: "reinigung", label: "Reinigungs/Hygiene" },
  { id: "elektronik", label: "Elektronik" },
  { id: "kueche", label: "Küche" },
  { id: "andere", label: "Andere" }
]

const UNIT_OPTIONS = ["Stk", "Pack", "Flasche", "Beutel", "g", "kg", "L"]

const EMPTY_FORM = {
  name: "",
  category: CATEGORY_OPTIONS[0].id,
  quantity: 1,
  unit: UNIT_OPTIONS[0],
  expirationDate: "",
  notes: "",
  requestAiEstimate: true
}

export default function Home() {
  const {
    isConnected,
    isLoading,
    itemsList,
    saveItem,
    loadItem,
    deleteItem,
    refreshWidget
  } = useRemoteStorageContext()

  const [formState, setFormState] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const categoryLookup = useMemo(
    () => CATEGORY_OPTIONS.reduce((acc, cur) => ({ ...acc, [cur.id]: cur }), {}),
    []
  )

  const groupedList = useMemo(() => {
    const initial = CATEGORY_OPTIONS.reduce((acc, cat) => {
      acc[cat.id] = []
      return acc
    }, {})

    itemsList.forEach((item) => {
      const category = item.category || "andere"
      if (!initial[category]) {
        initial["andere"].push(item)
      } else {
        initial[category].push(item)
      }
    })

    return initial
  }, [itemsList])

  const setTimedMessage = (text, type = "info") => {
    if (type === "error") {
      setError(text)
    } else {
      setMessage(text)
    }
    setTimeout(() => {
      setMessage("")
      setError("")
    }, 2800)
  }

  const resetForm = () => {
    setFormState(EMPTY_FORM)
    setEditingId(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError("")

    if (!formState.name.trim()) {
      setTimedMessage("Bitte einen Namen eintragen.", "error")
      return
    }

    const now = new Date().toISOString()
    const id = editingId || crypto.randomUUID?.() || Date.now().toString()
    const createdAt = selectedItem?.id === id && selectedItem?.createdAt ? selectedItem.createdAt : now

    const requiresExpiration = categoryLookup[formState.category]?.requiresExpiration
    const expiration = requiresExpiration && formState.expirationDate
      ? new Date(formState.expirationDate).toISOString()
      : null

    const aiEstimation = formState.category === "lebensmittel" && formState.requestAiEstimate
      ? {
          status: selectedItem?.aiEstimation?.status === "ready" ? "ready" : "pending",
          predictedDate: selectedItem?.aiEstimation?.predictedDate || null,
          confidence: selectedItem?.aiEstimation?.confidence || null,
          requestedAt: selectedItem?.aiEstimation?.requestedAt || now
        }
      : { status: "none", predictedDate: null, confidence: null }

    const payload = {
      id,
      name: formState.name.trim(),
      category: formState.category,
      quantity: Number(formState.quantity) > 0 ? Number(formState.quantity) : 1,
      unit: formState.unit || UNIT_OPTIONS[0],
      notes: formState.notes.trim(),
      expirationDate: expiration,
      aiEstimation,
      createdAt
    }

    try {
      await saveItem(payload)
      setSelectedItem(payload)
      setEditingId(payload.id)
      setTimedMessage(editingId ? "Aktualisiert und gespeichert." : "Gespeichert.")
    } catch (err) {
      setTimedMessage("Speichern fehlgeschlagen: " + err.message, "error")
    }
  }

  const handleLoadItem = async (id) => {
    try {
      const item = await loadItem(id)
      if (!item) {
        setTimedMessage("Eintrag nicht gefunden.", "error")
        return
      }

      setSelectedItem(item)
      setEditingId(item.id)
      setFormState({
        name: item.name || "",
        category: item.category || CATEGORY_OPTIONS[0].id,
        quantity: item.quantity || 1,
        unit: item.unit || UNIT_OPTIONS[0],
        expirationDate: item.expirationDate ? item.expirationDate.slice(0, 10) : "",
        notes: item.notes || "",
        requestAiEstimate: item.aiEstimation?.status !== "none"
      })
    } catch (err) {
      setTimedMessage("Laden fehlgeschlagen: " + err.message, "error")
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Diesen Eintrag wirklich löschen?")) return
    try {
      await deleteItem(id)
      setSelectedItem(null)
      if (editingId === id) {
        resetForm()
      }
      setTimedMessage("Eintrag gelöscht.")
    } catch (err) {
      setTimedMessage("Löschen fehlgeschlagen: " + err.message, "error")
    }
  }

  const formatDate = (value) => {
    if (!value) return "-"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "-"
    return date.toLocaleDateString("de-DE", { year: "numeric", month: "short", day: "numeric" })
  }

  const connectedLabel = isLoading ? "Prüfe Verbindung..." : isConnected ? "verbunden" : "offline"

  return (
    <div className="min-h-screen bg-white text-neutral-900 py-10">
      <div className="max-w-6xl mx-auto px-4 space-y-10">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-black/10 pb-6">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">Einkauf · Stock</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900">Haushaltsbestand</h1>
            <p className="text-neutral-600 max-w-2xl">
              Minimalistische Übersicht für Vorräte zuhause. Kategorien, Verfallsdaten für Lebensmittel
              und eine vorbereitete AI-Schätzung für Ablaufdaten.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="px-3 py-1 border border-black/20 rounded-full">{connectedLabel}</span>
            <span className="px-3 py-1 border border-black/20 rounded-full">Scope: einkauf / stock</span>
          </div>
        </header>

        {message && (
          <div className="border border-black/10 bg-white px-4 py-3 text-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="border border-black bg-black text-white px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!isConnected ? (
          <div className="border border-black/10 px-6 py-8 space-y-4">
            <p className="text-lg font-medium text-neutral-900">Verbinde RemoteStorage</p>
            <p className="text-neutral-600">Klicke auf das Widget unten rechts, melde dich an und erlaube Lese-/Schreibzugriff auf die Scope <span className="font-mono">einkauf</span>.</p>
            <ul className="list-disc pl-4 text-neutral-700 space-y-2">
              <li>Daten liegen unter <span className="font-mono">/einkauf/stock/</span>.</li>
              <li>Alle Angaben bleiben schwarz/weiß, ready für E-Ink oder Druck.</li>
            </ul>
            <div className="flex items-center gap-3 text-sm bg-neutral-50 border border-dashed border-black/10 px-3 py-2">
              <span className="text-neutral-700">Kein Widget sichtbar?</span>
              <button
                type="button"
                onClick={refreshWidget}
                className="underline underline-offset-4 text-neutral-900"
              >
                Widget neu laden
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-6">
              <section className="border border-black/10 p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {editingId ? "Bestand bearbeiten" : "Neuer Bestand"}
                  </h2>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-sm underline underline-offset-4 text-neutral-600"
                    >
                      Neu beginnen
                    </button>
                  )}
                </div>

                <form onSubmit={handleSave} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-2 text-sm">
                      <span className="text-neutral-700">Name</span>
                      <input
                        type="text"
                        value={formState.name}
                        onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                        className="border border-black/10 px-3 py-2 focus:outline-none focus:border-black"
                        placeholder="z.B. Haferflocken"
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      <span className="text-neutral-700">Kategorie</span>
                      <select
                        value={formState.category}
                        onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                        className="border border-black/10 px-3 py-2 focus:outline-none focus:border-black bg-white"
                      >
                        {CATEGORY_OPTIONS.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <label className="flex flex-col gap-2 text-sm">
                      <span className="text-neutral-700">Menge</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={formState.quantity}
                        onChange={(e) => setFormState({ ...formState, quantity: e.target.value })}
                        className="border border-black/10 px-3 py-2 focus:outline-none focus:border-black"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      <span className="text-neutral-700">Einheit</span>
                      <select
                        value={formState.unit}
                        onChange={(e) => setFormState({ ...formState, unit: e.target.value })}
                        className="border border-black/10 px-3 py-2 focus:outline-none focus:border-black bg-white"
                      >
                        {UNIT_OPTIONS.map((unit) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      <span className="text-neutral-700">MHD / Ablauf</span>
                      <input
                        type="date"
                        value={formState.expirationDate}
                        onChange={(e) => setFormState({ ...formState, expirationDate: e.target.value })}
                        className="border border-black/10 px-3 py-2 focus:outline-none focus:border-black"
                        disabled={!categoryLookup[formState.category]?.requiresExpiration}
                      />
                      {!categoryLookup[formState.category]?.requiresExpiration && (
                        <span className="text-[11px] text-neutral-500">Nicht benötigt für diese Kategorie.</span>
                      )}
                    </label>
                  </div>

                  <label className="flex flex-col gap-2 text-sm">
                    <span className="text-neutral-700">Notizen</span>
                    <textarea
                      rows={3}
                      value={formState.notes}
                      onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                      className="border border-black/10 px-3 py-2 focus:outline-none focus:border-black bg-white"
                      placeholder="Lagerort, Marke, Reserven..."
                    />
                  </label>

                  <div className="flex items-start gap-3 border border-black/10 px-3 py-3">
                    <input
                      id="ai-estimate"
                      type="checkbox"
                      checked={formState.requestAiEstimate}
                      onChange={(e) => setFormState({ ...formState, requestAiEstimate: e.target.checked })}
                      className="mt-1"
                      disabled={formState.category !== "lebensmittel"}
                    />
                    <label htmlFor="ai-estimate" className="text-sm space-y-1">
                      <span className="block text-neutral-800">AI Ablauf-Schätzung vorbereiten</span>
                      <span className="text-neutral-600">
                        Markiert Lebensmittel, damit ein späterer AI-Workflow Verfallsdaten ableiten und aktualisieren kann.
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-black text-white hover:bg-neutral-800 transition"
                    >
                      Speichern
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-black/20 text-neutral-700"
                    >
                      Zurücksetzen
                    </button>
                  </div>
                </form>
              </section>

              <section className="border border-black/10 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-900">Aktueller Bestand</h2>
                  <span className="text-sm text-neutral-500">{itemsList.length} Einträge</span>
                </div>

                {itemsList.length === 0 ? (
                  <p className="text-neutral-600">Noch nichts gespeichert. Rechts unten verbinden, dann links anlegen.</p>
                ) : (
                  <div className="space-y-4">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <div key={cat.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">{cat.label}</p>
                          <span className="text-xs text-neutral-500">{groupedList[cat.id]?.length || 0}</span>
                        </div>
                        <div className="border border-black/10 divide-y divide-black/10">
                          {(groupedList[cat.id] || []).map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between px-3 py-3 hover:bg-neutral-50"
                            >
                              <div className="space-y-1">
                                <p className="font-medium text-neutral-900">{item.name || item.title}</p>
                                <p className="text-xs text-neutral-600">
                                  {formatDate(item.expirationDate || item.updated_at)} · {item.aiStatus || item.aiEstimation?.status || "—"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <button
                                  onClick={() => handleLoadItem(item.id)}
                                  className="underline underline-offset-4 text-neutral-800"
                                >
                                  Öffnen
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="text-neutral-500 hover:text-black"
                                >
                                  Entfernen
                                </button>
                              </div>
                            </div>
                          ))}
                          {(groupedList[cat.id] || []).length === 0 && (
                            <div className="px-3 py-2 text-sm text-neutral-500">Keine Einträge.</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {selectedItem && (
              <section className="border border-black/10 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-neutral-900">Details</h3>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="text-sm underline underline-offset-4 text-neutral-700"
                  >
                    Schließen
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <Detail label="Name" value={selectedItem.name} />
                  <Detail label="Kategorie" value={categoryLookup[selectedItem.category]?.label || "Andere"} />
                  <Detail label="Menge" value={`${selectedItem.quantity} ${selectedItem.unit}`} />
                  <Detail label="Ablauf" value={formatDate(selectedItem.expirationDate)} />
                  <Detail label="Notizen" value={selectedItem.notes || "—"} />
                  <Detail label="Erstellt" value={formatDate(selectedItem.createdAt)} />
                  <Detail label="Zuletzt" value={formatDate(selectedItem.updatedAt || selectedItem.updated_at)} />
                  <Detail
                    label="AI Status"
                    value={selectedItem.aiEstimation?.status === "pending" ? "vorgemerkt" : selectedItem.aiEstimation?.status || "aus"}
                  />
                </div>
                {selectedItem.category === "lebensmittel" && (
                  <p className="text-xs text-neutral-600">
                    AI-Hinweis: Ablaufdaten können später automatisch geschätzt werden. Sobald ein Modell angeschlossen wird,
                    werden markierte Lebensmittel priorisiert.
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-neutral-500 text-xs uppercase tracking-[0.2em]">{label}</p>
      <p className="text-neutral-900">{value}</p>
    </div>
  )
}
