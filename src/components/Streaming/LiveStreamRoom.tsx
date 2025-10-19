import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { StreamingChat } from './StreamingChat';
import { Video, VideoOff, Mic, MicOff, X, Clock, AlertCircle } from 'lucide-react';

interface LiveStreamRoomProps {
  bookingId: string;
  isInfluencer: boolean;
  onEnd: () => void;
}

interface SessionData {
  id: string;
  booking_id: string;
  ends_at: string;
  is_active: boolean;
  subscriber: {
    username: string;
    full_name: string | null;
  };
  influencer: {
    username: string;
    full_name: string | null;
  };
}

export function LiveStreamRoom({ bookingId, isInfluencer, onEnd }: LiveStreamRoomProps) {
  const { profile } = useAuth();
  const [session, setSession] = useState<SessionData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    initializeSession();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (session) {
      const interval = setInterval(() => {
        updateTimeRemaining();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [session]);

  const initializeSession = async () => {
    try {
      if (isInfluencer) {
        // Influencer: Create or get existing session
        const { data: existingSession } = await supabase
          .from('streaming_sessions')
          .select(`
            *,
            subscriber:subscriber_id (username, full_name),
            influencer:influencer_id (username, full_name)
          `)
          .eq('booking_id', bookingId)
          .eq('is_active', true)
          .maybeSingle();

        if (existingSession) {
          setSession(existingSession as any);
          await startWebcam();
        } else {
          // Create new session
          const { data: booking } = await supabase
            .from('streaming_bookings')
            .select('*, subscriber_id, influencer_id, duration_minutes')
            .eq('id', bookingId)
            .single();

          if (!booking) {
            setError('Reserva não encontrada');
            setLoading(false);
            return;
          }

          const now = new Date();
          const endsAt = new Date(now.getTime() + booking.duration_minutes * 60 * 1000);

          const { data: newSession, error: sessionError } = await supabase
            .from('streaming_sessions')
            .insert({
              booking_id: bookingId,
              influencer_id: booking.influencer_id,
              subscriber_id: booking.subscriber_id,
              session_token: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              ends_at: endsAt.toISOString(),
              is_active: true,
            })
            .select(`
              *,
              subscriber:subscriber_id (username, full_name),
              influencer:influencer_id (username, full_name)
            `)
            .single();

          if (sessionError) {
            setError('Erro ao criar sessão');
            console.error(sessionError);
            setLoading(false);
            return;
          }

          setSession(newSession as any);
          await startWebcam();
        }
      } else {
        // Subscriber: Get existing session
        const { data: existingSession, error: sessionError } = await supabase
          .from('streaming_sessions')
          .select(`
            *,
            subscriber:subscriber_id (username, full_name),
            influencer:influencer_id (username, full_name)
          `)
          .eq('booking_id', bookingId)
          .eq('is_active', true)
          .maybeSingle();

        if (sessionError || !existingSession) {
          setError('Aguardando o influencer iniciar a transmissão...');
          setLoading(false);
          return;
        }

        setSession(existingSession as any);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error initializing session:', err);
      setError('Erro ao inicializar sessão');
      setLoading(false);
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Error accessing webcam:', err);
      setError('Erro ao acessar câmera. Verifique as permissões do navegador.');
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const updateTimeRemaining = () => {
    if (!session) return;

    const now = new Date();
    const endsAt = new Date(session.ends_at);
    const remaining = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000));

    setTimeRemaining(remaining);

    if (remaining === 0 && isInfluencer) {
      endSession();
    }
  };

  const endSession = async () => {
    if (!session) return;

    await supabase
      .from('streaming_sessions')
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    await supabase
      .from('streaming_bookings')
      .update({ status: 'completed' })
      .eq('id', bookingId);

    cleanup();
    onEnd();
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-lg">Iniciando transmissão...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4 text-red-600">
            <AlertCircle className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Erro</h3>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={onEnd}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const otherPerson = isInfluencer ? session.subscriber : session.influencer;

  return (
    <div className="fixed inset-0 bg-black z-50">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-white font-semibold">AO VIVO</span>
            </div>
            <div className="text-white">
              com {otherPerson.full_name || `@${otherPerson.username}`}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
              <span className={`text-lg font-mono font-semibold ${
                timeRemaining < 60 ? 'text-red-400' : 'text-white'
              }`}>
                {formatTime(timeRemaining)}
              </span>
            </div>

            <button
              onClick={endSession}
              className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              title="Encerrar"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Video Area */}
          <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
            {isInfluencer ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="max-w-full max-h-full object-contain"
                />

                {/* Controls for Influencer */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
                  <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full transition-colors ${
                      videoEnabled
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {videoEnabled ? (
                      <Video className="w-6 h-6 text-white" />
                    ) : (
                      <VideoOff className="w-6 h-6 text-white" />
                    )}
                  </button>

                  <button
                    onClick={toggleAudio}
                    className={`p-4 rounded-full transition-colors ${
                      audioEnabled
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {audioEnabled ? (
                      <Mic className="w-6 h-6 text-white" />
                    ) : (
                      <MicOff className="w-6 h-6 text-white" />
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-white p-8">
                <Video className="w-24 h-24 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold mb-2">Aguardando transmissão...</h3>
                <p className="text-gray-400">
                  O influencer iniciará a transmissão em breve
                </p>
              </div>
            )}
          </div>

          {/* Chat Sidebar */}
          <div className="w-96 border-l border-gray-700 flex flex-col">
            <StreamingChat sessionId={session.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
