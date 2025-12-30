import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [generateClean, setGenerateClean] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setSelectedFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('orgId', 'default-org');
      formData.append('autoAnalyze', autoAnalyze.toString());
      formData.append('generateClean', generateClean.toString());

      const response = await fetch('/api/products/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      setSuccess('Product uploaded successfully!');

      setTimeout(() => {
        navigate(`/products/${data.product.id}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <h1 style={{ marginBottom: '30px' }}>Upload Product</h1>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '3px dashed #cbd5e0',
            borderRadius: '12px',
            padding: '60px 20px',
            textAlign: 'center',
            background: preview ? 'transparent' : '#f7fafc',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '30px',
          }}
        >
          {preview ? (
            <div>
              <img
                src={preview}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              />
              <p style={{ color: '#718096', fontSize: '14px' }}>
                Click to change image or drag and drop
              </p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
              <p style={{ fontSize: '18px', color: '#4a5568', fontWeight: 600, marginBottom: '8px' }}>
                Click to upload or drag and drop
              </p>
              <p style={{ fontSize: '14px', color: '#a0aec0' }}>
                PNG, JPG, GIF up to 10MB
              </p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          style={{ display: 'none' }}
        />

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            AI Features
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                background: '#f7fafc',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={autoAnalyze}
                onChange={(e) => setAutoAnalyze(e.target.checked)}
                style={{ width: '20px', height: '20px', marginRight: '12px' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                  Auto-analyze with AI
                </div>
                <div style={{ fontSize: '13px', color: '#718096' }}>
                  Automatically extract product name, description, category, price, and tags using GPT-4o Vision
                </div>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                background: '#f7fafc',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={generateClean}
                onChange={(e) => setGenerateClean(e.target.checked)}
                style={{ width: '20px', height: '20px', marginRight: '12px' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                  Generate clean product shot
                </div>
                <div style={{ fontSize: '13px', color: '#718096' }}>
                  Use DALL-E 3 to create a professional product photo with clean background
                </div>
              </div>
            </label>
          </div>
        </div>

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="btn btn-primary"
          style={{ width: '100%', fontSize: '16px', padding: '14px' }}
        >
          {uploading ? 'Uploading & Analyzing...' : 'Upload Product'}
        </button>

        {uploading && (
          <div style={{ marginTop: '20px', textAlign: 'center', color: '#718096' }}>
            <p>This may take a moment while AI analyzes your product...</p>
          </div>
        )}
      </div>

      <div
        className="card"
        style={{
          marginTop: '30px',
          background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
          border: '1px solid #667eea30',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
          💡 How it works
        </h3>
        <ul style={{ paddingLeft: '20px', color: '#4a5568', fontSize: '14px', lineHeight: '1.8' }}>
          <li>Upload a photo of your product (can be taken with your phone)</li>
          <li>AI automatically extracts product details from the image</li>
          <li>Optionally generates a professional clean product shot</li>
          <li>Product is added to your catalog with searchable tags</li>
          <li>Edit any details on the product page after upload</li>
        </ul>
      </div>
    </div>
  );
}
