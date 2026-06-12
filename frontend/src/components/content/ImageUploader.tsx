import React, { useState, useRef } from 'react';
import { UploadCloud, X } from 'lucide-react';
import { uploadCmsImage } from '../../services/cmsService';
import { fileToBase64 } from '../../services/catalogService';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  recommendedSize?: string;
  /** Storage sub-folder under cms/ (e.g. "hero", "promos"). Default "banners". */
  folder?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ value, onChange, label, recommendedSize, folder }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (e.g. max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. Maximum size is 5MB.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setProgress(20);

    try {
      // Upload via the admin Cloud Function → Firebase Storage (infra rule:
      // image hosting is Firebase Storage, NOT Cloudinary). Base64 in, URL out.
      const fileBase64 = await fileToBase64(file);
      setProgress(60);
      const res = await uploadCmsImage({ fileBase64, contentType: file.type, folder: folder || 'banners' });
      const url = (res.data as { url?: string })?.url;
      if (!url) throw new Error('Upload did not return a URL');
      onChange(url);
      setProgress(100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-800 mb-2">{label}</label>}
      {recommendedSize && <p className="text-xs text-gray-500 mb-2">Recommended: {recommendedSize}</p>}
      
      {error && (
        <div className="mb-3 text-sm text-rose-500 bg-rose-500/10 p-2 rounded border border-rose-500/20">
          {error}
        </div>
      )}

      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white aspect-video flex items-center justify-center">
          <img src={value} alt="Uploaded preview" className="max-w-full max-h-full object-contain" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 bg-rose-600 rounded-full text-gray-900 hover:bg-rose-500 transition-colors shadow-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-lg border-2 border-dashed border-gray-200 bg-white hover:bg-gray-100 transition-colors aspect-video flex flex-col items-center justify-center cursor-pointer overflow-hidden ${isUploading ? 'pointer-events-none' : ''}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center w-full px-8">
              <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                <div className="bg-violet-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
              <span className="text-sm text-gray-500">Uploading... {progress}%</span>
            </div>
          ) : (
            <>
              <div className="p-4 bg-slate-700 rounded-full text-gray-500 mb-3">
                <UploadCloud size={24} />
              </div>
              <p className="text-sm text-gray-800 font-medium">Click to upload image</p>
              <p className="text-xs text-gray-500 mt-1">PNG, JPG or WEBP (max. 5MB)</p>
            </>
          )}
        </div>
      )}
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp, image/gif"
        className="hidden"
      />
    </div>
  );
};
