import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Volume2, VolumeX, Pause, Play, Square, Settings, Eye, Type } from 'lucide-react';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

interface AccessibilityControlsProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

const AccessibilityControls: React.FC<AccessibilityControlsProps> = ({ 
  isOpen = false, 
  onToggle 
}) => {
  const { 
    speak, 
    pause, 
    resume, 
    stop, 
    isSpeaking, 
    isPaused, 
    voices, 
    loadVoices,
    isSupported 
  } = useTextToSpeech();

  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [speechRate, setSpeechRate] = useState([1]);
  const [speechPitch, setSpeechPitch] = useState([1]);
  const [speechVolume, setSpeechVolume] = useState([1]);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState([16]);
  const [autoReadQuestions, setAutoReadQuestions] = useState(false);

  useEffect(() => {
    if (isSupported) {
      loadVoices();
      // Load voices when they become available
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [loadVoices, isSupported]);

  useEffect(() => {
    // Apply accessibility settings
    const root = document.documentElement;
    
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    root.style.fontSize = `${fontSize[0]}px`;
  }, [highContrast, fontSize]);

  const speakSampleText = () => {
    const sampleText = "This is how the text-to-speech will sound with your current settings.";
    const selectedVoiceObj = voices.find(voice => voice.name === selectedVoice);
    
    speak(sampleText, {
      voice: selectedVoiceObj,
      rate: speechRate[0],
      pitch: speechPitch[0],
      volume: speechVolume[0]
    });
  };

  if (!isSupported) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Accessibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Text-to-speech is not supported in your browser.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Accessibility Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Text-to-Speech Controls */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Text-to-Speech
          </h4>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Voice</Label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Speed: {speechRate[0]}</Label>
              <Slider
                value={speechRate}
                onValueChange={setSpeechRate}
                min={0.5}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Pitch: {speechPitch[0]}</Label>
              <Slider
                value={speechPitch}
                onValueChange={setSpeechPitch}
                min={0.5}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Volume: {speechVolume[0]}</Label>
              <Slider
                value={speechVolume}
                onValueChange={setSpeechVolume}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={speakSampleText}
                disabled={isSpeaking}
              >
                <Play className="h-4 w-4 mr-1" />
                Test
              </Button>
              
              {isSpeaking && (
                <>
                  {isPaused ? (
                    <Button variant="outline" size="sm" onClick={resume}>
                      <Play className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={pause}>
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={stop}>
                    <Square className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto-read"
                checked={autoReadQuestions}
                onCheckedChange={setAutoReadQuestions}
              />
              <Label htmlFor="auto-read">Auto-read questions</Label>
            </div>
          </div>
        </div>

        {/* Visual Accessibility */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Visual
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="high-contrast"
                checked={highContrast}
                onCheckedChange={setHighContrast}
              />
              <Label htmlFor="high-contrast">High contrast mode</Label>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Font size: {fontSize[0]}px
              </Label>
              <Slider
                value={fontSize}
                onValueChange={setFontSize}
                min={12}
                max={24}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccessibilityControls;