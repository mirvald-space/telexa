
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image as ImageIcon, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PostEditorProps {
  onSubmit: (post: {
    content: string;
    image_url?: string;
    scheduled_time: string;
  }) => void;
}

export const PostEditor: React.FC<PostEditorProps> = ({ onSubmit }) => {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // In a real app, you'd upload to Supabase Storage
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImageUrl(e.target.result as string);
        toast({
          title: "Image uploaded",
          description: "Your image has been added to the post.",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter some content for your post.",
        variant: "destructive",
      });
      return;
    }

    if (!scheduledTime) {
      toast({
        title: "Schedule time required",
        description: "Please select when to publish this post.",
        variant: "destructive",
      });
      return;
    }

    const scheduleDate = new Date(scheduledTime);
    if (scheduleDate <= new Date()) {
      toast({
        title: "Invalid schedule time",
        description: "Please select a future date and time.",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      content,
      image_url: imageUrl || undefined,
      scheduled_time: scheduledTime,
    });

    // Reset form
    setContent('');
    setImageUrl('');
    setScheduledTime('');
  };

  // Set minimum datetime to current time
  const now = new Date();
  const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 backdrop-blur-md border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Create New Post
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Content Editor */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-white">Post Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your post content here... You can use Telegram formatting like *bold* and _italic_"
                className="min-h-[120px] bg-white/10 border-white/20 text-white placeholder:text-purple-300 focus:border-purple-400"
                maxLength={4096}
              />
              <div className="text-right text-sm text-purple-300">
                {content.length}/4096 characters
              </div>
            </div>

            {/* Image Upload Area */}
            <div className="space-y-2">
              <Label className="text-white">Image (Optional)</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                  dragActive
                    ? 'border-purple-400 bg-purple-500/20'
                    : 'border-white/30 bg-white/5'
                } hover:border-purple-400 hover:bg-purple-500/10`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {imageUrl ? (
                  <div className="space-y-4">
                    <img
                      src={imageUrl}
                      alt="Upload preview"
                      className="max-h-48 mx-auto rounded-lg shadow-lg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setImageUrl('')}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 mx-auto text-purple-300" />
                    <div>
                      <p className="text-white mb-2">Drag & drop an image here, or</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        Choose File
                      </Button>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            </div>

            {/* Schedule Time */}
            <div className="space-y-2">
              <Label htmlFor="schedule" className="text-white flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schedule Time
              </Label>
              <Input
                id="schedule"
                type="datetime-local"
                value={scheduledTime}
                min={minDateTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="bg-white/10 border-white/20 text-white focus:border-purple-400"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 transition-all duration-200 transform hover:scale-105"
            >
              <Clock className="w-4 h-4 mr-2" />
              Schedule Post
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preview Card */}
      {(content || imageUrl) && (
        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white/10 rounded-lg p-4 space-y-3">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Post preview"
                  className="w-full max-w-md rounded-lg shadow-lg"
                />
              )}
              {content && (
                <p className="text-white whitespace-pre-wrap">
                  {content}
                </p>
              )}
              {scheduledTime && (
                <div className="text-sm text-purple-300 border-t border-white/10 pt-3 mt-3">
                  📅 Scheduled for: {new Date(scheduledTime).toLocaleString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
