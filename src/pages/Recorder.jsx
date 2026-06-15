import React, { useState, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

function Recorder({ user }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastDuration, setLastDuration] = useState(0);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState(''); // '', 'saving', 'saved', 'error'
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          const wavBlob = await convertToWav(audioBlob);
          await processAudio(wavBlob);
        } catch (err) {
          console.error("轉換音訊格式失敗:", err);
          setError("轉換音訊格式失敗，請重試。");
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError('');
      setTranscript('');
      setSaveStatus('');
    } catch (err) {
      console.error(err);
      setError('無法存取麥克風。請確定已授權麥克風權限。');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const convertToWav = async (blob) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const length = channelData.length * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    
    let pos = 0;
    const setUint32 = (data) => { view.setUint32(pos, data, true); pos += 4; };
    const setUint16 = (data) => { view.setUint16(pos, data, true); pos += 2; };
    const writeString = (name) => { for (let i = 0; i < name.length; i++) { view.setUint8(pos++, name.charCodeAt(i)); } };

    writeString('RIFF');
    setUint32(length - 8);
    writeString('WAVE');
    writeString('fmt ');
    setUint32(16);
    setUint16(1);
    setUint16(1);
    setUint32(sampleRate);
    setUint32(sampleRate * 2);
    setUint16(2);
    setUint16(16);
    writeString('data');
    setUint32(length - pos - 4);

    for (let i = 0; i < channelData.length; i++) {
        let sample = Math.max(-1, Math.min(1, channelData[i]));
        sample = sample < 0 ? sample * 32768 : sample * 32767;
        view.setInt16(pos, sample, true);
        pos += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const processAudio = async (blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:10000';
        
        const response = await fetch(`${backendUrl}/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio_data: base64data, format: 'wav' })
        });

        const result = await response.json();
        
        if (result.success) {
          setTranscript(result.text);
          setLastDuration(result.duration || 0);
          setSaveStatus(''); // 準備讓使用者點擊儲存
        } else {
          setError(result.error || '語音辨識失敗。');
        }
        setIsProcessing(false);
      };
    } catch (err) {
      console.error(err);
      setError('處理音訊或連線至伺服器時發生錯誤。請確認後端是否運行中。');
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!transcript) return;
    setSaveStatus('saving');
    try {
      await addDoc(collection(db, 'recordings'), {
        uid: user.uid,
        text: transcript,
        createdAt: serverTimestamp(),
        duration: lastDuration
      });
      setSaveStatus('saved');
    } catch (err) {
      console.error('儲存失敗:', err);
      setSaveStatus('error');
      // 如果遇到權限問題，顯示明確錯誤
      if (err.message && err.message.includes('permission')) {
        setError('儲存失敗：沒有權限寫入資料庫 (請確認 Firebase 規則)');
      } else {
        setError('儲存紀錄時發生錯誤。');
      }
    }
  };

  return (
    <div className="recorder-container">
      <h2>開始錄音</h2>
      <p style={{textAlign: 'center', maxWidth: '600px'}}>
        點擊下方麥克風開始講話。結束後會自動傳送給 AI 辨識。辨識完成後可點擊儲存到您的雲端紀錄中。
      </p>

      {error && <div style={{color: 'var(--danger)', marginTop: '10px'}}>{error}</div>}

      <button 
        className={`recording-pulse ${isRecording ? 'active' : ''}`}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing || saveStatus === 'saving'}
        style={{ background: isRecording ? 'var(--danger)' : 'var(--accent)' }}
      >
        {isRecording ? '⏹' : '🎤'}
      </button>

      <div className={`status-text ${isRecording ? 'recording' : ''}`}>
        {isRecording ? '正在錄音... (再次點擊停止)' : (isProcessing ? 'AI 正在處理中...' : '點擊麥克風開始')}
      </div>

      {(transcript || isProcessing) && (
        <div className="glass-panel transcript-box" style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
          <div>
            {isProcessing ? <span style={{color: 'var(--text-muted)'}}>辨識中，請稍候...</span> : transcript}
          </div>
          
          {/* 儲存按鈕區域 */}
          {!isProcessing && transcript && (
            <div style={{display: 'flex', justifyContent: 'center', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px'}}>
              {saveStatus === 'saved' ? (
                <span style={{color: 'var(--success)', fontWeight: 'bold'}}>✅ 已成功儲存至歷史紀錄！</span>
              ) : (
                <button 
                  onClick={handleSave} 
                  className="btn btn-primary"
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? '儲存中...' : '💾 儲存此紀錄'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Recorder;
