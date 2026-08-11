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
import { alert } from "../utils/dialog-utils"
import { getRequiredSettingMessage } from "@/utils/pl-utils";
import {
  getCurrentDateTime,
} from '@/api/siyuanApi';
import {
  deleteBookkeepingRecord as deleteBookkeepingRecordService,
  loadBookkeepingRecords,
  saveBookkeepingRecord as saveBookkeepingRecordService,
} from '@/services/bookkeepingService';

const emit = defineEmits<{
  (e: "changePage", value: "asset" | "bookkeeping"): void
  (e: "records-changed", records: TimelineRecord[]): void
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
  const validationMessage = getRequiredSettingMessage(props.settingConfData, "bookkeeping");
  if (validationMessage) {
    showMessage(validationMessage, 3000, "error");
    return;
  }
  const bookkeepingEditDialog = alert(BookkeepingEdit, {
    title: "新增记账记录",
    props: {
      confData: props.settingConfData,
      onUpdate: async (record: BookkeepingRecord) => {
        const savedRecord = await saveBookkeepingRecordService(record, props.settingConfData);
        if (savedRecord) {
          upsertBillRecord(toTimelineRecord(savedRecord));
          emitRecordsChanged();
          bookkeepingEditDialog?.destroy();
        }
      },
      onSaveAgain: async (record: BookkeepingRecord, reset: () => void) => {
        const savedRecord = await saveBookkeepingRecordService(record, props.settingConfData);
        if (savedRecord) {
          upsertBillRecord(toTimelineRecord(savedRecord));
          emitRecordsChanged();
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
        const savedRecord = await saveBookkeepingRecordService({
          ...item,
          ...record,
        }, props.settingConfData, item);
        if (savedRecord) {
          upsertBillRecord(toTimelineRecord(savedRecord));
          emitRecordsChanged();
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
  if (getRequiredSettingMessage(props.settingConfData, "bookkeeping")) {
    billRecords.value = [];
    emitRecordsChanged();
    return;
  }

  const { records, error } = await loadBookkeepingRecords(props.settingConfData);
  if (error) {
    showMessage(error, 3000, "error");
    return;
  }
  billRecords.value = records.map(toTimelineRecord).sort(sortBillRecord);
  emitRecordsChanged();
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

function emitRecordsChanged(): void {
  emit("records-changed", billRecords.value);
}

async function deleteBookkeepingRecord(record: TimelineRecord): Promise<boolean> {
  if (!record.blockId) {
    showMessage("未找到记账记录块，无法删除", 2000, "error");
    return false;
  }

  const isDeleted = await deleteBookkeepingRecordService(record.blockId);
  if (!isDeleted) {
    showMessage("记账删除失败", 2000, "error");
    return false;
  }

  billRecords.value = billRecords.value.filter(item => item.id !== record.id);
  emitRecordsChanged();
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
  color: var(--pl-color-text-secondary);
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
  color: var(--pl-color-empty);
}

.pl-empty svg {
  width: 4rem;
  height: 4rem;
  fill: currentColor;
}

.pl-bookkeeping-date {
  margin: 0 0 0.35rem 0.5rem;
  color: var(--pl-color-text);
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
  background-color: var(--pl-color-surface-light);
}

.pl-bookkeeping-icon {
  width: 2.25rem;
  height: 2.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--pl-color-surface);
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
  color: var(--pl-color-text);
  font-size: 0.8rem;
  font-weight: 600;
}

.pl-bookkeeping-record-desc {
  color: var(--pl-color-text-secondary);
  font-size: 0.75rem;
  line-height: 1.5;
}

.pl-bookkeeping-record-time {
  color: var(--pl-color-text-secondary);
  font-size: 0.75rem;
  line-height: 1.5;
}

.pl-bookkeeping-record-amount {
  color: var(--pl-color-error);
  font-size: 1.1rem;
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
}

.pl-bookkeeping-record-amount.income {
  color: var(--pl-color-success);
}

.pl-bookkeeping-more {
  width: calc(100% - 1rem);
  margin: 0.75rem 0.5rem 0;
  color: var(--pl-color-text);
  background-color: var(--pl-color-surface);
  border: 1px solid var(--pl-color-border);
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: bold;
  padding: 0.5rem 0.75rem;
}

.pl-bookkeeping-more:hover {
  background-color: var(--pl-color-surface-light);
  border-color: var(--pl-color-border);
}

.pl-bookkeeping-end {
  margin: 0.75rem 0 0;
  text-align: center;
  color: var(--pl-color-text-secondary);
  font-size: 0.875rem;
}
</style>
