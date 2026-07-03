<!-- 记账页左侧展示组件，用于PC端左侧记账展示 -->
<template>
  <div class="pl-bookkeeping-latest-main">
    <!-- 顶部工具栏 -->
    <div class="pl-bookkeeping-latest-top">
      <!-- 功能切换 -->
      <div class="pl-tabs">
        <label>
          <input type="radio" name="pl-type" :checked="activePage === 'bookkeeping'"
            @change="changePage('bookkeeping')" />
          <svg>
            <use xlink:href="#iconD3List"></use>
          </svg>
          记账
        </label>

        <label>
          <input type="radio" name="pl-type" :checked="activePage === 'asset'" @change="changePage('asset')" />
          <svg>
            <use xlink:href="#iconD3DB"></use>
          </svg>
          资产
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
      <div v-if="visibleBillGroups.length === 0" class="pl-empty">
        <svg>
          <use xlink:href="#iconD3Empty"></use>
        </svg>
      </div>
      <template v-else>
        <template v-for="group in visibleBillGroups" :key="group.date">
          <div class="pl-bookkeeping-date">{{ group.dateLabel }}</div>

          <button v-for="item in group.records" :key="item.id" class="pl-bookkeeping-record" @click="editBookkeepingItem(item)">
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
      </template>
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
  deleteBlock,
  getBookkeepingRecordsByPledge,
  getCurrentDateTime,
  getFileTreeById,
  getIDsByHPath,
  getNotebookConf,
  insertMarkdownBlock,
  setBlockAttrs,
  updateBlockContent,
} from '@/api/siyuanApi';

const emit = defineEmits<{
  (e: "changePage", value: "asset" | "bookkeeping"): void
  (e: "record-saved"): void
}>();

const props = defineProps<{
  settingConfData: SettingConfig, // 配置数据
  activePage: "asset" | "bookkeeping" // 当前页面
}>();

type TimelineRecord = BookkeepingRecord & {
  id: string;
  icon: string;
  displayTime: string;
  blockId?: string;
  documentId?: string;
  createdAt?: string;
}

const billPageSize = 5;
const visibleDayCount = ref(billPageSize);
const billRecords = ref<TimelineRecord[]>([]);
const currentDateText = ref("");

onMounted(async () => {
  currentDateText.value = (await getCurrentDateTime()).date;
  await initBookkeepingRecords();
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
const todayDateText = computed(() => currentDateText.value);
const recentAmountText = computed(() => {
  const total = billRecords.value.filter(record => record.date === todayDateText.value && record.type === "expense").reduce((sum, record) => {
    return sum + record.amount;
  }, 0);
  return Math.abs(total).toFixed(2);
});
const recentDateText = computed(() => todayDateText.value);
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
          emit("record-saved");
          bookkeepingEditDialog?.destroy();
        }
      },
      onSaveAgain: async (record: BookkeepingRecord, reset: () => void) => {
        const savedRecord = await saveBookkeepingRecord(record);
        if (savedRecord) {
          upsertBillRecord(savedRecord);
          emit("record-saved");
          reset();
        }
      }
    }
  });
}

// 编辑已有记录时更新原块，不新增一条记录
const editBookkeepingItem = (item: TimelineRecord) => {
  const bookkeepingEditDialog = alert(BookkeepingEdit, {
    title: "编辑记账记录",
    props: {
      confData: props.settingConfData,
      initialRecord: item,
      onUpdate: async (record: BookkeepingRecord) => {
        const savedRecord = await saveBookkeepingRecord({
          ...item,
          ...record,
        });
        if (savedRecord) {
          upsertBillRecord(savedRecord);
          emit("record-saved");
          bookkeepingEditDialog?.destroy();
        }
      },
      onDeleteRecord: async () => {
        if (!window.confirm("确定删除这条记账记录吗？")) return;
        const isDeleted = await deleteBookkeepingRecord(item);
        if (isDeleted) {
          bookkeepingEditDialog?.destroy();
        }
      },
    }
  });
}

// 初始化记账记录
async function initBookkeepingRecords(): Promise<void> {
  const records = await getBookkeepingRecordsByPledge(props.settingConfData.bookkeepingStorageMode);
  billRecords.value = records.map(toTimelineRecord).sort(sortBillRecord);
}

function toTimelineRecord(
  record: BookkeepingRecord & { blockId?: string; documentId?: string; displayTime?: string; createdAt?: string },
  index = 0,
): TimelineRecord {
  return {
    ...record,
    id: record.blockId || `${record.date}-${index}`,
    icon: getCategoryIcon(record.parentName),
    displayTime: record.displayTime || "",
    documentId: record.documentId,
    createdAt: record.createdAt,
  };
}

function upsertBillRecord(record: TimelineRecord): void {
  billRecords.value = [
    record,
    ...billRecords.value.filter(item => item.id !== record.id),
  ].sort(sortBillRecord);
}

async function deleteBookkeepingRecord(record: TimelineRecord): Promise<boolean> {
  if (!record.blockId) {
    showMessage("未找到记账记录块，无法删除", 2000, "error");
    return false;
  }

  const isDeleted = await deleteBlock(record.blockId);
  if (!isDeleted) {
    showMessage("记账删除失败", 2000, "error");
    return false;
  }

  billRecords.value = billRecords.value.filter(item => item.id !== record.id);
  emit("record-saved");
  showMessage("记账删除成功", 2000, "info");
  return true;
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

function formatDateValue(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateLabel(date: string): string {
  const dateObj = new Date(`${date}T00:00:00`);
  if (!currentDateText.value) return date.slice(5);

  const today = new Date(`${currentDateText.value}T00:00:00`);
  const yesterday = new Date(today);
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
async function saveBookkeepingRecord(record: BookkeepingRecord & { blockId?: string; documentId?: string; createdAt?: string; displayTime?: string }): Promise<TimelineRecord | undefined> {
  const settingConf = props.settingConfData;

  if (!settingConf.bookkeepingDocumentId) {
    showMessage("请先配置记账数据存放位置", 2000, "error");
    return undefined;
  }

  const blockMarkdown = recordToMarkdown(record);

  const now = await getCurrentDateTime();
  if (record.blockId) {
    const targetDocumentId = record.documentId ? await getBookkeepingTargetDocumentId(record, settingConf) : "";
    if (targetDocumentId && record.documentId && targetDocumentId !== record.documentId) {
      const blockId = await insertMarkdownBlock(targetDocumentId, blockMarkdown);
      const pledgeData = {
        ...record,
        month: record.date.slice(0, 7),
        storageMode: settingConf.bookkeepingStorageMode,
        documentId: targetDocumentId,
        blockId,
        createdAt: record.createdAt || now.iso,
        displayTime: record.displayTime || now.time,
      };
      const isAttrSaved = await setBlockAttrs(blockId, {
        "custom-pledge": JSON.stringify(pledgeData),
      });

      if (!isAttrSaved) {
        await deleteBlock(blockId);
        showMessage("记账已移动，属性写入失败", 3000, "error");
        return undefined;
      }

      await deleteBlock(record.blockId);
      showMessage("记账修改成功", 2000, "info");
      return toTimelineRecord(pledgeData);
    }

    await updateBlockContent(record.blockId, blockMarkdown);
    const pledgeData = {
      ...record,
      month: record.date.slice(0, 7),
      storageMode: settingConf.bookkeepingStorageMode,
      documentId: record.documentId,
      blockId: record.blockId,
      createdAt: record.createdAt || now.iso,
      displayTime: record.displayTime || now.time,
    };
    const isAttrSaved = await setBlockAttrs(record.blockId, {
      "custom-pledge": JSON.stringify(pledgeData),
    });

    if (isAttrSaved) {
      showMessage("记账修改成功", 2000, "info");
      return toTimelineRecord(pledgeData);
    }

    showMessage("记账已修改，属性写入失败", 3000, "error");
    return undefined;
  }

  let targetDocumentId = "";
  if (settingConf.bookkeepingStorageMode === "central") {
    targetDocumentId = await getCentralBookkeepingDocumentId(record, settingConf);
  } else if (settingConf.bookkeepingStorageMode === "date") {
    targetDocumentId = await getDailyBookkeepingDocumentId(record, settingConf);
  } else {
    showMessage("未知的记账存放方式", 2000, "error");
    return undefined;
  }

  if (!targetDocumentId) {
    showMessage("未找到记账写入文档", 2000, "error");
    return undefined;
  }

  const blockId = await insertMarkdownBlock(targetDocumentId, blockMarkdown);

  const pledgeData = {
    ...record,
    month: record.date.slice(0, 7),
    storageMode: settingConf.bookkeepingStorageMode,
    documentId: targetDocumentId,
    blockId,
    createdAt: now.iso,
    displayTime: now.time,
  };
  const attrs = {
    "custom-pledge": JSON.stringify(pledgeData),
  };
  const isAttrSaved = await setBlockAttrs(blockId, attrs);

  if (isAttrSaved) {
    showMessage("记账保存成功", 2000, "info");
    return toTimelineRecord(pledgeData);
  } else {
    showMessage("记账已写入，属性写入失败", 3000, "error");
    return undefined;
  }
}

async function getBookkeepingTargetDocumentId(record: BookkeepingRecord, settingConf: SettingConfig): Promise<string> {
  if (settingConf.bookkeepingStorageMode === "central") {
    return getCentralBookkeepingDocumentId(record, settingConf);
  }
  if (settingConf.bookkeepingStorageMode === "date") {
    return getDailyBookkeepingDocumentId(record, settingConf);
  }
  return "";
}

async function getCentralBookkeepingDocumentId(record: BookkeepingRecord, settingConf: SettingConfig): Promise<string> {
  const monthTitle = record.date.slice(0, 7);

  const fileList = await getFileTreeById(settingConf.bookkeepingDocumentId);

  const monthFile = fileList.find((file: any) => file.name === monthTitle + ".sy" || file.name === monthTitle);
  if (monthFile) {
    return monthFile.id;
  }

  const monthDocumentId = await createDoc(monthTitle, settingConf.bookkeepingDocumentId);
  return monthDocumentId;
}

async function getDailyBookkeepingDocumentId(record: BookkeepingRecord, settingConf: SettingConfig): Promise<string> {
  const notebookId = settingConf.bookkeepingDocumentId;
  if (!notebookId) {
    return "";
  }

  const notebookConf = await getNotebookConf(notebookId);
  const dailyNoteSavePath = notebookConf?.conf?.dailyNoteSavePath;

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
    return ids[0];
  }

  const dailyNoteDocumentId = await createDocWithMdByHPath(notebookId, dailyNotePath, "");
  return dailyNoteDocumentId;
}

function renderDailyNotePath(template: string, date: string): string {
  const dateObj = new Date(`${date}T00:00:00`);
  const renderedPath = template.replace(
    /{{\s*now\s*\|\s*date\s+["']([^"']+)["']\s*}}/g,
    (_match, layout: string) => formatGoDateLayout(dateObj, layout),
  );

  if (renderedPath.includes("{{")) {
    return "";
  }

  return renderedPath.startsWith("/") ? renderedPath : `/${renderedPath}`;
}

function formatGoDateLayout(date: Date, layout: string): string {
  const pad = (num: number) => String(num).padStart(2, "0");
  const tokenMap: Record<string, string> = {
    "2006": String(date.getFullYear()),
    "1": String(date.getMonth() + 1),
    "01": pad(date.getMonth() + 1),
    "2": String(date.getDate()),
    "02": pad(date.getDate()),
    "15": pad(date.getHours()),
    "04": pad(date.getMinutes()),
    "05": pad(date.getSeconds()),
  };

  return layout.replace(/2006|01|02|15|04|05|1|2/g, (token) => tokenMap[token]);
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

.pl-empty {
  min-height: 10rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
}

.pl-empty svg {
  width: 4rem;
  height: 4rem;
  fill: currentColor;
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
