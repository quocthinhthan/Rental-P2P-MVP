import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import apiService from '../../services/api';
import { createRentalChatSocket } from '../../services/chatSocket';
import { formatRentalCode } from '../../utils/itemCode';

const getId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
};

const getName = (value, fallback) => (
  value?.fullName || value?.name || value?.email || fallback
);

const formatMessageTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function RentalChatPanel({ rental, currentUser, mode = 'participant' }) {
  const rentalId = getId(rental);
  const readOnly = mode === 'admin-readonly';
  const socketRef = useRef(null);
  const messagesRef = useRef(null);
  const collapsedRef = useRef(true);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const parties = useMemo(() => {
    const renter = rental?.renter || rental?.renterId || {};
    const owner = rental?.owner || rental?.ownerId || {};

    return {
      renterId: getId(renter),
      ownerId: getId(owner),
      renterName: getName(renter, 'Người thuê'),
      ownerName: getName(owner, 'Chủ đồ'),
    };
  }, [rental]);

  const currentUserId = getId(currentUser);

  useEffect(() => {
    collapsedRef.current = isCollapsed;
    if (!isCollapsed) {
      setUnreadCount(0);
    }
  }, [isCollapsed]);

  const appendMessage = useCallback((message) => {
    setMessages((current) => {
      if (message?._id && current.some((item) => item._id === message._id)) {
        return current;
      }
      return [...current, message];
    });

    if (collapsedRef.current) {
      setUnreadCount((count) => count + 1);
    }
  }, []);

  useEffect(() => {
    if (!rentalId) return undefined;

    let isActive = true;
    setLoading(true);
    setError('');

    apiService.getRentalMessages(rentalId)
      .then((response) => {
        if (isActive) {
          setMessages(Array.isArray(response.data) ? response.data : []);
        }
      })
      .catch((err) => {
        if (isActive) {
          setError(err.response?.data?.message || 'Không thể tải lịch sử trò chuyện.');
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    if (!readOnly && currentUserId) {
      const socket = createRentalChatSocket();
      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('join_rental_room', rentalId);
      });
      socket.on('disconnect', () => setConnected(false));
      socket.on('receive_message', appendMessage);
      socket.on('chat_error', (payload) => {
        setError(payload?.message || 'Kết nối chat gặp lỗi.');
      });
      socket.on('connect_error', (err) => {
        setConnected(false);
        setError(err.message || 'Không thể kết nối chat realtime.');
      });

      socket.connect();
    }

    return () => {
      isActive = false;
      if (socketRef.current) {
        socketRef.current.off('receive_message', appendMessage);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [appendMessage, rentalId, readOnly, currentUserId]);

  useEffect(() => {
    const messageList = messagesRef.current;
    if (!messageList) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      messageList.scrollTo({
        top: messageList.scrollHeight,
        behavior: loading ? 'auto' : 'smooth',
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [messages.length, loading]);

  const getSenderMeta = (message) => {
    const senderId = getId(message?.senderId);
    const isMine = senderId && senderId === getId(currentUser);

    if (senderId === parties.renterId) {
      return { label: 'Người thuê', name: parties.renterName, isMine, role: 'renter' };
    }
    if (senderId === parties.ownerId) {
      return { label: 'Chủ đồ', name: parties.ownerName, isMine, role: 'owner' };
    }

    return { label: 'Tin nhắn', name: 'Người dùng', isMine, role: 'unknown' };
  };

  const handleDraftKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleToggleCollapse = () => {
    setIsCollapsed((current) => !current);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !rentalId || sending) return;

    try {
      setSending(true);
      setError('');

      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', { rentalId, content });
      } else {
        const response = await apiService.sendRentalMessage(rentalId, content);
        appendMessage(response.data);
      }

      setDraft('');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi tin nhắn.');
    } finally {
      setSending(false);
    }
  };

  if (isCollapsed) {
    return (
      <section className={`rental-chat-collapsed${readOnly ? ' is-readonly' : ''}`}>
        <button
          type="button"
          className="rental-chat-bubble-toggle"
          onClick={handleToggleCollapse}
          aria-label={readOnly ? 'Mở lịch sử trò chuyện' : 'Mở chat với đối tác'}
        >
          <span className="rental-chat-collapsed-icon" aria-hidden="true">
            <i className={readOnly ? 'fas fa-folder-open' : 'fas fa-comment-dots'} />
          </span>
          <span className="rental-chat-collapsed-copy">
            <span>{readOnly ? 'Lịch sử trò chuyện' : 'Chat với đối tác'}</span>
            <strong>{formatRentalCode(rental)}</strong>
            <small>
              {readOnly
                ? 'Bấm để xem bằng chứng trao đổi'
                : connected ? 'Đang trực tuyến, bấm để mở khung chat' : 'Bấm để mở khung chat'}
            </small>
          </span>
          <span className={`rental-chat-state ${readOnly ? 'is-readonly' : connected ? 'is-online' : 'is-offline'}`}>
            {readOnly ? 'Chỉ đọc' : connected ? 'Online' : 'Kết nối'}
          </span>
          {unreadCount > 0 && (
            <span className="rental-chat-unread" aria-label={`${unreadCount} tin nhắn mới`}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </section>
    );
  }

  return (
    <section className={`rental-chat-panel${readOnly ? ' is-readonly' : ''}`}>
      <div className="rental-chat-header">
        <div className="rental-chat-title-group">
          <span className="rental-chat-icon" aria-hidden="true">
            <i className={readOnly ? 'fas fa-folder-open' : 'fas fa-comments'} />
          </span>
          <div>
            <p className="section-kicker">{readOnly ? 'Bằng chứng trao đổi' : 'Trao đổi đơn thuê'}</p>
            <h3>{readOnly ? 'Lịch sử trò chuyện' : 'Chat với đối tác'}</h3>
            <span className="rental-chat-subtitle">
              {readOnly
                ? 'Admin chỉ xem lịch sử để đối chiếu khi xử lý tranh chấp.'
                : `${formatRentalCode(rental)} được lưu lại để hai bên dễ đối chiếu khi cần.`}
            </span>
          </div>
        </div>
        <div className="rental-chat-header-actions">
          <span className={`rental-chat-state ${readOnly ? 'is-readonly' : connected ? 'is-online' : 'is-offline'}`}>
            {readOnly ? 'Chỉ đọc' : connected ? 'Đang trực tuyến' : 'Đang kết nối'}
          </span>
          <button
            type="button"
            className="rental-chat-collapse-btn"
            onClick={handleToggleCollapse}
            aria-label="Thu gọn chat"
          >
            <i className="fas fa-minus" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="rental-chat-parties" aria-label="Các bên trong cuộc trò chuyện">
        <span><i className="fas fa-user" aria-hidden="true" /> Người thuê: <strong>{parties.renterName}</strong></span>
        <span><i className="fas fa-store" aria-hidden="true" /> Chủ đồ: <strong>{parties.ownerName}</strong></span>
      </div>

      <div className="rental-chat-messages" ref={messagesRef} aria-live="polite">
        {loading && (
          <div className="rental-chat-empty">
            <span aria-hidden="true"><i className="fas fa-spinner fa-spin" /></span>
            <p>Đang tải lịch sử trò chuyện...</p>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="rental-chat-empty">
            <span aria-hidden="true"><i className="far fa-comment-dots" /></span>
            <p>Chưa có tin nhắn nào trong đơn thuê này.</p>
          </div>
        )}

        {!loading && messages.map((message) => {
          const sender = getSenderMeta(message);
          const alignRight = readOnly ? sender.role === 'owner' : sender.isMine;

          return (
            <article
              key={message._id || `${message.createdAt}-${message.content}`}
              className={`rental-chat-message ${alignRight ? 'is-mine' : 'is-theirs'} is-${sender.role}`}
            >
              <span className="rental-chat-avatar" aria-hidden="true">
                {sender.role === 'owner' ? <i className="fas fa-store" /> : <i className="fas fa-user" />}
              </span>
              <div className="rental-chat-bubble">
                <div className="rental-chat-meta">
                  <strong>{readOnly ? sender.label : sender.isMine ? 'Bạn' : sender.name}</strong>
                  <span>{formatMessageTime(message.createdAt)}</span>
                </div>
                <p>{message.content}</p>
              </div>
            </article>
          );
        })}
      </div>

      {error && <div className="rental-chat-error">{error}</div>}

      {!readOnly && (
        <form className="rental-chat-form" onSubmit={handleSubmit}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleDraftKeyDown}
            placeholder="Nhập tin nhắn..."
            maxLength={1000}
            rows={1}
            disabled={sending}
          />
          <button type="submit" className="rental-chat-send-btn" disabled={!draft.trim() || sending} aria-label="Gửi tin nhắn">
            <i className={sending ? 'fas fa-spinner fa-spin' : 'fas fa-paper-plane'} aria-hidden="true" />
            <span>{sending ? 'Đang gửi' : 'Gửi'}</span>
          </button>
        </form>
      )}
    </section>
  );
}

export default RentalChatPanel;
