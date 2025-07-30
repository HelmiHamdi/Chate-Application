import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Smile, Image, Send, X, Camera, Mic, StopCircle } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import toast from "react-hot-toast";
import { useThemeStore } from "../store/useThemeStore";

const MessageInput = () => {
  // Text & Image preview states
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  // Emoji picker & camera UI states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const { sendMessage } = useChatStore();
  const { theme } = useThemeStore();

  // Fermer emoji picker si clic en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        inputRef.current !== event.target
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  // Image input handling
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file?.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  // Remove image preview
  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowCamera(false);
  };

  // Camera open & capture photo
  const openCamera = async () => {
    setShowCamera(true);
    setImagePreview(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      toast.error("Cannot access camera: " + err.message);
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    setImagePreview(dataUrl);

    // Stop camera stream
    const stream = video.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    video.srcObject = null;
    setShowCamera(false);
  };

  const cancelCamera = () => {
    const video = videoRef.current;
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
    setShowCamera(false);
  };

  // Audio recording handlers
  const startRecording = async () => {
    if (isRecording) return;
    setAudioBlob(null);
    setAudioUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Could not start recording: " + err.message);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  // Remove audio recording
  const removeAudio = () => {
    setAudioBlob(null);
    setAudioUrl(null);
  };

  // Send message with text/image/audio
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !audioBlob) return;

    try {
      let audioBase64 = null;

      if (audioBlob) {
        // Convert audio blob to base64 to send to backend (or send as FormData depending on your backend)
        audioBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(audioBlob);
        });
      }

      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        audio: audioBase64, // nouveau champ audio
      });

      setText("");
      setImagePreview(null);
      setAudioBlob(null);
      setAudioUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowCamera(false);
      setIsRecording(false);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="p-4 w-full relative">
      {/* Image preview */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
              type="button"
              aria-label="Supprimer l'image"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {/* Audio preview */}
      {audioUrl && (
        <div className="mb-3 flex items-center gap-2">
          <audio controls src={audioUrl} className="rounded-lg" />
          <button
            onClick={removeAudio}
            className="btn btn-sm btn-error ml-2"
            type="button"
            aria-label="Supprimer l'audio"
          >
            Supprimer
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-[70px] left-4 z-50"
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={theme}
            height={350}
            width={300}
            lazyLoadEmojis={true}
          />
        </div>
      )}

      {/* Camera */}
      {showCamera && (
        <div className="mb-3 flex flex-col items-center gap-2">
          <video
            ref={videoRef}
            className="w-full max-w-xl rounded-lg border border-zinc-700"
            autoPlay
            playsInline
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div className="flex gap-4 mt-2">
            <button
              onClick={cancelCamera}
              className="btn btn-outline btn-error"
              type="button"
            >
              Annuler
            </button>
            <button
              onClick={capturePhoto}
              className="btn btn-primary"
              type="button"
            >
              Capturer
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2 items-center bg-base-100 border rounded-lg px-2">
          {/* Emoji */}
          <button
            type="button"
            className="text-zinc-500 hover:text-yellow-500"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            aria-label="Ouvrir le sélecteur d'émojis"
          >
            <Smile size={20} />
          </button>

          {/* Text input */}
          <input
            type="text"
            ref={inputRef}
            className="w-full py-2 px-1 focus:outline-none"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setShowEmojiPicker(false)}
            aria-label="Champ de message"
          />

          {/* Image input hidden */}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          {/* Image button */}
          <button
            type="button"
            className="hidden sm:flex btn btn-circle text-zinc-400"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Importer une image"
          >
            <Image size={20} />
          </button>

          {/* Camera button */}
          <button
            type="button"
            className="hidden sm:flex btn btn-circle text-zinc-400"
            onClick={openCamera}
            aria-label="Ouvrir la caméra"
          >
            <Camera size={20} />
          </button>

          {/* Audio record button */}
          {!isRecording ? (
            <button
              type="button"
              className="btn btn-circle btn-accent"
              onClick={startRecording}
              aria-label="Démarrer l'enregistrement vocal"
              title="Démarrer l'enregistrement vocal"
            >
              <Mic size={20} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-circle btn-error animate-pulse"
              onClick={stopRecording}
              aria-label="Arrêter l'enregistrement vocal"
              title="Arrêter l'enregistrement vocal"
            >
              <StopCircle size={20} />
            </button>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview && !audioBlob}
          aria-label="Envoyer le message"
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
