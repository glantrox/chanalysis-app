// renderer.js — Chanalysis Frontend Logic
// Extracted from the monolithic index.html <script> block.
// Handles: theme toggling, drag-and-drop, file parsing, Chart.js rendering,
// behavior cards, count-up animations, and the participant detail modal.

// ═══════════════════════════════════════════════════════════════════════════
// Global State
// ═══════════════════════════════════════════════════════════════════════════
let dailyChartInst = null;
let last7ChartInst = null;
let hourlyChartInst = null;
let edaMsgLengthChartInst = null;
let edaMsgTypeCompositionChartInst = null;
let edaScatterChartInst = null;
let globalRawChat = null;
let globalParsedData = null;
let globalSystemMessages = [];

// ─── Color Palette for Senders (supports dark mode consistent styling) ──────
const palette = [
  { bg: 'rgba(79, 70, 229, 0.8)', border: 'rgb(79, 70, 229)', text: 'text-indigo-600 dark:text-indigo-400', badge: 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40' },
  { bg: 'rgba(225, 29, 72, 0.8)', border: 'rgb(225, 29, 72)', text: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40' },
  { bg: 'rgba(16, 185, 129, 0.8)', border: 'rgb(16, 185, 129)', text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40' },
  { bg: 'rgba(245, 158, 11, 0.8)', border: 'rgb(245, 158, 11)', text: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40' },
  { bg: 'rgba(14, 165, 233, 0.8)', border: 'rgb(14, 165, 233)', text: 'text-sky-600 dark:text-sky-400', badge: 'bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40' },
  { bg: 'rgba(168, 85, 247, 0.8)', border: 'rgb(168, 85, 247)', text: 'text-purple-600 dark:text-purple-400', badge: 'bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40' },
  { bg: 'rgba(236, 72, 153, 0.8)', border: 'rgb(236, 72, 153)', text: 'text-pink-600 dark:text-pink-400', badge: 'bg-pink-50 dark:bg-pink-950/40 border border-pink-100 dark:border-pink-900/40' },
  { bg: 'rgba(249, 115, 22, 0.8)', border: 'rgb(249, 115, 22)', text: 'text-orange-600 dark:text-orange-400', badge: 'bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/40' },
  { bg: 'rgba(34, 197, 94, 0.8)', border: 'rgb(34, 197, 94)', text: 'text-green-600 dark:text-green-400', badge: 'bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/40' },
  { bg: 'rgba(239, 68, 68, 0.8)', border: 'rgb(239, 68, 68)', text: 'text-red-600 dark:text-red-400', badge: 'bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40' }
];

// ═══════════════════════════════════════════════════════════════════════════
// DOMContentLoaded — Main Entry Point
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // ─── Theme Toggle Logic ────────────────────────────────────────────────
  const themeToggleBtn = document.getElementById('theme-toggle');
  const darkIcon = document.getElementById('theme-toggle-dark-icon');
  const lightIcon = document.getElementById('theme-toggle-light-icon');

  function updateThemeIcons() {
    if (document.documentElement.classList.contains('dark')) {
      darkIcon.classList.add('hidden');
      lightIcon.classList.remove('hidden');
    } else {
      lightIcon.classList.add('hidden');
      darkIcon.classList.remove('hidden');
    }
  }

  // Initialize theme from localStorage / system preference
  if (
    localStorage.getItem('color-theme') === 'dark' ||
    (!('color-theme' in localStorage) &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  updateThemeIcons();

  themeToggleBtn.addEventListener('click', function () {
    document.documentElement.classList.toggle('dark');
    if (document.documentElement.classList.contains('dark')) {
      localStorage.setItem('color-theme', 'dark');
    } else {
      localStorage.setItem('color-theme', 'light');
    }
    updateThemeIcons();

    // Update charts if they exist
    if (window.Chart) {
      Chart.helpers.each(Chart.instances, function (instance) {
        updateChartTheme(instance);
      });
    }
  });

  function updateChartTheme(chart) {
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b'; // slate-400 vs slate-500
    const gridColor = isDark ? '#334155' : '#e2e8f0'; // slate-700 vs slate-200

    if (chart.options.scales.x) {
      chart.options.scales.x.ticks.color = textColor;
      chart.options.scales.x.grid.color = gridColor;
    }
    if (chart.options.scales.y) {
      chart.options.scales.y.ticks.color = textColor;
      chart.options.scales.y.grid.color = gridColor;
    }
    chart.update();
  }

  // ─── File Upload (Header Button) ───────────────────────────────────────
  const fileUnggah = document.getElementById('fileUnggah');

  // ─── Drag-and-Drop & Pending State ─────────────────────────────────────
  const dropzone = document.getElementById('dropzone');
  const fileInputHidden = document.getElementById('file-input-hidden');
  const dropzoneError = document.getElementById('dropzone-error');
  const dropzoneErrorText = document.getElementById('dropzone-error-text');
  const pendingState = document.getElementById('pending-state');
  const pendingFileName = document.getElementById('pending-file-name');
  const pendingFileSize = document.getElementById('pending-file-size');
  const cancelFileBtn = document.getElementById('cancel-file-btn');
  const analyzeBtn = document.getElementById('analyze-btn');

  let selectedFile = null;

  function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  function showError(msg) {
    dropzoneErrorText.textContent = msg;
    dropzoneError.classList.remove('hidden');
    setTimeout(() => {
      dropzoneError.classList.add('hidden');
    }, 3000);
  }

  function handleFileSelection(file) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.txt')) {
      showError('Format tidak valid. Harap unggah file .txt.');
      if (fileInputHidden) fileInputHidden.value = '';
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      showError('File terlalu besar. Ukuran maksimum adalah 50 MB.');
      if (fileInputHidden) fileInputHidden.value = '';
      return;
    }

    selectedFile = file;
    if (pendingFileName) pendingFileName.textContent = file.name;
    if (pendingFileSize) pendingFileSize.textContent = formatBytes(file.size);

    if (dropzone) dropzone.classList.add('hidden');
    if (pendingState) pendingState.classList.remove('hidden');
  }

  if (fileInputHidden) {
    fileInputHidden.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }

  if (dropzone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, preventDefaults, false);
    });
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(
        eventName,
        () => {
          dropzone.classList.add(
            'border-indigo-500',
            'bg-indigo-50',
            'dark:border-indigo-500',
            'dark:bg-indigo-900/20'
          );
        },
        false
      );
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(
        eventName,
        () => {
          dropzone.classList.remove(
            'border-indigo-500',
            'bg-indigo-50',
            'dark:border-indigo-500',
            'dark:bg-indigo-900/20'
          );
        },
        false
      );
    });

    dropzone.addEventListener(
      'drop',
      (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
          handleFileSelection(files[0]);
        }
      },
      false
    );
  }

  if (cancelFileBtn) {
    cancelFileBtn.addEventListener('click', () => {
      selectedFile = null;
      if (fileInputHidden) fileInputHidden.value = '';
      if (pendingState) pendingState.classList.add('hidden');
      if (dropzone) dropzone.classList.remove('hidden');
    });
  }

  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => {
      if (!selectedFile) return;

      document.getElementById('upload-prompt').classList.add('hidden');
      document.getElementById('main-dashboard').classList.remove('hidden');

      const header = document.getElementById('main-header');
      if (header) {
        header.classList.remove('p-2', 'bg-transparent');
      }

      const headerBtn = document.getElementById('header-upload-btn');
      if (headerBtn) headerBtn.classList.remove('hidden');

      const reader = new FileReader();
      reader.onload = function (e) {
        const text = e.target.result;
        globalRawChat = text;
        const filterContainer = document.getElementById('filterContainer');
        if (filterContainer) filterContainer.classList.remove('hidden');
        processChatData(text);
      };
      reader.readAsText(selectedFile);
    });
  }

  // ─── Header Re-Upload Handler ──────────────────────────────────────────
  const filterContainer = document.getElementById('filterContainer');
  const startDateInput = document.getElementById('startDate');

  document.getElementById('fileUnggah').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('fileNameDisplay').textContent = file.name;
    const reader = new FileReader();
    reader.onload = function (evt) {
      globalRawChat = evt.target.result;
      filterContainer.classList.remove('hidden');
      document.getElementById('upload-prompt').classList.add('hidden');
      document.getElementById('main-dashboard').classList.remove('hidden');
      startDateInput.value = '';
      processChatData(globalRawChat);
      e.target.value = ''; // Reset input so same file can be uploaded again
    };
    reader.readAsText(file);
  });

  // ─── Date Filter ───────────────────────────────────────────────────────
  startDateInput.addEventListener('change', function (e) {
    if (globalRawChat) {
      processChatData(globalRawChat, e.target.value);
    }
  });

  // ─── Tabs Navigation ───────────────────────────────────────────────────
  const tabOverview = document.getElementById('tab-overview');
  const tabSystem = document.getElementById('tab-system');
  const tabEda = document.getElementById('tab-eda');
  const overviewContent = document.getElementById('overview-content');
  const systemContent = document.getElementById('system-content');
  const edaContent = document.getElementById('eda-content');

  const activeTabClass = 'border-indigo-500 text-indigo-600 dark:text-indigo-400 whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all cursor-pointer';
  const inactiveTabClass = 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all cursor-pointer';

  if (tabOverview && tabSystem && tabEda) {
    tabOverview.addEventListener('click', () => {
      tabOverview.className = activeTabClass;
      tabSystem.className = inactiveTabClass;
      tabEda.className = inactiveTabClass;
      
      overviewContent.classList.remove('hidden');
      systemContent.classList.add('hidden');
      edaContent.classList.add('hidden');
    });

    tabSystem.addEventListener('click', () => {
      tabOverview.className = inactiveTabClass;
      tabSystem.className = activeTabClass;
      tabEda.className = inactiveTabClass;
      
      overviewContent.classList.add('hidden');
      systemContent.classList.remove('hidden');
      edaContent.classList.add('hidden');

      renderSystemDashboard();
    });

    tabEda.addEventListener('click', () => {
      tabOverview.className = inactiveTabClass;
      tabSystem.className = inactiveTabClass;
      tabEda.className = activeTabClass;
      
      overviewContent.classList.add('hidden');
      systemContent.classList.add('hidden');
      edaContent.classList.remove('hidden');

      // Resize Chart.js instances to fit their new visible containers
      if (edaMsgLengthChartInst) edaMsgLengthChartInst.resize();
      if (edaMsgTypeCompositionChartInst) edaMsgTypeCompositionChartInst.resize();
      if (edaScatterChartInst) edaScatterChartInst.resize();
    });
  }

  // ─── Modal Close Listeners ─────────────────────────────────────────────
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', () => {
      closeParticipantModal();
    });
  }
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      closeParticipantModal();
    });
  }

  // ─── Modal Chat Search & Sort Listeners ─────────────────────────────────
  const modalSearch = document.getElementById('modal-chat-search');
  const modalSort = document.getElementById('modal-chat-sort');
  if (modalSearch) {
    modalSearch.addEventListener('input', updateModalChatList);
  }
  if (modalSort) {
    modalSort.addEventListener('change', updateModalChatList);
  }

  // ─── System Log Search & Filter Listeners ──────────────────────────────
  const sysSearch = document.getElementById('sys-search');
  const sysFilterType = document.getElementById('sys-filter-type');
  if (sysSearch) {
    sysSearch.addEventListener('input', updateSystemLogList);
  }
  if (sysFilterType) {
    sysFilterType.addEventListener('change', updateSystemLogList);
  }

  // ─── Modal Tabs Switching ──────────────────────────────────────────────
  const modalTabChat = document.getElementById('modal-tab-chat');
  const modalTabCall = document.getElementById('modal-tab-call');
  const modalPanelChat = document.getElementById('modal-panel-chat');
  const modalPanelCall = document.getElementById('modal-panel-call');

  if (modalTabChat && modalTabCall && modalPanelChat && modalPanelCall) {
    modalTabChat.addEventListener('click', () => {
      modalTabChat.className = 'border-indigo-500 text-indigo-600 dark:text-indigo-400 whitespace-nowrap pb-3 border-b-2 font-bold text-sm flex items-center gap-2 transition-all cursor-pointer';
      modalTabCall.className = 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 whitespace-nowrap pb-3 border-b-2 font-medium text-sm flex items-center gap-2 transition-all cursor-pointer';
      
      modalPanelChat.classList.remove('hidden');
      modalPanelCall.classList.add('hidden');
    });

    modalTabCall.addEventListener('click', () => {
      modalTabChat.className = 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 whitespace-nowrap pb-3 border-b-2 font-medium text-sm flex items-center gap-2 transition-all cursor-pointer';
      modalTabCall.className = 'border-indigo-500 text-indigo-600 dark:text-indigo-400 whitespace-nowrap pb-3 border-b-2 font-bold text-sm flex items-center gap-2 transition-all cursor-pointer';
      
      modalPanelChat.classList.add('hidden');
      modalPanelCall.classList.remove('hidden');
    });
  }

  const modalCallSort = document.getElementById('modal-call-sort');
  if (modalCallSort) {
    modalCallSort.addEventListener('change', updateModalCallList);
  }

  // ─── All Participants Modal Close Listeners ─────────────────────────────
  const participantsBackdrop = document.getElementById('participants-backdrop');
  const participantsCloseBtn = document.getElementById('participants-close-btn');
  if (participantsBackdrop) {
    participantsBackdrop.addEventListener('click', () => {
      closeAllParticipantsModal();
    });
  }
  if (participantsCloseBtn) {
    participantsCloseBtn.addEventListener('click', () => {
      closeAllParticipantsModal();
    });
  }

  // ─── Activity Ranking Modal Close Listeners ─────────────────────────────
  const activityBackdrop = document.getElementById('activity-backdrop');
  const activityCloseBtn = document.getElementById('activity-close-btn');
  if (activityBackdrop) {
    activityBackdrop.addEventListener('click', () => {
      closeActivityRankingModal();
    });
  }
  if (activityCloseBtn) {
    activityCloseBtn.addEventListener('click', () => {
      closeActivityRankingModal();
    });
  }
});

// ─── Dynamic Responsive Re-rendering of Badges ────────────────────────────
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (globalParsedData) {
      renderParticipantBadges();
    }
  }, 150);
});

// ═══════════════════════════════════════════════════════════════════════════
// processChatData — Core Parsing & Rendering Pipeline
// ═══════════════════════════════════════════════════════════════════════════
function processChatData(rawChat, startDateStr = '') {
  // ─── Parser ────────────────────────────────────────────────────────────
  function parseChatData(chatText) {
    const lines = chatText.split(/\r?\n/);
    
    // Patterns for auto-detection
    const patterns = {
      ios: {
        name: "iOS (Kurung Siku)",
        user: /^\[(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4}),\s*(\d{1,2})[:\.](\d{2})(?:[:\.](\d{2}))?\s*(AM|PM|am|pm)?\]\s*([^:]+):\s*([\s\S]*)/,
        system: /^\[(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4}),\s*(\d{1,2})[:\.](\d{2})(?:[:\.](\d{2}))?\s*(AM|PM|am|pm)?\]\s*([^:]+)$/
      },
      android: {
        name: "Android (Tanda Hubung)",
        user: /^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4}),\s*(\d{1,2})[:\.](\d{2})(?:[:\.](\d{2}))?\s*(AM|PM|am|pm)?\s*-\s*([^:]+):\s*([\s\S]*)/,
        system: /^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4}),\s*(\d{1,2})[:\.](\d{2})(?:[:\.](\d{2}))?\s*(AM|PM|am|pm)?\s*-\s*(?!.*:)([^:]+)$/
      }
    };

    // Pre-scan to detect format
    let iosUserMatches = 0;
    let androidUserMatches = 0;
    const scanLimit = Math.min(lines.length, 200);
    for (let i = 0; i < scanLimit; i++) {
      const line = lines[i].replace(/\u200E/g, '').trim();
      if (patterns.ios.user.test(line)) iosUserMatches++;
      if (patterns.android.user.test(line)) androidUserMatches++;
    }

    let selectedFormat = 'android';
    if (iosUserMatches > androidUserMatches) {
      selectedFormat = 'ios';
    }
    const activePatterns = patterns[selectedFormat];
    const formatName = activePatterns.name;

    let totalMessages = 0;
    const senders = new Set();
    const dailyData = {};
    const hourlyData = {};
    const totalsBySender = {};

    // Advanced Insights
    const mediaCount = {};
    const wordCount = {};
    const linkCount = {};

    // Language & Behavior
    const wordFreq = {};
    const emojiFreq = {};
    const responseTimes = {};
    const msgTypes = {};
    const interactions = {};

    // Diagnostics
    let multilineMergedCount = 0;
    let corruptedLinesCount = 0;
    let duplicateMessagesCount = 0;
    let emptyMessagesCount = 0;
    const systemMessages = [];

    // Helper arrays for EDA
    const allTextMessages = [];
    const wordCountsArray = [];
    const wordCountsBySender = {};

    let lastSender = null;
    let lastTimestamp = null;
    let lastMessageObj = null;

    const stopwords = new Set([
      'di', 'ke', 'dari', 'yg', 'yang', 'dan', 'ini', 'itu', 'ada', 'gw',
      'lu', 'aku', 'kamu', 'ya', 'ga', 'gak', 'aja', 'sama', 'buat', 'udah',
      'kalo', 'sih', 'kan', 'nya', 'emang', 'pas', 'terus', 'lagi', 'tapi',
      'bisa', 'omitted', 'sticker', 'image', 'video', 'audio', 'https',
      'http', 'www', 'com', 'untuk', 'dengan', 'atau', 'juga', 'baru', 'kok',
      'nih', 'dong', 'deh', 'karena', 'jadi', 'klo', 'kau', 'kita', 'mereka',
      'nah', 'oh', 'kalo',
    ]);
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

    function extractDetails(match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-indexed
      let year = parseInt(match[3], 10);
      if (year < 100) year += 2000;
      
      let hour = parseInt(match[4], 10);
      const minute = parseInt(match[5], 10);
      const second = match[6] ? parseInt(match[6], 10) : 0;
      const ampm = match[7];

      if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
        else if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
      }

      const dateObj = new Date(year, month, day, hour, minute, second);
      const timestamp = dateObj.getTime();
      const formattedDate = `${String(day).padStart(2, '0')}/${String(month+1).padStart(2, '0')}/${String(year).substring(2)}`;

      return {
        day, month, year,
        hour: String(hour).padStart(2, '0'),
        minute: String(minute).padStart(2, '0'),
        second: String(second).padStart(2, '0'),
        timestamp,
        rawDate: formattedDate,
        sender: match[8].trim(),
        messageContent: match[9] ? match[9].trim() : ''
      };
    }

    // Pre-scan first 200 lines to detect the group name from the encryption message
    let detectedGroupName = '';
    for (let i = 0; i < Math.min(lines.length, 200); i++) {
      const line = lines[i].replace(/\u200E/g, '').trim();
      const userMatch = line.match(activePatterns.user);
      if (userMatch) {
        const content = userMatch[9] ? userMatch[9].trim().toLowerCase() : '';
        if (content.includes('end-to-end encrypted') || content.includes('dienkripsi secara end-to-end')) {
          detectedGroupName = userMatch[8].trim();
          break;
        }
      }
    }

    lines.forEach((line) => {
      const cleanLine = line.replace(/\u200E/g, '').trim();
      if (!cleanLine) {
        if (lastMessageObj) {
          lastMessageObj.messageContent += '\n';
          multilineMergedCount++;
        }
        return;
      }

      // 1. Try matching user message
      const userMatch = cleanLine.match(activePatterns.user);
      if (userMatch) {
        const msg = extractDetails(userMatch);
        
        // Date filtering
        if (startDateStr) {
          const fullYear = msg.year;
          const messageDateStr = `${fullYear}-${String(msg.month+1).padStart(2, '0')}-${String(msg.day).padStart(2, '0')}`;
          if (messageDateStr < startDateStr) return;
        }

        // Check if it's an encryption notice or a message from the group itself (system)
        const lowerMsgContent = msg.messageContent.toLowerCase();
        const isEncryptionMsg = lowerMsgContent.includes('end-to-end encrypted') || lowerMsgContent.includes('dienkripsi secara end-to-end');
        
        if (isEncryptionMsg || (detectedGroupName && msg.sender === detectedGroupName)) {
          systemMessages.push({
            timestamp: msg.timestamp,
            type: isEncryptionMsg ? 'encryption' : 'group_event',
            content: isEncryptionMsg ? `${msg.sender}: ${msg.messageContent}` : msg.messageContent,
            isAI: false
          });
          lastMessageObj = null; // Break multiline chain on system message
          return;
        }

        // Check if it's a message from Meta AI
        if (msg.sender === 'Meta AI') {
          systemMessages.push({
            timestamp: msg.timestamp,
            type: 'meta_ai',
            content: msg.messageContent,
            isAI: true
          });
          lastMessageObj = null; // Break multiline chain on Meta AI message
          return;
        }

        // Check duplicates (consecutive, same sender, same content, within 5s)
        if (lastMessageObj && 
            lastMessageObj.sender === msg.sender && 
            lastMessageObj.messageContent === msg.messageContent &&
            Math.abs(lastMessageObj.timestamp - msg.timestamp) < 5000) {
          duplicateMessagesCount++;
          return; // Skip duplicate to avoid skewing stats
        }

        if (!msg.messageContent) {
          emptyMessagesCount++;
        }

        totalMessages++;
        const sender = msg.sender;
        senders.add(sender);

        if (!totalsBySender[sender]) totalsBySender[sender] = 0;
        if (!dailyData[msg.rawDate]) dailyData[msg.rawDate] = {};
        if (!dailyData[msg.rawDate][sender]) dailyData[msg.rawDate][sender] = 0;
        if (!hourlyData[msg.hour]) hourlyData[msg.hour] = {};
        if (!hourlyData[msg.hour][sender]) hourlyData[msg.hour][sender] = 0;

        // Insight initialization
        if (!mediaCount[sender]) mediaCount[sender] = 0;
        if (!wordCount[sender]) wordCount[sender] = 0;
        if (!linkCount[sender]) linkCount[sender] = 0;
        if (!wordFreq[sender]) wordFreq[sender] = {};
        if (!emojiFreq[sender]) emojiFreq[sender] = {};
        if (!wordCountsBySender[sender]) wordCountsBySender[sender] = [];
        if (!responseTimes[sender])
          responseTimes[sender] = {
            totalMs: 0,
            count: 0,
            kilat: 0,
            santai: 0,
            lama: 0,
          };
        if (!msgTypes[sender])
          msgTypes[sender] = { text: 0, media: 0, sticker: 0, link: 0 };
        if (!interactions[sender]) interactions[sender] = {};

        // Increment basics
        totalsBySender[sender]++;
        dailyData[msg.rawDate][sender]++;
        hourlyData[msg.hour][sender]++;

        let replyTimeMin = null;

        // Response time logic
        if (lastSender && lastSender !== sender) {
          const diff = msg.timestamp - lastTimestamp;
          if (diff < 1000 * 60 * 60 * 1) {
            // < 1 hour
            interactions[sender][lastSender] = (interactions[sender][lastSender] || 0) + 1;
            interactions[lastSender][sender] = (interactions[lastSender][sender] || 0) + 1;
          }
          // Count if reply is under 3 hours (avoid long pauses)
          if (diff < 1000 * 60 * 60 * 3 && diff >= 0) {
            responseTimes[sender].totalMs += diff;
            responseTimes[sender].count++;
            const diffMins = diff / 60000;
            replyTimeMin = diffMins;
            if (diffMins <= 1) responseTimes[sender].kilat++;
            else if (diffMins <= 15) responseTimes[sender].santai++;
            else responseTimes[sender].lama++;
          }
        }
        lastSender = sender;
        lastTimestamp = msg.timestamp;

        // Process text insights
        const lowerMsg = msg.messageContent.toLowerCase();
        let isMedia = false;
        let isSticker = false;
        let isLink = false;
        let isCall = false;

        const callRegex = /^(Voice call\.|Video call\.|Panggilan suara|Panggilan video|Missed (voice|video) call|Anda melewatkan panggilan)/i;
        
        if (callRegex.test(msg.messageContent)) {
          isCall = true;
        } else if (lowerMsg.includes('sticker omitted')) {
          mediaCount[sender]++;
          msgTypes[sender].sticker++;
          isSticker = true;
        } else if (
          lowerMsg.includes('image omitted') ||
          lowerMsg.includes('video omitted') ||
          lowerMsg.includes('audio omitted')
        ) {
          mediaCount[sender]++;
          msgTypes[sender].media++;
          isMedia = true;
        } else {
          msgTypes[sender].text++;
          if (lowerMsg.includes('http') || lowerMsg.includes('www.')) {
            linkCount[sender]++;
            msgTypes[sender].link++;
            isLink = true;
          }
          
          // Word Frequency
          const words = lowerMsg
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter((w) => w.length > 2);
          
          const wc = words.length;
          wordCount[sender] += wc;
          wordCountsArray.push(wc);
          wordCountsBySender[sender].push(wc);

          words.forEach((w) => {
            if (!stopwords.has(w)) {
              wordFreq[sender][w] = (wordFreq[sender][w] || 0) + 1;
            }
          });
        }

        // Add to allTextMessages (now all messages)
        const wc = isMedia || isSticker || isCall ? 0 : msg.messageContent.split(/\s+/).filter(w => w.length > 0).length;
        allTextMessages.push({
          sender,
          timestamp: msg.timestamp,
          wordCount: wc,
          responseTimeMin: replyTimeMin,
          messageContent: msg.messageContent,
          isMedia,
          isSticker,
          isLink,
          isCall,
          durationSec: isCall ? parseCallDuration(msg.messageContent) : 0
        });

        // Emoji Frequency
        const emojis = msg.messageContent.match(emojiRegex);
        if (emojis) {
          emojis.forEach((e) => {
            emojiFreq[sender][e] = (emojiFreq[sender][e] || 0) + 1;
          });
        }

        lastMessageObj = msg;
        return;
      }

      // 2. Try matching system message
      const systemMatch = cleanLine.match(activePatterns.system);
      if (systemMatch) {
        const details = extractDetails(systemMatch);
        let type = 'system_general';
        const content = details.sender; // group 8 is the content in system patterns
        const lowerContent = content.toLowerCase();
        
        if (lowerContent.includes('added') || lowerContent.includes('joined') || lowerContent.includes('left') || lowerContent.includes('removed') || lowerContent.includes('keluar') || lowerContent.includes('menambahkan') || lowerContent.includes('mengeluarkan')) {
          type = 'group_event';
        } else if (lowerContent.includes('pinned') || lowerContent.includes('menyematkan')) {
          type = 'group_event';
        } else if (lowerContent.includes('changed') || lowerContent.includes('mengubah') || lowerContent.includes('dibuat') || lowerContent.includes('created')) {
          type = 'group_event';
        }

        systemMessages.push({
          timestamp: details.timestamp,
          type,
          content,
          isAI: false
        });
        lastMessageObj = null; // Break multiline chain on system message
        return;
      }

      // 3. Multiline append or corrupted line
      if (lastMessageObj) {
        // Append to last message
        const additionalText = ' ' + cleanLine;
        lastMessageObj.messageContent += additionalText;
        multilineMergedCount++;

        // Re-calculate words if it was a text message (not media)
        const lowerMsg = lastMessageObj.messageContent.toLowerCase();
        const isOmitted = lowerMsg.includes('sticker omitted') || 
                           lowerMsg.includes('image omitted') || 
                           lowerMsg.includes('video omitted') || 
                           lowerMsg.includes('audio omitted');
        if (!isOmitted) {
          const words = lowerMsg
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter((w) => w.length > 2);
          
          const oldWc = wordCountsArray.pop() || 0;
          if (wordCountsBySender[lastMessageObj.sender]) {
            wordCountsBySender[lastMessageObj.sender].pop();
          }

          const wc = words.length;
          // Update global states
          wordCount[lastMessageObj.sender] += (wc - oldWc);
          wordCountsArray.push(wc);
          wordCountsBySender[lastMessageObj.sender].push(wc);

          // Update in allTextMessages
          const idx = allTextMessages.findIndex(m => m.timestamp === lastMessageObj.timestamp && m.sender === lastMessageObj.sender);
          if (idx !== -1) {
            allTextMessages[idx].wordCount = wc;
            allTextMessages[idx].messageContent = lastMessageObj.messageContent;
          }
        }
      } else {
        corruptedLinesCount++;
      }
    });

    return {
      totalMessages,
      interactions,
      senders: Array.from(senders),
      dailyData,
      hourlyData,
      totalsBySender,
      mediaCount,
      wordCount,
      linkCount,
      wordFreq,
      emojiFreq,
      msgTypes,
      responseTimes,
      // EDA & Quality Data
      diagnostics: {
        totalLines: lines.length,
        parsedCount: totalMessages,
        systemCount: systemMessages.length,
        multilineMergedCount,
        corruptedLinesCount,
        duplicateMessagesCount,
        emptyMessagesCount,
        formatName,
        selectedFormat
      },
      allTextMessages,
      wordCountsArray,
      wordCountsBySender,
      systemMessages
    };
  }

  // ─── Parsed Data ───────────────────────────────────────────────────────
  const parsedData = parseChatData(rawChat);
  globalSystemMessages = parsedData.systemMessages;
  parsedData.memberStatuses = determineMemberStatuses(parsedData);

  // Sort senders by message count (descending)
  const sortedSenders = [...parsedData.senders].sort(
    (a, b) => (parsedData.totalsBySender[b] || 0) - (parsedData.totalsBySender[a] || 0)
  );
  // Top 10 for detailed UI cards (avoid lag in large groups)
  const topSenders = sortedSenders.slice(0, 10);

  const colors = {};
  sortedSenders.forEach((sender, i) => {
    colors[sender] = palette[i % palette.length];
  });

  // ─── Update Header (Dynamic Title & Badges) ───────────────────────────
  let displayNames = sortedSenders.slice(0, 3).join(', ');
  if (sortedSenders.length > 3) {
    displayNames += ` & ${sortedSenders.length - 3} lainnya`;
  }
  document.getElementById('chat-subtitle').textContent =
    `${displayNames} • Riwayat Obrolan`;

  globalParsedData = parsedData;
  renderParticipantBadges();

  // ─── Render Stats Cards ────────────────────────────────────────────────
  const statsContainer = document.getElementById('stats-container');

  let maxDay = '';
  let maxDayCount = 0;
  for (const [date, counts] of Object.entries(parsedData.dailyData)) {
    let dayTotal = Object.values(counts).reduce((a, b) => a + b, 0);
    if (dayTotal > maxDayCount) {
      maxDayCount = dayTotal;
      maxDay = date;
    }
  }

  let maxHour = '';
  let maxHourCount = 0;
  for (const [hour, counts] of Object.entries(parsedData.hourlyData)) {
    let hourTotal = Object.values(counts).reduce((a, b) => a + b, 0);
    if (hourTotal > maxHourCount) {
      maxHourCount = hourTotal;
      maxHour = hour;
    }
  }
  const peakHourText = maxHour
    ? `${maxHour}:00 - ${String(parseInt(maxHour, 10) + 1).padStart(2, '0')}:00`
    : '-';

  statsContainer.innerHTML = `
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 animate-fade-up delay-100">
            <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xl mr-4">
                <i class="fa-solid fa-message"></i>
            </div>
            <div>
                <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Pesan</p>
                <p class="text-2xl font-bold text-slate-800 dark:text-slate-100"><span class="count-up" data-value="${parsedData.totalMessages}">0</span></p>
            </div>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 animate-fade-up delay-150">
            <div class="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center text-xl mr-4">
                <i class="fa-solid fa-fire"></i>
            </div>
            <div>
                <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">Hari Teraktif</p>
                <p class="text-lg font-bold text-slate-800 dark:text-slate-100">${maxDay || '-'}</p>
                <p class="text-xs text-slate-400 dark:text-slate-500"><span class="count-up" data-value="${maxDayCount}">0</span> pesan</p>
            </div>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 animate-fade-up delay-200">
            <div class="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center text-xl mr-4">
                <i class="fa-solid fa-clock"></i>
            </div>
            <div>
                <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">Jam Teramai</p>
                <p class="text-lg font-bold text-slate-800 dark:text-slate-100">${peakHourText}</p>
                <p class="text-xs text-slate-400 dark:text-slate-500"><span class="count-up" data-value="${maxHourCount}">0</span> pesan</p>
            </div>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 animate-fade-up delay-250">
            <div class="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 flex items-center justify-center text-xl mr-4">
                <i class="fa-solid fa-users"></i>
            </div>
            <div>
                <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">Partisipan Aktif</p>
                <p class="text-2xl font-bold text-slate-800 dark:text-slate-100"><span class="count-up" data-value="${parsedData.senders.length}">0</span></p>
            </div>
        </div>
    `;

  // ─── Render Insight Cards ──────────────────────────────────────────────
  let topSticker = { sender: '-', count: -1 };
  let topVerbose = { sender: '-', avgWords: -1 };
  let topLinks = { sender: '-', count: -1 };

  // Calculate dynamic threshold to avoid sample-size bias for average word count
  const totalMsgCount = parsedData.allTextMessages ? parsedData.allTextMessages.length : 100;
  const avgMsgs = totalMsgCount / parsedData.senders.length;
  const verboseMinThreshold = Math.max(15, Math.min(50, Math.floor(avgMsgs * 0.1)));

  parsedData.senders.forEach((sender) => {
    const mc = parsedData.mediaCount[sender] || 0;
    if (mc > topSticker.count) {
      topSticker = { sender, count: mc };
    }

    const totalSenderMsgs = parsedData.totalsBySender[sender] || 0;
    const wc = parsedData.wordCount[sender] || 0;
    const validMessages = totalSenderMsgs - mc;
    const avg = validMessages > 0 ? wc / validMessages : 0;
    if (totalSenderMsgs >= verboseMinThreshold && avg > topVerbose.avgWords) {
      topVerbose = { sender, avgWords: avg.toFixed(1) };
    }

    const lc = parsedData.linkCount[sender] || 0;
    if (lc > topLinks.count) {
      topLinks = { sender, count: lc };
    }
  });

  // Calculate unbiased activity scores
  const rankedActivity = calculateActivityScores(parsedData);
  const activeOnlyRanked = rankedActivity.filter(item => {
    const statusInfo = parsedData.memberStatuses ? parsedData.memberStatuses[item.sender] : null;
    return !statusInfo || statusInfo.status === 'active';
  });

  // Exclude members with an activity score below 1.0 from the "Paling Jarang Aktif" card
  const leastActiveCandidates = activeOnlyRanked.filter(item => item.score >= 1.0);

  const mostActive = rankedActivity.length > 0 ? rankedActivity[0] : { sender: '-', score: 0 };
  const leastActive = leastActiveCandidates.length > 0 ? leastActiveCandidates[leastActiveCandidates.length - 1] : { sender: '-', score: 0 };

  const insightsContainer = document.getElementById('insights-container');
  insightsContainer.innerHTML = `
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 animate-fade-up delay-300">
            <div class="absolute -right-4 -top-4 opacity-10 text-6xl text-purple-500"><i class="fa-solid fa-image"></i></div>
            <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">Raja Stiker & Media</p>
            <p class="text-2xl font-bold text-purple-600 mt-1 truncate pr-4">${topSticker.sender}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Mengirim ${topSticker.count.toLocaleString()} stiker/foto</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 animate-fade-up delay-300">
            <div class="absolute -right-4 -top-4 opacity-10 text-6xl text-blue-500"><i class="fa-solid fa-align-left"></i></div>
            <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">Paling Panjang Lebar</p>
            <p class="text-2xl font-bold text-blue-600 mt-1 truncate pr-4">${topVerbose.sender}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Rata-rata ${topVerbose.avgWords} kata per pesan</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 animate-fade-up delay-300">
            <div class="absolute -right-4 -top-4 opacity-10 text-6xl text-teal-500"><i class="fa-solid fa-link"></i></div>
            <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">Suka Share Link</p>
            <p class="text-2xl font-bold text-teal-600 mt-1 truncate pr-4">${topLinks.sender}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Membagikan ${topLinks.count.toLocaleString()} tautan</p>
        </div>
        <!-- Card 4: Paling Aktif (Clickable) -->
        <div id="card-most-active" class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 animate-fade-up delay-300 cursor-pointer group">
            <div class="absolute -right-4 -top-4 opacity-10 text-6xl text-emerald-500 group-hover:scale-110 transition-transform"><i class="fa-solid fa-circle-bolt"></i></div>
            <p class="text-sm text-slate-555 dark:text-slate-400 font-medium flex items-center gap-1">Paling Aktif <i class="fa-solid fa-ranking-star text-[10px] text-emerald-500 animate-pulse"></i></p>
            <p class="text-2xl font-bold text-emerald-600 mt-1 truncate pr-4">${mostActive.sender}</p>
            <p class="text-xs text-slate-450 dark:text-slate-500 mt-1">Skor Keaktifan: ${mostActive.score}/hari</p>
        </div>
        <!-- Card 5: Paling Pasif (Clickable) -->
        <div id="card-least-active" class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 animate-fade-up delay-300 cursor-pointer group">
            <div class="absolute -right-4 -top-4 opacity-10 text-6xl text-rose-500 group-hover:scale-110 transition-transform"><i class="fa-solid fa-moon"></i></div>
            <p class="text-sm text-slate-555 dark:text-slate-400 font-medium flex items-center gap-1">Paling Jarang Aktif <i class="fa-solid fa-ranking-star text-[10px] text-rose-500"></i></p>
            <p class="text-2xl font-bold text-rose-600 mt-1 truncate pr-4">${leastActive.sender}</p>
            <p class="text-xs text-slate-450 dark:text-slate-500 mt-1">Skor Keaktifan: ${leastActive.score}/hari</p>
        </div>
  `;

  // Bind click listeners for active ranking modal
  const cardMostActive = document.getElementById('card-most-active');
  const cardLeastActive = document.getElementById('card-least-active');

  if (cardMostActive) {
    cardMostActive.addEventListener('click', () => {
      showActivityRankingModal(rankedActivity);
    });
  }
  if (cardLeastActive) {
    cardLeastActive.addEventListener('click', () => {
      showActivityRankingModal(rankedActivity);
    });
  }

  // Render Left/Inactive Members Section
  const leftSection = document.getElementById('left-members-section');
  const leftList = document.getElementById('left-members-list');
  
  if (leftSection && leftList) {
    const statuses = parsedData.memberStatuses;
    const leftMembers = Object.entries(statuses).filter(([name, info]) => info.status === 'left' || info.status === 'inactive_inferred');
    
    if (leftMembers.length > 0) {
      leftSection.classList.remove('hidden');
      leftList.innerHTML = leftMembers.map(([name, info]) => {
        const isExplicit = info.status === 'left';
        const badgeBg = isExplicit 
          ? 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40' 
          : 'bg-amber-55/60 text-amber-700 border border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
        const icon = isExplicit ? 'fa-door-open' : 'fa-clock-rotate-left';
        
        return `
          <div class="left-member-pill px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${badgeBg} shadow-sm group relative cursor-pointer transition-all hover:scale-105" data-sender="${encodeURIComponent(name)}">
              <i class="fa-solid ${icon} text-[10px]"></i>
              <span>${name}</span>
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-md">
                  ${info.reason}
              </span>
          </div>
        `;
      }).join('');

      // Bind click event programmatically to comply with strict CSP
      leftList.querySelectorAll('.left-member-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const sender = decodeURIComponent(pill.getAttribute('data-sender'));
          showParticipantModal(sender);
        });
      });
    } else {
      leftSection.classList.add('hidden');
    }
  }

  // ─── Render Behavior Cards (with Sorting) ──────────────────────────────
  const behaviorContainer = document.getElementById('behavior-container');
  const behaviorSort = document.getElementById('behavior-sort');

  const triggerCountUps = (container = document) => {
    container.querySelectorAll('.count-up').forEach((el) => {
      const target = parseInt(el.getAttribute('data-value'), 10);
      if (isNaN(target)) {
        el.textContent = el.getAttribute('data-value');
        return;
      }
      if (el.textContent === target.toLocaleString()) return;

      const duration = 1500;
      const startTime = performance.now();
      const updateCount = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 4); // easeOutQuart
        const current = Math.floor(ease * target);
        el.textContent = current.toLocaleString();
        if (progress < 1) {
          requestAnimationFrame(updateCount);
        } else {
          el.textContent = target.toLocaleString();
        }
      };
      requestAnimationFrame(updateCount);
    });
  };

  const renderBehavior = () => {
    let sorted = [...topSenders];
    const sortVal = behaviorSort.value;

    if (sortVal === 'name_asc') {
      sorted.sort((a, b) => a.localeCompare(b));
    } else if (sortVal === 'name_desc') {
      sorted.sort((a, b) => b.localeCompare(a));
    } else if (sortVal === 'msg_desc') {
      sorted.sort(
        (a, b) =>
          (parsedData.totalsBySender[b] || 0) -
          (parsedData.totalsBySender[a] || 0)
      );
    } else if (sortVal === 'msg_asc') {
      sorted.sort(
        (a, b) =>
          (parsedData.totalsBySender[a] || 0) -
          (parsedData.totalsBySender[b] || 0)
      );
    } else if (sortVal === 'resp_fast' || sortVal === 'resp_slow') {
      sorted.sort((a, b) => {
        const rtA = parsedData.responseTimes[a];
        const rtB = parsedData.responseTimes[b];
        const avgA =
          rtA && rtA.count > 0 ? rtA.totalMs / rtA.count : Infinity;
        const avgB =
          rtB && rtB.count > 0 ? rtB.totalMs / rtB.count : Infinity;
        return sortVal === 'resp_fast' ? avgA - avgB : avgB - avgA;
      });
    }

    let behaviorHTML = '';
    sorted.forEach((sender) => {
      const theme = colors[sender];

      // Top Words
      const words = parsedData.wordFreq[sender] || {};
      const topWords = Object.entries(words)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      const wordsHTML = topWords
        .map(
          (w) =>
            `<span class="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-600 dark:text-slate-300 font-medium mr-1 mb-1">${w[0]} (${w[1]}x)</span>`
        )
        .join('');

      // Top Emojis
      const emojis = parsedData.emojiFreq[sender] || {};
      const topEmojis = Object.entries(emojis)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      const emojisHTML = topEmojis
        .map(
          (e) =>
            `<span class="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm mr-1 mb-1">${e[0]} (${e[1]}x)</span>`
        )
        .join('');

      // Avg Response Time
      const rt = parsedData.responseTimes[sender];
      let responseText = '-';
      if (rt && rt.count > 0) {
        const avgMs = rt.totalMs / rt.count;
        const mins = Math.floor(avgMs / 60000);
        const secs = Math.floor((avgMs % 60000) / 1000);
        responseText = mins > 0 ? `${mins}m ${secs}s` : `${secs} detik`;
      }

      // Check member status
      const statusInfo = parsedData.memberStatuses ? parsedData.memberStatuses[sender] : null;
      let leftBadgeHTML = '';
      if (statusInfo && (statusInfo.status === 'left' || statusInfo.status === 'inactive_inferred')) {
        const isExplicit = statusInfo.status === 'left';
        const label = isExplicit ? 'Telah Keluar' : 'Terindikasi Keluar';
        const title = statusInfo.reason;
        const colorClass = isExplicit 
          ? 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/45'
          : 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/35';
        leftBadgeHTML = `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${colorClass}" title="${title}"><i class="fa-solid fa-triangle-exclamation text-[8px] mr-0.5"></i> ${label}</span>`;
      }

      behaviorHTML += `
                <div class="behavior-card bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 animate-fade-up delay-400 cursor-pointer flex flex-col justify-between" data-sender="${encodeURIComponent(sender)}">
                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-1.5 flex-wrap max-w-[70%]">
                                <div class="w-8 h-8 rounded-full ${theme.badge} ${theme.text} flex items-center justify-center text-sm mr-0.5 flex-shrink-0"><i class="fa-solid fa-user"></i></div>
                                <h3 class="font-bold text-slate-800 dark:text-slate-100 truncate">${sender}</h3>
                                ${leftBadgeHTML}
                            </div>
                            <span class="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-md flex-shrink-0"><span class="count-up" data-value="${parsedData.totalsBySender[sender] || 0}">0</span> pesan</span>
                        </div>
                        <div class="space-y-3">
                            <div>
                                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1"><i class="fa-solid fa-stopwatch mr-1 text-indigo-400"></i> Rata-rata Waktu Balas</p>
                                <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">${responseText}</p>
                            </div>
                            <div>
                                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1"><i class="fa-solid fa-comment-dots mr-1 text-emerald-400"></i> Kata Paling Sering</p>
                                <div>${wordsHTML || '<span class="text-xs text-slate-400 dark:text-slate-500">Tidak ada data</span>'}</div>
                            </div>
                            <div>
                                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1"><i class="fa-regular fa-face-smile mr-1 text-amber-400"></i> Emoji Favorit</p>
                                <div>${emojisHTML || '<span class="text-xs text-slate-400 dark:text-slate-500">Tidak ada data</span>'}</div>
                            </div>
                        </div>
                    </div>
                </div>
                `;
    });
    behaviorContainer.innerHTML = behaviorHTML;

    // Attach click listeners programmatically to bypass CSP restrictions
    behaviorContainer.querySelectorAll('.behavior-card').forEach(card => {
      card.addEventListener('click', () => {
        const s = decodeURIComponent(card.getAttribute('data-sender'));
        showParticipantModal(s);
      });
    });

    triggerCountUps(behaviorContainer);
  };

  behaviorSort.onchange = renderBehavior;
  renderBehavior();

  // Trigger Count-Up Animations
  setTimeout(() => {
    triggerCountUps(document);
  }, 50);

  // ─── Chart Rendering ──────────────────────────────────────────────────
  globalParsedData = parsedData;

  const sortedDates = Object.keys(parsedData.dailyData).sort((a, b) => {
    const [d1, m1, y1] = a.split('/');
    const [d2, m2, y2] = b.split('/');
    return new Date(`20${y1}-${m1}-${d1}`) - new Date(`20${y2}-${m2}-${d2}`);
  });

  // Daily Chart
  const dailyDatasets = topSenders.map((sender) => {
    const color = colors[sender];
    return {
      label: sender,
      data: sortedDates.map(
        (date) => parsedData.dailyData[date][sender] || 0
      ),
      backgroundColor: color.bg,
      borderColor: color.border,
      borderWidth: 1,
      borderRadius: 4,
    };
  });

  if (dailyChartInst) dailyChartInst.destroy();
  const ctxDaily = document.getElementById('dailyChart').getContext('2d');
  dailyChartInst = new Chart(ctxDaily, {
    type: 'bar',
    data: { labels: sortedDates, datasets: dailyDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { borderDash: [4, 4] } },
      },
    },
  });

  // Last 7 Days Chart
  const last7Dates = sortedDates.slice(-7);
  const last7Datasets = topSenders.map((sender) => {
    const color = colors[sender];
    return {
      label: sender,
      data: last7Dates.map(
        (date) => parsedData.dailyData[date][sender] || 0
      ),
      backgroundColor: color.bg,
      borderColor: color.border,
      borderWidth: 1,
      borderRadius: 4,
    };
  });

  if (last7ChartInst) last7ChartInst.destroy();
  const ctxLast7 = document.getElementById('last7DaysChart').getContext('2d');
  last7ChartInst = new Chart(ctxLast7, {
    type: 'bar',
    data: { labels: last7Dates, datasets: last7Datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { borderDash: [4, 4] } },
      },
    },
  });

  // Hourly Chart
  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, '0')
  );
  const hourlyDatasets = topSenders.map((sender) => {
    const color = colors[sender];
    return {
      label: sender,
      data: hours.map((hour) =>
        parsedData.hourlyData[hour]
          ? parsedData.hourlyData[hour][sender] || 0
          : 0
      ),
      borderColor: color.border,
      backgroundColor: color.bg,
      borderWidth: 2,
      tension: 0.4,
      fill: false,
      pointBackgroundColor: color.border,
      pointRadius: 3,
    };
  });

  if (hourlyChartInst) hourlyChartInst.destroy();
  const ctxHourly = document.getElementById('hourlyChart').getContext('2d');
  hourlyChartInst = new Chart(ctxHourly, {
    type: 'line',
    data: { labels: hours.map((h) => `${h}:00`), datasets: hourlyDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { borderDash: [4, 4] } },
      },
      interaction: { intersect: false, mode: 'index' },
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDA & Data Quality Rendering
  // ═══════════════════════════════════════════════════════════════════════════

  // 1. Data Quality Cards
  const dg = parsedData.diagnostics;
  document.getElementById('dq-format-name').textContent = dg.formatName;
  document.getElementById('dq-multiline-count').textContent = dg.multilineMergedCount.toLocaleString();
  document.getElementById('dq-system-count').textContent = dg.systemCount.toLocaleString();
  document.getElementById('dq-anomaly-count').textContent = (dg.corruptedLinesCount + dg.duplicateMessagesCount + dg.emptyMessagesCount).toLocaleString();
  document.getElementById('dq-total-lines').textContent = dg.totalLines.toLocaleString();
  document.getElementById('dq-valid-messages').textContent = dg.parsedCount.toLocaleString();

  // 2. Univariate Word Count Stats
  const wordCounts = parsedData.wordCountsArray;
  if (wordCounts.length > 0) {
    const sum = wordCounts.reduce((a, b) => a + b, 0);
    const mean = sum / wordCounts.length;
    
    // Median, Q1, Q3, IQR, Outliers
    const sortedWordCounts = [...wordCounts].sort((a, b) => a - b);
    const getPercentile = (arr, p) => {
      const idx = (arr.length - 1) * p;
      const base = Math.floor(idx);
      const rest = idx - base;
      if (arr[base + 1] !== undefined) {
        return arr[base] + rest * (arr[base + 1] - arr[base]);
      } else {
        return arr[base];
      }
    };

    const median = getPercentile(sortedWordCounts, 0.5);
    const q1 = getPercentile(sortedWordCounts, 0.25);
    const q3 = getPercentile(sortedWordCounts, 0.75);
    const iqr = q3 - q1;
    const outlierThreshold = q3 + 1.5 * iqr;
    
    const outlierMsgs = parsedData.allTextMessages.filter(m => m.wordCount > outlierThreshold);

    // Mode
    const countsMap = {};
    let maxFreq = 0;
    let mode = 0;
    wordCounts.forEach(c => {
      countsMap[c] = (countsMap[c] || 0) + 1;
      if (countsMap[c] > maxFreq) {
        maxFreq = countsMap[c];
        mode = c;
      }
    });

    document.getElementById('stat-mean-words').textContent = mean.toFixed(1);
    document.getElementById('stat-median-words').textContent = Math.round(median);
    document.getElementById('stat-mode-words').textContent = mode;
    document.getElementById('stat-outliers-count').textContent = outlierMsgs.length.toLocaleString();

    // Top 3 Longest Outliers List
    const topOutliers = [...parsedData.allTextMessages]
      .sort((a, b) => b.wordCount - a.wordCount)
      .slice(0, 3);
    
    const outliersList = document.getElementById('outliers-list');
    outliersList.innerHTML = topOutliers.map((m) => {
      const theme = colors[m.sender] || { text: 'text-indigo-600', badge: 'bg-indigo-50 dark:bg-indigo-900/20' };
      const snippet = m.messageContent.length > 70 ? m.messageContent.substring(0, 70) + '...' : m.messageContent;
      return `
        <div class="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1.5 hover:shadow-sm transition-shadow">
            <div class="flex justify-between items-center">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${theme.badge} ${theme.text}"><i class="fa-solid fa-user mr-1"></i> ${m.sender}</span>
                <span class="text-[10px] text-slate-400 font-medium">${new Date(m.timestamp).toLocaleDateString('id-ID')}</span>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-300 italic">"${snippet}"</p>
            <div class="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold text-right">${m.wordCount} kata</div>
        </div>
      `;
    }).join('');

    if (topOutliers.length === 0) {
      outliersList.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Tidak ada outlier terdeteksi.</p>';
    }

    // 3. Message Length Histogram Chart
    const buckets = {
      '1-5': 0,
      '6-15': 0,
      '16-30': 0,
      '31-50': 0,
      '51-100': 0,
      '101+': 0
    };
    wordCounts.forEach(c => {
      if (c <= 5) buckets['1-5']++;
      else if (c <= 15) buckets['6-15']++;
      else if (c <= 30) buckets['16-30']++;
      else if (c <= 50) buckets['31-50']++;
      else if (c <= 100) buckets['51-100']++;
      else buckets['101+']++;
    });

    if (edaMsgLengthChartInst) edaMsgLengthChartInst.destroy();
    const ctxEdaLength = document.getElementById('edaMsgLengthChart').getContext('2d');
    edaMsgLengthChartInst = new Chart(ctxEdaLength, {
      type: 'bar',
      data: {
        labels: Object.keys(buckets),
        datasets: [{
          label: 'Jumlah Pesan',
          data: Object.values(buckets),
          backgroundColor: 'rgba(79, 70, 229, 0.8)',
          borderColor: 'rgb(79, 70, 229)',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { borderDash: [4, 4] } }
        }
      }
    });
  }

  // 4. Message Type Composition Stacked Bar
  const compositionDatasets = [
    { label: 'Teks', data: [], backgroundColor: 'rgba(79, 70, 229, 0.85)', borderRadius: 4 },
    { label: 'Media', data: [], backgroundColor: 'rgba(16, 185, 129, 0.85)', borderRadius: 4 },
    { label: 'Stiker', data: [], backgroundColor: 'rgba(245, 158, 11, 0.85)', borderRadius: 4 },
    { label: 'Tautan', data: [], backgroundColor: 'rgba(14, 165, 233, 0.85)', borderRadius: 4 }
  ];

  topSenders.forEach(sender => {
    const types = parsedData.msgTypes[sender] || { text: 0, media: 0, sticker: 0, link: 0 };
    const sum = (types.text || 0) + (types.media || 0) + (types.sticker || 0) + (types.link || 0);
    if (sum > 0) {
      compositionDatasets[0].data.push(Math.round((types.text / sum) * 100));
      compositionDatasets[1].data.push(Math.round((types.media / sum) * 100));
      compositionDatasets[2].data.push(Math.round((types.sticker / sum) * 100));
      compositionDatasets[3].data.push(Math.round((types.link / sum) * 100));
    } else {
      compositionDatasets[0].data.push(0);
      compositionDatasets[1].data.push(0);
      compositionDatasets[2].data.push(0);
      compositionDatasets[3].data.push(0);
    }
  });

  if (edaMsgTypeCompositionChartInst) edaMsgTypeCompositionChartInst.destroy();
  const ctxEdaComp = document.getElementById('edaMsgTypeCompositionChart').getContext('2d');
  edaMsgTypeCompositionChartInst = new Chart(ctxEdaComp, {
    type: 'bar',
    data: {
      labels: topSenders,
      datasets: compositionDatasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, max: 100, grid: { borderDash: [4, 4] } }
      }
    }
  });

  // 5. Message Length vs Response Time Scatter Plot
  const scatterPoints = parsedData.allTextMessages
    .filter(m => m.responseTimeMin !== null && m.responseTimeMin > 0)
    .map(m => ({ x: m.wordCount, y: parseFloat(m.responseTimeMin.toFixed(2)), sender: m.sender }));
  
  // Sample max 300 points to prevent lag
  const sampledPoints = scatterPoints.sort(() => 0.5 - Math.random()).slice(0, 300);

  const scatterDatasets = topSenders.map(sender => {
    const color = colors[sender];
    return {
      label: sender,
      data: sampledPoints.filter(p => p.sender === sender),
      backgroundColor: color.bg,
      borderColor: color.border,
      borderWidth: 1,
      pointRadius: 5,
      pointHoverRadius: 7
    };
  });

  if (edaScatterChartInst) edaScatterChartInst.destroy();
  const ctxEdaScatter = document.getElementById('edaScatterChart').getContext('2d');
  edaScatterChartInst = new Chart(ctxEdaScatter, {
    type: 'scatter',
    data: { datasets: scatterDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.raw.x} kata, ${context.raw.y} menit`;
            }
          }
        }
      },
      scales: {
        x: { 
          title: { display: true, text: 'Panjang Pesan (Kata)', color: '#64748b' },
          grid: { display: false } 
        },
        y: { 
          title: { display: true, text: 'Waktu Respon (Menit)', color: '#64748b' },
          beginAtZero: true, 
          grid: { borderDash: [4, 4] } 
        }
      }
    }
  });

  // 6. Daily Chat Volume Pearson Correlation Heatmap
  function calculatePearsonCorrelation(x, y) {
    const n = x.length;
    if (n === 0) return 0;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
      sumY2 += y[i] * y[i];
    }
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    if (den === 0) return 0;
    return num / den;
  }

  const dailyVectors = {};
  topSenders.forEach(sender => {
    dailyVectors[sender] = sortedDates.map(date => parsedData.dailyData[date][sender] || 0);
  });

  const correlationMatrix = {};
  topSenders.forEach(s1 => {
    correlationMatrix[s1] = {};
    topSenders.forEach(s2 => {
      if (s1 === s2) {
        correlationMatrix[s1][s2] = 1.0;
      } else {
        correlationMatrix[s1][s2] = calculatePearsonCorrelation(dailyVectors[s1], dailyVectors[s2]);
      }
    });
  });

  let corrHTML = '<div class="overflow-x-auto w-full max-w-full"><table class="w-full text-xs border-collapse">';
  corrHTML += '<thead><tr><th class="p-2 text-slate-400 dark:text-slate-500 font-semibold text-left">Partisipan</th>';
  topSenders.forEach(sender => {
    const shortName = sender.length > 8 ? sender.substring(0, 8) + '...' : sender;
    corrHTML += `<th class="p-2 text-slate-500 dark:text-slate-400 font-semibold text-center whitespace-nowrap" title="${sender}">${shortName}</th>`;
  });
  corrHTML += '</tr></thead><tbody>';

  topSenders.forEach(s1 => {
    corrHTML += `<tr><td class="p-2 font-bold text-slate-700 dark:text-slate-300 text-left whitespace-nowrap">${s1}</td>`;
    topSenders.forEach(s2 => {
      const val = correlationMatrix[s1][s2];
      let bgStyle = '';
      let textStyle = 'text-slate-800 dark:text-slate-100';
      if (val > 0) {
        bgStyle = `background-color: rgba(79, 70, 229, ${val * 0.75})`;
        if (val > 0.4) textStyle = 'text-white font-bold';
      } else if (val < 0) {
        bgStyle = `background-color: rgba(225, 29, 72, ${Math.abs(val) * 0.75})`;
        if (val < -0.4) textStyle = 'text-white font-bold';
      } else {
        bgStyle = 'background-color: transparent';
      }
      corrHTML += `<td class="p-3 text-center border border-slate-100 dark:border-slate-700/50 transition-all hover:scale-105 hover:shadow-sm" style="${bgStyle}" title="Korelasi aktivitas harian antara ${s1} & ${s2}: ${val.toFixed(3)}">
        <span class="${textStyle}">${val.toFixed(2)}</span>
      </td>`;
    });
    corrHTML += '</tr>';
  });
  corrHTML += '</tbody></table></div>';
  document.getElementById('eda-correlation-matrix-container').innerHTML = corrHTML;

  // 7. Interaction Matrix Heatmap (Reply Frequency)
  let maxInteraction = 0;
  topSenders.forEach(s1 => {
    topSenders.forEach(s2 => {
      if (s1 !== s2) {
        const count = (parsedData.interactions[s1] || {})[s2] || 0;
        if (count > maxInteraction) maxInteraction = count;
      }
    });
  });

  let interactHTML = '<div class="overflow-x-auto w-full max-w-full"><table class="w-full text-xs border-collapse">';
  interactHTML += '<thead><tr><th class="p-2 text-slate-400 dark:text-slate-500 font-semibold text-left">Membalas \\ Ke</th>';
  topSenders.forEach(sender => {
    const shortName = sender.length > 8 ? sender.substring(0, 8) + '...' : sender;
    interactHTML += `<th class="p-2 text-slate-500 dark:text-slate-400 font-semibold text-center whitespace-nowrap" title="${sender}">${shortName}</th>`;
  });
  interactHTML += '</tr></thead><tbody>';

  topSenders.forEach(s1 => {
    interactHTML += `<tr><td class="p-2 font-bold text-slate-700 dark:text-slate-300 text-left whitespace-nowrap">${s1}</td>`;
    topSenders.forEach(s2 => {
      if (s1 === s2) {
        interactHTML += `<td class="p-3 text-center border border-slate-100 dark:border-slate-700/50 bg-slate-100/50 dark:bg-slate-800 text-slate-450 dark:text-slate-600 select-none">-</td>`;
      } else {
        const count = (parsedData.interactions[s1] || {})[s2] || 0;
        const pct = maxInteraction === 0 ? 0 : count / maxInteraction;
        const bgStyle = count > 0 ? `background-color: rgba(16, 185, 129, ${pct * 0.75})` : 'background-color: transparent';
        const textStyle = pct > 0.4 ? 'text-white font-bold' : 'text-slate-800 dark:text-slate-100';
        
        interactHTML += `<td class="p-3 text-center border border-slate-100 dark:border-slate-700/50 transition-all hover:scale-105 hover:shadow-sm" style="${bgStyle}" title="${s1} membalas ${s2} sebanyak ${count} kali">
          <span class="${textStyle}">${count}</span>
        </td>`;
      }
    });
    interactHTML += '</tr>';
  });
  interactHTML += '</tbody></table></div>';
  document.getElementById('eda-interaction-matrix-container').innerHTML = interactHTML;
}

// ═══════════════════════════════════════════════════════════════════════════
// Modal — Participant Detail View
// ═══════════════════════════════════════════════════════════════════════════

function showParticipantModal(sender) {
  if (!globalParsedData) return;
  const data = globalParsedData;

  document.getElementById('modal-title').textContent = sender;
  const totalMessages = data.totalsBySender[sender] || 0;
  document.getElementById('modal-subtitle').textContent =
    `Total ${totalMessages.toLocaleString()} Pesan Terkirim`;

  // 1. 24-Hour Chart Data
  const hours = new Array(24).fill(0);
  let maxHour = 0;
  for (let i = 0; i < 24; i++) {
    const count =
      (data.hourlyData[String(i).padStart(2, '0')] || {})[sender] || 0;
    hours[i] = count;
    if (count > maxHour) maxHour = count;
  }

  let chartHTML = '';
  for (let i = 0; i < 24; i++) {
    const hPct =
      maxHour === 0 ? 2 : Math.max(2, (hours[i] / maxHour) * 100);
    chartHTML += `<div class="flex-1 bg-indigo-500 dark:bg-indigo-600 rounded-t-sm transition-all hover:bg-indigo-400 relative group" style="height: ${hPct}%">
            <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded hidden group-hover:block whitespace-nowrap z-10">${i}:00 (${hours[i]})</div>
        </div>`;
  }

  // 2. Message Composition
  const types = data.msgTypes[sender] || {
    text: 0,
    media: 0,
    sticker: 0,
    link: 0,
  };
  const typeTotal = types.text + types.media + types.sticker;
  const textPct = typeTotal === 0 ? 0 : (types.text / typeTotal) * 100;
  const mediaPct = typeTotal === 0 ? 0 : (types.media / typeTotal) * 100;
  const stickerPct = typeTotal === 0 ? 0 : (types.sticker / typeTotal) * 100;

  // 3. Vocab
  const words = data.wordFreq[sender] || {};
  const topWords = Object.entries(words)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  let vocabHTML = topWords
    .map(
      (w) =>
        `<span class="inline-flex items-center px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200">${w[0]} <span class="ml-2 text-xs text-slate-400">${w[1]}x</span></span>`
    )
    .join('');
  if (!vocabHTML)
    vocabHTML =
      '<span class="text-sm text-slate-500">Tidak cukup data teks.</span>';

  // 4. Reply Speeds
  const rt = data.responseTimes[sender] || {
    kilat: 0,
    santai: 0,
    lama: 0,
  };
  const rtTotal = rt.kilat + rt.santai + rt.lama;
  const kilatPct = rtTotal === 0 ? 0 : (rt.kilat / rtTotal) * 100;
  const santaiPct = rtTotal === 0 ? 0 : (rt.santai / rtTotal) * 100;
  const lamaPct = rtTotal === 0 ? 0 : (rt.lama / rtTotal) * 100;

  // 5. Interactions
  const interact = data.interactions[sender] || {};
  const topInteract = Object.entries(interact)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  let interactHTML = topInteract
    .map(
      (i) =>
        `<div class="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg border border-slate-100 dark:border-slate-600"><div class="flex items-center gap-2"><div class="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 dark:text-indigo-400 flex items-center justify-center text-[10px]"><i class="fa-solid fa-user"></i></div><span class="text-xs font-semibold text-slate-700 dark:text-slate-200">${i[0]}</span></div><span class="text-xs text-slate-500 font-medium">${i[1]}x membalas</span></div>`
    )
    .join('');
  if (!interactHTML)
    interactHTML =
      '<span class="text-sm text-slate-500">Tidak ada interaksi tercatat.</span>';

  // Render Bento Grid
  const grid = document.getElementById('modal-bento-grid');
  grid.innerHTML = `
        <!-- 24H Chart (Span 8) -->
        <div class="col-span-1 md:col-span-8 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Aktivitas 24 Jam</h3>
            <div class="flex items-end h-32 gap-[2px] mt-auto border-b border-slate-200 dark:border-slate-700 pb-1">
                ${chartHTML}
            </div>
            <div class="flex justify-between mt-2 text-[10px] font-medium text-slate-400">
                <span>00:00</span>
                <span>12:00</span>
                <span>23:59</span>
            </div>
        </div>

        <!-- Reply Speed (Span 4) -->
        <div class="col-span-1 md:col-span-4 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Kategori Kecepatan Balas</h3>
            <div class="space-y-4 mt-2">
                <div>
                    <div class="flex justify-between text-xs mb-1 font-medium"><span class="text-emerald-500">Kilat (< 1m)</span><span class="text-slate-500">${rt.kilat}x</span></div>
                    <div class="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div class="h-full bg-emerald-500 rounded-full" style="width: ${kilatPct}%"></div></div>
                </div>
                <div>
                    <div class="flex justify-between text-xs mb-1 font-medium"><span class="text-amber-500">Santai (1-15m)</span><span class="text-slate-500">${rt.santai}x</span></div>
                    <div class="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div class="h-full bg-amber-500 rounded-full" style="width: ${santaiPct}%"></div></div>
                </div>
                <div>
                    <div class="flex justify-between text-xs mb-1 font-medium"><span class="text-rose-500">Lama (> 15m)</span><span class="text-slate-500">${rt.lama}x</span></div>
                    <div class="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div class="h-full bg-rose-500 rounded-full" style="width: ${lamaPct}%"></div></div>
                </div>
            </div>
        </div>

        <!-- Msg Types (Span 5) -->
        <div class="col-span-1 md:col-span-5 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Komposisi Pesan</h3>
            <div class="w-full h-6 rounded-full flex overflow-hidden mb-4 bg-slate-100 dark:bg-slate-700">
                <div class="h-full bg-indigo-500" style="width: ${textPct}%" title="Text: ${types.text}"></div>
                <div class="h-full bg-emerald-400" style="width: ${mediaPct}%" title="Media: ${types.media}"></div>
                <div class="h-full bg-amber-400" style="width: ${stickerPct}%" title="Sticker: ${types.sticker}"></div>
            </div>
            <div class="flex gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                <div class="flex items-center gap-1.5"><div class="w-2.5 h-2.5 rounded-full bg-indigo-500"></div> Teks (${Math.round(textPct)}%)</div>
                <div class="flex items-center gap-1.5"><div class="w-2.5 h-2.5 rounded-full bg-emerald-400"></div> Media (${Math.round(mediaPct)}%)</div>
                <div class="flex items-center gap-1.5"><div class="w-2.5 h-2.5 rounded-full bg-amber-400"></div> Stiker (${Math.round(stickerPct)}%)</div>
            </div>
        </div>

        <!-- Top Vocab (Span 7) -->
        <div class="col-span-1 md:col-span-7 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Top 10 Kosakata</h3>
            <div class="flex flex-wrap gap-2 mt-auto">
                ${vocabHTML}
            </div>
        </div>

        <!-- Besties (Span 5) -->
        <div class="col-span-1 md:col-span-5 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Sering Ngobrol Dengan</h3>
            <div class="flex flex-col gap-2 mt-auto">
                ${interactHTML}
            </div>
        </div>
    `;

  // Initialize Chat History list
  activeModalSender = sender;
  activeModalMessages = data.allTextMessages.filter((m) => m.sender === sender && !m.isCall);
  
  const searchInput = document.getElementById('modal-chat-search');
  const sortSelect = document.getElementById('modal-chat-sort');
  if (searchInput) searchInput.value = '';
  if (sortSelect) sortSelect.value = 'date_desc';
  
  updateModalChatList();

  // Render Call History
  activeModalCalls = data.allTextMessages.filter((m) => m.sender === sender && m.isCall);
  const callAnalysis = analyzeCalls(activeModalCalls);
  renderCallStats(callAnalysis);
  
  const callSortSelect = document.getElementById('modal-call-sort');
  if (callSortSelect) callSortSelect.value = 'date_desc';
  
  updateModalCallList();

  // Reset modal tab to Chat history
  const chatTab = document.getElementById('modal-tab-chat');
  if (chatTab) {
    chatTab.className = 'border-indigo-500 text-indigo-600 dark:text-indigo-400 whitespace-nowrap pb-3 border-b-2 font-bold text-sm flex items-center gap-2 transition-all cursor-pointer';
  }
  const callTab = document.getElementById('modal-tab-call');
  if (callTab) {
    callTab.className = 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 whitespace-nowrap pb-3 border-b-2 font-medium text-sm flex items-center gap-2 transition-all cursor-pointer';
  }
  const panelChat = document.getElementById('modal-panel-chat');
  if (panelChat) panelChat.classList.remove('hidden');
  const panelCall = document.getElementById('modal-panel-call');
  if (panelCall) panelCall.classList.add('hidden');

  // Show modal with animation
  const modal = document.getElementById('participant-modal');
  const content = document.getElementById('participant-modal-content');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    content.classList.remove('scale-95');
    content.classList.add('scale-100');
  });
}

function closeParticipantModal() {
  const modal = document.getElementById('participant-modal');
  const content = document.getElementById('participant-modal-content');

  modal.classList.add('opacity-0');
  content.classList.remove('scale-100');
  content.classList.add('scale-95');

  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }, 300);
}

// ═══════════════════════════════════════════════════════════════════════════
// Participant Modal Chat History Helpers
// ═══════════════════════════════════════════════════════════════════════════
let activeModalMessages = [];
let activeModalCalls = [];
let activeModalSender = "";

function updateModalChatList() {
  const searchVal = document.getElementById('modal-chat-search') ? document.getElementById('modal-chat-search').value.toLowerCase() : '';
  const sortVal = document.getElementById('modal-chat-sort') ? document.getElementById('modal-chat-sort').value : 'date_desc';
  const chatListContainer = document.getElementById('modal-chat-list');
  
  if (!chatListContainer) return;

  // 1. Filter
  let filtered = activeModalMessages;
  if (searchVal) {
    filtered = activeModalMessages.filter(m => m.messageContent.toLowerCase().includes(searchVal));
  }

  // 2. Helper to count capslock
  const countCapslock = (text) => {
    if (!text) return 0;
    const words = text.split(/\s+/);
    let count = 0;
    words.forEach(w => {
      const clean = w.replace(/[^\w]/g, '');
      if (clean.length >= 2 && /^[A-Z]+$/.test(clean)) {
        count++;
      }
    });
    return count;
  };

  // 3. Sort
  const sorted = [...filtered];
  if (sortVal === 'date_desc') {
    sorted.sort((a, b) => b.timestamp - a.timestamp);
  } else if (sortVal === 'date_asc') {
    sorted.sort((a, b) => a.timestamp - b.timestamp);
  } else if (sortVal === 'words_desc') {
    sorted.sort((a, b) => b.wordCount - a.wordCount);
  } else if (sortVal === 'words_asc') {
    sorted.sort((a, b) => a.wordCount - b.wordCount);
  } else if (sortVal === 'caps_desc') {
    sorted.sort((a, b) => {
      const capsA = countCapslock(a.messageContent);
      const capsB = countCapslock(b.messageContent);
      return capsB - capsA;
    });
  }

  // 4. Render
  document.getElementById('chat-history-count').textContent = `${sorted.length.toLocaleString()} pesan`;

  if (sorted.length === 0) {
    chatListContainer.innerHTML = '<div class="text-center py-8 text-xs text-slate-400 dark:text-slate-500">Tidak ada pesan ditemukan.</div>';
    return;
  }

  chatListContainer.innerHTML = sorted.map(m => {
    const timeStr = new Date(m.timestamp).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Escape HTML to prevent XSS
    let contentHTML = m.messageContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let badgeHTML = '';
    
    if (m.isSticker) {
      badgeHTML = '<span class="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded text-[10px] font-bold">Stiker</span>';
      contentHTML = `<span class="italic text-slate-400 dark:text-slate-500">${contentHTML}</span>`;
    } else if (m.isMedia) {
      badgeHTML = '<span class="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-bold">Media</span>';
      contentHTML = `<span class="italic text-slate-400 dark:text-slate-500">${contentHTML}</span>`;
    } else if (m.isLink) {
      badgeHTML = '<span class="px-1.5 py-0.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded text-[10px] font-bold">Tautan</span>';
    }

    const caps = countCapslock(m.messageContent);
    const capsBadge = caps > 0 ? `<span class="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded text-[10px] font-bold">${caps} Caps</span>` : '';

    return `
      <div class="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-150 dark:border-slate-700/60 shadow-sm flex flex-col gap-1 hover:border-slate-250 dark:hover:border-slate-600 transition-colors">
          <div class="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              <span>${timeStr}</span>
              <div class="flex items-center gap-1.5">
                  ${badgeHTML}
                  ${capsBadge}
                  <span class="font-semibold">${m.wordCount} kata</span>
              </div>
          </div>
          <p class="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">${contentHTML}</p>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Responsive Participant Badges & All Participants Modal
// ═══════════════════════════════════════════════════════════════════════════
function renderParticipantBadges() {
  if (!globalParsedData) return;
  const data = globalParsedData;

  const sortedSenders = [...data.senders].sort(
    (a, b) => (data.totalsBySender[b] || 0) - (data.totalsBySender[a] || 0)
  );

  const colors = {};
  sortedSenders.forEach((sender, i) => {
    colors[sender] = palette[i % palette.length];
  });

  const w = window.innerWidth;
  let limit = 8;
  if (w < 640) limit = 3;
  else if (w < 1024) limit = 5;

  const visibleSenders = sortedSenders.slice(0, limit);
  const hiddenCount = sortedSenders.length - limit;

  const badgesContainer = document.getElementById('participant-badges');
  if (!badgesContainer) return;

  let badgesHTML = visibleSenders
    .map((sender) => {
      const theme = colors[sender];
      return `<span class="px-3 py-1.5 ${theme.badge} ${theme.text} rounded-full font-medium text-xs flex items-center transition-colors hover:brightness-95 dark:hover:brightness-110">
                    <i class="fa-solid fa-user mr-1.5"></i> ${sender}
                </span>`;
    })
    .join('');

  if (hiddenCount > 0) {
    badgesHTML += `<button id="show-all-participants-btn" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-full font-medium text-xs flex items-center transition-colors cursor-pointer">
                +${hiddenCount} lainnya
            </button>`;
  }

  badgesContainer.innerHTML = badgesHTML;
  badgesContainer.classList.remove('hidden');

  // Bind the show-all button programmatically
  const showAllBtn = document.getElementById('show-all-participants-btn');
  if (showAllBtn) {
    showAllBtn.addEventListener('click', () => {
      showAllParticipantsModal(sortedSenders, colors);
    });
  }
}

function showAllParticipantsModal(senders, colors) {
  const modal = document.getElementById('all-participants-modal');
  const content = document.getElementById('participants-modal-content');
  const listContainer = document.getElementById('all-participants-list');
  
  if (!modal || !listContainer) return;

  listContainer.innerHTML = senders.map(sender => {
    const theme = colors[sender] || { text: 'text-slate-600 dark:text-slate-300', badge: 'bg-slate-50 dark:bg-slate-800' };
    const totalMsg = globalParsedData ? (globalParsedData.totalsBySender[sender] || 0) : 0;
    return `
      <div class="flex justify-between items-center p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30">
          <div class="flex items-center">
              <span class="px-2.5 py-1 ${theme.badge} ${theme.text} rounded-full text-xs font-medium flex items-center">
                  <i class="fa-solid fa-user mr-1.5"></i> ${sender}
              </span>
          </div>
          <span class="text-xs text-slate-500 dark:text-slate-400 font-semibold">${totalMsg.toLocaleString()} pesan</span>
      </div>
    `;
  }).join('');

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    content.classList.remove('scale-95');
    content.classList.add('scale-100');
  });
}

function closeAllParticipantsModal() {
  const modal = document.getElementById('all-participants-modal');
  const content = document.getElementById('participants-modal-content');

  if (!modal) return;
  modal.classList.add('opacity-0');
  content.classList.remove('scale-100');
  content.classList.add('scale-95');

  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }, 300);
}

// ═══════════════════════════════════════════════════════════════════════════
// System & AI Messages Dashboard
// ═══════════════════════════════════════════════════════════════════════════
function renderSystemDashboard() {
  if (!globalSystemMessages) return;
  
  const totalCount = globalSystemMessages.length;
  const aiCount = globalSystemMessages.filter(m => m.type === 'meta_ai').length;
  const eventCount = globalSystemMessages.filter(m => m.type === 'group_event' || m.type === 'encryption').length;
  
  document.getElementById('sys-total-count').textContent = totalCount.toLocaleString();
  document.getElementById('sys-ai-count').textContent = aiCount.toLocaleString();
  document.getElementById('sys-event-count').textContent = eventCount.toLocaleString();

  // Types breakdown
  const typesList = document.getElementById('sys-types-list');
  if (typesList) {
    const types = {
      encryption: { label: 'Enkripsi & Keamanan', count: 0, color: 'bg-indigo-500', icon: 'fa-lock' },
      group_event: { label: 'Aktivitas Grup (Join/Leave/Pin)', count: 0, color: 'bg-amber-500', icon: 'fa-users-gear' },
      meta_ai: { label: 'Respon Meta AI', count: 0, color: 'bg-emerald-500', icon: 'fa-brain' },
      system_general: { label: 'Sistem Umum', count: 0, color: 'bg-slate-500', icon: 'fa-circle-info' }
    };
    
    globalSystemMessages.forEach(m => {
      if (types[m.type]) types[m.type].count++;
    });
    
    typesList.innerHTML = Object.values(types).map(t => {
      const pct = totalCount > 0 ? (t.count / totalCount) * 100 : 0;
      return `
        <div>
            <div class="flex justify-between text-xs mb-1 font-medium text-slate-700 dark:text-slate-300">
                <span class="flex items-center gap-1.5"><i class="fa-solid ${t.icon} text-slate-400"></i> ${t.label}</span>
                <span>${t.count}x (${Math.round(pct)}%)</span>
            </div>
            <div class="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div class="h-full ${t.color} rounded-full" style="width: ${pct}%"></div>
            </div>
        </div>
      `;
    }).join('');
  }

  updateSystemLogList();
}

function updateSystemLogList() {
  const searchVal = document.getElementById('sys-search') ? document.getElementById('sys-search').value.toLowerCase() : '';
  const filterVal = document.getElementById('sys-filter-type') ? document.getElementById('sys-filter-type').value : 'all';
  const logContainer = document.getElementById('sys-log-container');
  
  if (!logContainer) return;

  let filtered = globalSystemMessages;
  
  // 1. Filter by type
  if (filterVal !== 'all') {
    if (filterVal === 'ai') {
      filtered = filtered.filter(m => m.type === 'meta_ai');
    } else if (filterVal === 'system') {
      filtered = filtered.filter(m => m.type === 'system_general' || m.type === 'encryption');
    } else if (filterVal === 'event') {
      filtered = filtered.filter(m => m.type === 'group_event');
    }
  }

  // 2. Filter by search
  if (searchVal) {
    filtered = filtered.filter(m => m.content.toLowerCase().includes(searchVal));
  }

  // Sort by date desc (newest first)
  const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp);

  if (sorted.length === 0) {
    logContainer.innerHTML = '<div class="text-center py-8 text-xs text-slate-400 dark:text-slate-500">Tidak ada log pesan sistem ditemukan.</div>';
    return;
  }

  logContainer.innerHTML = sorted.map(m => {
    const timeStr = new Date(m.timestamp).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    let badgeClass = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    let badgeText = 'Sistem';
    let iconClass = 'fa-circle-info text-slate-400';
    
    if (m.type === 'meta_ai') {
      badgeClass = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400';
      badgeText = 'Meta AI';
      iconClass = 'fa-brain text-emerald-400';
    } else if (m.type === 'encryption') {
      badgeClass = 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400';
      badgeText = 'Keamanan';
      iconClass = 'fa-lock text-indigo-400';
    } else if (m.type === 'group_event') {
      badgeClass = 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400';
      badgeText = 'Grup';
      iconClass = 'fa-users-gear text-amber-400';
    }

    return `
      <div class="p-3 bg-white dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/50 shadow-sm flex flex-col gap-1 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
          <div class="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              <span class="flex items-center gap-1"><i class="fa-solid ${iconClass}"></i> ${timeStr}</span>
              <span class="px-1.5 py-0.5 ${badgeClass} rounded text-[9px] font-bold">${badgeText}</span>
          </div>
          <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">${m.content}</p>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Participant Modal Call History & DND Analysis Helpers
// ═══════════════════════════════════════════════════════════════════════════
function analyzeCalls(calls) {
  const totalCalls = calls.length;
  if (totalCalls === 0) {
    return {
      total: 0,
      connected: 0,
      missed: 0,
      voiceCount: 0,
      videoCount: 0,
      dndDetected: false,
      dndBursts: 0,
      avgDurationText: '-'
    };
  }

  let missed = 0;
  let connected = 0;
  let voiceCount = 0;
  let videoCount = 0;
  let totalDurationSec = 0;
  let durationCount = 0;

  // Sorting calls chronologically to analyze bursts
  const chronoCalls = [...calls].sort((a, b) => a.timestamp - b.timestamp);

  chronoCalls.forEach(c => {
    const content = c.messageContent.toLowerCase();
    const isVoice = content.includes('voice') || content.includes('suara');
    if (isVoice) voiceCount++;
    else videoCount++;

    const isMissed = content.includes('no answer') || content.includes('tidak terjawab') || content.includes('melewatkan');
    if (isMissed) {
      missed++;
    } else {
      connected++;
      const sec = c.durationSec || 0;
      if (sec > 0) {
        totalDurationSec += sec;
        durationCount++;
      }
    }
  });

  // Analyze DND (Do Not Disturb) bursts:
  // Multiple missed calls (no answer / tidak terjawab) from the same sender
  // where consecutive missed calls happen in a short period (<= 15 minutes)
  let dndBursts = 0;
  let consecutiveMissed = 0;
  
  for (let i = 0; i < chronoCalls.length; i++) {
    const c = chronoCalls[i];
    const content = c.messageContent.toLowerCase();
    const isMissed = content.includes('no answer') || content.includes('tidak terjawab') || content.includes('melewatkan');

    if (isMissed) {
      consecutiveMissed++;
      if (consecutiveMissed >= 2) {
        const prevCall = chronoCalls[i - 1];
        const diffMs = c.timestamp - prevCall.timestamp;
        if (diffMs <= 15 * 60 * 1000) { // 15 minutes
          dndBursts++;
        }
      }
    } else {
      consecutiveMissed = 0; // reset on connected call
    }
  }

  const dndDetected = dndBursts > 0;

  let avgDurationText = '-';
  if (durationCount > 0) {
    const avgSec = totalDurationSec / durationCount;
    const mins = Math.floor(avgSec / 60);
    const secs = Math.floor(avgSec % 60);
    avgDurationText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  return {
    total: totalCalls,
    connected,
    missed,
    voiceCount,
    videoCount,
    dndDetected,
    dndBursts,
    avgDurationText
  };
}

function renderCallStats(analysis) {
  const statsContainer = document.getElementById('modal-call-stats');
  if (!statsContainer) return;

  if (analysis.total === 0) {
    statsContainer.innerHTML = `
      <div class="col-span-1 md:col-span-3 text-center py-6 text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-sm">
          Tidak ada riwayat panggilan untuk partisipan ini.
      </div>
    `;
    return;
  }

  const missedPct = Math.round((analysis.missed / analysis.total) * 100);
  const voicePct = Math.round((analysis.voiceCount / analysis.total) * 100);

  // DND Analysis Text
  let dndTitle = 'DND Terdeteksi: Tidak';
  let dndDesc = 'Panggilan tidak terjawab tersebar secara wajar/acak.';
  let dndColor = 'text-slate-500 dark:text-slate-400';
  let dndBg = 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800/60';
  
  if (analysis.dndDetected) {
    dndTitle = 'DND Terdeteksi: Ya';
    dndDesc = `Ada ${analysis.dndBursts}x panggilan tak terjawab beruntun dalam waktu kurang dari 15 menit (potensi mode Do Not Disturb/Hening).`;
    dndColor = 'text-amber-600 dark:text-amber-400';
    dndBg = 'bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40';
  }

  statsContainer.innerHTML = `
    <!-- Card 1: Ringkasan -->
    <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-sm">
        <p class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Panggilan</p>
        <h4 class="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">${analysis.total} Panggilan</h4>
        <p class="text-xs text-slate-550 dark:text-slate-400 mt-1">${analysis.connected} Terhubung • ${analysis.missed} Tak Terjawab (${missedPct}%)</p>
    </div>
    
    <!-- Card 2: Jenis & Durasi -->
    <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-sm">
        <p class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Metode & Durasi</p>
        <h4 class="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">${voicePct}% Suara</h4>
        <p class="text-xs text-slate-550 dark:text-slate-400 mt-1">Rata-rata Durasi: <span class="font-semibold">${analysis.avgDurationText}</span></p>
    </div>

    <!-- Card 3: Analisis DND -->
    <div class="p-4 rounded-xl shadow-sm ${dndBg} flex flex-col justify-between">
        <div>
            <p class="text-[10px] font-semibold uppercase tracking-wider ${dndColor}">Analisis Missed Call</p>
            <h4 class="text-sm font-bold mt-1 ${dndColor}">${dndTitle}</h4>
        </div>
        <p class="text-[10px] leading-normal mt-1 text-slate-550 dark:text-slate-400">${dndDesc}</p>
    </div>
  `;
}

function parseCallDuration(messageContent) {
  const content = messageContent.toLowerCase();
  const isMissed = content.includes('no answer') || content.includes('tidak terjawab') || content.includes('melewatkan');
  if (isMissed) return 0;

  let sec = 0;
  const secMatch = content.match(/(\d+)\s*sec/);
  const minMatch = content.match(/(\d+)\s*min/);
  const hrMatch = content.match(/(\d+)\s*hr/);
  
  if (secMatch) sec += parseInt(secMatch[1], 10);
  if (minMatch) sec += parseInt(minMatch[1], 10) * 60;
  if (hrMatch) sec += parseInt(hrMatch[1], 10) * 3600;

  // Indonesian formats
  const detikMatch = content.match(/(\d+)\s*detik/);
  const menitMatch = content.match(/(\d+)\s*menit/);
  const jamMatch = content.match(/(\d+)\s*jam/);

  if (detikMatch) sec += parseInt(detikMatch[1], 10);
  if (menitMatch) sec += parseInt(menitMatch[1], 10) * 60;
  if (jamMatch) sec += parseInt(jamMatch[1], 10) * 3600;

  return sec;
}

function updateModalCallList() {
  const sortVal = document.getElementById('modal-call-sort') ? document.getElementById('modal-call-sort').value : 'date_desc';
  const callListContainer = document.getElementById('modal-call-list');
  if (!callListContainer || !activeModalCalls) return;

  let sorted = [...activeModalCalls];

  if (sortVal === 'date_desc') {
    sorted.sort((a, b) => b.timestamp - a.timestamp);
  } else if (sortVal === 'date_asc') {
    sorted.sort((a, b) => a.timestamp - b.timestamp);
  } else if (sortVal === 'duration_desc') {
    sorted.sort((a, b) => {
      const diff = (b.durationSec || 0) - (a.durationSec || 0);
      if (diff !== 0) return diff;
      return b.timestamp - a.timestamp;
    });
  } else if (sortVal === 'duration_asc') {
    sorted.sort((a, b) => {
      const diff = (a.durationSec || 0) - (b.durationSec || 0);
      if (diff !== 0) return diff;
      return b.timestamp - a.timestamp;
    });
  }

  document.getElementById('call-history-count').textContent = `${sorted.length} panggilan`;

  if (sorted.length === 0) {
    callListContainer.innerHTML = '<div class="text-center py-6 text-xs text-slate-400 dark:text-slate-500">Tidak ada riwayat panggilan.</div>';
    return;
  }

  callListContainer.innerHTML = sorted.map(c => {
    const timeStr = new Date(c.timestamp).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const content = c.messageContent.toLowerCase();
    const isMissed = content.includes('no answer') || content.includes('tidak terjawab') || content.includes('melewatkan');
    const isVideo = content.includes('video');
    
    let typeBadge = '';
    if (isMissed) {
      typeBadge = '<span class="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded text-[9px] font-bold">Tak Terjawab</span>';
    } else {
      typeBadge = '<span class="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded text-[9px] font-bold">Tersambung</span>';
    }

    const icon = isVideo ? 'fa-video text-indigo-400' : 'fa-phone text-indigo-400';
    
    return `
      <div class="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-center justify-between hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
          <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                  <i class="fa-solid ${icon} text-xs"></i>
              </div>
              <div>
                  <p class="text-xs font-semibold text-slate-700 dark:text-slate-200">${c.messageContent}</p>
                  <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">${timeStr}</p>
              </div>
          </div>
          <div>
              ${typeBadge}
          </div>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Activity Score Unbiased Data Science Model
// ═══════════════════════════════════════════════════════════════════════════
function calculateActivityScores(parsedData) {
  const senders = parsedData.senders;
  const messages = parsedData.allTextMessages;
  if (!messages || messages.length === 0 || !senders || senders.length === 0) return [];

  // Find max timestamp in the chat to use as reference
  let maxTimestamp = 0;
  messages.forEach(m => {
    if (m.timestamp > maxTimestamp) maxTimestamp = m.timestamp;
  });

  // Initialize sender stats
  const senderStats = {};
  senders.forEach(s => {
    senderStats[s] = {
      firstTimestamp: maxTimestamp,
      lastTimestamp: 0,
      weightedScore: 0,
      messageCount: 0,
      wordCount: 0
    };
  });

  // Process messages
  messages.forEach(m => {
    const stats = senderStats[m.sender];
    if (!stats) return;

    stats.messageCount++;
    stats.wordCount += m.wordCount;
    if (m.timestamp < stats.firstTimestamp) stats.firstTimestamp = m.timestamp;
    if (m.timestamp > stats.lastTimestamp) stats.lastTimestamp = m.timestamp;

    // Calculate age in days relative to maxTimestamp
    const ageDays = (maxTimestamp - m.timestamp) / (1000 * 60 * 60 * 24);
    
    // Time decay weight (half-life of 180 days)
    const lambda = Math.log(2) / 180;
    const weight = Math.exp(-lambda * ageDays);

    // Score for this message: base score of 1 + 0.1 per word
    const msgScore = weight * (1 + 0.1 * m.wordCount);
    stats.weightedScore += msgScore;
  });

  // Calculate final score normalized by tenure
  const rankedSenders = senders.map(s => {
    const stats = senderStats[s];
    
    // Tenure in days (min 7 days to avoid division by zero or extreme scores for brand new members)
    const tenureDays = Math.max(7, (maxTimestamp - stats.firstTimestamp) / (1000 * 60 * 60 * 24));
    
    // Activity score = weighted score per day
    const score = stats.weightedScore / tenureDays;

    return {
      sender: s,
      score: parseFloat(score.toFixed(3)),
      messageCount: stats.messageCount,
      wordCount: stats.wordCount,
      tenureDays: Math.round(tenureDays)
    };
  });

  // Sort descending
  rankedSenders.sort((a, b) => b.score - a.score);
  return rankedSenders;
}

function showActivityRankingModal(rankedActivity) {
  const modal = document.getElementById('activity-ranking-modal');
  const content = document.getElementById('activity-modal-content');
  const listContainer = document.getElementById('activity-ranking-list');

  if (!modal || !listContainer) return;

  listContainer.innerHTML = rankedActivity.map((item, index) => {
    let rankBadge = '';
    let itemBg = 'bg-slate-50/50 dark:bg-slate-800/40';
    let textColor = 'text-slate-700 dark:text-slate-200';
    
    if (index === 0) {
      rankBadge = '<span class="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shadow-sm"><i class="fa-solid fa-trophy text-[10px]"></i></span>';
      itemBg = 'bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/25';
    } else if (index === 1) {
      rankBadge = '<span class="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xs font-bold shadow-sm">2</span>';
    } else if (index === 2) {
      rankBadge = '<span class="w-6 h-6 rounded-full bg-amber-500/15 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shadow-sm">3</span>';
    } else if (index === rankedActivity.length - 1) {
      rankBadge = '<span class="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-450 flex items-center justify-center text-xs font-bold shadow-sm"><i class="fa-solid fa-moon text-[9px]"></i></span>';
      itemBg = 'bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100/40 dark:border-rose-900/25';
    } else {
      rankBadge = `<span class="w-6 h-6 rounded-full bg-slate-100/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xs font-medium">${index + 1}</span>`;
    }

    return `
      <div class="p-3 ${itemBg} rounded-xl flex items-center justify-between shadow-sm hover:translate-x-0.5 transition-transform">
          <div class="flex items-center gap-3">
              ${rankBadge}
              <div>
                  <p class="text-xs font-bold ${textColor}">${item.sender}</p>
                  <p class="text-[10px] text-slate-450 dark:text-slate-550 mt-0.5">${item.messageCount.toLocaleString()} pesan • ${item.wordCount.toLocaleString()} kata • Aktif ${item.tenureDays} hari</p>
              </div>
          </div>
          <div class="text-right">
              <span class="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">${item.score}</span>
              <p class="text-[8px] text-slate-450 dark:text-slate-500 font-medium">skor/hari</p>
          </div>
      </div>
    `;
  }).join('');

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    content.classList.remove('scale-95');
    content.classList.add('scale-100');
  });
}

function closeActivityRankingModal() {
  const modal = document.getElementById('activity-ranking-modal');
  const content = document.getElementById('activity-modal-content');

  if (!modal) return;
  modal.classList.add('opacity-0');
  content.classList.remove('scale-100');
  content.classList.add('scale-95');

  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }, 300);
}

// ═══════════════════════════════════════════════════════════════════════════
// WhatsApp Member Status Detection (Explicit leaving & Inferred Inactivity)
// ═══════════════════════════════════════════════════════════════════════════
function determineMemberStatuses(parsedData) {
  const statuses = {};
  const explicitlyLeft = new Set();
  
  // 1. Process system messages chronologically to track Joins/Leaves
  const chronoSystem = [...parsedData.systemMessages].sort((a, b) => a.timestamp - b.timestamp);
  
  chronoSystem.forEach(m => {
    const content = m.content;
    if (!content) return;

    // Regexes for leaving/removed
    const leftRegexes = [
      /^(.+?)\s+left$/i,
      /^(.+?)\s+left\s+the\s+group$/i,
      /^(.+?)\s+was\s+removed$/i,
      /^(.+?)\s+keluar$/i,
      /^(.+?)\s+dikeluarkan$/i
    ];

    // Regexes for joining/added
    const joinRegexes = [
      /^(.+?)\s+joined$/i,
      /^(.+?)\s+bergabung$/i,
      /^(.+?)\s+added\s+(.+)$/i,
      /^(.+?)\s+menambahkan\s+(.+)$/i
    ];

    // Check left
    for (const rx of leftRegexes) {
      const match = content.match(rx);
      if (match) {
        const name = match[1].trim();
        explicitlyLeft.add(name);
        break;
      }
    }

    // Check join/added (remove from left set if they re-joined)
    for (const rx of joinRegexes) {
      const match = content.match(rx);
      if (match) {
        const addedPart = match[2] ? match[2] : match[1];
        const names = addedPart.split(/,|\band\b|\bdan\b|&/);
        names.forEach(n => {
          const name = n.trim().replace(/^~/, '').trim();
          explicitlyLeft.delete(name);
        });
        break;
      }
    }
  });

  // 2. Calculate reference timestamp (max timestamp in the chat)
  let maxTimestamp = 0;
  parsedData.allTextMessages.forEach(m => {
    if (m.timestamp > maxTimestamp) maxTimestamp = m.timestamp;
  });

  // Chronological sort to count messages sent after a user's last message
  const sortedMsgs = [...parsedData.allTextMessages].sort((a, b) => a.timestamp - b.timestamp);

  // Find last message timestamp for each sender
  const lastMsgTimestamp = {};
  parsedData.senders.forEach(s => {
    lastMsgTimestamp[s] = 0;
  });
  sortedMsgs.forEach(m => {
    lastMsgTimestamp[m.sender] = m.timestamp;
  });

  // Determine status for each sender
  parsedData.senders.forEach(s => {
    // Check if s matches any name in explicitlyLeft (loose match to handle ~ prefix or minor differences)
    let isExplicitlyLeft = explicitlyLeft.has(s);
    if (!isExplicitlyLeft) {
      for (const leftName of explicitlyLeft) {
        if (s.includes(leftName) || leftName.includes(s)) {
          isExplicitlyLeft = true;
          break;
        }
      }
    }

    if (isExplicitlyLeft) {
      statuses[s] = { status: 'left', reason: 'Telah keluar atau dikeluarkan dari grup (tercatat di log sistem)' };
      return;
    }

    // Data Science Heuristic for Inferred Inactivity (Inferred Left)
    const lastT = lastMsgTimestamp[s] || 0;
    if (lastT > 0) {
      const daysSinceLast = (maxTimestamp - lastT) / (1000 * 60 * 60 * 24);
      
      // Count messages in the group after this sender's last message
      let msgsAfterCount = 0;
      for (let i = sortedMsgs.length - 1; i >= 0; i--) {
        if (sortedMsgs[i].timestamp <= lastT) {
          msgsAfterCount = sortedMsgs.length - 1 - i;
          break;
        }
      }

      // If inactive for > 60 days AND there were > 150 messages in the group since they last spoke, they are inferred left/dead.
      if (daysSinceLast > 60 && msgsAfterCount > 150) {
        statuses[s] = { 
          status: 'inactive_inferred', 
          reason: `Terindikasi keluar/pasif (tidak ada pesan selama ${Math.round(daysSinceLast)} hari terakhir, dengan ${msgsAfterCount} pesan baru di grup)` 
        };
        return;
      }
    }

    statuses[s] = { status: 'active', reason: 'Aktif di dalam grup' };
  });

  return statuses;
}
