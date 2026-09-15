'use client'

import { useState, useRef, useCallback } from 'react'
import { ImageIcon, Loader2, X } from 'lucide-react'

interface ImageUploadProps {
  /** Called with the public Supabase URL once upload succeeds */
  onUploaded: (url: string) => void
  /** Optional existing image URL to preview initially */
  existingUrl?: string
  /** Folder inside the bucket, e.g. "products" */
  folder?: string
  label?: string
}

export function ImageUpload({
  onUploaded,
  existingUrl,
  folder = 'products',
  label = 'Upload Image',
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(existingUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return

      const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
      if (!validTypes.includes(file.type)) {
        setError('Invalid file type. Use PNG, JPG, WEBP, or GIF.')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File is too large. Max size is 5 MB.')
        return
      }

      setError(null)
      setUploading(true)

      // Show local preview immediately
      const localUrl = URL.createObjectURL(file)
      setPreview(localUrl)

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', folder)

        const res = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        })

        const json = await res.json()

        if (!res.ok || json.error) {
          throw new Error(json.error || 'Upload failed.')
        }

        setPreview(json.url)
        onUploaded(json.url)
      } catch (err: any) {
        setError(err?.message || 'Upload failed. Please try again.')
        setPreview(existingUrl || null)
      } finally {
        setUploading(false)
      }
    },
    [folder, existingUrl, onUploaded],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">
          {label}
        </label>
      )}

      <div
        className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer
          ${dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.01]'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}
          ${uploading
            ? 'pointer-events-none opacity-70'
            : 'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10'}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {preview ? (
          <div className="relative h-40 flex items-center justify-center p-2">
            <img
              src={preview}
              alt="Preview"
              className="max-h-full max-w-full object-contain rounded-lg drop-shadow-sm"
            />
            {!uploading && (
              <button
                type="button"
                className="absolute top-2 right-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 shadow-sm hover:bg-red-50 hover:border-red-300 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setPreview(null)
                  onUploaded('')
                }}
              >
                <X className="w-3.5 h-3.5 text-slate-500 hover:text-red-500" />
              </button>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 flex items-center justify-center rounded-xl backdrop-blur-sm">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 flex flex-col items-center justify-center text-center gap-2">
            <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-1">
              {uploading ? (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              ) : (
                <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {uploading ? 'Uploading…' : 'Click to upload or drag & drop'}
            </p>
            <p className="text-xs text-slate-500">PNG, JPG, WEBP (max. 5 MB)</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <X className="w-3 h-3 shrink-0" /> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
