import React, { useState, useEffect } from 'react';
import { useNotifications, NotificationHistoryItem } from '../../hooks/ui/useNotifications';

interface NotificationHistoryProps {
  className?: string;
}

const NotificationHistory: React.FC<NotificationHistoryProps> = ({
  className = '',
}) => {
  const {
    history,
    isLoading,
    error,
    fetchHistory,
    clearError,
  } = useNotifications();

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchHistory(currentPage);
  }, [fetchHistory, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return '#059669';
      case 'sent':
        return '#0891b2';
      case 'queued':
        return '#f59e0b';
      case 'bounced':
      case 'failed':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return '✓';
      case 'sent':
        return '📤';
      case 'queued':
        return '⏳';
      case 'bounced':
        return '⚠️';
      case 'failed':
        return '❌';
      default:
        return '📧';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'verification':
        return 'Email Verification';
      case 'review':
        return 'New Review';
      case 'subscription':
        return 'Subscription Update';
      case 'security':
        return 'Security';
      case 'test':
        return 'Test Email';
      default:
        return type;
    }
  };

  if (isLoading && !history) {
    return (
      <div className={`notification-history ${className}`}>
        <div className="loading">Loading notification history...</div>
      </div>
    );
  }

  return (
    <div className={`notification-history ${className}`}>
      <div className="history-header">
        <h3>Email Notification History</h3>
        <p>View all emails sent to your account.</p>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={clearError} className="error-dismiss">×</button>
        </div>
      )}

      <div className="history-content">
        {history && history.notifications.length > 0 ? (
          <>
            <div className="history-list">
              {history.notifications.map((notification) => (
                <div key={notification.id} className="history-item">
                  <div className="history-item-header">
                    <div className="history-type">
                      <span className="type-icon">{getStatusIcon(notification.status)}</span>
                      <span className="type-label">{getTypeLabel(notification.type)}</span>
                    </div>
                    <div
                      className="history-status"
                      style={{ color: getStatusColor(notification.status) }}
                    >
                      {notification.status.toUpperCase()}
                    </div>
                  </div>

                  <div className="history-item-content">
                    <h4 className="history-subject">{notification.subject}</h4>
                    <div className="history-details">
                      <div className="detail-item">
                        <span className="detail-label">Created:</span>
                        <span className="detail-value">
                          {formatDate(notification.created_at)}
                        </span>
                      </div>
                      {notification.sent_at && (
                        <div className="detail-item">
                          <span className="detail-label">Sent:</span>
                          <span className="detail-value">
                            {formatDate(notification.sent_at)}
                          </span>
                        </div>
                      )}
                      {notification.delivered_at && (
                        <div className="detail-item">
                          <span className="detail-label">Delivered:</span>
                          <span className="detail-value">
                            {formatDate(notification.delivered_at)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {history.pagination.pages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                  className="pagination-button"
                >
                  Previous
                </button>

                <span className="pagination-info">
                  Page {currentPage} of {history.pagination.pages}
                  ({history.pagination.total} total notifications)
                </span>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === history.pagination.pages || isLoading}
                  className="pagination-button"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📧</div>
            <h4>No notifications yet</h4>
            <p>When you receive email notifications, they'll appear here.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .notification-history {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .history-header {
          margin-bottom: 24px;
        }

        .history-header h3 {
          margin: 0 0 8px 0;
          color: #1f2937;
        }

        .history-header p {
          margin: 0;
          color: #6b7280;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #dc2626;
        }

        .error-dismiss {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #dc2626;
        }

        .history-content {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .history-list {
          max-height: 600px;
          overflow-y: auto;
        }

        .history-item {
          border-bottom: 1px solid #f3f4f6;
          padding: 20px;
        }

        .history-item:last-child {
          border-bottom: none;
        }

        .history-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .history-type {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .type-icon {
          font-size: 16px;
        }

        .type-label {
          font-weight: 500;
          color: #374151;
        }

        .history-status {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.05);
        }

        .history-subject {
          margin: 0 0 12px 0;
          color: #1f2937;
          font-size: 16px;
          font-weight: 500;
        }

        .history-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .detail-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-value {
          font-size: 14px;
          color: #374151;
        }

        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .pagination-info {
          color: #6b7280;
          font-size: 14px;
        }

        .pagination-button {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .pagination-button:hover:not(:disabled) {
          background: #f3f4f6;
        }

        .pagination-button:disabled {
          background: #f9fafb;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state h4 {
          margin: 0 0 8px 0;
          color: #374151;
        }

        .empty-state p {
          margin: 0;
          font-size: 14px;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default NotificationHistory;