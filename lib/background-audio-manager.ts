/**
 * Background Audio Manager
 * Manages seamless switching between YouTube player and HTML5 audio for true background playback
 * 
 * This fixes the issue where music stops when switching tabs/apps on mobile
 */

export class BackgroundAudioManager {
  private audioElement: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private isBackgroundMode = false;
  private playbackState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 80,
    currentUrl: "",
  };
  private eventListeners: Map<string, Set<EventListener>> = new Map();

  async initialize(): Promise<void> {
    if (this.audioElement) return;

    try {
      // Create hidden audio element
      this.audioElement = new Audio();
      this.audioElement.style.display = "none";
      this.audioElement.crossOrigin = "anonymous";
      this.audioElement.preload = "metadata";
      
      // CRITICAL: Enable background playback on iOS and Android
      this.audioElement.setAttribute("playsinline", "true");
      (this.audioElement as any)["webkit-playsinline"] = true;
      
      // Set up event forwarding
      this.setupEventForwarding();
      
      // Add to DOM
      document.body.appendChild(this.audioElement);

      // Initialize audio context
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      // Resume audio context if suspended
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      console.log("[BackgroundAudioManager] Initialized successfully");
    } catch (error) {
      console.error("[BackgroundAudioManager] Initialization failed:", error);
      throw error;
    }
  }

  private setupEventForwarding(): void {
    if (!this.audioElement) return;

    const eventsToForward = [
      "timeupdate",
      "ended",
      "play",
      "pause",
      "loadstart",
      "progress",
      "durationchange",
      "loadedmetadata",
    ];

    eventsToForward.forEach((eventType) => {
      this.audioElement?.addEventListener(eventType, (event) => {
        // Update internal state
        if (this.audioElement) {
          this.playbackState.currentTime = this.audioElement.currentTime;
          this.playbackState.duration = this.audioElement.duration;
          this.playbackState.isPlaying = !this.audioElement.paused;
        }

        // Forward to registered listeners
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
          listeners.forEach((listener) => listener(event));
        }
      });
    });
  }

  async loadAndPlay(url: string, startTime: number = 0): Promise<void> {
    if (!this.audioElement) await this.initialize();
    if (!this.audioElement) throw new Error("Audio element initialization failed");

    try {
      // Resume audio context if suspended
      if (this.audioContext?.state === "suspended") {
        await this.audioContext.resume();
      }

      this.audioElement.src = url;
      this.audioElement.currentTime = Math.max(0, startTime);
      this.playbackState.currentUrl = url;
      this.playbackState.currentTime = startTime;

      const playPromise = this.audioElement.play();
      if (playPromise) {
        await playPromise;
      }

      this.playbackState.isPlaying = true;
      this.isBackgroundMode = true;

      console.log("[BackgroundAudioManager] Playing in background:", url.substring(0, 80));
    } catch (error) {
      console.error("[BackgroundAudioManager] Failed to load/play:", error);
      throw error;
    }
  }

  play(): void {
    if (!this.audioElement) return;
    
    const playPromise = this.audioElement.play();
    if (playPromise) {
      playPromise.catch((e) => 
        console.debug("[BackgroundAudioManager] Play failed:", e)
      );
    }
    
    this.playbackState.isPlaying = true;
  }

  pause(): void {
    if (!this.audioElement) return;
    this.audioElement.pause();
    this.playbackState.isPlaying = false;
  }

  seek(time: number): void {
    if (!this.audioElement) return;
    this.audioElement.currentTime = Math.max(0, time);
    this.playbackState.currentTime = time;
  }

  setVolume(volume: number): void {
    if (!this.audioElement) return;
    this.audioElement.volume = Math.max(0, Math.min(1, volume / 100));
    this.playbackState.volume = volume;
  }

  getCurrentTime(): number {
    return this.audioElement?.currentTime ?? this.playbackState.currentTime ?? 0;
  }

  getDuration(): number {
    return this.audioElement?.duration ?? this.playbackState.duration ?? 0;
  }

  isPlaying(): boolean {
    if (!this.audioElement) return this.playbackState.isPlaying;
    return !this.audioElement.paused && !this.audioElement.ended;
  }

  addEventListener(event: string, handler: EventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(handler);
  }

  removeEventListener(event: string, handler: EventListener): void {
    this.eventListeners.get(event)?.delete(handler);
  }

  destroy(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = "";
      this.audioElement.remove();
      this.audioElement = null;
    }
    this.eventListeners.clear();
    this.isBackgroundMode = false;
  }
}

let backgroundAudioManager: BackgroundAudioManager | null = null;

/**
 * Get or create global background audio manager instance
 */
export function getBackgroundAudioManager(): BackgroundAudioManager {
  if (!backgroundAudioManager) {
    backgroundAudioManager = new BackgroundAudioManager();
  }
  return backgroundAudioManager;
}
