'use client'

import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'

interface ItemSetupFormProps {
  currentItem?: { name: string; imageUrl: string | null; startingPrice: number }
  onItemUpdated?: () => void
  phase?: 'idle' | 'active' | 'ended'
}

export default function ItemSetupForm({ currentItem, onItemUpdated, phase }: ItemSetupFormProps) {
  const [itemName, setItemName] = useState(currentItem?.name ?? '')
  const [startingPrice, setStartingPrice] = useState<number | ''>(currentItem?.startingPrice ?? '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEnded = phase === 'ended'

  // Sync fields when currentItem changes from server (e.g. after reset or reconnect)
  // Use JSON stringify to detect deep changes reliably
  const currentItemKey = JSON.stringify(currentItem)
  useEffect(() => {
    // When phase transitions to ended or idle, clear the form so operator enters fresh item details
    if (phase === 'ended' || (phase === 'idle' && !currentItem?.name)) {
      setItemName('')
      setStartingPrice('')
      setImageFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (currentItem && currentItem.name) {
      setItemName(currentItem.name)
      setStartingPrice(currentItem.startingPrice === 0 ? '' : currentItem.startingPrice)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItemKey, phase])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!itemName.trim()) {
      toast.error('Item name is required')
      return
    }
    if (startingPrice === '' || startingPrice < 0) {
      toast.error('Starting price must be a non-negative number')
      return
    }

    setLoading(true)

    try {
      let itemImageUrl: string | undefined

      if (imageFile) {
        const formData = new FormData()
        formData.append('image', imageFile)

        const uploadRes = await fetch('/api/auction/image', {
          method: 'POST',
          body: formData,
        })

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}))
          throw new Error(err.error ?? 'Image upload failed')
        }

        const { url } = await uploadRes.json()
        itemImageUrl = url
      }

      const updateRes = await fetch('/api/auction/item', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: itemName.trim(),
          startingPrice: Number(startingPrice),
          ...(itemImageUrl !== undefined && { itemImageUrl }),
        }),
      })

      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to update item')
      }

      toast.success('Item updated — preview refreshed')
      onItemUpdated?.()

      setImageFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Item Setup</h2>

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="space-y-1">
          <label htmlFor="item-name" className="block text-xs font-medium text-zinc-400">Item Name</label>
          <input
            id="item-name"
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. Vintage Watch"
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="starting-price" className="block text-xs font-medium text-zinc-400">Starting Price</label>
          <input
            id="starting-price"
            type="number"
            min={0}
            step="any"
            value={startingPrice}
            onChange={(e) => setStartingPrice(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="item-image" className="block text-xs font-medium text-zinc-400">
            Image <span className="text-zinc-600">(optional)</span>
          </label>
          <input
            id="item-image"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-zinc-700 file:text-zinc-200 hover:file:bg-zinc-600 cursor-pointer"
          />
          {imageFile && <p className="text-xs text-zinc-500 truncate">{imageFile.name}</p>}
          {currentItem?.imageUrl && !imageFile && (
            <p className="text-xs text-zinc-600 truncate">Current: {currentItem.imageUrl.split('/').pop()}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-amber-800 disabled:cursor-not-allowed text-zinc-950 font-semibold py-1.5 text-sm transition-colors"
        >
          {loading ? 'Updating…' : isEnded ? 'Set Item for Next Auction' : 'Update Item'}
        </button>
      </form>
    </div>
  )
}
