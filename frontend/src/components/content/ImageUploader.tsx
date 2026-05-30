import React, { useState, useRef } from 'react';
import { UploadCloud, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  recommendedSize?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ value, onChange, label, recommendedSize }) => {
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
    setProgress(10);

    const formData = new FormData();
    formData.append('file', file);
    
    // NOTE: These should be in your .env file
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'docs_upload_example_us_preset';

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          onChange(response.secure_url);
          setProgress(100);
        } else {
          const response = JSON.parse(xhr.responseText);
          setError(response.error?.message || 'Upload failed');
        }
        setIsUploading(false);
      };

      xhr.onerror = () => {
        setError('Network error occurred during upload.');
        setIsUploading(false);
      };

      xhr.send(formData);

    } catch (err: any) {
      setError(err.message || 'An error occurred');
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
      {label && <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>}
      {recommendedSize && <p className="text-xs text-slate-500 mb-2">Recommended: {recommendedSize}</p>}
      
      {error && (
        <div className="mb-3 text-sm text-rose-500 bg-rose-500/10 p-2 rounded border border-rose-500/20">
          {error}
        </div>
      )}

      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-slate-600 bg-slate-800 aspect-video flex items-center justify-center">
          <img src={value} alt="Uploaded preview" className="max-w-full max-h-full object-contain" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 bg-rose-600 rounded-full text-white hover:bg-rose-500 transition-colors shadow-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-lg border-2 border-dashed border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 transition-colors aspect-video flex flex-col items-center justify-center cursor-pointer overflow-hidden ${isUploading ? 'pointer-events-none' : ''}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center w-full px-8">
              <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                <div className="bg-violet-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
              <span className="text-sm text-slate-400">Uploading... {progress}%</span>
            </div>
          ) : (
            <>
              <div className="p-4 bg-slate-700 rounded-full text-slate-400 mb-3">
                <UploadCloud size={24} />
              </div>
              <p className="text-sm text-slate-300 font-medium">Click to upload image</p>
              <p className="text-xs text-slate-500 mt-1">PNG, JPG or WEBP (max. 5MB)</p>
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
