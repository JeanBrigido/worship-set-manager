'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChordSheetRenderer } from './chord-sheet-renderer'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/lib/api-client'
import { Upload, Link, FileText, Save, Trash2 } from 'lucide-react'

const KEYS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B']

interface ChordSheet {
  id: string
  songVersionId: string
  chordText: string | null
  originalKey: string | null
  fileUrl: string | null
  fileName: string | null
  externalUrl: string | null
}

interface ChordSheetEditorProps {
  songVersionId: string
  initialData?: ChordSheet | null
  onSave?: (chordSheet: ChordSheet) => void
  onDelete?: () => void
}

export function ChordSheetEditor({
  songVersionId,
  initialData,
  onSave,
  onDelete,
}: ChordSheetEditorProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [chordText, setChordText] = useState(initialData?.chordText || '')
  const [originalKey, setOriginalKey] = useState(initialData?.originalKey || '')
  const [externalUrl, setExternalUrl] = useState(initialData?.externalUrl || '')
  const [fileUrl, setFileUrl] = useState(initialData?.fileUrl || '')
  const [fileName, setFileName] = useState(initialData?.fileName || '')

  const handleSaveText = async () => {
    try {
      setSaving(true)
      const { data, error } = await apiClient.put<ChordSheet>(`/song-versions/${songVersionId}/chord-sheet`, {
        chordText: chordText || null,
        originalKey: originalKey || null,
        externalUrl: externalUrl || null,
      })

      if (error) throw new Error(error.message)

      toast({ title: 'Chord sheet saved' })
      if (data) onSave?.(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not save chord sheet',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/song-versions/${songVersionId}/chord-sheet/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Upload failed')
      }

      const { data } = await response.json()

      setFileUrl(data.fileUrl)
      setFileName(data.fileName)

      toast({ title: 'File uploaded' })
      onSave?.(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not upload file',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this chord sheet?')) return

    try {
      setDeleting(true)
      const { error } = await apiClient.delete(`/song-versions/${songVersionId}/chord-sheet`)

      if (error) throw new Error(error.message)

      setChordText('')
      setOriginalKey('')
      setExternalUrl('')
      setFileUrl('')
      setFileName('')

      toast({ title: 'Chord sheet deleted' })
      onDelete?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not delete chord sheet',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const hasContent = chordText || fileUrl || externalUrl

  return (
    <div className="space-y-6">
      <Tabs defaultValue="text" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="text" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Text Chords
          </TabsTrigger>
          <TabsTrigger value="file" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            PDF/Image
          </TabsTrigger>
          <TabsTrigger value="link" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            External Link
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="originalKey">Original Key</Label>
              <Select value={originalKey} onValueChange={setOriginalKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select key" />
                </SelectTrigger>
                <SelectContent>
                  {KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chordText">Chord Text</Label>
              <Textarea
                id="chordText"
                value={chordText}
                onChange={(e) => setChordText(e.target.value)}
                placeholder="[G]Amazing [C]grace, how [G]sweet the sound..."
                className="font-mono min-h-[300px]"
              />
              <p className="text-xs text-muted-foreground">
                Use [Chord] notation: [G]word [Am]another
              </p>
            </div>

            <div className="space-y-2">
              <Label>Preview</Label>
              <Card className="min-h-[300px] overflow-auto">
                <CardContent className="p-4">
                  {chordText ? (
                    <ChordSheetRenderer chordText={chordText} />
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Enter chords to see preview
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Button onClick={handleSaveText} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Text Chords'}
          </Button>
        </TabsContent>

        <TabsContent value="file" className="space-y-4">
          <div className="space-y-2">
            <Label>Upload PDF or Image</Label>
            <Input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground">
              Max 5MB. Supported: PDF, PNG, JPG
            </p>
          </div>

          {fileUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Current File</CardTitle>
                <CardDescription>{fileName}</CardDescription>
              </CardHeader>
              <CardContent>
                {fileUrl.endsWith('.pdf') ? (
                  <iframe src={fileUrl} className="w-full h-96 border rounded" />
                ) : (
                  <img src={fileUrl} alt="Chord sheet" className="max-w-full rounded" />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="link" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="externalUrl">External URL</Label>
            <Input
              id="externalUrl"
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://example.com/chord-sheet"
            />
            <p className="text-xs text-muted-foreground">
              Link to CCLI, LaCuerda, or other chord sheet source
            </p>
          </div>

          <Button onClick={handleSaveText} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save External Link'}
          </Button>
        </TabsContent>
      </Tabs>

      {hasContent && (
        <div className="pt-4 border-t">
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete Chord Sheet'}
          </Button>
        </div>
      )}
    </div>
  )
}
