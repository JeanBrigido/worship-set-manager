'use client'

interface ChordSheetRendererProps {
  chordText: string
  className?: string
}

interface ParsedLine {
  type: 'lyrics-with-chords' | 'empty'
  lyrics: string
  chords: { position: number; chord: string }[]
}

function parseChordText(text: string): ParsedLine[] {
  const lines = text.split('\n')
  return lines.map((line) => {
    if (!line.trim()) {
      return { type: 'empty' as const, lyrics: '', chords: [] }
    }

    const chords: { position: number; chord: string }[] = []
    let lyrics = ''

    // Parse [Chord] patterns and extract position
    const regex = /\[([^\]]+)\]/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(line)) !== null) {
      // Add text before this chord
      lyrics += line.slice(lastIndex, match.index)
      const currentPos = lyrics.length
      chords.push({ position: currentPos, chord: match[1] })
      lastIndex = match.index + match[0].length
    }

    // Add remaining text after last chord
    lyrics += line.slice(lastIndex)

    return { type: 'lyrics-with-chords' as const, lyrics, chords }
  })
}

export function ChordSheetRenderer({ chordText, className = '' }: ChordSheetRendererProps) {
  const parsedLines = parseChordText(chordText)

  return (
    <div className={`font-mono text-sm whitespace-pre-wrap ${className}`}>
      {parsedLines.map((line, lineIdx) => {
        if (line.type === 'empty') {
          return <div key={lineIdx} className="h-4" />
        }

        // Build chord line with proper spacing
        let chordLine = ''
        for (const { position, chord } of line.chords) {
          // Add spaces to reach this position
          while (chordLine.length < position) {
            chordLine += ' '
          }
          chordLine += chord
        }

        const hasChords = line.chords.length > 0

        return (
          <div key={lineIdx} className="leading-relaxed">
            {hasChords && (
              <div className="text-primary font-bold h-5">{chordLine}</div>
            )}
            <div className={hasChords ? '' : 'h-5'}>{line.lyrics || '\u00A0'}</div>
          </div>
        )
      })}
    </div>
  )
}
