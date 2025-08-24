// ==========================================
// NOTIFICATION SYSTEM MODULE
// ==========================================

export const notificationSystem = {
  // State
  state: {
    notifications: [],
    notificationContainer: null,
    historyOverlay: null,
    historyPanel: null,
    historyBtn: null,
    currentNotificationTimeout: null
  },

  // Initialization
  initialization: {
    initialize: function() {
      if (!notificationSystem.state.notificationContainer) {
        notificationSystem.state.notificationContainer = document.createElement("div");
        notificationSystem.state.notificationContainer.className = "fixed z-50 right-4 bottom-4 space-y-2 max-w-sm";
        document.body.appendChild(notificationSystem.state.notificationContainer);
        
        notificationSystem.state.historyOverlay = document.createElement("div");
        notificationSystem.state.historyOverlay.className = "hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center";
        document.body.appendChild(notificationSystem.state.historyOverlay);
        
        notificationSystem.state.historyPanel = document.createElement("div");
        notificationSystem.state.historyPanel.className = "bg-[#161b22] text-white rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto p-4 space-y-2";
        notificationSystem.state.historyOverlay.appendChild(notificationSystem.state.historyPanel);
        
        notificationSystem.state.historyBtn = document.createElement("button");
        notificationSystem.state.historyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
        notificationSystem.state.historyBtn.className = "fixed bottom-4 left-4 z-50";
        notificationSystem.state.historyBtn.addEventListener("click", function() {
          notificationSystem.history.update();
          notificationSystem.state.historyOverlay.classList.remove("hidden");
        });
        document.body.appendChild(notificationSystem.state.historyBtn);
        
        notificationSystem.state.historyOverlay.addEventListener("click", function(e) {
          if (e.target === notificationSystem.state.historyOverlay) {
            notificationSystem.state.historyOverlay.classList.add("hidden");
          }
        });
      }
      
      notificationSystem.state.notifications = notificationSystem.state.notifications || [];
      notificationSystem.state.currentNotificationTimeout = null;
    }
  },

  // Core notification functions
  show: function(message, type = "info", undoCallback = null) {
    if (!notificationSystem.state.notificationContainer) {
      notificationSystem.initialization.initialize();
    }
    
    const typeStyles = {
      info: "bg-[#316dca] border-[#265db5] text-white",
      success: "bg-[#238636] border-[#2ea043] text-white", 
      warning: "bg-[#bb8009] border-[#d29922] text-white",
      error: "bg-[#da3633] border-[#f85149] text-white"
    };
    
    const noteIndex = notificationSystem.state.notifications.length;
    const note = { message, type, undo: undoCallback };
    notificationSystem.state.notifications.push(note);
    
    const notification = document.createElement("div");
    notification.className = `relative border px-5 py-4 rounded-md shadow-md flex items-start justify-between gap-4 text-md ${typeStyles[type] || typeStyles.info}`;
    
    const msgSpan = document.createElement("span");
    msgSpan.className = "flex-1";
    msgSpan.innerText = message;
    notification.appendChild(msgSpan);
    
    const actions = document.createElement("div");
    actions.className = "absolute top-5 bottom-5 right-2 flex items-center space-x-2";
    
    if (undoCallback) {
      const undo = document.createElement("button");
      undo.innerHTML = '<svg class="w-5 h-5 text-white hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>';
      undo.addEventListener("click", function() {
        if (typeof undoCallback === "function") {
          undoCallback();
          notificationSystem.ui.remove(notification);
        }
      });
      actions.appendChild(undo);
    }
    
    const close = document.createElement("button");
    close.innerHTML = '<svg class="w-5 h-5 text-white hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>';
    close.addEventListener("click", function() { 
      notificationSystem.ui.remove(notification); 
    });
    actions.appendChild(close);
    notification.appendChild(actions);
    
    notification.addEventListener("mouseenter", function() {
      actions.classList.remove("hidden");
    });
    notification.addEventListener("mouseleave", function() {
      if (!notificationSystem.state.historyOverlay || notificationSystem.state.historyOverlay.classList.contains("hidden")) return;
      actions.classList.add("hidden");
    });
    
    notificationSystem.state.notificationContainer.appendChild(notification);
    
    if (notificationSystem.state.currentNotificationTimeout) {
      clearTimeout(notificationSystem.state.currentNotificationTimeout);
    }
    notificationSystem.state.currentNotificationTimeout = setTimeout(function() { 
      notificationSystem.ui.remove(notification); 
    }, 5000);
    
    return notification;
  },

  // UI functions
  ui: {
    remove: function(element) {
      element.classList.add("opacity-0", "translate-y-2", "transition-all", "duration-300");
      setTimeout(function() { 
        element.remove(); 
      }, 300);
    }
  },

  // History management
  history: {
    update: function() {
      if (!notificationSystem.state.historyPanel) return;
      
      notificationSystem.state.historyPanel.innerHTML = "";
      const typeStyles = {
        info: "bg-[#316dca] border-[#265db5] text-white",
        success: "bg-[#238636] border-[#2ea043] text-white", 
        warning: "bg-[#bb8009] border-[#d29922] text-white",
        error: "bg-[#da3633] border-[#f85149] text-white"
      };
      
      notificationSystem.state.notifications.forEach(function(note, i) {
        const el = document.createElement("div");
        el.className = `relative border px-3 py-2 rounded-md shadow-md flex items-start justify-between gap-4 text-sm mb-2 ${typeStyles[note.type] || typeStyles.info}`;
        
        const msgSpan = document.createElement("span");
        msgSpan.className = "flex-1";
        msgSpan.innerText = note.message;
        el.appendChild(msgSpan);
        
        const actions = document.createElement("div");
        actions.className = "hidden absolute -top-3 right-1 flex items-center space-x-2";
        
        if (typeof note.undo === "function") {
          const undo = document.createElement("button");
          undo.innerHTML = '<svg class="w-5 h-5 text-white hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>';
          undo.disabled = i !== notificationSystem.state.notifications.length - 1;
          if (undo.disabled) undo.classList.add("opacity-30", "cursor-not-allowed");
          undo.addEventListener("click", function() {
            note.undo();
            el.remove();
            notificationSystem.state.notifications = notificationSystem.state.notifications.filter(function(_, index) { 
              return index !== i; 
            });
          });
          actions.appendChild(undo);
        }
        
        const close = document.createElement("button");
        close.innerHTML = '<svg class="w-5 h-5 text-white hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>';
        close.addEventListener("click", function() {
          el.remove();
          notificationSystem.state.notifications = notificationSystem.state.notifications.filter(function(_, index) { 
            return index !== i; 
          });
        });
        
        actions.appendChild(close);
        el.appendChild(actions);
        
        el.addEventListener("mouseenter", function() {
          actions.classList.remove("hidden");
        });
        el.addEventListener("mouseleave", function() {
          actions.classList.add("hidden");
        });
        
        notificationSystem.state.historyPanel.appendChild(el);
      });
      
      if (notificationSystem.state.notifications.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "text-center py-6 text-gray-400";
        emptyState.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No notifications yet</p>
        `;
        notificationSystem.state.historyPanel.appendChild(emptyState);
      }
    }
  }
};

