import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

export interface TTSConfig {
  voiceName: string;
  outputFile: string;
}

export class GeminiTTS {
  private ai: GoogleGenAI;
  private readonly defaultConfig: TTSConfig = {
    voiceName: 'Kore',
    outputFile: 'output.wav'
  };

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required. Please set it in your environment variables.');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Read text from a file
   */
  private readTextFile(filePath: string): string {
    try {
      const fullPath = path.resolve(filePath);
      return fs.readFileSync(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  /**
   * Create WAV header for PCM audio data
   */
  private createWavHeader(dataLength: number, sampleRate: number = 24000, channels: number = 1, bitsPerSample: number = 16): Buffer {
    const header = Buffer.alloc(44);
    
    // RIFF header
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write('WAVE', 8);
    
    // fmt chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // chunk size
    header.writeUInt16LE(1, 20);  // audio format (PCM)
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28); // byte rate
    header.writeUInt16LE(channels * bitsPerSample / 8, 32); // block align
    header.writeUInt16LE(bitsPerSample, 34);
    
    // data chunk
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);
    
    return header;
  }

  /**
   * Save audio data to a WAV file with proper WAV header
   */
  private saveWaveFile(filename: string, audioData: string): void {
    try {
      const pcmBuffer = Buffer.from(audioData, 'base64');
      const wavHeader = this.createWavHeader(pcmBuffer.length);
      const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
      
      fs.writeFileSync(filename, wavBuffer);
      console.log(`✅ Audio saved to: ${filename}`);
      console.log(`📊 File size: ${(wavBuffer.length / 1024).toFixed(1)} KB`);
      console.log(`⏱️  Duration: ~${(pcmBuffer.length / (24000 * 2)).toFixed(1)} seconds`);
    } catch (error) {
      throw new Error(`Failed to save audio file: ${error}`);
    }
  }

  /**
   * Convert text to speech using Gemini TTS
   */
  async textToSpeech(text: string, config: Partial<TTSConfig> = {}): Promise<void> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    try {
      console.log('🎤 Generating speech with Gemini TTS...');
      console.log(`📝 Text length: ${text.length} characters`);
      console.log(`🎵 Voice: ${finalConfig.voiceName}`);

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ 
          role: "user", 
          parts: [{ text: `Please read this text aloud: ${text}` }] 
        }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { 
                voiceName: finalConfig.voiceName 
              }
            }
          }
        }
      });

      // Extract audio data from response
      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (!audioData) {
        throw new Error('No audio data received from Gemini API');
      }

      // Save the audio file
      this.saveWaveFile(finalConfig.outputFile, audioData);
      
    } catch (error) {
      console.error('❌ Error generating speech:', error);
      throw error;
    }
  }

  /**
   * Convert text file to speech
   */
  async convertFileToSpeech(inputFile: string, config: Partial<TTSConfig> = {}): Promise<void> {
    try {
      console.log(`📖 Reading text from: ${inputFile}`);
      const text = this.readTextFile(inputFile);
      
      if (!text.trim()) {
        throw new Error('Input file is empty or contains only whitespace');
      }

      await this.textToSpeech(text, config);
      
    } catch (error) {
      console.error('❌ Error converting file to speech:', error);
      throw error;
    }
  }

  /**
   * Get available voice options
   */
  getAvailableVoices(): string[] {
    return [
      'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda',
      'Orus', 'Aoede', 'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus',
      'Umbriel', 'Algieba', 'Despina', 'Erinome', 'Algenib', 'Rasalgethi',
      'Laomedeia', 'Achernar', 'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima',
      'Achird', 'Zubenelgenubi', 'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat'
    ];
  }

  /**
   * Verify if the generated audio file is valid
   */
  verifyAudioFile(filename: string): boolean {
    try {
      if (!fs.existsSync(filename)) {
        console.log(`❌ File ${filename} does not exist`);
        return false;
      }

      const stats = fs.statSync(filename);
      console.log(`📁 File exists: ${filename}`);
      console.log(`📊 File size: ${(stats.size / 1024).toFixed(1)} KB`);

      // Read first few bytes to check WAV header
      const fd = fs.openSync(filename, 'r');
      const buffer = Buffer.alloc(12);
      fs.readSync(fd, buffer, 0, 12, 0);
      fs.closeSync(fd);
      
      const header = buffer.toString('ascii', 0, 4);
      const format = buffer.toString('ascii', 8, 12);

      if (header === 'RIFF' && format === 'WAVE') {
        console.log(`✅ Valid WAV file detected`);
        return true;
      } else {
        console.log(`❌ Invalid WAV header. Header: "${header}", Format: "${format}"`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error verifying audio file: ${error}`);
      return false;
    }
  }

  /**
   * Provide instructions for playing the audio file
   */
  showPlaybackInstructions(filename: string): void {
    console.log('\n🔊 How to play the audio file:');
    console.log('');
    console.log('Windows:');
    console.log(`  - Double-click: ${filename}`);
    console.log(`  - Command line: start ${filename}`);
    console.log(`  - Media players: VLC, Windows Media Player, etc.`);
    console.log('');
    console.log('Mac:');
    console.log(`  - Double-click: ${filename}`);
    console.log(`  - Command line: open ${filename}`);
    console.log(`  - Media players: QuickTime, VLC, etc.`);
    console.log('');
    console.log('Linux:');
    console.log(`  - Command line: xdg-open ${filename}`);
    console.log(`  - Media players: VLC, mpv, etc.`);
  }
} 