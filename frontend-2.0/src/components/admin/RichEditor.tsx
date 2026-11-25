'use client'

import { useEffect, useRef, useState } from 'react'

interface RichEditorProps {
  initialValue: string
  onContentChange: (html: string) => void
}

function isSafeHref(raw: string): boolean {
  const trimmed = raw.trim()
  return /^(https?:\/\/|mailto:|\/)/i.test(trimmed)
}

export default function RichEditor({
  initialValue,
  onContentChange,
}: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const [sourceMode, setSourceMode] = useState(false)
  const [htmlSource, setHtmlSource] = useState(initialValue)

  useEffect(() => {
    setHtmlSource(initialValue)
    if (editorRef.current && !sourceMode) {
      editorRef.current.innerHTML = initialValue
    }
    // Only reset when initialValue changes (e.g. remounted via key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue])

  function syncFromDom() {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    setHtmlSource(html)
    onContentChange(html)
  }

  function runCommand(command: string, value?: string) {
    if (sourceMode || !editorRef.current) return
    editorRef.current.focus()
    document.execCommand(command, false, value)
    syncFromDom()
  }

  function handleLink() {
    if (sourceMode || !editorRef.current) return
    const selection = window.getSelection()
    const savedRange =
      selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
    const raw = window.prompt('Enter URL (https://, http://, mailto:, or /path):')
    if (raw === null) return
    const url = raw.trim()
    if (!url) {
      if (savedRange && selection) {
        selection.removeAllRanges()
        selection.addRange(savedRange)
      }
      runCommand('unlink')
      return
    }
    if (!isSafeHref(url)) {
      window.alert('Please enter a valid URL starting with https://, http://, mailto:, or /.')
      return
    }
    editorRef.current.focus()
    if (savedRange && selection) {
      selection.removeAllRanges()
      selection.addRange(savedRange)
    }
    if (selection && selection.isCollapsed) {
      const a = document.createElement('a')
      a.href = url
      a.textContent = url
      a.rel = 'noopener noreferrer'
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null
      if (range) {
        range.insertNode(a)
        range.setStartAfter(a)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
      } else {
        editorRef.current.appendChild(a)
      }
      syncFromDom()
    } else {
      document.execCommand('createLink', false, url)
      syncFromDom()
    }
  }

  function toggleSourceMode() {
    if (!sourceMode) {
      const current = editorRef.current ? editorRef.current.innerHTML : htmlSource
      setHtmlSource(current)
      setSourceMode(true)
    } else {
      setSourceMode(false)
      requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = htmlSource
        }
      })
    }
  }

  return (
    <div className="adm-editor">
      <div className="adm-editor-toolbar" role="toolbar" aria-label="Formatting">
        <button
          type="button"
          className="adm-editor-btn"
          disabled={sourceMode}
          onClick={() => runCommand('bold')}
          aria-label="Bold"
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="adm-editor-btn"
          disabled={sourceMode}
          onClick={() => runCommand('italic')}
          aria-label="Italic"
          title="Italic"
        >
          <em>I</em>
        </button>
        <span className="adm-editor-sep" aria-hidden="true" />
        <button
          type="button"
          className="adm-editor-btn"
          disabled={sourceMode}
          onClick={() => runCommand('formatBlock', 'p')}
          aria-label="Paragraph"
          title="Paragraph"
        >
          P
        </button>
        <button
          type="button"
          className="adm-editor-btn"
          disabled={sourceMode}
          onClick={() => runCommand('formatBlock', 'h2')}
          aria-label="Heading 2"
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          className="adm-editor-btn"
          disabled={sourceMode}
          onClick={() => runCommand('formatBlock', 'h3')}
          aria-label="Heading 3"
          title="Heading 3"
        >
          H3
        </button>
        <button
          type="button"
          className="adm-editor-btn"
          disabled={sourceMode}
          onClick={() => runCommand('formatBlock', 'blockquote')}
          aria-label="Blockquote"
          title="Quote"
        >
          Quote
        </button>
        <button
          type="button"
          className="adm-editor-btn"
          disabled={sourceMode}
          onClick={() => runCommand('insertUnorderedList')}
          aria-label="Bullet list"
          title="Bullet list"
        >
          • List
        </button>
        <span className="adm-editor-sep" aria-hidden="true" />
        <button
          type="button"
          className="adm-editor-btn"
          disabled={sourceMode}
          onClick={handleLink}
          aria-label="Insert link"
          title="Link"
        >
          Link
        </button>
        <button
          type="button"
          className="adm-editor-btn"
          disabled={sourceMode}
          onClick={() => runCommand('removeFormat')}
          aria-label="Clear formatting"
          title="Clear formatting"
        >
          Clear
        </button>
        <span className="adm-editor-spacer" />
        <button
          type="button"
          className="adm-editor-btn"
          aria-pressed={sourceMode}
          onClick={toggleSourceMode}
          aria-label="Toggle HTML source"
          title="Toggle HTML source"
        >
          {'</>'} HTML
        </button>
      </div>

      {sourceMode ? (
        <textarea
          className="adm-editor-source"
          value={htmlSource}
          onChange={(e) => {
            const val = e.target.value
            setHtmlSource(val)
            onContentChange(val)
          }}
          aria-label="HTML source"
          spellCheck={false}
        />
      ) : (
        <div
          ref={editorRef}
          className="adm-editor-body"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Rich text editor"
          onInput={syncFromDom}
        />
      )}
    </div>
  )
}
