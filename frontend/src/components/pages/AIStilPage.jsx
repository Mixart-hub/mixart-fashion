import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { aiAPI } from '../../services/api'
import { useStore } from '../../store/store'

const PROMPTS = [
  'Yozgi ko\'ylak tavsiya qil',
  'Qizil rang kiyim bormi?',
  'M o\'lcham liboslar',
  'Trenddagi kiyimlar',
  'Bayram uchun ko\'ylak',
  'Narxi arzon kiyimlar',
]

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'linear-gradient(135deg,#C9956C,#c4689a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0, marginRight: 8, alignSelf: 'flex-end',
        }}>✨</div>
      )}
      <div style={{
        maxWidth: '78%',
        background: isUser ? '#C9956C' : '#fff',
        color: isUser ? '#fff' : '#1C1C1E',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '10px 14px',
        fontSize: 13,
        lineHeight: 1.5,
        boxShadow: '0 1px 4px rgba(0,0,0,.08)',
        whiteSpace: 'pre-wrap',
      }}>
        {msg.text}
      </div>
    </div>
  )
}

export default function AIStilPage() {
  const nav = useNavigate()
  const { user } = useStore()
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Salom! Men Mix — sizning shaxsiy stilistingizman. Qanday kiyim qidiryapsiz? 👗✨' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const endRef = useRef()
  const recorderRef = useRef()
  const chunksRef = useRef([])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const userId = user?.id ? String(user.id) : String(Date.now())

  async function sendMessage(text) {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', text: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await aiAPI.chat(text.trim(), userId, 'customer')
      setMessages(prev => [...prev, { role: 'ai', text: res.text || 'Javob kelmadi...' }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Kechirasiz, xatolik yuz berdi. Yana urinib ko\'ring.' }])
    } finally {
      setLoading(false)
    }
  }

  async function toggleVoice() {
    if (recording) {
      recorderRef.current?.stop()
      setRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const fd = new FormData()
        fd.append('file', blob, 'voice.webm')
        try {
          const res = await aiAPI.transcribe(fd)
          if (res.text) setInput(res.text)
        } catch { /* ignore */ }
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
    } catch {
      alert('Mikrofon ruxsati kerak')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8f5f7' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#1C1C1E,#C9956C)',
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
      }}>
        <button onClick={() => nav(-1)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>←</button>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✨</div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Mix Stilist</div>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 10 }}>AI yordamchi • 24/7</div>
        </div>
        <button onClick={async () => {
          await aiAPI.clearSession(userId).catch(() => {})
          setMessages([{ role: 'ai', text: 'Suhbat tozalandi! Yangi savol berish mumkin 😊' }])
        }} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '5px 10px', fontSize: 10, cursor: 'pointer' }}>
          Tozalash
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 0' }}>
        {messages.length === 1 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8, textAlign: 'center' }}>Tez savol</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {PROMPTS.map(p => (
                <button key={p} onClick={() => sendMessage(p)} style={{
                  background: '#fff', border: '1px solid #F3F4F6', borderRadius: 20,
                  padding: '6px 12px', fontSize: 11, color: '#C9956C', cursor: 'pointer',
                }}>{p}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => <Bubble key={i} msg={m} />)}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#C9956C,#c4689a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✨</div>
            <div style={{ background: '#fff', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', fontSize: 13 }}>
              <span style={{ animation: 'pulse 1s infinite' }}>Yozmoqda...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        background: '#fff',
        borderTop: '0.5px solid #F3F4F6',
        display: 'flex', gap: 8, alignItems: 'flex-end',
        flexShrink: 0,
      }}>
        <button onClick={toggleVoice} style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: recording ? '#dc2626' : '#f3edf0',
          border: 'none', cursor: 'pointer', fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{recording ? '⏹' : '🎤'}</button>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
          placeholder="Savol yozing..."
          rows={1}
          style={{
            flex: 1, border: '1px solid #F3F4F6', borderRadius: 20,
            padding: '9px 14px', fontSize: 13, outline: 'none',
            resize: 'none', fontFamily: 'inherit', background: '#f8f5f7',
            maxHeight: 80, overflowY: 'auto',
          }}
        />
        <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: input.trim() && !loading ? '#C9956C' : '#e0d0d8',
          border: 'none', cursor: input.trim() ? 'pointer' : 'default',
          fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>➤</button>
      </div>
    </div>
  )
}

