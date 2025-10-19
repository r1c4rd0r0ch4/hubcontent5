import { X, Heart, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useEffect } from 'react';
import { VideoPlayer } from './VideoPlayer';

interface LightboxProps {
  imageUrl: string;
  title: string;
  description?: string;
  likes: number;
  views?: number;
  isLiked: boolean;
  isVideo?: boolean;
  onClose: () => void;
  onLike: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export function Lightbox({
  imageUrl,
  title,
  description,
  likes,
  views = 0,
  isLiked,
  isVideo = false,
  onClose,
  onLike,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext
}: LightboxProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) onPrevious();
      if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, hasPrevious, hasNext, onPrevious, onNext]);

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {hasPrevious && onPrevious && (
        <button
          onClick={onPrevious}
          className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>
      )}

      {hasNext && onNext && (
        <button
          onClick={onNext}
          className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>
      )}

      <div className="max-w-7xl max-h-[90vh] w-full mx-4 flex flex-col items-center">
        {isVideo ? (
          <div className="w-full max-w-4xl">
            <VideoPlayer
              src={imageUrl}
              className="rounded-lg shadow-2xl"
            />
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={title}
            className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 mt-4 max-w-2xl w-full">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
              {description && (
                <p className="text-gray-300 text-sm">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg">
                <Eye className="w-5 h-5 text-white" />
                <span className="text-white font-semibold">{views}</span>
              </div>
              <button
                onClick={onLike}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Heart
                  className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`}
                />
                <span className="text-white font-semibold">{likes}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
