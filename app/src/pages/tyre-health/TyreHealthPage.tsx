import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, MousePointer } from 'lucide-react';

// Import sample images
import t1 from '../../media/t1.jpg';
import t2 from '../../media/t2.jpg';
import t3 from '../../media/t3.jpg';
import t4 from '../../media/t4.jpg';

const TyreHealthPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedSample, setSelectedSample] = useState<string | null>(null);

  // Sample images data
  const sampleImages = [
    { id: 1, name: 'Sample Tyre 1', src: t1, description: 'Click to analyze this tyre' },
    { id: 2, name: 'Sample Tyre 2', src: t2, description: 'Click to analyze this tyre' },
    { id: 3, name: 'Sample Tyre 3', src: t3, description: 'Click to analyze this tyre' },
    { id: 4, name: 'Sample Tyre 4', src: t4, description: 'Click to analyze this tyre' }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      setSelectedFile(file);
      setSelectedSample(null);
      setResult(null);
      
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSampleSelect = async (sampleImage: typeof sampleImages[0]) => {
    setSelectedSample(sampleImage.src);
    setSelectedFile(null);
    setPreviewUrl(sampleImage.src);
    setResult(null);
    
    // Automatically analyze the sample image
    await analyzeSampleTyre(sampleImage.src);
  };

  const analyzeTyre = async () => {
    if (!selectedFile) {
      toast.error('Please select an image first');
      return;
    }

    setAnalyzing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('http://34.93.198.94:8000/classify_tyre', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to analyze tyre');
      }

      setResult(data);
      toast.success('Tyre analyzed successfully!');
      
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze tyre: ' + (error.message || 'Unknown error'));
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeSampleTyre = async (imageUrl: string) => {
    setAnalyzing(true);
    
    try {
      // Convert image URL to blob and then to File
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'sample-tyre.jpg', { type: 'image/jpeg' });
      
      const formData = new FormData();
      formData.append('file', file);

      const apiResponse = await fetch('http://34.93.198.94:8000/classify_tyre', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
        },
        body: formData,
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(data.detail || 'Failed to analyze tyre');
      }

      setResult(data);
      toast.success('Sample tyre analyzed successfully!');
      
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze sample tyre: ' + (error.message || 'Unknown error'));
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setSelectedSample(null);
    setPreviewUrl(null);
    setResult(null);
    if (previewUrl && selectedFile) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tyre Health</h1>
        <p className="text-gray-600 mt-1">Upload tyre image for analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedFile && !selectedSample ? (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Click to upload tyre image</p>
                <p className="text-xs text-gray-500">JPG, PNG, JPEG</p>
              </div>
            ) : (
              <div className="space-y-4">
                <img
                  src={previewUrl || ''}
                  alt="Selected tyre"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <div className="flex space-x-3">
                  {selectedFile && (
                    <Button 
                      onClick={analyzeTyre} 
                      disabled={analyzing}
                      className="flex-1"
                    >
                      {analyzing ? 'Analyzing...' : 'Analyze Tyre'}
                    </Button>
                  )}
                  {selectedSample && (
                    <div className="flex-1 text-center text-sm text-gray-600">
                      {analyzing ? 'Analyzing sample...' : 'Sample analyzed automatically'}
                    </div>
                  )}
                  <Button variant="outline" onClick={reset}>
                    Reset
                  </Button>
                </div>
              </div>
            )}
            
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="text-center py-12">
                <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Upload an image to see analysis results</p>
              </div>
            ) : (
              <div className="space-y-4">
                {result.data ? (
                  <>
                    {/* Prediction Result */}
                    <div className={`p-4 rounded-lg border ${
                      result.data.prediction === 'good' ? 'bg-green-50 border-green-200' :
                      result.data.prediction === 'bad' ? 'bg-red-50 border-red-200' :
                      'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`text-lg font-semibold capitalize ${
                            result.data.prediction === 'good' ? 'text-green-800' :
                            result.data.prediction === 'bad' ? 'text-red-800' :
                            'text-yellow-800'
                          }`}>
                            {result.data.prediction}
                          </h3>
                          <p className={`text-sm ${
                            result.data.prediction === 'good' ? 'text-green-600' :
                            result.data.prediction === 'bad' ? 'text-red-600' :
                            'text-yellow-600'
                          }`}>
                            Tyre Condition
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${
                            result.data.prediction === 'good' ? 'text-green-800' :
                            result.data.prediction === 'bad' ? 'text-red-800' :
                            'text-yellow-800'
                          }`}>
                            {result.data.confidence?.toFixed(1)}%
                          </div>
                          <p className={`text-sm ${
                            result.data.prediction === 'good' ? 'text-green-600' :
                            result.data.prediction === 'bad' ? 'text-red-600' :
                            'text-yellow-600'
                          }`}>
                            Confidence
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Confidence Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Confidence Level</span>
                        <span>{result.data.confidence?.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            result.data.confidence >= 80 ? 'bg-green-500' :
                            result.data.confidence >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${result.data.confidence}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {result.data.confidence >= 80 ? 'High confidence' :
                         result.data.confidence >= 60 ? 'Medium confidence' :
                         'Low confidence - consider retaking photo'}
                      </p>
                    </div>

                    {/* Raw Response (collapsible) */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                        View Raw Response
                      </summary>
                      <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto mt-2">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </details>
                  </>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="text-red-800 font-semibold">Error</h3>
                    <p className="text-red-600 text-sm mt-1">
                      Unexpected response format
                    </p>
                    <pre className="bg-red-100 p-2 rounded text-xs mt-2 overflow-auto">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sample Images Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MousePointer className="h-5 w-5" />
            <span>Try Sample Images</span>
          </CardTitle>
          <CardDescription>
            Click on any sample image below to automatically analyze it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {sampleImages.map((sample) => (
              <div
                key={sample.id}
                className="cursor-pointer group"
                onClick={() => handleSampleSelect(sample)}
              >
                <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all duration-200 group-hover:shadow-lg">
                  <img
                    src={sample.src}
                    alt={sample.name}
                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="bg-white rounded-full p-2">
                        <MousePointer className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <p className="text-sm font-medium text-gray-900">{sample.name}</p>
                  <p className="text-xs text-gray-500">{sample.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          {analyzing && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Analyzing sample image...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TyreHealthPage;
