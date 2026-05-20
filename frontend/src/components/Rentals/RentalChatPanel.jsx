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
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const parties = useMemo(() => {
    const renter = rental?.renter || rental?.renterId || {};
    const owner = rental?.owner || rental?.ownerId || {};

    return {
      renterId: getId(renter),
      ownerId: getId(owner),
      renterName: getName(renter, 'Nguoi thue'),
      ownerName: getName(owner, 'Chu do'),
    };
  }, [rental]);

  const appendMessage = useCallback((message) => {
    setMessages((current) => {
      if (message?._id && current.some((item) => item._id === message._id)) {
        return current;
      }
      return [...current, message];
    });
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
          setError(err.response?.data?.message || 'Khong the tai lich su tro chuyen.');
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    if (!readOnly && currentUser?._id) {
      const socket = createRentalChatSocket();
      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('join_rental_room', rentalId);
      });
      socket.on('disconnect', () => setConnected(false));
      socket.on('receive_message', appendMessage);
      socket.on('chat_error', (payload) => {
        setError(payload?.message || 'Ket noi chat gap loi.');
      });
      socket.on('connect_error', (err) => {
        setConnected(false);
        setError(err.message || 'Khong the ket noi chat realtime.');
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
  }, [appendMessage, rentalId, readOnly, currentUser?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const getSenderMeta = (message) => {
    const senderId = getId(message?.senderId);
    const isMine = senderId && senderId === getId(currentUser);

    if (senderId === parties.renterId) {
      return { label: 'Nguoi thue', name: parties.renterName, isMine, role: 'renter' };
    }
    if (senderId === parties.ownerId) {
      return { label: 'Chu do', name: parties.ownerName, isMine, role: 'owner' };
    }

    return { label: 'Tin nhan', name: 'Nguoi dung', isMine, role: 'unknown' };
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
      setError(err.response?.data?.message || 'Khong the gui tin nhan.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={`rental-detail-panel rental-chat-panel${readOnly ? ' is-readonly' : ''}`}>
      <div className="detail-section-header">
        <div>
          <p className="section-kicker">{readOnly ? 'Bang chung trao doi' : 'Trao doi don thue'}</p>
          <h3>{readOnly ? 'Lich su chat' : 'Chat voi doi tac'}</h3>
        </div>
        <span className={`rental-chat-state ${readOnly ? 'is-readonly' : connected ? 'is-online' : 'is-offline'}`}>
          {readOnly ? 'Chi doc' : connected ? 'Realtime' : 'Dang ket noi'}
        </span>
      </div>

      <div className="rental-chat-context">
        <i className="fas fa-comments" aria-hidden="true" />
        <span>{formatRentalCode(rental)} - tin nhan duoc luu de doi chieu khi can.</span>
      </div>

      <div className="rental-chat-messages" aria-live="polite">
        {loading && (
          <div className="compact-empty-state">
            <span aria-hidden="true" />
            <p>Dang tai lich su tro chuyen...</p>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="compact-empty-state">
            <span aria-hidden="true" />
            <p>Chua co tin nhan nao trong don thue nay.</p>
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
              <div className="rental-chat-bubble">
                <div className="rental-chat-meta">
                  <strong>{readOnly ? sender.label : sender.isMine ? 'Ban' : sender.name}</strong>
                  <span>{formatMessageTime(message.createdAt)}</span>
                </div>
                <p>{message.content}</p>
              </div>
            </article>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className="rental-chat-error">{error}</div>}

      {!readOnly && (
        <form className="rental-chat-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Nhap tin nhan..."
            maxLength={1000}
            disabled={sending}
          />
          <button type="submit" className="btn-xs btn-primary-xs" disabled={!draft.trim() || sending}>
            {sending ? 'Dang gui...' : 'Gui'}
          </button>
        </form>
      )}
    </section>
  );
}

export default RentalChatPanel;
