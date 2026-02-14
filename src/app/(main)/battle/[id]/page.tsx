'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Check, Users, MessageSquare } from 'lucide-react';

import { useBattle } from '@/hooks/useBattle';
import { useBattleStore } from '@/stores/battleStore';
import { BattleCanvas, BattleResultView } from '@/components/battle';
import { Button } from '@/components/ui/Button';
import { formatDuration } from '@/lib/utils';
import { getUuidParam } from '@/lib/validation/params';

export default function BattleRoomPage() {
  const params = useParams();
  const battleId = getUuidParam(params, 'id');
  const { sendChat, toggleReady, updateCanvas, startBattle, vote } = useBattle(battleId || '');
  const {
    participants,
    messages,
    isConnected,
    error,
    room,
    timeLeft,
    battleResult,
    isReady
  } = useBattleStore();
  
  const [chatInput, setChatInput] = useState('');
  const [hasVoted, setHasVoted] = useState(false);

  if (!battleId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">잘못된 battle ID</h2>
        <p className="text-gray-600">올바른 대결방 ID를 확인해주세요.</p>
      </div>
    );
  }

  const handleVote = (paintingUserId: string) => {
    vote(paintingUserId);
    setHasVoted(true);
  };

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

  // 寃뚯엫 醫낅즺 ??寃곌낵 ?붾㈃ ?쒖떆
  if (room.status === 'finished' && battleResult) {
    return (
      <div className="h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden">
        <BattleResultView 
          result={battleResult} 
          onVote={handleVote} 
          hasVoted={hasVoted} 
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden bg-gray-100">
      {/* 硫붿씤 罹붾쾭???곸뿭 */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm shrink-0">
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2">
              {room.title}
              {room.status === 'in_progress' && (
                <span className="text-red-500 font-mono text-xl bg-red-50 px-2 py-0.5 rounded">
                  {formatDuration(timeLeft)}
                </span>
              )}
            </h1>
            <div className="text-sm text-gray-500">
              {room.topic || '?쒕뜡 二쇱젣'} ??{Math.floor(room.timeLimit / 60)}遺??쒗븳
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isConnected && (
              <span className="text-red-500 text-sm flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> ?곌껐 以?..
              </span>
            )}
            <Button 
                variant={isReady ? "primary" : "outline"}
                onClick={() => toggleReady(!isReady)}
                disabled={!isConnected}
              >
                <Check className="w-4 h-4 mr-1" /> 
                {isReady ? '준비완료' : '준비'}
              </Button>
          </div>
        </div>

        {/* 罹붾쾭??而댄룷?뚰듃 */}
        <div className="flex-1 overflow-hidden">
          <BattleCanvas battleId={battleId} className="h-full" />
        </div>
      </div>

      {/* ?ъ씠?쒕컮 (李멸???諛?梨꾪똿) */}
      <div className="w-full lg:w-80 flex flex-col bg-white border-l border-gray-200 shrink-0">
        {/* 李멸???紐⑸줉 */}
        <div className="flex-1 overflow-y-auto p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-1">
            <Users className="w-4 h-4" /> 李멸???({participants.length}/{room.maxParticipants})
          </h3>
          <div className="space-y-4">
            {participants.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0 relative">
                    {p.avatarUrl && (
                      <Image
                        src={p.avatarUrl}
                        alt={p.displayName || p.username}
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {p.displayName || p.username}
                    </div>
                    {p.isHost && <span className="text-xs text-primary-600 font-medium">諛⑹옣</span>}
                  </div>
                  {p.isReady && <Check className="w-4 h-4 text-green-500" />}
                </div>
                
                {/* ?ㅼ떆媛?罹붾쾭??誘몃━蹂닿린 */}
                <div className="aspect-[4/3] bg-white border border-gray-200 rounded overflow-hidden relative">
                  {p.canvasData ? (
                    <Image
                      src={p.canvasData}
                      alt={`${p.username}'s canvas`}
                      fill
                      className="object-contain"
                      sizes="(max-width: 1024px) 100vw, 256px"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-gray-50">
                      ?湲?以?..
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 梨꾪똿李?*/}
        <div className="h-1/3 flex flex-col min-h-[200px]">
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-1">
              <MessageSquare className="w-4 h-4" /> 梨꾪똿
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
              placeholder="硫붿떆吏 ?낅젰..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </form>
        </div>
      </div>
    </div>
  );
}


