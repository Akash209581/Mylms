'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  Users,
  LogOut,
  Maximize,
  Minimize,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  Send,
  X,
  RefreshCw,
  Plus,
} from 'lucide-react'
import { API_URL } from '@/lib/api'

// Public Google STUN servers and OpenRelay TURN servers for WebRTC NAT discovery across strict networks
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelay',
      credential: 'openrelay',
    },
  ],
}

interface PeerConnection {
  socketId: string;
  name: string;
  pc: RTCPeerConnection;
  stream?: MediaStream;
  pendingCandidates?: any[];
  audioEnabled: boolean;
  videoEnabled: boolean;
}

interface ChatMessage {
  id: string;
  senderSocketId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

export default function MadmeetPage() {
  // Pre-join form state
  const [lobbyMode, setLobbyMode] = useState<'create' | 'join'>('create')
  const [roomCode, setRoomCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [joined, setJoined] = useState(false)
  const [copied, setCopied] = useState(false)
  const [joining, setJoining] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Side drawers
  const [activeSidePanel, setActiveSidePanel] = useState<'chat' | 'participants' | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  // WebRTC & Socket state
  const [mySocketId, setMySocketId] = useState<string>('')
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map())
  const [participantsList, setParticipantsList] = useState<Array<{ socketId: string; name: string; audioEnabled: boolean; videoEnabled: boolean }>>([])

  // Refs
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const previewStreamRef = useRef<MediaStream | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map())
  const containerRef = useRef<HTMLDivElement | null>(null)

  const generateNewCode = () => {
    const code = 'MAD-' + Math.floor(1000 + Math.random() * 9000)
    setRoomCode(code)
  }

  // Populate logged in user name on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const u = JSON.parse(stored)
        if (u.name) setDisplayName(u.name)
      }
    } catch {}

    // Generate random room code placeholder
    generateNewCode()
  }, [])

  // Manage Preview Stream before joining
  useEffect(() => {
    if (joined) return

    let previewStream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        previewStream = stream
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream
        }
      })
      .catch((err) => {
        console.warn('Camera/Mic preview permission denied or unavailable:', err)
      })

    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [joined])

  // Helper: Get API socket base URL
  const getSocketUrl = () => {
    if (typeof window === 'undefined') return 'http://localhost:3003'
    if (process.env.NEXT_PUBLIC_WS_URL) {
      return process.env.NEXT_PUBLIC_WS_URL
    }
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3003'
    }
    if (API_URL) {
      return API_URL.replace(/\/api\/?$/, '')
    }
    return window.location.origin
  }

  // Bind local stream to active meeting room video element when joined
  useEffect(() => {
    if (joined && localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
    }
  }, [joined])

  // Create Peer Connection for a remote user
  const createPeerConnection = useCallback((targetSocketId: string, targetName: string): RTCPeerConnection => {
    console.log(`[Madmeet] Creating RTCPeerConnection for target: ${targetSocketId} (${targetName})`)
    const pc = new RTCPeerConnection(ICE_SERVERS)

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
        })
      }
    }

    // Handle remote tracks safely across browsers
    pc.ontrack = (event) => {
      console.log(`[Madmeet] Received remote track (${event.track.kind}) from ${targetSocketId}:`, event.track)
      setPeers((prev) => {
        const next = new Map(prev)
        const existing = next.get(targetSocketId)
        if (existing) {
          let stream = existing.stream
          if (!stream) {
            stream = event.streams[0] || new MediaStream()
          }
          if (!stream.getTracks().some((t) => t.id === event.track.id)) {
            stream.addTrack(event.track)
          }
          existing.stream = stream
          next.set(targetSocketId, { ...existing })
        }
        return next
      })
    }

    pc.onconnectionstatechange = () => {
      console.log(`[Madmeet] Peer connection state with ${targetSocketId}: ${pc.connectionState}`)
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        removePeer(targetSocketId)
      }
    }

    const peerInfo: PeerConnection = {
      socketId: targetSocketId,
      name: targetName,
      pc,
      pendingCandidates: [],
      audioEnabled: true,
      videoEnabled: true,
    }

    peerConnectionsRef.current.set(targetSocketId, peerInfo)
    setPeers(new Map(peerConnectionsRef.current))

    return pc
  }, [])

  const removePeer = (targetSocketId: string) => {
    const peer = peerConnectionsRef.current.get(targetSocketId)
    if (peer) {
      peer.pc.close()
      peerConnectionsRef.current.delete(targetSocketId)
      setPeers(new Map(peerConnectionsRef.current))
    }
  }

  // Join Room Handler
  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!roomCode.trim() || !displayName.trim()) return

    setJoining(true)
    setErrorMessage('')

    try {
      // Reuse existing stream or prompt for user media
      let stream = localStreamRef.current
      if (!stream || stream.getTracks().every((t) => t.readyState === 'ended')) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        })
        localStreamRef.current = stream
      }

      // Connect Socket.IO client to /madmeet namespace
      const socketUrl = getSocketUrl()
      console.log('[Madmeet] Connecting to Socket.IO signaling at:', socketUrl + '/madmeet')

      const socket = io(`${socketUrl}/madmeet`, {
        transports: ['websocket', 'polling'],
        withCredentials: true,
        timeout: 10000,
      })

      socketRef.current = socket

      socket.on('connect_error', (err) => {
        console.error('[Madmeet] Socket connection error:', err)
        setJoining(false)
        setErrorMessage(`Unable to connect to video server at ${socketUrl}. Please ensure backend is running.`)
      })

      socket.on('connect', () => {
        console.log('[Madmeet] Connected to signaling gateway, socketId:', socket.id)
        setMySocketId(socket.id || '')
        socket.emit('join-room', {
          roomCode: roomCode.trim().toUpperCase(),
          name: displayName.trim(),
        })
      })

      // Room Joined response from server
      socket.on('room-joined', async (data: { yourSocketId: string; existingParticipants: Array<{ socketId: string; name: string }> }) => {
        console.log('[Madmeet] Room joined successfully. Existing participants:', data.existingParticipants)
        setJoining(false)
        setJoined(true)

        // Initiate offer to all existing participants
        for (const p of data.existingParticipants) {
          if (p.socketId === socket.id) continue
          const pc = createPeerConnection(p.socketId, p.name)
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          socket.emit('signal-offer', {
            targetSocketId: p.socketId,
            offer,
          })
        }
      })

      // New user joined room
      socket.on('user-joined', (data: { participant: { socketId: string; name: string } }) => {
        console.log('[Madmeet] New user joined room:', data.participant)
        createPeerConnection(data.participant.socketId, data.participant.name)
      })

      // Signal Offer received
      socket.on('signal-offer', async (data: { senderSocketId: string; senderName: string; offer: any }) => {
        console.log('[Madmeet] Received signal offer from:', data.senderSocketId)
        let peer = peerConnectionsRef.current.get(data.senderSocketId)
        let pc: RTCPeerConnection
        if (!peer) {
          pc = createPeerConnection(data.senderSocketId, data.senderName)
          peer = peerConnectionsRef.current.get(data.senderSocketId)
        } else {
          pc = peer.pc
        }

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        // Flush any pending candidates
        if (peer && peer.pendingCandidates && peer.pendingCandidates.length > 0) {
          for (const cand of peer.pendingCandidates) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch((err) => console.warn('[Madmeet] Candidate flush error:', err))
          }
          peer.pendingCandidates = []
        }

        socket.emit('signal-answer', {
          targetSocketId: data.senderSocketId,
          answer,
        })
      })

      // Signal Answer received
      socket.on('signal-answer', async (data: { senderSocketId: string; answer: any }) => {
        console.log('[Madmeet] Received signal answer from:', data.senderSocketId)
        const peer = peerConnectionsRef.current.get(data.senderSocketId)
        if (peer) {
          await peer.pc.setRemoteDescription(new RTCSessionDescription(data.answer))
          // Flush any pending candidates
          if (peer.pendingCandidates && peer.pendingCandidates.length > 0) {
            for (const cand of peer.pendingCandidates) {
              await peer.pc.addIceCandidate(new RTCIceCandidate(cand)).catch((err) => console.warn('[Madmeet] Candidate flush error:', err))
            }
            peer.pendingCandidates = []
          }
        }
      })

      // ICE Candidate received
      socket.on('ice-candidate', async (data: { senderSocketId: string; candidate: any }) => {
        const peer = peerConnectionsRef.current.get(data.senderSocketId)
        if (peer && data.candidate) {
          try {
            if (peer.pc.remoteDescription && peer.pc.remoteDescription.type) {
              await peer.pc.addIceCandidate(new RTCIceCandidate(data.candidate))
            } else {
              if (!peer.pendingCandidates) peer.pendingCandidates = []
              peer.pendingCandidates.push(data.candidate)
            }
          } catch (err) {
            console.warn('[Madmeet] Error adding ICE candidate:', err)
          }
        }
      })

      // User Left room
      socket.on('user-left', (data: { socketId: string; name: string }) => {
        console.log('[Madmeet] User left room:', data.name)
        removePeer(data.socketId)
      })

      // Media Toggled update
      socket.on('media-toggled', (data: { socketId: string; mediaType: 'audio' | 'video'; enabled: boolean }) => {
        setPeers((prev) => {
          const next = new Map(prev)
          const p = next.get(data.socketId)
          if (p) {
            if (data.mediaType === 'audio') p.audioEnabled = data.enabled
            if (data.mediaType === 'video') p.videoEnabled = data.enabled
            next.set(data.socketId, { ...p })
          }
          return next
        })
      })

      // Chat message received
      socket.on('chat-message', (msg: ChatMessage) => {
        setChatMessages((prev) => [...prev, msg])
      })
    } catch (err) {
      alert('Could not access microphone/camera. Please allow permissions in your browser.')
      console.error('Error starting media stream:', err)
    }
  }

  // Toggle Microphone
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !micEnabled
        setMicEnabled(audioTrack.enabled)

        if (socketRef.current) {
          socketRef.current.emit('toggle-media', {
            mediaType: 'audio',
            enabled: audioTrack.enabled,
          })
        }
      }
    }
  }

  // Toggle Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !cameraEnabled
        setCameraEnabled(videoTrack.enabled)

        if (socketRef.current) {
          socketRef.current.emit('toggle-media', {
            mediaType: 'video',
            enabled: videoTrack.enabled,
          })
        }
      }
    }
  }

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (screenSharing) {
      // Stop screen share
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop())
        screenStreamRef.current = null
      }
      // Re-add camera video track to peer connections
      if (localStreamRef.current) {
        const camTrack = localStreamRef.current.getVideoTracks()[0]
        peerConnectionsRef.current.forEach((peer) => {
          const sender = peer.pc.getSenders().find((s) => s.track?.kind === 'video')
          if (sender && camTrack) sender.replaceTrack(camTrack)
        })
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current
      }
      setScreenSharing(false)
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        screenStreamRef.current = screenStream
        const screenTrack = screenStream.getVideoTracks()[0]

        // Replace video track for all peer connections
        peerConnectionsRef.current.forEach((peer) => {
          const sender = peer.pc.getSenders().find((s) => s.track?.kind === 'video')
          if (sender) sender.replaceTrack(screenTrack)
        })

        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream

        screenTrack.onended = () => {
          toggleScreenShare()
        }

        setScreenSharing(true)
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err)
      }
    }
  }

  // Leave Meeting
  const handleLeave = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room')
      socketRef.current.disconnect()
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop())
    }

    peerConnectionsRef.current.forEach((peer) => peer.pc.close())
    peerConnectionsRef.current.clear()
    setPeers(new Map())
    setChatMessages([])
    setJoined(false)
    setScreenSharing(false)
  }

  // Send Chat
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !socketRef.current) return
    socketRef.current.emit('send-chat', { message: chatInput.trim() })
    setChatInput('')
  }

  // Copy Room Link
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  const peerList = Array.from(peers.values())

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      {/* Navbar Header */}
      <header className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-indigo-500/30">
            M
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              MADMEET <Sparkles className="w-4 h-4 text-amber-400" />
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Real-Time WebRTC Video Room</p>
          </div>
        </div>

        {joined && (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-300">ROOM: {roomCode}</span>
            <button
              onClick={copyRoomCode}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Copy Room Code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> P2P WebRTC
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      {!joined ? (
        /* PRE-JOIN SCREEN */
        <div className="flex-1 flex items-center justify-center p-6 bg-mesh">
          <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left: Video Preview */}
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl flex items-center justify-center group">
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-3 bg-slate-950/70 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Mic & Camera Ready
                </span>
              </div>
            </div>

            {/* Right: Join / Create Form */}
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6">
              {/* Tab Selector: Create vs Join */}
              <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setLobbyMode('create')
                    if (!roomCode) generateNewCode()
                  }}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    lobbyMode === 'create'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Plus className="w-4 h-4" /> Create Room
                </button>
                <button
                  type="button"
                  onClick={() => setLobbyMode('join')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    lobbyMode === 'join'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Video className="w-4 h-4" /> Join Room
                </button>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                  {lobbyMode === 'create' ? (
                    <>
                      Create Instant Room <Sparkles className="w-5 h-5 text-amber-400" />
                    </>
                  ) : (
                    'Join Existing Room'
                  )}
                </h2>
                <p className="text-xs text-slate-400">
                  {lobbyMode === 'create'
                    ? 'Host a new video room and share your code with participants.'
                    : 'Enter the room code shared by your host to join.'}
                </p>
              </div>

              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      {lobbyMode === 'create' ? 'Room Code' : 'Enter Room Code *'}
                    </label>
                    {lobbyMode === 'create' && (
                      <button
                        type="button"
                        onClick={generateNewCode}
                        className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" /> Generate New
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MAD-8673"
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-white/10 text-white text-sm font-bold placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors uppercase tracking-widest"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Your Display Name *
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Maruthi"
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-white/10 text-white text-sm font-medium placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs font-semibold text-red-300">
                    {errorMessage}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={joining}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {joining ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" /> Connecting to Room...
                      </>
                    ) : lobbyMode === 'create' ? (
                      <>
                        <Sparkles className="w-5 h-5" /> Host & Start Room
                      </>
                    ) : (
                      <>
                        <Video className="w-5 h-5" /> Join Meeting Now
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE MEETING ROOM */
        <div ref={containerRef} className="flex-1 flex overflow-hidden relative bg-slate-950">
          {/* Main Video Grid */}
          <div className="flex-1 flex flex-col p-4 relative">
            <div
              className={`flex-1 grid gap-4 place-items-center ${
                peerList.length === 0
                  ? 'grid-cols-1'
                  : peerList.length === 1
                  ? 'grid-cols-1 md:grid-cols-2'
                  : peerList.length <= 3
                  ? 'grid-cols-2'
                  : 'grid-cols-2 md:grid-cols-3'
              }`}
            >
              {/* Local Self Video */}
              <div className="relative w-full h-full max-h-[75vh] aspect-video rounded-3xl overflow-hidden bg-slate-900 border border-white/15 shadow-2xl flex items-center justify-center group">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${screenSharing ? '' : 'transform -scale-x-100'}`}
                />
                <div className="absolute bottom-4 left-4 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{displayName} (You)</span>
                  {!micEnabled && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                </div>
              </div>

              {/* Remote Peer Videos */}
              {peerList.map((peer) => (
                <RemotePeerTile key={peer.socketId} peer={peer} />
              ))}
            </div>

            {/* Bottom Control Toolbar */}
            <div className="h-20 px-6 mt-4 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-md flex items-center justify-between">
              {/* Left Info */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-semibold">
                <span>{peerList.length + 1} Connected</span>
              </div>

              {/* Center Controls */}
              <div className="flex items-center gap-3 mx-auto sm:mx-0">
                <button
                  onClick={toggleMic}
                  className={`p-3.5 rounded-2xl transition-all ${
                    micEnabled
                      ? 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'
                      : 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30'
                  }`}
                  title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                  {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                <button
                  onClick={toggleCamera}
                  className={`p-3.5 rounded-2xl transition-all ${
                    cameraEnabled
                      ? 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'
                      : 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30'
                  }`}
                  title={cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
                >
                  {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>

                <button
                  onClick={toggleScreenShare}
                  className={`p-3.5 rounded-2xl transition-all ${
                    screenSharing
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'
                  }`}
                  title="Share Screen"
                >
                  {screenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => setActiveSidePanel(activeSidePanel === 'chat' ? null : 'chat')}
                  className={`p-3.5 rounded-2xl transition-all relative ${
                    activeSidePanel === 'chat'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'
                  }`}
                  title="In-Meeting Chat"
                >
                  <MessageSquare className="w-5 h-5" />
                  {chatMessages.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {chatMessages.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveSidePanel(activeSidePanel === 'participants' ? null : 'participants')}
                  className={`p-3.5 rounded-2xl transition-all ${
                    activeSidePanel === 'participants'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'
                  }`}
                  title="Participants"
                >
                  <Users className="w-5 h-5" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-white/10 transition-all hidden sm:block"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>

                <button
                  onClick={handleLeave}
                  className="px-5 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 ml-2"
                >
                  <LogOut className="w-4 h-4" /> Leave
                </button>
              </div>
            </div>
          </div>

          {/* Right Side Panel (Chat / Participants) */}
          {activeSidePanel && (
            <div className="w-80 border-l border-white/10 bg-slate-900 flex flex-col z-30 animate-fade-in">
              <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {activeSidePanel === 'chat' ? (
                    <>
                      <MessageSquare className="w-4 h-4 text-purple-400" /> In-Meeting Chat
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 text-purple-400" /> Participants ({peerList.length + 1})
                    </>
                  )}
                </h3>
                <button
                  onClick={() => setActiveSidePanel(null)}
                  className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {activeSidePanel === 'chat' ? (
                /* CHAT PANEL */
                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-10">No messages yet. Say hello!</p>
                    ) : (
                      chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-2xl text-xs space-y-1 ${
                            msg.senderSocketId === mySocketId
                              ? 'bg-indigo-600/30 border border-indigo-500/30 ml-4'
                              : 'bg-slate-800 border border-white/10 mr-4'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                            <span>{msg.senderName}</span>
                            <span>{msg.timestamp}</span>
                          </div>
                          <p className="text-slate-200">{msg.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              ) : (
                /* PARTICIPANTS PANEL */
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-white/10 text-xs">
                    <span className="font-bold text-white">{displayName} (You)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                      Host
                    </span>
                  </div>

                  {peerList.map((p) => (
                    <div
                      key={p.socketId}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/50 border border-white/10 text-xs"
                    >
                      <span className="font-medium text-slate-200">{p.name}</span>
                      <div className="flex items-center gap-1.5">
                        {!p.audioEnabled && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                        {!p.videoEnabled && <VideoOff className="w-3.5 h-3.5 text-rose-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Remote Peer Stream Renderer
function RemotePeerTile({ peer }: { peer: PeerConnection }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream
      videoRef.current.play().catch((err) => {
        console.warn('[Madmeet] Remote video auto-play exception handled:', err)
      })
    }
  }, [peer.stream, peer.videoEnabled])

  return (
    <div className="relative w-full h-full max-h-[75vh] aspect-video rounded-3xl overflow-hidden bg-slate-900 border border-white/15 shadow-2xl flex items-center justify-center group">
      {peer.videoEnabled ? (
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/20 flex items-center justify-center font-bold text-2xl text-white uppercase shadow-lg shadow-indigo-500/20">
            {peer.name ? peer.name.charAt(0) : 'P'}
          </div>
          <span className="text-xs font-semibold text-slate-300">{peer.name} (Camera Off)</span>
        </div>
      )}
      <div className="absolute bottom-4 left-4 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
        <span className="text-xs font-bold text-white">{peer.name}</span>
        {!peer.audioEnabled && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
        {!peer.videoEnabled && <VideoOff className="w-3.5 h-3.5 text-amber-400" />}
      </div>
    </div>
  )
}
