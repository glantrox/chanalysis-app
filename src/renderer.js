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
let globalRawChat = null;
let globalParsedData = null;

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
      const brandText2 = document.getElementById('brand-text');
      if (brandText2) brandText2.classList.add('hidden');
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
      const brandText2 = document.getElementById('brand-text');
      if (brandText2) brandText2.classList.add('hidden');
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
});

// ═══════════════════════════════════════════════════════════════════════════
// processChatData — Core Parsing & Rendering Pipeline
// ═══════════════════════════════════════════════════════════════════════════
function processChatData(rawChat, startDateStr = '') {
  // ─── Parser ────────────────────────────────────────────────────────────
  function parseChatData(chatText) {
    const lines = chatText.split('\n');
    const regex =
      /\[(\d{2})\/(\d{2})\/(\d{2}),\s(\d{2})\.(\d{2})\.(\d{2})\]\s([^:]+):(.*)/;

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

    let lastSender = null;
    let lastTimestamp = null;

    // Stopwords (common words filtered for more relevant word insights)
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

    lines.forEach((line) => {
      const cleanLine = line.replace(/\u200E/g, '').trim();
      if (!cleanLine) return;

      const match = cleanLine.match(regex);
      if (match) {
        const rawDate = `${match[1]}/${match[2]}/${match[3]}`;
        const hour = match[4];
        const sender = match[7].trim();
        const messageContent = match[8] ? match[8].trim() : '';

        // Parse timestamp
        const year = 2000 + parseInt(match[3], 10);
        const month = parseInt(match[2], 10) - 1;
        const day = parseInt(match[1], 10);
        const h = parseInt(match[4], 10);
        const m = parseInt(match[5], 10);
        const s = parseInt(match[6], 10);
        const currentTimestamp = new Date(year, month, day, h, m, s).getTime();

        // Date filtering
        if (startDateStr) {
          const fullYear =
            match[3].length === 2 ? `20${match[3]}` : match[3];
          const messageDateStr = `${fullYear}-${match[2]}-${match[1]}`;
          if (messageDateStr < startDateStr) return;
        }

        totalMessages++;
        senders.add(sender);

        if (!totalsBySender[sender]) totalsBySender[sender] = 0;
        if (!dailyData[rawDate]) dailyData[rawDate] = {};
        if (!dailyData[rawDate][sender]) dailyData[rawDate][sender] = 0;
        if (!hourlyData[hour]) hourlyData[hour] = {};
        if (!hourlyData[hour][sender]) hourlyData[hour][sender] = 0;

        // Insight initialization
        if (!mediaCount[sender]) mediaCount[sender] = 0;
        if (!wordCount[sender]) wordCount[sender] = 0;
        if (!linkCount[sender]) linkCount[sender] = 0;
        if (!wordFreq[sender]) wordFreq[sender] = {};
        if (!emojiFreq[sender]) emojiFreq[sender] = {};
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
        dailyData[rawDate][sender]++;
        hourlyData[hour][sender]++;

        // Response time logic
        if (lastSender && lastSender !== sender) {
          const diff = currentTimestamp - lastTimestamp;
          if (diff < 1000 * 60 * 60 * 1) {
            // < 1 hour
            interactions[sender][lastSender] =
              (interactions[sender][lastSender] || 0) + 1;
            interactions[lastSender][sender] =
              (interactions[lastSender][sender] || 0) + 1;
          }
          // Count if reply is under 3 hours (avoid long pauses)
          if (diff < 1000 * 60 * 60 * 3 && diff >= 0) {
            responseTimes[sender].totalMs += diff;
            responseTimes[sender].count++;
            const diffMins = diff / 60000;
            if (diffMins <= 1) responseTimes[sender].kilat++;
            else if (diffMins <= 15) responseTimes[sender].santai++;
            else responseTimes[sender].lama++;
          }
        }
        lastSender = sender;
        lastTimestamp = currentTimestamp;

        // Process text insights
        const lowerMsg = messageContent.toLowerCase();
        if (lowerMsg.includes('sticker omitted')) {
          mediaCount[sender]++;
          msgTypes[sender].sticker++;
        } else if (
          lowerMsg.includes('image omitted') ||
          lowerMsg.includes('video omitted') ||
          lowerMsg.includes('audio omitted')
        ) {
          mediaCount[sender]++;
          msgTypes[sender].media++;
        } else {
          msgTypes[sender].text++;
          if (lowerMsg.includes('http') || lowerMsg.includes('www.')) {
            linkCount[sender]++;
            msgTypes[sender].link++;
          }
          // Word Frequency
          const words = lowerMsg
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter((w) => w.length > 2);
          wordCount[sender] += words.length;
          words.forEach((w) => {
            if (!stopwords.has(w)) {
              wordFreq[sender][w] = (wordFreq[sender][w] || 0) + 1;
            }
          });
        }

        // Emoji Frequency
        const emojis = messageContent.match(emojiRegex);
        if (emojis) {
          emojis.forEach((e) => {
            emojiFreq[sender][e] = (emojiFreq[sender][e] || 0) + 1;
          });
        }
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
    };
  }

  // ─── Parsed Data ───────────────────────────────────────────────────────
  const parsedData = parseChatData(rawChat);

  // ─── Color Palette ─────────────────────────────────────────────────────
  const palette = [
    { bg: 'rgba(79, 70, 229, 0.8)', border: 'rgb(79, 70, 229)', text: 'text-indigo-600', badge: 'bg-indigo-50' },
    { bg: 'rgba(225, 29, 72, 0.8)', border: 'rgb(225, 29, 72)', text: 'text-rose-600', badge: 'bg-rose-50' },
    { bg: 'rgba(16, 185, 129, 0.8)', border: 'rgb(16, 185, 129)', text: 'text-emerald-600', badge: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { bg: 'rgba(245, 158, 11, 0.8)', border: 'rgb(245, 158, 11)', text: 'text-amber-600', badge: 'bg-amber-50 dark:bg-amber-900/30' },
    { bg: 'rgba(14, 165, 233, 0.8)', border: 'rgb(14, 165, 233)', text: 'text-sky-600', badge: 'bg-sky-50' },
    { bg: 'rgba(168, 85, 247, 0.8)', border: 'rgb(168, 85, 247)', text: 'text-purple-600', badge: 'bg-purple-50' },
    { bg: 'rgba(236, 72, 153, 0.8)', border: 'rgb(236, 72, 153)', text: 'text-pink-600', badge: 'bg-pink-50' },
    { bg: 'rgba(249, 115, 22, 0.8)', border: 'rgb(249, 115, 22)', text: 'text-orange-600', badge: 'bg-orange-50' },
    { bg: 'rgba(34, 197, 94, 0.8)', border: 'rgb(34, 197, 94)', text: 'text-green-600', badge: 'bg-green-50' },
    { bg: 'rgba(239, 68, 68, 0.8)', border: 'rgb(239, 68, 68)', text: 'text-red-600', badge: 'bg-red-50' },
  ];

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

  const badgesContainer = document.getElementById('participant-badges');
  let badgesHTML = topSenders
    .map((sender) => {
      const theme = colors[sender];
      return `<span class="px-3 py-1.5 ${theme.badge} ${theme.text} rounded-full font-medium text-xs flex items-center transition-colors hover:brightness-95 dark:hover:brightness-110">
                    <i class="fa-solid fa-user mr-1.5"></i> ${sender}
                </span>`;
    })
    .join('');
  if (sortedSenders.length > 10) {
    badgesHTML += `<span class="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full font-medium text-xs flex items-center transition-colors hover:brightness-95 dark:hover:brightness-110">
                +${sortedSenders.length - 10} lainnya
            </span>`;
  }
  badgesContainer.innerHTML = badgesHTML;
  badgesContainer.classList.remove('hidden');

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

  parsedData.senders.forEach((sender) => {
    const mc = parsedData.mediaCount[sender] || 0;
    if (mc > topSticker.count) {
      topSticker = { sender, count: mc };
    }

    const wc = parsedData.wordCount[sender] || 0;
    const validMessages = parsedData.totalsBySender[sender] - mc;
    const avg = validMessages > 0 ? wc / validMessages : 0;
    if (avg > topVerbose.avgWords) {
      topVerbose = { sender, avgWords: avg.toFixed(1) };
    }

    const lc = parsedData.linkCount[sender] || 0;
    if (lc > topLinks.count) {
      topLinks = { sender, count: lc };
    }
  });

  const insightsContainer = document.getElementById('insights-container');
  insightsContainer.innerHTML = `
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 animate-fade-up delay-300">
            <div class="absolute -right-4 -top-4 opacity-10 text-6xl text-purple-500"><i class="fa-solid fa-image"></i></div>
            <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">Raja Stiker & Media</p>
            <p class="text-2xl font-bold text-purple-600 mt-1">${topSticker.sender}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Mengirim ${topSticker.count.toLocaleString()} stiker/foto</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 animate-fade-up delay-300">
            <div class="absolute -right-4 -top-4 opacity-10 text-6xl text-blue-500"><i class="fa-solid fa-align-left"></i></div>
            <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">Paling Panjang Lebar</p>
            <p class="text-2xl font-bold text-blue-600 mt-1">${topVerbose.sender}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Rata-rata ${topVerbose.avgWords} kata per pesan</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 animate-fade-up delay-300">
            <div class="absolute -right-4 -top-4 opacity-10 text-6xl text-teal-500"><i class="fa-solid fa-link"></i></div>
            <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">Suka Share Link</p>
            <p class="text-2xl font-bold text-teal-600 mt-1">${topLinks.sender}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Membagikan ${topLinks.count.toLocaleString()} tautan</p>
        </div>
    `;

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

      behaviorHTML += `
                <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 animate-fade-up delay-400 cursor-pointer" onclick="showParticipantModal(decodeURIComponent('${encodeURIComponent(sender).replace(/'/g, '%27')}'))">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center">
                            <div class="w-8 h-8 rounded-full ${theme.badge} ${theme.text} flex items-center justify-center text-sm mr-2"><i class="fa-solid fa-user"></i></div>
                            <h3 class="font-bold text-slate-800 dark:text-slate-100">${sender}</h3>
                        </div>
                        <span class="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-md"><span class="count-up" data-value="${parsedData.totalsBySender[sender] || 0}">0</span> pesan</span>
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
                `;
    });
    behaviorContainer.innerHTML = behaviorHTML;
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
