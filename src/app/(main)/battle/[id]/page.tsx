'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBattle } from '@/hooks/useBattle';
import { useBattleStore } from '@/stores/battleStore';
import { Canvas } from '@/components/canvas';
import { Button } from '@/components/ui/Button';
import { useCanvasStore } from '@/stores/canvasStore';
import { Loader2, Users, MessageSquare, Play, Check } from 'lucide-react';

export default function BattleRoomPage() {
  const params = useParams();
  const router = useRouter();
  const battleId = params.id as string;
  const { sendChat, toggleReady, updateCanvas, startBattle } = useBattle(battleId);
  const { 
    participants, 
    messages, 
    myState, 
    isConnected, 
    error,
    room 
  } = useBattleStore();
  
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);

  // 방 정보 로드 (초기 진입 시)
  useEffect(() => {
    const fetchBattleInfo = async () => {
      try {
        const res = await fetch(`/api/battle/${battleId}`);
        if (!res.ok) throw new Error('방을 찾을 수 없습니다.');
        const data = await res.json();
        useBattleStore.getState().setRoom(data);
        
        // 비밀번호 체크 로직 등은 여기서 추가 가능 (API에서 처리됨)
      } catch (err) {
        alert('존재하지 않거나 접근할 수 없는 방입니다.');
        router.push('/battle');
      }
    };
    
    fetchBattleInfo();
  }, [battleId, router]);

  // 에러 처리
  useEffect(() => {
    if (error) {
      console.error('Socket Error:', error);
      // alert('연결 오류가 발생했습니다.');
    }
  }, [error]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChat(chatInput);
    setChatInput('');
  };

  if (!room) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden bg-gray-100">
      {/* 메인 캔버스 영역 */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
          <div>
            <h1 className="font-bold text-lg">{room.title}</h1>
            <div className="text-sm text-gray-500">
              {room.topic || '랜덤 주제'} • {Math.floor(room.time_limit / 60)}분 제한
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isConnected && (
              <span className="text-red-500 text-sm flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> 연결 중...
              </span>
            )}
            
            {room.host_id === myState.isHost ? ( // 내가 호스트인 경우 (수정 필요: 실제 user id 비교)
               <Button onClick={startBattle} disabled={!isConnected}>
                 <Play className="w-4 h-4 mr-1" /> 게임 시작
               </Button>
            ) : (
              <Button 
                variant={myState.isReady ? "primary" : "outline"}
                onClick={() => toggleReady(!myState.isReady)}
                disabled={!isConnected}
              >
                <Check className="w-4 h-4 mr-1" /> 
                {myState.isReady ? '준비 완료' : '준비하기'}
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex items-center justify-center relative">
          {/* 여기에 메인 캔버스 컴포넌트 배치 */}
          <div className="text-gray-400">캔버스 영역 (준비 중)</div>
        </div>
      </div>

      {/* 사이드바 (참가자 및 채팅) */}
      <div className="w-full lg:w-80 flex flex-col bg-white border-l border-gray-200">
        {/* 참가자 목록 */}
        <div className="flex-1 overflow-y-auto p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-1">
            <Users className="w-4 h-4" /> 참가자 ({participants.length}/{room.max_participants})
          </h3>
          <div className="space-y-3">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                  {p.avatarUrl && <img src={p.avatarUrl} alt={p.displayName || p.username} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {p.displayName || p.username}
                  </div>
                  {p.isHost && <span className="text-xs text-primary-600 font-medium">방장</span>}
                </div>
                {p.isReady && <Check className="w-4 h-4 text-green-500" />}
              </div>
            ))}
          </div>
        </div>

        {/* 채팅창 */}
        <div className="h-1/2 flex flex-col">
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-1">
              <MessageSquare className="w-4 h-4" /> 채팅
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className="text-sm">
                <span className="font-bold text-gray-700">{msg.username}:</span>{' '}
                <span className="text-gray-900">{msg.content}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="메시지 입력..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
