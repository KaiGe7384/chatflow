import React, { useEffect, useState } from 'react';

interface PasteImageHandlerProps {
  onImagePaste: (file: File) => void;
  disabled?: boolean;
}

const PasteImageHandler: React.FC<PasteImageHandlerProps> = ({ onImagePaste, disabled = false }) => {
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;
      
      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault(); // 防止默认粘贴行为
            
            const file = items[i].getAsFile();
            if (file) {
              // 验证文件类型和大小
              if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
                console.warn('不支持的图片格式，仅支持JPEG、PNG、GIF和WEBP格式');
                return;
              }
              
              if (file.size > 5 * 1024 * 1024) { // 5MB限制
                console.warn('图片太大，请上传小于5MB的图片');
                return;
              }
              
              // 创建预览
              const reader = new FileReader();
              reader.onload = (e) => {
                if (e.target && e.target.result) {
                  setPreviewUrl(e.target.result as string);
                }
              };
              reader.readAsDataURL(file);
              
              setPastedImage(file);
              onImagePaste(file);
            }
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [onImagePaste, disabled]);

  const clearImage = () => {
    setPastedImage(null);
    setPreviewUrl(null);
  };

  if (!previewUrl) return null;

  return (
    <div className="mt-2 relative inline-block">
      <div className="relative border border-gray-300 rounded-md overflow-hidden" style={{ maxWidth: '200px' }}>
        <img src={previewUrl} alt="Pasted" className="max-w-full h-auto" />
        <button
          onClick={clearImage}
          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
          title="移除图片"
        >
          ×
        </button>
      </div>
      <span className="text-sm text-gray-500 block mt-1">已粘贴图片</span>
    </div>
  );
};

export default PasteImageHandler; 