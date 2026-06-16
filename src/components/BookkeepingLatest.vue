<!-- 记账页左侧展示组件，用于PC端左侧记账展示 -->
<template>
  <div class="pl-bookkeeping-latest-main">
    <!-- 顶部工具栏 -->
    <div class="pl-bookkeeping-latest-top">
      <!-- 功能切换 -->
      <div class="pl-tabs">
        <label>
          <input type="radio" name="pl-type" :checked="activePage === 'asset'" @change="changePage('asset')" />
          <svg>
            <use xlink:href="#iconD3DB"></use>
          </svg>
          资产
        </label>

        <label>
          <input type="radio" name="pl-type" :checked="activePage === 'bookkeeping'"
            @change="changePage('bookkeeping')" />
          <svg>
            <use xlink:href="#iconD3List"></use>
          </svg>
          记账
        </label>
      </div>

      <!-- 添加按钮, 靠右 -->
      <button class="pl-button" style="margin-left: auto;" @click="addBookkeepingItem">
        <svg>
          <use xlink:href="#iconAdd"></use>
        </svg>
        新建
      </button>
    </div>

    <!-- 记账总览 -->
    <div class="pl-card">
      <div class="pl-card-title">今日支出</div>
      <div class="pl-card-content">
        {{ recentAmountText }}
      </div>
      <div class="pl-card-footer">
        <svg>
          <use xlink:href="#iconD3TimeIcon"></use>
        </svg>
        {{ recentDateText }}
      </div>
    </div>

    <!-- 记账列表 -->
    <div class="pl-bookkeeping-bill-list">
      <template v-for="group in visibleBillGroups" :key="group.date">
        <div class="pl-bookkeeping-date">{{ group.dateLabel }}</div>

        <button v-for="item in group.records" :key="item.id" class="pl-bookkeeping-record">
          <div class="pl-bookkeeping-icon">
            <IconDisplay :icon="item.icon" fallback="•" />
          </div>
          <div class="pl-bookkeeping-record-body">
            <div class="pl-bookkeeping-record-main">
              <div class="pl-bookkeeping-record-title">{{ item.parentName }}</div>
              <div class="pl-bookkeeping-record-desc">
                {{ item.childName }}<template v-if="item.remark"> · {{ item.remark }}</template>
              </div>
              <div class="pl-bookkeeping-record-time">{{ item.displayTime }}</div>
            </div>
            <div class="pl-bookkeeping-record-amount" :class="{ income: item.type === 'income' }">
              {{ item.type === 'expense' ? '-' : '+' }}{{ item.amount.toFixed(2) }}
            </div>
          </div>
        </button>
      </template>

      <button v-if="hasMoreBills" class="pl-bookkeeping-more" @click="showMoreBills">
        查看更多
      </button>
      <div v-else class="pl-bookkeeping-end">
        到底了，没有更多了
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { showMessage } from 'siyuan';
import BookkeepingEdit from './BookkeepingEdit.vue';
import IconDisplay from "@/components/custom/IconDisplay.vue";
import { alert } from "../utils/dialog-utils.js"
import {
  createDoc,
  createDocWithMdByHPath,
  getBookkeepingRecordsByPledge,
  getFileTreeById,
  getIDsByHPath,
  getNotebookConf,
  insertMarkdownBlock,
  setBlockAttrs,
} from '@/api/siyuanApi';

const emit = defineEmits<{
  (e: "changePage", value: "asset" | "bookkeeping"): void
}>();

const props = defineProps<{
  settingConfData: SettingConfig, // 配置数据
  activePage: "asset" | "bookkeeping" // 当前页面
}>();

type TimelineRecord = BookkeepingRecord & {
  id: string;
  icon: string;
  displayTime: string;
  createdAt?: string;
}

const billPageSize = 5;
const visibleDayCount = ref(billPageSize);
const billRecords = ref<TimelineRecord[]>([]);

onMounted(() => {
  initBookkeepingRecords();
});

const billGroups = computed(() => {
  const groupMap = new Map<string, TimelineRecord[]>();
  for (const record of billRecords.value) {
    const list = groupMap.get(record.date) || [];
    list.push(record);
    groupMap.set(record.date, list);
  }

  return Array.from(groupMap.entries())
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([date, records]) => ({ date, dateLabel: formatDateLabel(date), records }));
});

const visibleBillGroups = computed(() => billGroups.value.slice(0, visibleDayCount.value));
const hasMoreBills = computed(() => visibleDayCount.value < billGroups.value.length);
const visibleBillRecords = computed(() => visibleBillGroups.value.flatMap(group => group.records));
const recentAmountText = computed(() => {
  const recentDate = billRecords.value[0]?.date || "";
  const total = billRecords.value.filter(record => record.date === recentDate && record.type === "expense").reduce((sum, record) => {
    return sum + record.amount;
  }, 0);
  return Math.abs(total).toFixed(2);
});
const recentDateText = computed(() => billRecords.value[0]?.date || "");
const bookkeepingIconMap = computed(() => {
  const iconMap = new Map<string, string>();
  try {
    const config = JSON.parse(props.settingConfData.bookkeepingConfig || "[]");
    if (!Array.isArray(config)) return iconMap;

    config.forEach((item: LedgerItem) => {
      if (item?.name && item?.icon) iconMap.set(item.name, item.icon);
    });
  } catch (error) {
    console.error("记账配置图标解析失败", error);
  }
  return iconMap;
});

// 切换资产/记账页面
const changePage = (page: "asset" | "bookkeeping") => {
  emit("changePage", page);
}

// 新增记账记录
const addBookkeepingItem = () => {
  const bookkeepingEditDialog = alert(BookkeepingEdit, {
    title: "新增记账记录",
    props: {
      confData: props.settingConfData,
      onUpdate: async (record: BookkeepingRecord) => {
        const savedRecord = await saveBookkeepingRecord(record);
        if (savedRecord) {
          upsertBillRecord(savedRecord);
          bookkeepingEditDialog?.destroy();
        }
      },
      onSaveAgain: async (record: BookkeepingRecord, reset: () => void) => {
        const savedRecord = await saveBookkeepingRecord(record);
        if (savedRecord) {
          upsertBillRecord(savedRecord);
          reset();
        }
      }
    }
  });
}

// 初始化记账记录
async function initBookkeepingRecords(): Promise<void> {
  console.log("开始初始化记账左侧记录");
  const records = await getBookkeepingRecordsByPledge(props.settingConfData.bookkeepingStorageMode);
  billRecords.value = records.map(toTimelineRecord).sort(sortBillRecord);
  console.log("记账左侧记录初始化完成", billRecords.value);
}

function toTimelineRecord(
  record: BookkeepingRecord & { blockId?: string; displayTime?: string; createdAt?: string },
  index = 0,
): TimelineRecord {
  return {
    ...record,
    id: record.blockId || `${record.date}-${index}`,
    icon: getCategoryIcon(record.parentName),
    displayTime: record.displayTime || "",
    createdAt: record.createdAt,
  };
}

function upsertBillRecord(record: TimelineRecord): void {
  console.log("准备合并新保存的记账记录到左侧列表", record);
  billRecords.value = [
    record,
    ...billRecords.value.filter(item => item.id !== record.id),
  ].sort(sortBillRecord);
  console.log("合并后的记账左侧列表", billRecords.value);
}

function sortBillRecord(a: TimelineRecord, b: TimelineRecord): number {
  const dateCompare = b.date.localeCompare(a.date);
  if (dateCompare !== 0) return dateCompare;
  return (b.createdAt || b.displayTime).localeCompare(a.createdAt || a.displayTime);
}

// 每次多展示 5 天
const showMoreBills = () => {
  visibleDayCount.value += billPageSize;
}

function formatDateLabel(date: string): string {
  const dateObj = new Date(`${date}T00:00:00`);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const monthDay = date.slice(5);

  if (isSameDate(dateObj, today)) return `今天 · ${monthDay}`;
  if (isSameDate(dateObj, yesterday)) return `昨天 · ${monthDay}`;
  if (dateObj.getFullYear() !== today.getFullYear()) return `${dateObj.getFullYear()} · ${monthDay}`;

  const weekText = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][dateObj.getDay()];
  return `${monthDay} ${weekText}`;
}

function isSameDate(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function getCategoryIcon(parentName: string): string {
  return bookkeepingIconMap.value.get(parentName) || "•";
}

// 保存记账记录
async function saveBookkeepingRecord(record: BookkeepingRecord): Promise<TimelineRecord | undefined> {
  const settingConf = props.settingConfData;
  console.log("准备保存记账记录", { settingConf, record });

  if (!settingConf.bookkeepingDocumentId) {
    showMessage("请先配置记账数据存放位置", 2000, "error");
    console.log("记账数据存放位置为空，保存中断");
    return undefined;
  }

  let targetDocumentId = "";
  if (settingConf.bookkeepingStorageMode === "central") {
    targetDocumentId = await getCentralBookkeepingDocumentId(record, settingConf);
  } else if (settingConf.bookkeepingStorageMode === "date") {
    targetDocumentId = await getDailyBookkeepingDocumentId(record, settingConf);
  } else {
    showMessage("未知的记账存放方式", 2000, "error");
    console.log("未知的记账存放方式，保存中断", settingConf.bookkeepingStorageMode);
    return undefined;
  }

  if (!targetDocumentId) {
    showMessage("未找到记账写入文档", 2000, "error");
    console.log("未找到记账写入文档，保存中断", { record, settingConf });
    return undefined;
  }

  const blockMarkdown = recordToMarkdown(record);
  console.log("记账块内容", blockMarkdown);

  const blockId = await insertMarkdownBlock(targetDocumentId, blockMarkdown);
  console.log("记账块已插入", { blockId, targetDocumentId });

  const now = new Date();
  const pledgeData = {
    ...record,
    month: record.date.slice(0, 7),
    storageMode: settingConf.bookkeepingStorageMode,
    documentId: targetDocumentId,
    blockId,
    createdAt: now.toISOString(),
    displayTime: now.toTimeString().slice(0, 5),
  };
  const attrs = {
    "custom-pledge": JSON.stringify(pledgeData),
  };
  const isAttrSaved = await setBlockAttrs(blockId, attrs);
  console.log("记账块属性写入结果", { isAttrSaved, attrs });

  if (isAttrSaved) {
    showMessage("记账保存成功", 2000, "info");
    return toTimelineRecord(pledgeData);
  } else {
    showMessage("记账已写入，属性写入失败", 3000, "error");
    return undefined;
  }
}

async function getCentralBookkeepingDocumentId(record: BookkeepingRecord, settingConf: SettingConfig): Promise<string> {
  const monthTitle = record.date.slice(0, 7);
  console.log("记账集中存放目标月份", monthTitle);

  const fileList = await getFileTreeById(settingConf.bookkeepingDocumentId);
  console.log("记账数据存放位置下文件列表", fileList);

  const monthFile = fileList.find((file: any) => file.name === monthTitle + ".sy" || file.name === monthTitle);
  if (monthFile) {
    console.log("找到已有记账月份文件", monthFile);
    return monthFile.id;
  }

  const monthDocumentId = await createDoc(monthTitle, settingConf.bookkeepingDocumentId);
  console.log("创建记账月份文件", { monthTitle, monthDocumentId });
  return monthDocumentId;
}

async function getDailyBookkeepingDocumentId(record: BookkeepingRecord, settingConf: SettingConfig): Promise<string> {
  console.log("准备按日期存放记账记录", { record, settingConf });

  const notebookId = settingConf.bookkeepingDocumentId;
  if (!notebookId) {
    console.log("按日期存放需要配置笔记本 ID");
    return "";
  }

  const notebookConf = await getNotebookConf(notebookId);
  const dailyNoteSavePath = notebookConf?.conf?.dailyNoteSavePath;
  console.log("读取到新建日记配置", { notebook: notebookId, dailyNoteSavePath, notebookConf });

  if (!dailyNoteSavePath) {
    showMessage("未读取到新建日记路径配置", 3000, "error");
    return "";
  }

  const dailyNotePath = renderDailyNotePath(dailyNoteSavePath, record.date);
  if (!dailyNotePath) {
    showMessage("暂不支持当前新建日记路径模板", 3000, "error");
    return "";
  }

  const ids = await getIDsByHPath(notebookId, dailyNotePath);
  if (ids.length > 0) {
    console.log("找到已有日记文档", { dailyNotePath, ids });
    return ids[0];
  }

  const dailyNoteDocumentId = await createDocWithMdByHPath(notebookId, dailyNotePath, "");
  console.log("创建日记文档", { dailyNotePath, dailyNoteDocumentId });
  return dailyNoteDocumentId;
}

function renderDailyNotePath(template: string, date: string): string {
  const dateObj = new Date(`${date}T00:00:00`);
  const renderedPath = template.replace(
    /{{\s*now\s*\|\s*date\s+["']([^"']+)["']\s*}}/g,
    (_match, layout: string) => formatGoDateLayout(dateObj, layout),
  );

  if (renderedPath.includes("{{")) {
    console.log("新建日记路径模板存在暂不支持的表达式", { template, renderedPath });
    return "";
  }

  return renderedPath.startsWith("/") ? renderedPath : `/${renderedPath}`;
}

function formatGoDateLayout(date: Date, layout: string): string {
  const pad = (num: number) => String(num).padStart(2, "0");
  const tokenMap: Record<string, string> = {
    "2006": String(date.getFullYear()),
    "01": pad(date.getMonth() + 1),
    "02": pad(date.getDate()),
    "15": pad(date.getHours()),
    "04": pad(date.getMinutes()),
    "05": pad(date.getSeconds()),
  };

  return layout.replace(/2006|01|02|15|04|05/g, (token) => tokenMap[token]);
}

function recordToMarkdown(record: BookkeepingRecord): string {
  return [
    record.date,
    record.parentName,
    record.childName,
    record.type === "expense" ? "支出" : "收入",
    record.amount.toFixed(2),
    record.remark || "",
  ].join("|");
}
</script>

<style scoped lang="css">
.pl-bookkeeping-latest-main {
  display: grid;
  gap: 0.75rem;
}

.pl-bookkeeping-latest-top {
  display: flex;
  align-items: center;
}

.pl-card-footer {
  font-size: 0.75rem;
  color: #9ea2ab;
}

.pl-card-footer svg {
  height: 0.75rem;
  width: 0.75rem;
}

.pl-card-content {
  text-align: right;
  font-size: 1.6rem;
  line-height: 1.5rem;
  font-weight: bold;
}

.pl-bookkeeping-bill-list {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: 624px;
  padding: 0 0 0.75rem;
}

.pl-bookkeeping-date {
  margin: 0 0 0.35rem 0.5rem;
  color: #111827;
  font-size: 1rem;
  font-weight: 600;
}

.pl-bookkeeping-record {
  width: 100%;
  display: grid;
  grid-template-columns: 2.25rem minmax(0, 1fr);
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.35rem;
  padding: 0.5rem 0.75rem;
  text-align: left;
  background-color: transparent;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
}

.pl-bookkeeping-record:hover {
  background-color: #f9fafb;
}

.pl-bookkeeping-icon {
  width: 2.25rem;
  height: 2.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #f3f4f6;
  border-radius: 999px;
  font-size: 1rem;
}

.pl-bookkeeping-icon :deep(svg),
.pl-bookkeeping-icon :deep(.pl-icon-text) {
  width: 1rem;
  height: 1rem;
}

.pl-bookkeeping-record-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: center;
}

.pl-bookkeeping-record-main {
  min-width: 0;
}

.pl-bookkeeping-record-title {
  color: #111827;
  font-size: 0.8rem;
  font-weight: 600;
}

.pl-bookkeeping-record-desc {
  color: #6b7280;
  font-size: 0.75rem;
  line-height: 1.5;
}

.pl-bookkeeping-record-time {
  color: #9ca3af;
  font-size: 0.75rem;
  line-height: 1.5;
}

.pl-bookkeeping-record-amount {
  color: #dc2626;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
}

.pl-bookkeeping-record-amount.income {
  color: #16a34a;
}

.pl-bookkeeping-more {
  width: calc(100% - 1rem);
  margin: 0.75rem 0.5rem 0;
  color: #333;
  background-color: #e6e6e7;
  border: 1px solid #e6e6e7;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: bold;
  padding: 0.5rem 0.75rem;
}

.pl-bookkeeping-more:hover {
  background-color: #e2e2e2;
  border-color: #e2e2e2;
}

.pl-bookkeeping-end {
  margin: 0.75rem 0 0;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
}
</style>
