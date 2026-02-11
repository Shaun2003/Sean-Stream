/**
 * Enhanced Audio Player for Background Playback
 * Provides proper Web Audio API integration with background playback support
 */

export class BackgroundAudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private currentUrl: string = "";
  private isInitialized = false;

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create audio context on first user interaction
      if (!this.audioContext) {
        // Use window.audioContext if available, otherwise create new
        this.audioContext = (window as any).audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Resume audio context if suspended
        if (this.audioContext.state === "suspended") {
          await this.audioContext.resume();
          console.log("[BackgroundPlayer] Audio context resumed");
        }
      }

      // Create audio element for background playback
      if (!this.audioElement) {
        this.audioElement = new Audio();
        this.audioElement.crossOrigin = "anonymous";
        this.audioElement.preload = "none";
        
        // Enable persistent playback
        this.audioElement.setAttribute("controlsList", "nodownload");
        
        // Connect to audio context
        if (this.audioContext && !this.source) {
          this.source = this.audioContext.createMediaElementAudioSource(this.audioElement);
          this.source.connect(this.audioContext.destination);
          console.log("[BackgroundPlayer] Audio element connected to context");
        }
      }

      this.isInitialized = true;
      console.log("[BackgroundPlayer] Initialized successfully");
    } catch (error) {
      console.error("[BackgroundPlayer] Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Load and play audio from URL (works in background)
   */
  async loadAndPlay(url: string, startTime: number = 0): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.audioElement) {
      throw new Error("Audio element not initialized");
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext && this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.currentUrl = url;
      this.audioElement.src = url;
      this.audioElement.currentTime = startTime;
      
      // Play
      const playPromise = this.audioElement.play();
      if (playPromise) {
        await playPromise;
        console.log("[BackgroundPlayer] Playing:", url);
      }
    } catch (error) {
      console.error("[BackgroundPlayer] Failed to load/play:", error);
      throw error;
    }
  }

  /**
   * Play audio
   */
  async play(): Promise<void> {
    if (!this.audioElement) throw new Error("Audio element not initialized");
    
    try {
      if (this.audioContext && this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
      
      const playPromise = this.audioElement.play();
      if (playPromise) {
        await playPromise;
      }
    } catch (error) {
      console.error("[BackgroundPlayer] Play failed:", error);
    }
  }

  /**
   * Pause audio
   */
  pause(): void {
    if (!this.audioElement) return;
    this.audioElement.pause();
  }

  /**
   * Seek to time
   */
  seek(time: number): void {
    if (!this.audioElement) return;
    this.audioElement.currentTime = Math.max(0, time);
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    if (!this.audioElement) return 0;
    return this.audioElement.currentTime;
  }

  /**
   * Get duration
   */
  getDuration(): number {
    if (!this.audioElement) return 0;
    return this.audioElement.duration || 0;
  }

  /**
   * Set volume (0-100)
   */
  setVolume(volume: number): void {
    if (!this.audioElement) return;
    this.audioElement.volume = Math.max(0, Math.min(1, volume / 100));
  }

  /**
   * Get volume (0-100)
   */
  getVolume(): number {
    if (!this.audioElement) return 0;
    return this.audioElement.volume * 100;
  }

  /**
   * Add event listener
   */
  addEventListener(event: string, handler: EventListener): void {
    if (!this.audioElement) return;
    this.audioElement.addEventListener(event, handler);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, handler: EventListener): void {
    if (!this.audioElement) return;
    this.audioElement.removeEventListener(event, handler);
  }

  /**
   * Check if audio is playing
   */
  isPlaying(): boolean {
    if (!this.audioElement) return false;
    return !this.audioElement.paused && !this.audioElement.ended;
  }

  /**
   * Destroy player and clean up
   */
  destroy(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = "";
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    // Note: Don't close audio context as it may be shared
    this.isInitialized = false;
  }
}

// Global singleton instance
let globalPlayer: BackgroundAudioPlayer | null = null;

/**
 * Get or create global player instance
 */
export function getGlobalAudioPlayer(): BackgroundAudioPlayer {
  if (!globalPlayer) {
    globalPlayer = new BackgroundAudioPlayer();
  }
  return globalPlayer;
}
