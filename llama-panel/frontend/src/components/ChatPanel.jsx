import { useState, useRef, useEffect } from 'react'

const SYSTEM_PROMPT = `You are a helpful assistant. Respond in Russian unless asked otherwise.`

export default function ChatPanel() {
  const [messages, setMessages] = useState([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'assistant', content: 'Привет! Я Qwen3.6-35B. Чем могу помочь?' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [temperature, setTemperature] = useState(0.7)
  const [topP, setTopP] = useState(0.9)
  const messagesEnd = useRef(null)

  const scrollToBottom = () => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('http://127.0.0.1:8080/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.concat(userMessage).map(({ role, content }) => ({ role, content })),
          temperature,
          top_p: topP,
          stream: false,
          n_predict: 1024,
        }),
      })

      const data = await res.json()

      if (data.choices?.[0]?.message) {
        setMessages(prev => [...prev, data.choices[0].message])
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'Ошибка: ' + (data.error?.message || 'Неизвестная ошибка') },
        ])
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Ошибка подключения: ${err.message}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearChat = () => {
    setMessages([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'assistant', content: 'Привет! Я Qwen3.6-35B. Чем могу помочь?' },
    ])
  }

  return (
    <div className="space-y-4">
      {/* Settings */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">⚙️ Параметры генерации</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Temperature</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value))}
                className="input w-20 text-center"
              />
            </div>
          </div>
          <div>
            <label className="label">Top P</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={topP}
                onChange={e => setTopP(parseFloat(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={topP}
                onChange={e => setTopP(parseFloat(e.target.value))}
                className="input w-20 text-center"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={clearChat} className="btn btn-ghost text-sm">
              🗑 Очистить чат
            </button>
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div className="card min-h-[400px] max-h-[600px] flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 pr-4">
          {messages.filter(m => m.role !== 'system').map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl p-4 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-200'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>

        {/* Input */}
        <div className="mt-4 pt-4 border-t border-gray-800 flex gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите сообщение..."
            className="input flex-1 resize-none"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="btn btn-primary self-end h-10"
          >
            {loading ? '⏳' : '➤'}
          </button>
        </div>
      </div>
    </div>
  )
}
