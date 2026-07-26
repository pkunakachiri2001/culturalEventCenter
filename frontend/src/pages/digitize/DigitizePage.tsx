/**
 * CultureFlow — AI Historical Record Digitization Workspace (Flagship Feature)
 * OCR + Gemini Vision AI field extraction, side-by-side verification, confidence highlights, duplicate detection, and database confirmation.
 */

import React, { useEffect, useState, useRef } from 'react'
import toast from 'react-hot-toast'
import {
  Sparkles,
  UploadCloud,
  FileImage,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Save,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Copy,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  Modal,
  Skeleton,
  Alert,
} from '@/components/ui'
import {
  uploadAndDigitize,
  listDigitizedRecords,
  getDigitizedRecord,
  updateDigitizedRecord,
  confirmDigitizedRecord,
  rejectDigitizedRecord,
  type ListDigitizedParams,
} from '@/services/digitize'
import type { DigitizedRecord, DigitizationStatus } from '@/types'
import { formatDateTime, formatDate, cn } from '@/utils'

export default function DigitizePage() {
  const [records, setRecords] = useState<DigitizedRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [duplicateFilter, setDuplicateFilter] = useState<boolean | undefined>(undefined)

  // Uploading state
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reviewing Active Record
  const [activeRecord, setActiveRecord] = useState<DigitizedRecord | null>(null)
  const [editedFields, setEditedFields] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // ── Fetch Records ───────────────────────────────────────────────────────────
  const loadRecords = async () => {
    setLoading(true)
    try {
      const params: ListDigitizedParams = {
        status: statusFilter || undefined,
        is_duplicate: duplicateFilter,
        page: 1,
        page_size: 50,
      }
      const data = await listDigitizedRecords(params)
      setRecords(data.items)
    } catch {
      toast.error('Failed to load digitized records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [statusFilter, duplicateFilter])

  // ── Handle File Upload ──────────────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const newRecord = await uploadAndDigitize(file)
      toast.success('Document OCR & AI Field extraction complete!')
      setActiveRecord(newRecord)
      initEditedFields(newRecord)
      loadRecords()
    } catch {
      toast.error('Failed to process document scan.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  // ── Initialize Editable Fields ──────────────────────────────────────────────
  const initEditedFields = (record: DigitizedRecord) => {
    const data: Record<string, any> = (record.extracted_data as Record<string, any>) || {}
    const fields: Record<string, string> = {
      visitor_name: String(data.visitor_name?.value ?? ''),
      school: String(data.school?.value ?? ''),
      teacher: String(data.teacher?.value ?? ''),
      phone: String(data.phone?.value ?? ''),
      email: String(data.email?.value ?? ''),
      province: String(data.province?.value ?? 'Harare'),
      country: String(data.country?.value ?? 'Zimbabwe'),
      visit_date: String(data.visit_date?.value ?? ''),
      num_students: String(data.num_students?.value ?? ''),
      num_teachers: String(data.num_teachers?.value ?? ''),
      payment: String(data.payment?.value ?? ''),
      purpose: String(data.purpose?.value ?? ''),
      notes: String(data.notes?.value ?? ''),
    }
    setEditedFields(fields)
  }

  const openReviewModal = (record: DigitizedRecord) => {
    setActiveRecord(record)
    initEditedFields(record)
  }

  // ── Save Manual Corrections ─────────────────────────────────────────────────
  const handleSaveCorrections = async () => {
    if (!activeRecord) return
    setSaving(true)
    try {
      const currentData: Record<string, any> = (activeRecord.extracted_data as Record<string, any>) || {}
      const updatedData: Record<string, any> = {}

      for (const [key, val] of Object.entries(editedFields)) {
        const origConfidence = currentData[key]?.confidence ?? 0.8
        updatedData[key] = {
          value: val || null,
          confidence: val ? Math.max(origConfidence, 0.95) : 0.0,
        }
      }

      const updated = await updateDigitizedRecord(activeRecord.id, {
        extracted_data: updatedData,
      })
      setActiveRecord(updated)
      toast.success('Field corrections saved.')
      loadRecords()
    } catch {
      toast.error('Failed to save field edits.')
    } finally {
      setSaving(false)
    }
  }

  // ── Confirm & Save to Database ─────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!activeRecord) return
    setConfirming(true)
    try {
      const visit = await confirmDigitizedRecord(activeRecord.id)
      toast.success(`Record confirmed and saved to database! Pass code: ${visit.qr_code}`)
      setActiveRecord(null)
      loadRecords()
    } catch {
      toast.error('Failed to confirm and save record.')
    } finally {
      setConfirming(false)
    }
  }

  // ── Reject Scan ────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!activeRecord) return
    if (!window.confirm('Reject this document scan?')) return
    try {
      await rejectDigitizedRecord(activeRecord.id)
      toast.success('Record scan rejected.')
      setActiveRecord(null)
      loadRecords()
    } catch {
      toast.error('Failed to reject record.')
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            AI Historical Record Digitization
          </h1>
          <p className="page-subtitle">
            Convert handwritten paper visitor books and historic register scans into structured database records using OCR + Gemini AI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            loading={uploading}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Scanned Document
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,.pdf"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0])
              }
            }}
          />
        </div>
      </div>

      {/* ── Drag & Drop Upload Zone ────────────────────────────────────────────── */}
      <Card
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={cn(
          'p-8 border-2 border-dashed text-center transition-all cursor-pointer space-y-4',
          uploading
            ? 'border-amber-500 bg-amber-950/20'
            : 'border-gray-800 hover:border-amber-500/50 hover:bg-gray-900/60'
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="py-6 space-y-3">
            <Sparkles className="w-12 h-12 text-amber-400 mx-auto animate-pulse" />
            <h3 className="text-lg font-bold text-amber-300">Extracting Handwriting via AI...</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Running Tesseract OCR & Gemini Vision field mapping. Parsing visitor names, dates, schools, and headcounts.
            </p>
          </div>
        ) : (
          <div className="py-4 space-y-2">
            <UploadCloud className="w-12 h-12 text-gray-400 mx-auto" />
            <h3 className="text-base font-bold text-gray-200">
              Drag & Drop Handwritten Visitor Books / Diary Scans
            </h3>
            <p className="text-xs text-gray-500">Supports JPG, PNG, WEBP, and PDF files</p>
          </div>
        )}
      </Card>

      {/* ── Digitized Records Archive Table ───────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-900/60 p-4 rounded-xl border border-gray-800">
          <div className="flex flex-wrap items-center gap-2">
            {['', 'needs_review', 'saved', 'rejected'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors',
                  statusFilter === st
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-gray-800/60 text-gray-400 hover:text-gray-200'
                )}
              >
                {st ? st.replace('_', ' ') : 'All Statuses'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDuplicateFilter(duplicateFilter ? undefined : true)}
              className={cn(
                'text-xs flex items-center gap-1.5',
                duplicateFilter ? 'border-red-500/50 text-red-300 bg-red-950/20' : ''
              )}
            >
              <Copy className="w-3.5 h-3.5" />
              {duplicateFilter ? 'Showing Duplicates Only' : 'Filter Duplicates'}
            </Button>
            <Button variant="ghost" size="sm" onClick={loadRecords}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-gray-300">No digitized records found</p>
              <p className="text-xs mt-1">Upload a scanned handwritten page above to begin AI extraction.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-800/80 text-gray-400 uppercase text-[11px] tracking-wider border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-4">Original Scan</th>
                    <th className="py-3 px-4">Extracted Visitor / School</th>
                    <th className="py-3 px-4">Visit Date</th>
                    <th className="py-3 px-4">AI Confidence</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {records.map((r) => {
                    const data: Record<string, any> = (r.extracted_data as Record<string, any>) || {}
                    const vName = data.visitor_name?.value || 'Unknown Guest'
                    const sName = data.school?.value
                    const confPct = Math.round((r.overall_confidence || 0) * 100)

                    return (
                      <tr key={r.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <FileImage className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-xs font-mono text-gray-300 truncate max-w-[140px]">
                              {r.original_filename || r.id.substring(0, 8)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-100">
                          <div>
                            <span>{vName}</span>
                            {sName && <span className="text-xs text-teal-400 block font-normal">{sName}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-300 font-mono">
                          {data.visit_date?.value || formatDate(r.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 bg-gray-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  confPct >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                                )}
                                style={{ width: `${confPct}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-bold text-gray-300">{confPct}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusBadge(r.status)}>{r.status.replace('_', ' ')}</Badge>
                            {r.is_duplicate && (
                              <Badge variant="red" className="text-[10px]">
                                Duplicate
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReviewModal(r)}
                            className="text-xs py-1 px-2.5 flex items-center gap-1.5 border-gray-700 hover:bg-gray-800 text-teal-300"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Review & Verify
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ── MODAL: SIDE-BY-SIDE REVIEW & VERIFICATION ────────────────────────── */}
      {activeRecord && (
        <Modal
          open={!!activeRecord}
          onClose={() => setActiveRecord(null)}
          title="Review AI Extracted Record"
          description="Verify extracted fields against the original handwritten scan."
          size="lg"
        >
          <div className="space-y-6">
            {/* Confidence & Warning Banner */}
            {activeRecord.is_duplicate && (
              <Alert variant="error" title="Duplicate Record Detected">
                This record matches an existing entry in the system. Verify before confirming.
              </Alert>
            )}

            {activeRecord.overall_confidence < 0.75 && (
              <Alert variant="warning" title="Low Confidence Fields Highlighted">
                Some fields had low OCR confidence (&lt; 75%). Please double check and edit them manually below.
              </Alert>
            )}

            {/* Side-by-Side Review Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Original Image Viewer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileImage className="w-4 h-4 text-amber-400" />
                    Original Handwritten Scan
                  </h3>
                  <a
                    href={activeRecord.original_image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-teal-400 hover:underline flex items-center gap-1"
                  >
                    Open Image <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative aspect-[3/4] bg-gray-950 rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center p-2">
                  <img
                    src={activeRecord.original_image_url}
                    alt="Original scan"
                    className="max-h-full max-w-full object-contain rounded transition-transform hover:scale-125 cursor-zoom-in"
                  />
                </div>
              </div>

              {/* Right Column: Extracted Fields Editor */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-800 pb-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Extracted Fields Verification
                </h3>

                <FieldInput
                  label="Visitor / Group Leader Name"
                  value={editedFields.visitor_name || ''}
                  confidence={((activeRecord.extracted_data as Record<string, any>)?.[visitor_name_key]?.confidence)}
                  onChange={(v) => setEditedFields({ ...editedFields, visitor_name: v })}
                />

                <FieldInput
                  label="School Name"
                  value={editedFields.school || ''}
                  confidence={((activeRecord.extracted_data as Record<string, any>)?.school?.confidence)}
                  onChange={(v) => setEditedFields({ ...editedFields, school: v })}
                />

                <FieldInput
                  label="Contact Teacher Name"
                  value={editedFields.teacher || ''}
                  confidence={((activeRecord.extracted_data as Record<string, any>)?.teacher?.confidence)}
                  onChange={(v) => setEditedFields({ ...editedFields, teacher: v })}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FieldInput
                    label="Phone"
                    value={editedFields.phone || ''}
                    confidence={((activeRecord.extracted_data as Record<string, any>)?.phone?.confidence)}
                    onChange={(v) => setEditedFields({ ...editedFields, phone: v })}
                  />
                  <FieldInput
                    label="Email"
                    value={editedFields.email || ''}
                    confidence={((activeRecord.extracted_data as Record<string, any>)?.email?.confidence)}
                    onChange={(v) => setEditedFields({ ...editedFields, email: v })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FieldInput
                    label="Visit Date"
                    type="date"
                    value={editedFields.visit_date || ''}
                    confidence={((activeRecord.extracted_data as Record<string, any>)?.visit_date?.confidence)}
                    onChange={(v) => setEditedFields({ ...editedFields, visit_date: v })}
                  />
                  <FieldInput
                    label="Province"
                    value={editedFields.province || ''}
                    confidence={((activeRecord.extracted_data as Record<string, any>)?.province?.confidence)}
                    onChange={(v) => setEditedFields({ ...editedFields, province: v })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FieldInput
                    label="Num. Students"
                    type="number"
                    value={editedFields.num_students || ''}
                    confidence={((activeRecord.extracted_data as Record<string, any>)?.num_students?.confidence)}
                    onChange={(v) => setEditedFields({ ...editedFields, num_students: v })}
                  />
                  <FieldInput
                    label="Num. Teachers"
                    type="number"
                    value={editedFields.num_teachers || ''}
                    confidence={((activeRecord.extracted_data as Record<string, any>)?.num_teachers?.confidence)}
                    onChange={(v) => setEditedFields({ ...editedFields, num_teachers: v })}
                  />
                </div>

                <FieldInput
                  label="Purpose of Visit"
                  value={editedFields.purpose || ''}
                  confidence={((activeRecord.extracted_data as Record<string, any>)?.purpose?.confidence)}
                  onChange={(v) => setEditedFields({ ...editedFields, purpose: v })}
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-800">
              <Button variant="danger" size="sm" onClick={handleReject} className="w-full sm:w-auto">
                Reject Scan
              </Button>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveCorrections}
                  loading={saving}
                >
                  Save Corrections
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirm}
                  loading={confirming}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  Confirm & Save to Database
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

const visitor_name_key = 'visitor_name'

function FieldInput({
  label,
  value,
  confidence = 0.9,
  type = 'text',
  onChange,
}: {
  label: string
  value: string
  confidence?: number
  type?: string
  onChange: (v: string) => void
}) {
  const confPct = Math.round((confidence || 0) * 100)
  const isLowConfidence = (confidence || 0) < 0.75

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-gray-300">{label}</label>
        <span
          className={cn(
            'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded',
            isLowConfidence
              ? 'bg-amber-950 text-amber-300 border border-amber-700/50'
              : 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
          )}
        >
          {confPct}% conf.
        </span>
      </div>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          isLowConfidence ? 'border-amber-500/60 bg-amber-950/10 focus:border-amber-400' : ''
        )}
      />
    </div>
  )
}

function getStatusBadge(status: DigitizationStatus) {
  switch (status) {
    case 'saved':
    case 'confirmed':
      return 'green'
    case 'needs_review':
      return 'amber'
    case 'rejected':
      return 'red'
    default:
      return 'gray'
  }
}
