const STORAGE_KEY = "marketing-review-dashboard-v1";
const statuses = ["刚刚开始", "已写文案", "有初稿图片", "待审核", "已完成"];
const today = toISODate(new Date());

const defaultItems = [
  {
    id: makeId(),
    title: "新品精华小红书种草图文",
    channel: "小红书",
    owner: "Mia",
    time: "11:00",
    date: today,
    status: "已写文案",
  },
  {
    id: makeId(),
    title: "周末护理套餐短视频脚本",
    channel: "抖音",
    owner: "Ken",
    time: "15:30",
    date: today,
    status: "有初稿图片",
  },
  {
    id: makeId(),
    title: "会员日朋友圈海报",
    channel: "朋友圈",
    owner: "Lynn",
    time: "18:00",
    date: today,
    status: "待审核",
  },
];

let items = loadItems().map((item) => ({ ...item, date: item.date || today }));
let activeFilter = "全部";

const form = document.querySelector("#contentForm");
const list = document.querySelector("#contentList");
const template = document.querySelector("#contentCardTemplate");
const filterButtons = document.querySelectorAll(".filter-button");
const scanDialog = document.querySelector("#scanDialog");
const calendarImages = document.querySelector("#calendarImages");
const scanProgress = document.querySelector("#scanProgress");
const scanProgressBar = document.querySelector("#scanProgressBar");
const scanProgressText = document.querySelector("#scanProgressText");
const scanPreview = document.querySelector("#scanPreview");
const previewRows = document.querySelector("#previewRows");
const previewRowTemplate = document.querySelector("#previewRowTemplate");
const dropZone = document.querySelector(".drop-zone");

document.querySelector("#todayLabel").textContent = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "full",
}).format(new Date());
document.querySelector("#dateInput").value = today;

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const newItem = {
    id: makeId(),
    title: document.querySelector("#titleInput").value.trim(),
    channel: document.querySelector("#channelInput").value,
    owner: document.querySelector("#ownerInput").value.trim() || "未分配",
    time: document.querySelector("#timeInput").value || "18:00",
    date: document.querySelector("#dateInput").value || today,
    status: "刚刚开始",
  };

  items.unshift(newItem);
  saveItems();
  form.reset();
  document.querySelector("#timeInput").value = "18:00";
  document.querySelector("#dateInput").value = today;
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    render();
  });
});

document.querySelector("#openScannerButton").addEventListener("click", () => {
  scanDialog.showModal();
});

document.querySelector("#addPreviewRow").addEventListener("click", () => {
  addPreviewRow({ date: today, title: "", channel: "其他" });
});

document.querySelector("#importScheduleButton").addEventListener("click", importPreviewRows);

calendarImages.addEventListener("change", () => {
  if (calendarImages.files.length) {
    scanFiles([...calendarImages.files]);
  }
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  });
});

dropZone.addEventListener("drop", (event) => {
  const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith("image/"));
  if (files.length) {
    scanFiles(files);
  }
});

function loadItems() {
  try {
    const savedItems = localStorage.getItem(STORAGE_KEY);
    return savedItems ? JSON.parse(savedItems) : defaultItems;
  } catch {
    return defaultItems;
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getVisibleItems() {
  const filtered = activeFilter === "已完成"
    ? items.filter((item) => item.status === "已完成")
    : activeFilter === "待审核"
      ? items.filter((item) => item.status !== "已完成")
      : [...items];

  return filtered.sort((a, b) => {
    const dateCompare = (a.date || today).localeCompare(b.date || today);
    return dateCompare || (a.time || "").localeCompare(b.time || "");
  });
}

function getProgress(status) {
  const index = statuses.indexOf(status);
  return `${((index + 1) / statuses.length) * 100}%`;
}

function render() {
  const visibleItems = getVisibleItems();
  list.replaceChildren();

  document.querySelector("#totalCount").textContent = items.length;
  document.querySelector("#pendingCount").textContent = items.filter(
    (item) => item.status !== "已完成",
  ).length;
  document.querySelector("#doneCount").textContent = items.filter(
    (item) => item.status === "已完成",
  ).length;

  if (visibleItems.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<strong>当前没有排期</strong><p>新增内容或扫描营销日历后，会自动出现在这里。</p>";
    list.append(empty);
    return;
  }

  visibleItems.forEach((item) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const title = card.querySelector("h3");
    const meta = card.querySelector(".meta");
    const mark = card.querySelector(".channel-mark");
    const pill = card.querySelector(".status-pill");
    const progress = card.querySelector(".progress-track span");
    const select = card.querySelector(".status-select");
    const deleteButton = card.querySelector(".delete-button");

    title.textContent = item.title;
    meta.innerHTML = '<span class="schedule-date">' + formatDate(item.date) + "</span>" +
      escapeHTML(item.channel) + " · " + escapeHTML(item.owner) + "负责 · " +
      escapeHTML(item.time) + " 发布";
    mark.textContent = item.channel.slice(0, 1);
    pill.textContent = item.status;
    pill.dataset.status = item.status;
    progress.style.width = getProgress(item.status);

    statuses.forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      option.selected = status === item.status;
      select.append(option);
    });

    select.addEventListener("change", () => {
      item.status = select.value;
      saveItems();
      render();
    });

    deleteButton.addEventListener("click", () => {
      items = items.filter((currentItem) => currentItem.id !== item.id);
      saveItems();
      render();
    });

    list.append(card);
  });
}

async function scanFiles(files) {
  if (!window.Tesseract) {
    showScanError("扫描组件加载失败，请检查网络后刷新页面。");
    return;
  }

  scanProgress.hidden = false;
  scanPreview.hidden = true;
  previewRows.replaceChildren();
  setScanProgress(0, "正在准备中文识别组件，第一次使用可能需要一点时间...");

  let currentFileIndex = 0;
  let worker;

  try {
    worker = await Tesseract.createWorker("chi_sim+eng", 1, {
      logger(message) {
        const base = currentFileIndex / files.length;
        const part = Number.isFinite(message.progress) ? message.progress / files.length : 0;
        const percent = Math.min(95, Math.round((base + part) * 100));
        setScanProgress(percent, statusToChinese(message.status, currentFileIndex, files.length));
      },
    });

    const detectedRows = [];

    for (currentFileIndex = 0; currentFileIndex < files.length; currentFileIndex += 1) {
      setScanProgress(
        Math.round((currentFileIndex / files.length) * 100),
        "正在识别第 " + (currentFileIndex + 1) + " / " + files.length + " 张截图...",
      );
      const result = await worker.recognize(files[currentFileIndex]);
      detectedRows.push(...parseScheduleText(result.data.text));
    }

    const uniqueRows = dedupeRows(detectedRows);
    (uniqueRows.length ? uniqueRows : [{ date: today, title: "请填写识别不到的排期内容", channel: "其他" }])
      .forEach(addPreviewRow);

    setScanProgress(100, "识别完成，请检查下面的日期和内容。");
    scanPreview.hidden = false;
  } catch (error) {
    console.error(error);
    showScanError("识别没有完成。请换一张更清晰、文字更大的截图再试。");
  } finally {
    if (worker) {
      await worker.terminate();
    }
    calendarImages.value = "";
  }
}

function parseScheduleText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/[|｜]/g, " ").replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 2);

  const rows = [];
  let activeDate = "";
  let pendingTitle = "";

  lines.forEach((line) => {
    const dateMatch = extractDate(line);
    if (dateMatch) {
      activeDate = dateMatch.iso;
      const remaining = cleanCalendarLine(line.replace(dateMatch.raw, ""));
      if (remaining) {
        rows.push({
          date: activeDate,
          title: remaining,
          channel: inferChannel(remaining),
        });
      }
      pendingTitle = "";
      return;
    }

    const cleaned = cleanCalendarLine(line);
    if (!cleaned || isCalendarNoise(cleaned)) {
      return;
    }

    if (activeDate) {
      rows.push({
        date: activeDate,
        title: cleaned,
        channel: inferChannel(cleaned),
      });
    } else {
      pendingTitle = pendingTitle ? pendingTitle + " " + cleaned : cleaned;
      if (pendingTitle.length >= 6) {
        rows.push({
          date: today,
          title: pendingTitle,
          channel: inferChannel(pendingTitle),
        });
        pendingTitle = "";
      }
    }
  });

  return rows;
}

function extractDate(text) {
  const full = text.match(/(20\d{2})[年\/.\-](\d{1,2})[月\/.\-](\d{1,2})日?/);
  if (full) {
    return {
      raw: full[0],
      iso: safeDate(Number(full[1]), Number(full[2]), Number(full[3])),
    };
  }

  const shortChinese = text.match(/(\d{1,2})月(\d{1,2})日?/);
  if (shortChinese) {
    return {
      raw: shortChinese[0],
      iso: safeDate(new Date().getFullYear(), Number(shortChinese[1]), Number(shortChinese[2])),
    };
  }

  const short = text.match(/(?:^|\s)(\d{1,2})[\/.\-](\d{1,2})(?:\s|$)/);
  if (short) {
    return {
      raw: short[0],
      iso: safeDate(new Date().getFullYear(), Number(short[1]), Number(short[2])),
    };
  }

  return null;
}

function cleanCalendarLine(line) {
  return line
    .replace(/星期[一二三四五六日天]/g, "")
    .replace(/周[一二三四五六日天]/g, "")
    .replace(/^[\-—–:：,，.。\s]+|[\-—–:：,，.。\s]+$/g, "")
    .trim();
}

function isCalendarNoise(line) {
  return /^(星期|周|月份|日期|内容|渠道|负责人|备注|营销日历|content calendar|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(line) ||
    /^\d{1,2}$/.test(line);
}

function inferChannel(text) {
  const rules = [
    ["小红书", /小红书|xhs|red/i],
    ["抖音", /抖音|douyin|tiktok|短视频/i],
    ["微信视频号", /视频号|wechat channel/i],
    ["朋友圈", /朋友圈|moments/i],
    ["公众号", /公众号|推文|article|wechat/i],
    ["门店物料", /门店|海报|立牌|物料|poster/i],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] || "其他";
}

function dedupeRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = row.date + "|" + row.title.replace(/\s/g, "").toLowerCase();
    if (!row.title || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function addPreviewRow(row) {
  const element = previewRowTemplate.content.firstElementChild.cloneNode(true);
  element.querySelector(".preview-date").value = row.date || today;
  element.querySelector(".preview-title").value = row.title || "";
  element.querySelector(".preview-channel").value = row.channel || "其他";
  element.querySelector(".remove-preview-row").addEventListener("click", () => element.remove());
  previewRows.append(element);
}

function importPreviewRows() {
  const rows = [...previewRows.querySelectorAll(".preview-row")]
    .map((row) => ({
      date: row.querySelector(".preview-date").value,
      title: row.querySelector(".preview-title").value.trim(),
      channel: row.querySelector(".preview-channel").value,
    }))
    .filter((row) => row.date && row.title);

  if (!rows.length) {
    scanProgressText.textContent = "请至少保留一条有日期和内容的排期。";
    return;
  }

  const importedItems = rows.map((row) => ({
    id: makeId(),
    title: row.title,
    channel: row.channel,
    owner: "待分配",
    time: "18:00",
    date: row.date,
    status: "刚刚开始",
  }));

  items = [...importedItems, ...items];
  saveItems();
  render();
  scanDialog.close();
  previewRows.replaceChildren();
  scanPreview.hidden = true;
  scanProgress.hidden = true;
}

function setScanProgress(percent, message) {
  scanProgress.hidden = false;
  scanProgressBar.style.width = percent + "%";
  scanProgressText.textContent = message;
}

function showScanError(message) {
  setScanProgress(0, message);
}

function statusToChinese(status, index, total) {
  const map = {
    "loading tesseract core": "正在加载扫描组件...",
    "initializing tesseract": "正在启动文字识别...",
    "loading language traineddata": "正在下载中文识别资料...",
    "initializing api": "正在准备识别...",
    "recognizing text": "正在识别第 " + (index + 1) + " / " + total + " 张截图...",
  };
  return map[status] || "正在处理截图...";
}

function safeDate(year, month, day) {
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return today;
  }
  return toISODate(date);
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function formatDate(value) {
  if (!value) return "未定日期";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(year, month - 1, day));
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || String(Date.now() + Math.random());
}

function escapeHTML(value) {
  const element = document.createElement("span");
  element.textContent = value ?? "";
  return element.innerHTML;
}

saveItems();
render();

