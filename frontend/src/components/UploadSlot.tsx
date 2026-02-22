import React, { useRef, useState } from 'react';
import { Share, X } from 'lucide-react'; // Using Share or ArrowUpToLine as a close approximation to the thin upload arrow
import { UploadedImage } from '../types';

interface UploadSlotProps {
  label: string;
  image: UploadedImage | null;
  onUpload: (img: UploadedImage) => void;
  onClear: () => void;
  required?: boolean;
}

const UploadSlot: React.FC<UploadSlotProps> = ({ label, image, onUpload, onClear, required }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      onUpload({
        file,
        previewUrl: URL.createObjectURL(file),
        base64: e.target?.result as string,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-2 group">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] tracking-widest font-bold text-gray-500 font-sans uppercase">
          {label} {required && '*'}
        </span>
        {image && (
          <button onClick={onClear} className="text-gray-400 hover:text-red-500 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      <div
        className={`relative w-full aspect-[3/4] border transition-all duration-300 cursor-pointer overflow-hidden ${image ? 'border-transparent' : 'border-gray-100 bg-[#fafafa] hover:border-gray-300'
          } ${isDragging ? 'border-black bg-gray-100' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {image ? (
          <img src={image.previewUrl} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 group-hover:text-gray-400 transition-colors">
            {isDragging ? (
              <span className="text-[10px] tracking-widest font-medium text-black">DROP HERE</span>
            ) : (
              <Share size={20} className="rotate-[-90deg] text-[#d1d1d1]" strokeWidth={1} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadSlot;
