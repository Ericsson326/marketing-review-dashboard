const STORAGE_KEY = "marketing-review-dashboard-v1";
const statuses = ["刚刚开始", "已写文案", "有初稿图片", "待审核", "已完成"];

const defaultItems = [
  {
    id: crypto.randomUUID(),
    title: "新品精华小红书种草图文",
    channel: "小红书",
    owner: "Mia",
    time: "11:00",
    status: "已写文案",
  },
  {
    id: crypto.randomUUID(),
    title: "周末护理套餐短视频脚本",
    channel: "抖音",
    owner: "Ken",
    time: "15:30",
    status: "有初稿图片",
  },
  {
    id: crypto.randomUUID(),
    title: "会员日朋友圈海报",
    channel: "朋友圈",
    owner: "Lynn",
    time: "18:00",
    status: "待审核",
  },
];

let items = loadItems();
let activeFilter = "全部";

const form = document.querySelector("#contentForm");
const list = document.querySelector("#contentList");
const template = document.querySelector("#contentCardTemplate");
const filterButtons = document.querySelectorAll(".filter-button");

document.querySelector("#todayLabel").textContent = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "full",
}).format(new Date());

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const newItem = {
    id: crypto.randomUUID(),
    title: document.querySelector("#titleInput").value.trim(),
    channel: document.querySelector("#channelInput").value,
    owner: document.querySelector("#ownerInput").value.trim() || "未分配",
    time: document.querySelector("#timeInput").value || "18:00",
    status: "刚刚开始",
  };

  items.unshift(newItem);
  saveItems();
  form.reset();
  document.querySelector("#timeInput").value = "18:00";
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    render();
  });
});

function loadItems() {
  const savedItems = localStorage.getItem(STORAGE_KEY);
  return savedItems ? JSON.parse(savedItems) : defaultItems;
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getVisibleItems() {
  if (activeFilter === "待审核") {
    return items.filter((item) => item.status !== "已完成");
  }

  if (activeFilter === "已完成") {
    return items.filter((item) => item.status === "已完成");
  }

  return items;
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
    empty.innerHTML = "<strong>当前没有内容</strong><p>新增一条今日内容后，会自动出现在这里。</p>";
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
    meta.textContent = `${item.channel} · ${item.owner}负责 · ${item.time} 发布`;
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

render();
