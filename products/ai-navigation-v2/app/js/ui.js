'use strict';

/**
 * UI Service — DOM manipulation, accessibility, and notification helpers
 * 
 * WHY: Centralizes all DOM interaction patterns to enforce:
 * 1. Accessibility compliance (WCAG 2.1 AA) — governance/accessibility-policy.md
 * 2. Security (no innerHTML with user input) — governance/security-policy.md A03
 * 3. Consistent UX patterns across all components
 * 
 * LEARNING APPLIED: LEARN-004 — ARIA live regions need 50ms setTimeout
 * before setting textContent, otherwise Screen Readers ignore the change.
 * 
 * LEARNING APPLIED: LEARN-007 — Error messages need 'assertive' priority
 * for non-technical users (Monika persona).
 */

/**
 * Notification types with semantic mapping.
 */
const NOTIFICATION_TYPES = Object.freeze({
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
});

/**
 * Auto-dismiss durations per notification type (ms).
 * Errors persist until manually dismissed (0 = no auto-dismiss).
 */
const DISMISS_DURATIONS = Object.freeze({
  [NOTIFICATION_TYPES.SUCCESS]: 4000,
  [NOTIFICATION_TYPES.ERROR]: 0,
  [NOTIFICATION_TYPES.WARNING]: 6000,
  [NOTIFICATION_TYPES.INFO]: 5000
});

let notificationCounter = 0;

const UIService = {
  /**
   * Announce a message to screen readers via ARIA live region.
   * 
   * LEARNING: LEARN-004 — 50ms delay is required for live region updates.
   * LEARNING: LEARN-007 — Errors use 'assertive' for immediate announcement.
   * 
   * @param {string} message - Text to announce
   * @param {'polite'|'assertive'} priority - ARIA live priority
   */
  announce(message, priority = 'polite') {
    const elementId = priority === 'assertive' ? 'error-message' : 'status-message';
    const el = document.getElementById(elementId);

    if (!el) {
      console.warn(`[UI] Live region #${elementId} not found in DOM`);
      return;
    }

    // Clear first, then set after delay — screen readers need the "change" event
    el.textContent = '';
    setTimeout(() => {
      el.textContent = message;
    }, 50);
  },

  /**
   * Show a visual notification to the user.
   * Also announces to screen readers for accessibility.
   * 
   * @param {string} message - Notification text
   * @param {string} type - One of NOTIFICATION_TYPES
   * @param {Object} options - Optional overrides
   * @param {number} options.duration - Custom dismiss duration (0 = persistent)
   * @returns {string} Notification ID (for programmatic dismissal)
   */
  notify(message, type = NOTIFICATION_TYPES.INFO, options = {}) {
    const id = `notification-${++notificationCounter}`;
    const duration = options.duration !== undefined
      ? options.duration
      : DISMISS_DURATIONS[type];

    const container = document.getElementById('notification-container');
    if (!container) {
      console.warn('[UI] #notification-container not found. Falling back to announce().');
      this.announce(message, type === NOTIFICATION_TYPES.ERROR ? 'assertive' : 'polite');
      return id;
    }

    // Create notification element using safe DOM API (no innerHTML)
    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `notification notification--${type}`;
    notification.setAttribute('role', type === NOTIFICATION_TYPES.ERROR ? 'alert' : 'status');

    const icon = document.createElement('span');
    icon.className = 'notification__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = this._getIconForType(type);

    const text = document.createElement('span');
    text.className = 'notification__text';
    text.textContent = message; // textContent — safe against XSS

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'notification__dismiss';
    dismissBtn.setAttribute('type', 'button');
    dismissBtn.setAttribute('aria-label', 'Benachrichtigung schließen');
    dismissBtn.textContent = '×';
    dismissBtn.addEventListener('click', () => this.dismissNotification(id));

    notification.appendChild(icon);
    notification.appendChild(text);
    notification.appendChild(dismissBtn);
    container.appendChild(notification);

    // Announce to screen readers
    const announcePriority = type === NOTIFICATION_TYPES.ERROR ? 'assertive' : 'polite';
    this.announce(message, announcePriority);

    // Auto-dismiss if duration > 0
    if (duration > 0) {
      setTimeout(() => this.dismissNotification(id), duration);
    }

    return id;
  },

  /**
   * Remove a notification from the DOM.
   * 
   * @param {string} notificationId - ID of notification to remove
   */
  dismissNotification(notificationId) {
    const el = document.getElementById(notificationId);
    if (el) {
      el.classList.add('notification--dismissing');
      // Wait for CSS transition before removing from DOM
      setTimeout(() => {
        el.remove();
      }, 300);
    }
  },

  /**
   * Show a confirmation dialog.
   * Returns a Promise that resolves to true (confirm) or false (cancel).
   * 
   * Accessible: focus trap, keyboard support, role="alertdialog".
   * 
   * @param {string} message - Dialog message
   * @param {Object} options
   * @param {string} options.confirmText - Confirm button label (default: 'Bestätigen')
   * @param {string} options.cancelText - Cancel button label (default: 'Abbrechen')
   * @returns {Promise<boolean>}
   */
  confirm(message, options = {}) {
    const confirmText = options.confirmText || 'Bestätigen';
    const cancelText = options.cancelText || 'Abbrechen';

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';
      overlay.setAttribute('role', 'presentation');

      const dialog = document.createElement('div');
      dialog.className = 'dialog';
      dialog.setAttribute('role', 'alertdialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-label', 'Bestätigungsdialog');

      const messageEl = document.createElement('p');
      messageEl.className = 'dialog__message';
      messageEl.textContent = message;
      dialog.appendChild(messageEl);

      const actions = document.createElement('div');
      actions.className = 'dialog__actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn--secondary';
      cancelBtn.setAttribute('type', 'button');
      cancelBtn.textContent = cancelText;

      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn btn--primary';
      confirmBtn.setAttribute('type', 'button');
      confirmBtn.textContent = confirmText;

      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // Focus the confirm button (most expected action)
      confirmBtn.focus();

      // Keyboard handling: Escape = cancel, Tab = trap within dialog
      const handleKeydown = (e) => {
        if (e.key === 'Escape') {
          cleanup(false);
        } else if (e.key === 'Tab') {
          // Simple focus trap between two buttons
          const focusable = [cancelBtn, confirmBtn];
          const currentIndex = focusable.indexOf(document.activeElement);
          if (e.shiftKey) {
            e.preventDefault();
            focusable[(currentIndex - 1 + focusable.length) % focusable.length].focus();
          } else {
            e.preventDefault();
            focusable[(currentIndex + 1) % focusable.length].focus();
          }
        }
      };

      const cleanup = (result) => {
        document.removeEventListener('keydown', handleKeydown);
        overlay.remove();
        resolve(result);
      };

      cancelBtn.addEventListener('click', () => cleanup(false));
      confirmBtn.addEventListener('click', () => cleanup(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup(false);
      });
      document.addEventListener('keydown', handleKeydown);
    });
  },

  /**
   * Set loading state on a button (disable + spinner).
   * 
   * @param {HTMLButtonElement} button - Button element
   * @param {boolean} isLoading - Loading state
   */
  setButtonLoading(button, isLoading) {
    if (!button) return;

    if (isLoading) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.classList.add('btn--loading');
      button.setAttribute('aria-busy', 'true');
    } else {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
      }
      button.classList.remove('btn--loading');
      button.removeAttribute('aria-busy');
    }
  },

  /**
   * Create a keyword tag/chip element.
   * Used by the filter configuration UI.
   * 
   * Accessibility: each tag has aria-label and remove button is focusable.
   * Color independence: tags use text + icon, not color alone (Monika — Deuteranomalie).
   * 
   * @param {string} keyword - Keyword text
   * @param {Function} onRemove - Callback when remove is clicked
   * @returns {HTMLElement} Tag element
   */
  createKeywordTag(keyword, onRemove) {
    const tag = document.createElement('span');
    tag.className = 'keyword-tag';
    tag.setAttribute('role', 'listitem');

    const text = document.createElement('span');
    text.className = 'keyword-tag__text';
    text.textContent = keyword; // Safe: textContent

    const removeBtn = document.createElement('button');
    removeBtn.className = 'keyword-tag__remove';
    removeBtn.setAttribute('type', 'button');
    removeBtn.setAttribute('aria-label', `Keyword "${keyword}" entfernen`);
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      if (typeof onRemove === 'function') {
        onRemove(keyword);
      }
    });

    tag.appendChild(text);
    tag.appendChild(removeBtn);

    return tag;
  },

  /**
   * Create a tooltip attached to a target element.
   * Accessible: visible on hover AND focus (keyboard users).
   * 
   * @param {HTMLElement} target - Element to attach tooltip to
   * @param {string} content - Tooltip text (plain language, per Monika persona)
   */
  attachTooltip(target, content) {
    if (!target) return;

    const tooltipId = `tooltip-${++notificationCounter}`;

    const tooltip = document.createElement('div');
    tooltip.id = tooltipId;
    tooltip.className = 'tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.textContent = content;
    tooltip.hidden = true;

    target.setAttribute('aria-describedby', tooltipId);
    target.parentElement.style.position = 'relative';
    target.parentElement.appendChild(tooltip);

    const show = () => { tooltip.hidden = false; };
    const hide = () => { tooltip.hidden = true; };

    target.addEventListener('mouseenter', show);
    target.addEventListener('mouseleave', hide);
    target.addEventListener('focus', show);
    target.addEventListener('blur', hide);
  },

  /**
   * Get the icon character for a notification type.
   * @private
   */
  _getIconForType(type) {
    switch (type) {
      case NOTIFICATION_TYPES.SUCCESS: return '✓';
      case NOTIFICATION_TYPES.ERROR: return '✕';
      case NOTIFICATION_TYPES.WARNING: return '⚠';
      case NOTIFICATION_TYPES.INFO: return 'ℹ';
      default: return 'ℹ';
    }
  }
};

export { UIService, NOTIFICATION_TYPES };
export default UIService;
