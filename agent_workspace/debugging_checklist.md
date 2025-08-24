# Speech-to-Text Debugging Checklist

## Pre-Testing Setup
- [ ] Use a supported browser (Chrome, Edge, or Safari)
- [ ] Ensure microphone is connected and working
- [ ] Open browser console (F12 → Console tab)
- [ ] Navigate to: https://vxwzo3g7zcia.space.minimax.io

## Step-by-Step Testing

### 1. Initial Load Check
- [ ] Console shows: "Speech recognition browser support check"
- [ ] `supported: true` in the support check log
- [ ] No initialization errors in console
- [ ] Microphone button is visible and not disabled

### 2. Microphone Button Click
- [ ] Click the microphone button
- [ ] Console shows: "Starting speech recognition..."
- [ ] Console shows: "Calling recognition.start()"
- [ ] Browser prompts for microphone permission (if first time)
- [ ] Button changes to "listening" state (red with pulse animation)
- [ ] Console shows: "Speech recognition started"

### 3. Speech Input Test
- [ ] Speak clearly: "Hello world, this is a test"
- [ ] Console shows: "Speech recognition result event"
- [ ] Console shows: "Processing result" with your text
- [ ] Console shows: "Final text to process" with clean text
- [ ] Console shows: "Speech result received" with isFinal: true
- [ ] Console shows: "Inserting final text at position" with position number
- [ ] Console shows: "Text inserted successfully"
- [ ] Text appears in the editor

### 4. Multiple Speech Segments
- [ ] Continue speaking after first segment
- [ ] Each speech segment produces separate console logs
- [ ] Text is inserted at the correct cursor position
- [ ] Proper spacing between segments

### 5. Stop Recognition
- [ ] Click microphone button again OR wait for auto-stop
- [ ] Console shows: "Speech recognition ended"
- [ ] Button returns to normal state
- [ ] No more speech processing occurs

## Troubleshooting Guide

### Issue: Microphone button disabled/gray
**Debug Steps:**
- [ ] Check console for "Speech recognition not supported in this browser"
- [ ] Verify browser support: Chrome/Edge/Safari required
- [ ] Try refreshing the page

**Expected Console:**
```
Speech recognition browser support check: {
  supported: false,  // ← Problem indicator
  userAgent: "..."
}
```

### Issue: Permission denied
**Debug Steps:**
- [ ] Check console for "not-allowed" error
- [ ] Check browser address bar for blocked microphone icon
- [ ] Go to browser settings → Site permissions → Microphone
- [ ] Allow microphone access for the site
- [ ] Refresh and try again

**Expected Console:**
```
Speech recognition error: Microphone access denied. Please allow microphone access.
```

### Issue: No speech detected
**Debug Steps:**
- [ ] Check console for "no-speech" error
- [ ] Test microphone in other applications
- [ ] Speak louder and closer to microphone
- [ ] Check system microphone settings
- [ ] Try different microphone if available

**Expected Console:**
```
Speech recognition error: No speech detected. Please try speaking closer to the microphone.
```

### Issue: Recognition starts but no text appears
**Debug Steps:**
- [ ] Check console for "Speech result received"
- [ ] Check if `editorExists: false` in logs
- [ ] Click inside the editor to focus it
- [ ] Try speaking again
- [ ] Check for any JavaScript errors

**Expected Console:**
```
Speech result received: {
  transcript: "your text",
  isFinal: true,
  editorExists: false  // ← Problem indicator
}
```

### Issue: Recognition stops immediately
**Debug Steps:**
- [ ] Check console for "aborted" or "network" errors
- [ ] Verify internet connection
- [ ] Try refreshing the page
- [ ] Wait a moment and try again (rate limiting)

**Expected Console:**
```
Speech recognition error: Network error occurred. Please check your internet connection.
```

### Issue: Interim results not working
**Debug Steps:**
- [ ] Check console for "Interim result" logs while speaking
- [ ] This is expected - interim results are logged but not inserted
- [ ] Only final results are inserted into the editor
- [ ] Continue speaking to generate final results

## Manual Browser Tests

### Test Browser Support
```javascript
// Run in browser console
const support = {
  SpeechRecognition: !!window.SpeechRecognition,
  webkitSpeechRecognition: !!window.webkitSpeechRecognition,
  supported: !!(window.SpeechRecognition || window.webkitSpeechRecognition)
};
console.log('Browser support:', support);
```

### Test Microphone Access
```javascript
// Run in browser console
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(() => console.log('✅ Microphone access granted'))
  .catch(err => console.error('❌ Microphone access denied:', err));
```

### Test Editor Focus
```javascript
// Run in browser console
const editor = document.querySelector('.ProseMirror');
console.log('Editor found:', !!editor);
if (editor) editor.focus();
```

## Success Indicators

### Perfect Working Flow Console Output:
```
Speech recognition browser support check: { supported: true, ... }
Initializing speech recognition with config: { continuous: true, ... }
Starting speech recognition...: { isSupported: true, ... }
Clearing previous state and starting recognition...
Calling recognition.start()
Speech recognition started
Speech recognition result event: { resultIndex: 0, ... }
Processing result: { index: 0, isFinal: true, transcript: "hello", ... }
Final text to process: "hello"
Speech result received: { transcript: "hello", isFinal: true, editorExists: true }
Inserting final text at position: 0 Text: "hello "
Text inserted successfully
```

### Visual Success Indicators:
- [ ] Microphone button shows pulse animation when listening
- [ ] Text appears in editor as you speak
- [ ] Proper spacing between words/segments
- [ ] Button returns to normal state when done
- [ ] No error messages in console

## Emergency Fallback
If speech-to-text still doesn't work:
1. Try the original URL: https://rfrfcs1o5d48.space.minimax.io
2. Use manual typing as fallback
3. Report specific console errors for further debugging
4. Test in different browser (Chrome → Edge → Safari)
5. Check system microphone permissions at OS level

## Quick Test Commands
```bash
# Test different browsers
# Chrome: chrome --enable-speech-input --enable-web-speech-api
# Edge: Same as Chrome
# Safari: No special flags needed
```

---

**Last Updated:** August 24, 2025  
**Fixed Version:** https://vxwzo3g7zcia.space.minimax.io  
**Support:** Chrome, Edge, Safari (No Firefox support)
