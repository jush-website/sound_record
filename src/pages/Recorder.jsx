import React, { useState, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

function Recorder({ user }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  
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
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError('');
      setTranscript('');
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
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audio_data: base64data,
            format: 'webm'
          })
        });

        const result = await response.json();
        
        if (result.success) {
          setTranscript(result.text);
          // 儲存到 Firebase
          await addDoc(collection(db, 'recordings'), {
            uid: user.uid,
            text: result.text,
            createdAt: serverTimestamp(),
            duration: result.duration
          });
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

  return (
    <div className="recorder-container">
      <h2>開始錄音</h2>
      <p style={{textAlign: 'center', maxWidth: '600px'}}>
        點擊下方麥克風開始講話。結束後會自動傳送給 AI 辨識並保存到您的雲端紀錄中。
      </p>

      {error && <div style={{color: 'var(--danger)'}}>{error}</div>}

      <button 
        className={`recording-pulse ${isRecording ? 'active' : ''}`}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        style={{ background: isRecording ? 'var(--danger)' : 'var(--accent)' }}
      >
        {isRecording ? '⏹' : '🎤'}
      </button>

      <div className={`status-text ${isRecording ? 'recording' : ''}`}>
        {isRecording ? '正在錄音... (再次點擊停止)' : (isProcessing ? 'AI 正在處理中...' : '點擊麥克風開始')}
      </div>

      {(transcript || isProcessing) && (
        <div className="glass-panel transcript-box">
          {isProcessing ? <span style={{color: 'var(--text-muted)'}}>辨識中，請稍候...</span> : transcript}
        </div>
      )}
    </div>
  );
}

export default Recorder;
