import * as dotenv from 'dotenv';
import { GeminiTTS } from './gemini-tts';

// Load environment variables
dotenv.config();

// Main execution
async function main(): Promise<void> {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      console.error('❌ Please set GEMINI_API_KEY in your environment variables');
      console.log('💡 Get your API key from: https://aistudio.google.com/app/apikey');
      process.exit(1);
    }

    const tts = new GeminiTTS(apiKey);
    
    // Show available voices
    console.log('🎵 Available voices:', tts.getAvailableVoices().join(', '));
    console.log('');

    // Convert the text.txt file to speech
    const outputFile = 'sinhala_text_audio.wav';
    await tts.convertFileToSpeech('text.txt', {
      voiceName: 'Kore', // You can change this to any available voice
      outputFile: outputFile
    });

    console.log('');
    console.log('🎉 Text-to-speech conversion completed successfully!');
    
    // Verify the audio file
    console.log('\n🔍 Verifying audio file...');
    const isValid = tts.verifyAudioFile(outputFile);
    
    if (isValid) {
      tts.showPlaybackInstructions(outputFile);
    } else {
      console.log('❌ The generated audio file may have issues. Please check the logs above.');
    }
    
  } catch (error) {
    console.error('💥 Application error:', error);
    process.exit(1);
  }
}

// Run the application
if (require.main === module) {
  main();
} 