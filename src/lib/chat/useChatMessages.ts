'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  gaCompanyName: string | null;
  body: string;
  createdAt: string;
}

const LABEL_REFRESH_INTERVAL_MS = 30_000;

/**
 * 공용 실시간 채팅방 훅 - 플랫폼 전체가 공유하는 chat_messages 테이블 하나를 구독한다.
 * "(소속GA) 이름 설계사" 표시는 DB에 스냅샷을 두지 않고 항상 조회 시점에 조인해서
 * 계산하므로(list_chat_messages/get_chat_message), 이미 렌더링된 과거 메시지의 라벨도
 * GA 변경 승인이 나면 getChatSenderLabels 주기 새로고침으로 몇십 초 안에 자동 반영된다.
 */
export function useChatMessages(enabled: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const mapRow = useCallback(
    (row: {
      id: string;
      user_id: string;
      nickname: string;
      ga_company_name: string | null;
      body: string;
      created_at: string;
    }): ChatMessage => ({
      id: row.id,
      userId: row.user_id,
      nickname: row.nickname,
      gaCompanyName: row.ga_company_name,
      body: row.body,
      createdAt: row.created_at,
    }),
    []
  );

  // 최초 이력 로드
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabaseRef.current
      .rpc('list_chat_messages', { p_limit: 50 })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setMessages([]);
          setHasMore(false);
        } else {
          setMessages(data.map(mapRow).reverse());
          setHasMore(data.length === 50);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, mapRow]);

  // 과거 메시지 더 불러오기(스크롤 백)
  const loadOlder = useCallback(() => {
    if (!enabled || messages.length === 0) return;
    const oldest = messages[0]?.createdAt;
    supabaseRef.current
      .rpc('list_chat_messages', { p_before: oldest, p_limit: 50 })
      .then(({ data, error }) => {
        if (error || !data) return;
        setMessages((prev) => [...data.map(mapRow).reverse(), ...prev]);
        setHasMore(data.length === 50);
      });
  }, [enabled, messages, mapRow]);

  // Realtime 구독 - INSERT 이벤트가 오면 조인된 형태로 다시 조회해 붙인다.
  useEffect(() => {
    if (!enabled) return;
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newId = (payload.new as { id: string }).id;
          supabase
            .rpc('get_chat_message', { p_message_id: newId })
            .then(({ data }) => {
              const row = data?.[0];
              if (!row) return;
              setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, mapRow(row)]));
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, mapRow]);

  // 발신자 라벨 주기 새로고침 - GA 변경 승인이 이미 열려있는 채팅창에도 반영되게 한다.
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      setMessages((prev) => {
        const ids = Array.from(new Set(prev.map((m) => m.userId)));
        if (ids.length === 0) return prev;
        supabaseRef.current.rpc('get_chat_sender_labels', { p_user_ids: ids }).then(({ data }) => {
          if (!data) return;
          const labelById = new Map(data.map((r) => [r.user_id, { nickname: r.nickname, gaCompanyName: r.ga_company_name }]));
          setMessages((current) =>
            current.map((m) => {
              const label = labelById.get(m.userId);
              return label ? { ...m, nickname: label.nickname, gaCompanyName: label.gaCompanyName } : m;
            })
          );
        });
        return prev;
      });
    }, LABEL_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled]);

  return { messages, loading, hasMore, loadOlder };
}
