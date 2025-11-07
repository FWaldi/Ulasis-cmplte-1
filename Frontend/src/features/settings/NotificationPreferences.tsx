import React, { useState, useEffect } from 'react';
import { useNotifications, NotificationPreferences as NotificationPrefs } from '../../hooks/ui/useNotifications';

interface NotificationPreferencesProps {
  className?: string;
}

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  className = '',
}) => {
  const {
    preferences,
    isLoading,
    error,
    updatePreferences,
    isUpdatingPreferences,
    sendTestEmail,
    isSendingTestEmail,
    clearError,
  } = useNotifications();

  const [localPreferences, setLocalPreferences] = useState<NotificationPrefs>({
    email_notifications: true,
    new_review_alerts: true,
    subscription_updates: true,
    account_security: true,
  });
  const [testEmail, setTestEmail] = useState('');
  const [showTestEmail, setShowTestEmail] = useState(false);

  // Update local state when preferences are loaded
  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  const handlePreferenceChange = (key: keyof NotificationPrefs, value: boolean) => {
    setLocalPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    updatePreferences(localPreferences);
  };

  const handleTestEmail = () => {
    if (testEmail.trim()) {
      sendTestEmail({ email: testEmail.trim() });
      setTestEmail('');
      setShowTestEmail(false);
    }
  };

  const hasChanges = preferences &&
    Object.keys(localPreferences).some(
      key => localPreferences[key as keyof NotificationPrefs] !==
             preferences[key as keyof NotificationPrefs]
    );

  if (isLoading && !preferences) {
    return (
      <div className={`notification-preferences ${className}`}>
        <div className="loading">Loading notification preferences...</div>
      </div>
    );
  }

  return (
    <div className={`notification-preferences ${className}`}>
      <div className="preferences-header">
        <h3>Email Notification Preferences</h3>
        <p>Choose which email notifications you'd like to receive.</p>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={clearError} className="error-dismiss">×</button>
        </div>
      )}

      <div className="preferences-form">
        <div className="preference-group">
          <label className="preference-item">
            <input
              type="checkbox"
              checked={localPreferences.email_notifications}
              onChange={(e) => handlePreferenceChange('email_notifications', e.target.checked)}
              disabled={isUpdatingPreferences}
            />
            <div className="preference-content">
              <strong>Enable Email Notifications</strong>
              <p>Master switch for all email notifications</p>
            </div>
          </label>
        </div>

        <div className="preference-group">
          <h4>Notification Types</h4>

          <label className="preference-item">
            <input
              type="checkbox"
              checked={localPreferences.new_review_alerts}
              onChange={(e) => handlePreferenceChange('new_review_alerts', e.target.checked)}
              disabled={isUpdatingPreferences || !localPreferences.email_notifications}
            />
            <div className="preference-content">
              <strong>New Review Alerts</strong>
              <p>Get notified when someone submits a review for your questionnaires</p>
            </div>
          </label>

          <label className="preference-item">
            <input
              type="checkbox"
              checked={localPreferences.subscription_updates}
              onChange={(e) => handlePreferenceChange('subscription_updates', e.target.checked)}
              disabled={isUpdatingPreferences || !localPreferences.email_notifications}
            />
            <div className="preference-content">
              <strong>Subscription Updates</strong>
              <p>Receive notifications about subscription changes and billing</p>
            </div>
          </label>

          <label className="preference-item">
            <input
              type="checkbox"
              checked={localPreferences.account_security}
              onChange={(e) => handlePreferenceChange('account_security', e.target.checked)}
              disabled={isUpdatingPreferences || !localPreferences.email_notifications}
            />
            <div className="preference-content">
              <strong>Account Security</strong>
              <p>Important security notifications like password resets and login alerts</p>
            </div>
          </label>
        </div>

        <div className="preferences-actions">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isUpdatingPreferences}
            className="save-button"
          >
            {isUpdatingPreferences ? 'Saving...' : 'Save Preferences'}
          </button>

          <button
            onClick={() => setShowTestEmail(!showTestEmail)}
            className="test-email-button"
          >
            Test Email Settings
          </button>
        </div>

        {showTestEmail && (
          <div className="test-email-section">
            <p>Send a test email to verify your notification settings:</p>
            <div className="test-email-form">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter email address"
                disabled={isSendingTestEmail}
              />
              <button
                onClick={handleTestEmail}
                disabled={!testEmail.trim() || isSendingTestEmail}
                className="send-test-button"
              >
                {isSendingTestEmail ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .notification-preferences {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }

        .preferences-header {
          margin-bottom: 24px;
        }

        .preferences-header h3 {
          margin: 0 0 8px 0;
          color: #1f2937;
        }

        .preferences-header p {
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

        .preferences-form {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 24px;
        }

        .preference-group {
          margin-bottom: 24px;
        }

        .preference-group h4 {
          margin: 0 0 16px 0;
          color: #374151;
          font-size: 16px;
          font-weight: 600;
        }

        .preference-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .preference-item:hover {
          border-color: #d1d5db;
        }

        .preference-item input[type="checkbox"] {
          margin-top: 2px;
          width: 16px;
          height: 16px;
        }

        .preference-content strong {
          display: block;
          color: #1f2937;
          margin-bottom: 4px;
        }

        .preference-content p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .preferences-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .save-button, .test-email-button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .save-button {
          background: #4f46e5;
          color: white;
        }

        .save-button:hover:not(:disabled) {
          background: #4338ca;
        }

        .save-button:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        .test-email-button {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .test-email-button:hover {
          background: #e5e7eb;
        }

        .test-email-section {
          margin-top: 20px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .test-email-form {
          display: flex;
          gap: 12px;
          margin-top: 12px;
        }

        .test-email-form input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
        }

        .send-test-button {
          padding: 8px 16px;
          background: #059669;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .send-test-button:hover:not(:disabled) {
          background: #047857;
        }

        .send-test-button:disabled {
          background: #d1d5db;
          cursor: not-allowed;
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

export default NotificationPreferences;