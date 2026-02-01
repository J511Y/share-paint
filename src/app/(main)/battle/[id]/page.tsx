'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBattle } from '@/hooks/useBattle';
import { useBattleStore } from '@/stores/battleStore';
import { BattleCanvas } from '@/components/battle';

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

  // ... (기존 useEffect 등 유지)

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
        <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm shrink-0">
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
            
            {/* 임시: user id 비교 로직 필요 */}
            {/* room.host_id === myState.isHost ? ... */}
             <Button 
                variant={myState.isReady ? "primary" : "outline"}
                onClick={() => toggleReady(!myState.isReady)}
                disabled={!isConnected}
              >
                <Check className="w-4 h-4 mr-1" /> 
                {myState.isReady ? '준비 완료' : '준비하기'}
              </Button>
          </div>
        </div>

        {/* 캔버스 컴포넌트 */}
        <div className="flex-1 overflow-hidden">
          <BattleCanvas battleId={battleId} className="h-full" />
        </div>
      </div>

      {/* 사이드바 (참가자 및 채팅) */}
      <div className="w-full lg:w-80 flex flex-col bg-white border-l border-gray-200 shrink-0">
        {/* 참가자 목록 */}
        <div className="flex-1 overflow-y-auto p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-1">
            <Users className="w-4 h-4" /> 참가자 ({participants.length}/{room.max_participants})
          </h3>
          <div className="space-y-4">
            {participants.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
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
                
                {/* 실시간 캔버스 미리보기 */}
                <div className="aspect-[4/3] bg-white border border-gray-200 rounded overflow-hidden relative">
                   {p.canvasData ? (
                     <img src={p.canvasData} alt={`${p.username}'s canvas`} className="w-full h-full object-contain" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-gray-50">
                       대기 중...
                     </div>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 채팅창 */}
        <div className="h-1/3 flex flex-col min-h-[200px]">
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
