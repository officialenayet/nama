import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { ScrollArea } from '@/components/ui/scroll-area.jsx'
import { 
  Send, 
  MessageCircle, 
  Book, 
  Heart, 
  Star, 
  Moon, 
  Sun,
  ExternalLink,
  Loader2,
  BookOpen,
  Scroll,
  Users
} from 'lucide-react'
import './App.css'

function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: 'আসসালামু আলাইকুম! আমি আপনার ইসলামিক এআই সহায়ক। কুরআন, হাদিস, এবং ফতোয়া সম্পর্কে যেকোনো প্রশ্ন করুন।',
      contentEn: 'Assalamu Alaikum! I am your Islamic AI assistant. Ask me any questions about Quran, Hadith, and Fatwa.',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState('bangla')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [stats, setStats] = useState(null)
  const messagesEndRef = useRef(null)
  const scrollAreaRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Fetch database stats
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          language: language
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        const assistantMessage = {
          id: Date.now() + 1,
          type: 'assistant',
          content: data.response,
          sources: data.sources,
          isUncertain: data.is_uncertain,
          expertContact: data.expert_contact,
          totalSources: data.total_sources,
          timestamp: new Date()
        }

        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error('Failed to get response')
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'দুঃখিত, একটি ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
        contentEn: 'Sorry, an error occurred. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

  const SourceCard = ({ source, type }) => {
    const getSourceIcon = () => {
      switch (type) {
        case 'quran': return <BookOpen className="w-4 h-4" />
        case 'hadith': return <Scroll className="w-4 h-4" />
        case 'fatwa': return <Users className="w-4 h-4" />
        case 'dua': return <Heart className="w-4 h-4" />
        default: return <Book className="w-4 h-4" />
      }
    }

    const getSourceTitle = () => {
      switch (type) {
        case 'quran': return source.surah_name_bangla || source.surah_name_english
        case 'hadith': return source.collection_name
        case 'fatwa': return 'ফতোয়া'
        case 'dua': return source.dua_name_bangla || source.dua_name
        default: return 'উৎস'
      }
    }

    return (
      <Card className="mb-2 border-l-4 border-l-primary">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            {getSourceIcon()}
            <span className="font-semibold text-sm">{getSourceTitle()}</span>
          </div>
          {type === 'quran' && (
            <div>
              <p className="text-sm arabic-text mb-1">{source.arabic_text}</p>
              <p className="text-sm bengali-text">{source.bangla_translation}</p>
              {source.english_translation && (
                <p className="text-xs text-muted-foreground mt-1">{source.english_translation}</p>
              )}
            </div>
          )}
          {type === 'hadith' && (
            <div>
              <p className="text-sm bengali-text">{source.bangla_translation}</p>
              {source.english_translation && (
                <p className="text-xs text-muted-foreground mt-1">{source.english_translation}</p>
              )}
              <Badge variant="outline" className="mt-1 text-xs">
                {source.authenticity_grade}
              </Badge>
            </div>
          )}
          {type === 'fatwa' && (
            <div>
              <p className="text-sm font-medium mb-1">প্রশ্ন: {source.question_bangla || source.question}</p>
              <p className="text-sm">{source.answer_bangla || source.answer}</p>
            </div>
          )}
          {type === 'dua' && (
            <div>
              <p className="text-sm arabic-text mb-1">{source.arabic_text}</p>
              <p className="text-sm bengali-text">{source.bangla_translation}</p>
              <Badge variant="secondary" className="mt-1 text-xs">
                {source.occasion}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`min-h-screen islamic-pattern ${isDarkMode ? 'dark' : ''}`}>
      <div className="container mx-auto max-w-4xl p-4">
        {/* Header */}
        <Card className="mb-6 islamic-border">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl">
              <div className="crescent-moon"></div>
              <span className="bengali-text">ইসলামিক এআই চ্যাটবট</span>
              <div className="crescent-moon"></div>
            </CardTitle>
            <p className="text-muted-foreground">
              কুরআন, হাদিস ও ফতোয়ার আলোকে ইসলামিক জ্ঞান অর্জন করুন
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLanguage(language === 'bangla' ? 'english' : 'bangla')}
              >
                {language === 'bangla' ? 'English' : 'বাংলা'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://bio.link/officialenayet', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                যোগাযোগ
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Stats */}
        {stats && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.quran_verses?.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">কুরআনের আয়াত</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.total_hadiths?.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">হাদিস</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.verified_fatwas?.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">যাচাইকৃত ফতোয়া</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.duas?.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">দোয়া</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Messages */}
        <Card className="mb-4">
          <CardContent className="p-0">
            <ScrollArea className="h-[500px] p-4" ref={scrollAreaRef}>
              {messages.map((message) => (
                <div key={message.id} className={`chat-message ${message.type} smooth-transition`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {message.type === 'user' ? (
                        <div className="w-8 h-8 rounded-full bg-primary-foreground flex items-center justify-center">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="bengali-text mb-2">{message.content}</div>
                      {message.contentEn && language === 'english' && (
                        <div className="text-sm opacity-75 mb-2">{message.contentEn}</div>
                      )}
                      
                      {/* Sources */}
                      {message.sources && (
                        <div className="mt-4">
                          <Separator className="mb-3" />
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Book className="w-4 h-4" />
                            সূত্র ({message.totalSources})
                          </h4>
                          
                          {message.sources.quran_verses?.map((verse, index) => (
                            <SourceCard key={`quran-${index}`} source={verse} type="quran" />
                          ))}
                          
                          {message.sources.hadiths?.map((hadith, index) => (
                            <SourceCard key={`hadith-${index}`} source={hadith} type="hadith" />
                          ))}
                          
                          {message.sources.fatwas?.map((fatwa, index) => (
                            <SourceCard key={`fatwa-${index}`} source={fatwa} type="fatwa" />
                          ))}
                          
                          {message.sources.duas?.map((dua, index) => (
                            <SourceCard key={`dua-${index}`} source={dua} type="dua" />
                          ))}
                        </div>
                      )}

                      {/* Expert Contact */}
                      {message.isUncertain && message.expertContact && (
                        <div className="mt-3 p-3 bg-accent rounded-lg">
                          <p className="text-sm bengali-text mb-2">
                            এই বিষয়ে আরও নিশ্চিত হতে একজন বিশেষজ্ঞের সাথে যোগাযোগ করুন:
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`https://${message.expertContact}`, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            বিশেষজ্ঞের সাথে যোগাযোগ
                          </Button>
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground mt-2">
                        {message.timestamp.toLocaleTimeString('bn-BD')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="chat-message assistant smooth-transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                    </div>
                    <div className="loading-dots">
                      <span style={{'--i': 0}}></span>
                      <span style={{'--i': 1}}></span>
                      <span style={{'--i': 2}}></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Input */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={language === 'bangla' ? 'আপনার প্রশ্ন লিখুন...' : 'Type your question...'}
                className="flex-1 bengali-text"
                disabled={isLoading}
              />
              <Button 
                onClick={sendMessage} 
                disabled={isLoading || !inputMessage.trim()}
                className="smooth-transition"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 bengali-text">
              কুরআন, হাদিস, ফতোয়া এবং দোয়া সম্পর্কে প্রশ্ন করুন। আল্লাহই সবচেয়ে ভালো জানেন।
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App

