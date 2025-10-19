import { supabase } from './supabase';

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// --- File Validation ---
export function validateImageFile(file: File) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo de imagem inválido. Use JPEG, PNG ou WebP.' };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: `A imagem é muito grande. Máximo ${formatFileSize(MAX_IMAGE_SIZE)}.` };
  }
  return { valid: true };
}

export function validateVideoFile(file: File) {
  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo de vídeo inválido. Use MP4, MOV, AVI ou WebM.' };
  }
  if (file.size > MAX_VIDEO_SIZE) {
    return { valid: false, error: `O vídeo é muito grande. Máximo ${formatFileSize(MAX_VIDEO_SIZE)}.` };
  }
  return { valid: true };
}

export function validateDocumentFile(file: File) {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo de documento inválido. Use PDF, DOCX, XLSX, TXT, ZIP, RAR.' };
  }
  if (file.size > MAX_DOCUMENT_SIZE) {
    return { valid: false, error: `O documento é muito grande. Máximo ${formatFileSize(MAX_DOCUMENT_SIZE)}.` };
  }
  return { valid: true };
}

// --- Supabase Storage Uploads ---
async function uploadFileToBucket(file: File, userId: string, bucketName: string, folder: string) {
  const fileExtension = file.name.split('.').pop();
  const fileName = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error(`Error uploading to ${bucketName}:`, error);
    return { data: null, error };
  }

  const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);

  return {
    data: {
      url: publicUrlData.publicUrl,
      path: fileName,
    },
    error: null,
  };
}

export async function uploadContentImage(file: File, userId: string) {
  return uploadFileToBucket(file, userId, 'content-images', 'images');
}

export async function uploadContentVideo(file: File, userId: string) {
  return uploadFileToBucket(file, userId, 'content-videos', 'videos');
}

export async function uploadContentDocument(file: File, userId: string) {
  return uploadFileToBucket(file, userId, 'content-documents', 'documents');
}

// New export for KYC documents
export async function uploadKycDocument(file: File, userId: string, documentType: string) {
  // Store KYC documents in a dedicated 'kyc-documents' bucket under a folder for each document type
  return uploadFileToBucket(file, userId, 'kyc-documents', `kyc/${documentType}`);
}

// New export for user avatars
export async function uploadAvatar(file: File, userId: string) {
  // Avatars are stored in a dedicated 'avatars' bucket under the user's ID
  // We can overwrite the previous avatar, so upsert is true
  const fileExtension = file.name.split('.').pop();
  const fileName = `${userId}/avatar.${fileExtension}`; // Consistent filename for easy overwrite

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true, // Allow overwriting existing avatar
    });

  if (error) {
    console.error('Error uploading avatar:', error);
    return { data: null, error };
  }

  const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

  return {
    data: {
      url: publicUrlData.publicUrl,
      path: fileName,
    },
    error: null,
  };
}

export async function uploadVideoThumbnail(thumbnailBlob: Blob, userId: string, videoPath: string) {
  const fileExtension = 'webp'; // Or 'jpeg', depending on generation
  const thumbnailFileName = videoPath.replace(/\.[^/.]+$/, "") + `-thumbnail.${fileExtension}`; // Use video path as base

  const { data, error } = await supabase.storage
    .from('content-videos') // Store thumbnails in the same bucket or a dedicated one
    .upload(thumbnailFileName, thumbnailBlob, {
      cacheControl: '3600',
      upsert: false,
      contentType: `image/${fileExtension}`
    });

  if (error) {
    console.error('Error uploading video thumbnail:', error);
    return { data: null, error };
  }

  const { data: publicUrlData } = supabase.storage.from('content-videos').getPublicUrl(thumbnailFileName);

  return {
    data: {
      url: publicUrlData.publicUrl,
      path: thumbnailFileName,
    },
    error: null,
  };
}

// --- Video Thumbnail Generation ---
export async function generateVideoThumbnail(videoFile: File): Promise<{ data: Blob | null; error: string | null }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    video.currentTime = 1; // Capture frame at 1 second
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.style.display = 'none'; // Hide video element

    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve({ data: blob, error: null });
          } else {
            resolve({ data: null, error: 'Failed to generate thumbnail blob.' });
          }
          URL.revokeObjectURL(video.src);
          video.remove();
          canvas.remove();
        }, 'image/webp', 0.8); // Use WebP for efficiency
      } else {
        resolve({ data: null, error: 'Failed to get canvas context.' });
        URL.revokeObjectURL(video.src);
        video.remove();
        canvas.remove();
      }
    };

    video.onerror = (e) => {
      console.error('Error loading video for thumbnail generation:', e);
      resolve({ data: null, error: 'Failed to load video for thumbnail generation.' });
      URL.revokeObjectURL(video.src);
      video.remove();
    };

    // Append video to DOM temporarily to ensure loadeddata fires in some browsers
    document.body.appendChild(video);
  });
}
