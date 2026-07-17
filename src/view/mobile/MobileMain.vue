<template>
  <div class="pl-mobile-main">
    <main class="pl-mobile-content">
      <template v-if="activePage === 'bookkeeping'">
        <section class="pl-mobile-summary-grid">
          <div class="pl-mobile-summary-card expense">
            <span>本月支出</span>
            <strong>{{ formatAmount(bookkeepingMonthStats.expense) }}</strong>
            <p>较上月 <b>{{ formatDiff(bookkeepingMonthDiff.expenseRate) }}</b></p>
          </div>
          <div class="pl-mobile-summary-card income">
            <span>本月收入</span>
            <strong>{{ formatAmount(bookkeepingMonthStats.income) }}</strong>
            <p>较上月 <b>{{ formatDiff(bookkeepingMonthDiff.incomeRate) }}</b></p>
          </div>
          <div class="pl-mobile-summary-card budget">
            <span>预算执行情况(本月)</span>
            <strong>{{ formatPercent(bookkeepingBudgetRate) }}%</strong>
            <p>预算 <b>{{ formatAmount(bookkeepingMonthlyBudget) }}</b></p>
          </div>
          <div class="pl-mobile-summary-card average">
            <span>日均支出(本月)</span>
            <strong>{{ formatAmount(bookkeepingMonthStats.averageExpense) }}</strong>
            <p>较上月 <b>{{ formatDiff(bookkeepingMonthDiff.averageRate) }}</b></p>
          </div>
        </section>

        <section class="pl-mobile-card pl-mobile-record-card">
          <div class="pl-mobile-section-header">
            <h3>当日收支记录</h3>
            <span class="pl-mobile-link">{{ todayDateText }}</span>
          </div>
          <div v-if="todayBookkeepingRecords.length === 0" class="pl-mobile-empty pl-mobile-record-empty">
            <svg>
              <use xlink:href="#iconD3Empty"></use>
            </svg>
            <span>暂无当日记录</span>
          </div>
          <div v-else class="pl-mobile-record-list">
            <button v-for="record in todayBookkeepingRecords" :key="record.id" class="pl-mobile-record-row"
              @click="editBookkeepingItem(record)">
              <div class="pl-mobile-record-icon">
                <IconDisplay :icon="record.icon" fallback="•" />
              </div>
              <div class="pl-mobile-record-body">
                <strong>{{ record.parentName }} · {{ record.childName }}</strong>
                <span>{{ record.displayTime || "--:--" }}<template v-if="record.remark"> · {{ record.remark }}</template></span>
              </div>
              <b :class="{ income: record.type === 'income' }">
                {{ record.type === "expense" ? "-" : "+" }}{{ formatAmount(record.amount) }}
              </b>
            </button>
          </div>
        </section>

        <section class="pl-mobile-month-picker">
          <button @click="changeBookkeepingMonth(-1)">‹</button>
          <strong>{{ bookkeepingMonthTitle }}</strong>
          <button @click="changeBookkeepingMonth(1)">›</button>
        </section>

        <section class="pl-mobile-card">
          <div class="pl-mobile-section-header">
            <h3>收支趋势</h3>
            <div class="pl-mobile-range-tabs">
              <span>按天</span>
            </div>
          </div>
          <div class="pl-mobile-bookkeeping-chart">
            <div ref="bookkeepingTrendChartRef" class="pl-mobile-bookkeeping-echart"></div>
            <div v-if="!hasBookkeepingMonthData" class="pl-mobile-chart-empty">
              <svg>
                <use xlink:href="#iconD3Empty"></use>
              </svg>
              <span>暂无收支记录</span>
            </div>
          </div>
        </section>

        <section class="pl-mobile-card">
          <div class="pl-mobile-section-header">
            <h3>支出占比（按分类）</h3>
          </div>
          <div class="pl-mobile-category-body">
            <div class="pl-mobile-donut" :style="{ background: categoryDonutBackground }"></div>
            <div class="pl-mobile-category-list">
              <div v-for="item in bookkeepingCategoryStats" :key="item.name">
                <span :style="{ backgroundColor: item.color }"></span>
                <b>{{ item.name }}</b>
                <em>{{ item.percent }}</em>
              </div>
              <div v-if="bookkeepingCategoryStats.length === 0" class="pl-mobile-category-empty">暂无分类支出</div>
            </div>
          </div>
        </section>
      </template>

      <template v-else>
        <section class="pl-mobile-total-card">
          <div class="pl-mobile-total-header">
            <div>
              <span>总资产</span>
              <span class="pl-mobile-unit">（元）</span>
            </div>
            <button class="pl-mobile-ghost-button" @click="totalVisible = !totalVisible" aria-label="切换总资产显示">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          </div>
          <div class="pl-mobile-total-body">
            <span>{{ accountDate || "--" }}</span>
            <strong>{{ totalVisible ? accountTotal : "******" }}</strong>
          </div>
        </section>

        <section class="pl-mobile-card">
          <div class="pl-mobile-section-header">
            <h3>资产走势</h3>
            <div class="pl-mobile-range-tabs">
              <span>近1年</span>
            </div>
          </div>
          <Line class="pl-mobile-line" :lineData="lineData"></Line>
        </section>

        <section class="pl-mobile-card">
          <div class="pl-mobile-section-header">
            <h3>分析</h3>
            <span class="pl-mobile-badge">{{ accountDate || "--" }}</span>
          </div>
          <Compare :amountDiff="accountDiff" :rateDiff="rateDiff" :date="secondDate"></Compare>
        </section>

        <section class="pl-mobile-card">
          <div class="pl-mobile-section-header">
            <h3>计划</h3>
            <span class="pl-mobile-badge">{{ accountDate || "--" }}</span>
          </div>
          <Plan :blockNm="20" :value="planRate" />
          <div class="pl-mobile-plan-text">已完成 {{ assetPlanRateText }}</div>
        </section>

        <section class="pl-mobile-card pl-mobile-account-card">
          <div v-if="latestLedgerList.length === 0" class="pl-mobile-empty">
            <svg>
              <use xlink:href="#iconD3Empty"></use>
            </svg>
            <span>暂无资产记录</span>
          </div>
          <div v-else class="pl-mobile-account-list">
            <button v-for="item in visibleLedgerList" :key="item.name" class="pl-mobile-account-row"
              @click="editLedgerItem(item)">
              <IconDisplay class="pl-mobile-account-icon" :icon="item.icon" fallback="iconD3List" />
              <div class="pl-mobile-account-body">
                <div class="pl-mobile-account-title">{{ item.name }}</div>
                <div class="pl-mobile-account-amount">{{ formatAmount(item.amount) }}</div>
                <div class="pl-mobile-account-detail">{{ getChildrenText(item) }}</div>
              </div>
              <svg class="pl-mobile-edit-icon">
                <use xlink:href="#iconD3EidtIcon"></use>
              </svg>
            </button>

            <button v-if="latestLedgerList.length > accountLimit" class="pl-mobile-more-button"
              @click="showAllAccounts = !showAllAccounts">
              {{ showAllAccounts ? "收起账户" : "全部账户" }}
              <span>{{ showAllAccounts ? "⌃" : "›" }}</span>
            </button>
          </div>
        </section>
      </template>
    </main>

    <footer class="pl-mobile-tabbar">
      <button :class="{ active: activePage === 'bookkeeping' }" @click="activePage = 'bookkeeping'">
        <svg>
          <use xlink:href="#iconD3List"></use>
        </svg>
        <span>记账</span>
      </button>
      <button class="pl-mobile-add-button" @click="addBookkeepingItem">
        <span>+</span>
        <em>记一笔</em>
      </button>
      <button :class="{ active: activePage === 'asset' }" @click="activePage = 'asset'">
        <svg>
          <use xlink:href="#iconD3DB"></use>
        </svg>
        <span>资产</span>
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import currency from "currency.js";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts/core';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { showMessage } from 'siyuan';
import {
  blockDocument,
  createDoc,
  createDocWithMdByHPath,
  deleteBlock,
  getBookkeepingRecordsByPledge,
  getCurrentDateTime,
  getFileTreeById,
  getIDsByHPath,
  getLedgerListByYearDocId,
  getNotebookConf,
  getTableBlockByDocId,
  getYearDocs,
  insertMarkdownBlock,
  insertTableBlock,
  setBlockAttrs,
  updateBlockContent,
} from '@/api/siyuanApi.js';
import { config2TableMDHeader, deepClone, getRequiredSettingMessage, json2TableMDBody } from '@/utils/pl-utils.js';
import { alert } from "@/utils/dialog-utils.js";
import BookkeepingEdit from '@/components/BookkeepingEdit.vue';
import Compare from '@/components/bi/Compare.vue';
import IconDisplay from "@/components/custom/IconDisplay.vue";
import LedgerEdit from '@/components/LedgerEdit.vue';
import Line from '@/components/bi/Line.vue';
import Plan from '@/components/bi/Plan.vue';
import { getPluginThemeColors, observeThemeChange } from '@/utils/theme-utils';

echarts.use([
  GridComponent,
  LegendComponent,
  TooltipComponent,
  LineChart,
  CanvasRenderer,
]);

const props = defineProps<{
  settingConfData: SettingConfig // 配置数据
}>();

type MobilePage = "bookkeeping" | "asset";
type TimelineRecord = BookkeepingRecord & {
  id: string;
  icon: string;
  displayTime: string;
  blockId?: string;
  createdAt?: string;
  documentId?: string;
}

const activePage = ref<MobilePage>("bookkeeping");

const accountLimit = 5;
const latestLedgerList = ref<LedgerItem[]>([]);
const accountTotal = ref<string>("0.00");
const accountDate = ref<string>("");
const secondDate = ref<string>("");
const accountDiff = ref<number>(0);
const rateDiff = ref<number>(0);
const planRate = ref<number>(0);
const lineData = ref<{ time: string; value: number }[]>([]);
const showAllAccounts = ref(false);
const totalVisible = ref(true);

const bookkeepingRecords = ref<TimelineRecord[]>([]);
const selectedBookkeepingMonth = ref(formatMonth(new Date()));
const currentSystemDate = ref("");
const bookkeepingTrendChartRef = ref<HTMLDivElement | null>(null);
type EChartsInstance = ReturnType<typeof echarts.init>;
let bookkeepingTrendChart: EChartsInstance | null = null;
let stopObservingTheme: (() => void) | null = null;

const visibleLedgerList = computed(() => {
  return showAllAccounts.value ? latestLedgerList.value : latestLedgerList.value.slice(0, accountLimit);
});
const assetPlanRateText = computed(() => `${Math.min(Math.max(planRate.value * 100, 0), 100).toFixed(0)}%`);

const bookkeepingMonthlyBudget = computed(() => parseAmount(props.settingConfData.bookkeepingMonthlyBudget, 3000));
const bookkeepingMonthTitle = computed(() => {
  const [year, month] = selectedBookkeepingMonth.value.split("-");
  return `${year}年${Number(month)}月`;
});
const bookkeepingMonthRange = computed(() => getMonthRange(selectedBookkeepingMonth.value));
const previousBookkeepingMonthRange = computed(() => getMonthRange(formatMonth(addMonths(parseMonth(selectedBookkeepingMonth.value), -1))));
const currentMonthRecords = computed(() => {
  const range = bookkeepingMonthRange.value;
  return bookkeepingRecords.value.filter(record => record.date >= range.start && record.date <= range.end);
});
const previousMonthRecords = computed(() => {
  const range = previousBookkeepingMonthRange.value;
  return bookkeepingRecords.value.filter(record => record.date >= range.start && record.date <= range.end);
});
const dailyRecordDate = computed(() => currentSystemDate.value);
const todayDateText = computed(() => dailyRecordDate.value);
const todayBookkeepingRecords = computed(() => {
  return bookkeepingRecords.value
    .filter(record => record.date === dailyRecordDate.value)
    .sort(sortBookkeepingRecord);
});
const hasBookkeepingMonthData = computed(() => currentMonthRecords.value.length > 0);
const bookkeepingMonthStats = computed(() => calculateMonthStats(currentMonthRecords.value, bookkeepingMonthRange.value.dayCount));
const previousBookkeepingMonthStats = computed(() => calculateMonthStats(previousMonthRecords.value, previousBookkeepingMonthRange.value.dayCount));
const bookkeepingMonthDiff = computed(() => ({
  expenseRate: getRateDiff(bookkeepingMonthStats.value.expense, previousBookkeepingMonthStats.value.expense),
  incomeRate: getRateDiff(bookkeepingMonthStats.value.income, previousBookkeepingMonthStats.value.income),
  averageRate: getRateDiff(bookkeepingMonthStats.value.averageExpense, previousBookkeepingMonthStats.value.averageExpense),
}));
const bookkeepingBudgetRate = computed(() => bookkeepingMonthlyBudget.value > 0 ? bookkeepingMonthStats.value.expense / bookkeepingMonthlyBudget.value * 100 : 0);
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
const bookkeepingTrendData = computed(() => {
  const dates = getDateRange(bookkeepingMonthRange.value.start, bookkeepingMonthRange.value.end);
  const expenseMap = new Map<string, number>();
  const incomeMap = new Map<string, number>();
  dates.forEach(date => {
    expenseMap.set(date, 0);
    incomeMap.set(date, 0);
  });

  for (const record of currentMonthRecords.value) {
    const map = record.type === "expense" ? expenseMap : incomeMap;
    map.set(record.date, currency(map.get(record.date) || 0).add(Math.abs(record.amount || 0)).value);
  }

  const expense = dates.map(date => expenseMap.get(date) || 0);
  const income = dates.map(date => incomeMap.get(date) || 0);

  return {
    labels: dates.map(date => date.slice(5)),
    expense,
    income,
    balance: dates.map((_, index) => income[index] - expense[index]),
  };
});

const categoryColors = ["#ef4444", "#2563eb", "#22c55e", "#f59e0b", "#94a3b8"];
const bookkeepingCategoryStats = computed(() => {
  const amountMap = new Map<string, number>();
  for (const record of currentMonthRecords.value) {
    if (record.type !== "expense") continue;
    amountMap.set(record.parentName, currency(amountMap.get(record.parentName) || 0).add(Math.abs(record.amount || 0)).value);
  }

  const entries = Array.from(amountMap.entries())
    .filter(([, amount]) => amount > 0)
    .sort(([, amountA], [, amountB]) => amountB - amountA);
  const topEntries = entries.slice(0, 4);
  const otherAmount = entries.slice(4).reduce((sum, [, amount]) => sum + amount, 0);
  const finalEntries = otherAmount > 0 ? [...topEntries, ["其他", otherAmount] as [string, number]] : topEntries;
  const total = finalEntries.reduce((sum, [, amount]) => sum + amount, 0);

  return finalEntries.map(([name, amount], index) => ({
    name,
    amount,
    color: categoryColors[index] || categoryColors[categoryColors.length - 1],
    percent: total > 0 ? `${formatPercent(amount / total * 100)}%` : "0.0%",
  }));
});
const categoryDonutBackground = computed(() => {
  if (bookkeepingCategoryStats.value.length === 0) {
    return "conic-gradient(var(--pl-color-border) 0deg 360deg)";
  }

  const total = bookkeepingCategoryStats.value.reduce((sum, item) => sum + item.amount, 0);
  let start = 0;
  const segments = bookkeepingCategoryStats.value.map(item => {
    const end = start + item.amount / total * 360;
    const segment = `${item.color} ${start}deg ${end}deg`;
    start = end;
    return segment;
  });
  return `conic-gradient(${segments.join(", ")})`;
});

onMounted(async () => {
  currentSystemDate.value = (await getCurrentDateTime()).date;
  selectedBookkeepingMonth.value = currentSystemDate.value.slice(0, 7);
  await initAssetData();
  await initBookkeepingRecords();
  stopObservingTheme = observeThemeChange(renderBookkeepingTrendChart);
  window.addEventListener("resize", resizeBookkeepingTrendChart);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeBookkeepingTrendChart);
  stopObservingTheme?.();
  disposeBookkeepingTrendChart();
});

watch([activePage, bookkeepingTrendData, hasBookkeepingMonthData], async () => {
  await nextTick();
  if (activePage.value !== "bookkeeping") {
    disposeBookkeepingTrendChart();
    return;
  }
  renderBookkeepingTrendChart();
}, { deep: true });

// 初始化资产数据，移动端先展示最近一年走势和最新一期资产。
async function initAssetData() {
  const today = (await getCurrentDateTime()).dateObj;
  const rangeStartDate = formatDate(addDays(today, -364));
  const rangeEndDate = formatDate(today);
  const accountList = await getAssetLedgerListByDateRange(rangeStartDate, rangeEndDate);
  const sortedTimes = Array.from(new Set(accountList.map(item => item.time).filter(Boolean) as string[]))
    .sort((a, b) => b.localeCompare(a));
  const latestDate = sortedTimes[0] || "";
  const secondLatestDate = sortedTimes.length > 1 ? sortedTimes[1] || "" : sortedTimes[0] || "";

  latestLedgerList.value = accountList.filter(item => item.time === latestDate);
  accountDate.value = latestLedgerList.value.length > 0 ? latestLedgerList.value[0].time || "" : "";

  const sum = sumLedgerList(latestLedgerList.value);
  accountTotal.value = formatAmount(sum);

  const secondLatestLedgerList = accountList.filter(item => item.time === secondLatestDate);
  const secondSum = sumLedgerList(secondLatestLedgerList);
  secondDate.value = secondLatestDate;
  accountDiff.value = currency(sum).subtract(secondSum).value;
  rateDiff.value = secondSum === 0 ? 0 : currency(accountDiff.value, { precision: 4 }).divide(Math.abs(secondSum)).multiply(100).value;
  const planTarget = parseAmount(props.settingConfData.planNum, 1000000);
  planRate.value = planTarget > 0 ? sum / planTarget : 0;

  const lineMap = new Map<string, number>();
  for (const item of accountList) {
    if (!item.time) continue;
    lineMap.set(item.time, currency(lineMap.get(item.time) || 0).add(item.amount || 0).value);
  }
  lineData.value = Array.from(lineMap.entries()).map(([time, value]) => ({ time, value }));
}

async function initBookkeepingRecords(): Promise<void> {
  if (getRequiredSettingMessage(props.settingConfData, "bookkeeping")) {
    bookkeepingRecords.value = [];
    return;
  }

  const records = await getBookkeepingRecordsByPledge(props.settingConfData.bookkeepingStorageMode);
  bookkeepingRecords.value = records.map(toTimelineRecord).sort(sortBookkeepingRecord);
}

function addBookkeepingItem() {
  const validationMessage = getRequiredSettingMessage(props.settingConfData, "bookkeeping");
  if (validationMessage) {
    showMessage(validationMessage, 3000, "error");
    return;
  }
  const bookkeepingEditDialog = alert(BookkeepingEdit, {
    title: "新增记账记录",
    isMobile: true,
    props: {
      confData: props.settingConfData,
      isMobile: true,
      onUpdate: async (record: BookkeepingRecord) => {
        const savedRecord = await saveBookkeepingRecord(record);
        if (!savedRecord) return;
        upsertBookkeepingRecord(savedRecord);
        bookkeepingEditDialog?.destroy();
      },
      onSaveAgain: async (record: BookkeepingRecord, reset: () => void) => {
        const savedRecord = await saveBookkeepingRecord(record);
        if (!savedRecord) return;
        upsertBookkeepingRecord(savedRecord);
        reset();
      },
    },
  });
}

function editBookkeepingItem(item: TimelineRecord) {
  const bookkeepingEditDialog = alert(BookkeepingEdit, {
    title: "编辑记账记录",
    isMobile: true,
    props: {
      confData: props.settingConfData,
      isMobile: true,
      initialRecord: item,
      onUpdate: async (record: BookkeepingRecord) => {
        const savedRecord = await saveBookkeepingRecord({
          ...item,
          ...record,
        });
        if (!savedRecord) return;
        upsertBookkeepingRecord(savedRecord);
        bookkeepingEditDialog?.destroy();
      },
      onDeleteRecord: async () => {
        if (!window.confirm("确定删除这条记账记录吗？")) return;
        const isDeleted = await deleteBookkeepingRecord(item);
        if (isDeleted) bookkeepingEditDialog?.destroy();
      },
    },
  });
}

function editLedgerItem(item: LedgerItem) {
  openLedgerEditDialog("修改资产记录", item);
}

function openLedgerEditDialog(title: string, ledgerData?: LedgerItem) {
  if (!ledgerData) {
    const validationMessage = getRequiredSettingMessage(props.settingConfData, "asset");
    if (validationMessage) {
      showMessage(validationMessage, 3000, "error");
      return;
    }
  }
  const originalLedgerData = ledgerData ? deepClone(ledgerData) : undefined;
  const ledgerEditDialog = alert(LedgerEdit, {
    title,
    isMobile: true,
    props: {
      confData: props.settingConfData,
      isMobile: true,
      ledgerData: ledgerData ? [deepClone(ledgerData)] : undefined,
      onUpdate: (item: LedgerItem[]) => {
        editAssetData(item, originalLedgerData).then(() => {
          showMessage("保存成功", 3000, "info");
          ledgerEditDialog?.destroy();
          setTimeout(initAssetData, 500);
        });
      },
    },
  });
}

async function editAssetData(item: LedgerItem[], originLedgerData?: LedgerItem): Promise<void> {
  const yearDate = item[0].time?.split("-")[0];
  if (!yearDate) return;

  if (!originLedgerData) {
    await saveAssetData(yearDate, item);
    return;
  }

  const originYear = originLedgerData.time?.split("-")[0];
  if (originYear === yearDate) {
    await replaceLedgerData(yearDate, originLedgerData, deepClone(item[0]));
  }
}

async function saveAssetData(yearDate: string, item: LedgerItem[]): Promise<void> {
  const fileList = await getFileTreeById(props.settingConfData.documentId);
  let yearDocumentId = "";
  const yearFile = fileList.find((file: any) => file.name === `${yearDate}.sy` || file.name === yearDate);
  if (yearFile) yearDocumentId = yearFile.id;
  if (!yearDocumentId) {
    yearDocumentId = await createDoc(yearDate, props.settingConfData.documentId);
  }

  let { id: tableBlockId, markdown: tableBlockMarkdown } = await getTableBlockByDocId(yearDocumentId);
  if (!tableBlockId) {
    tableBlockMarkdown = config2TableMDHeader(props.settingConfData.config);
  }
  tableBlockMarkdown += "\n" + json2TableMDBody(deepClone(item));

  if (tableBlockId) {
    await updateBlockContent(tableBlockId, tableBlockMarkdown);
  } else {
    tableBlockId = await insertTableBlock(yearDocumentId, tableBlockMarkdown);
  }
  await blockDocument(yearDocumentId);
}

async function replaceLedgerData(year: string, originLedgerData: LedgerItem, ledgerData: LedgerItem): Promise<void> {
  const fileList = await getFileTreeById(props.settingConfData.documentId);
  let yearDocumentId = "";
  const yearFile = fileList.find((file: any) => file.name === `${year}.sy` || file.name === year);
  if (yearFile) yearDocumentId = yearFile.id;
  if (!yearDocumentId) {
    yearDocumentId = await createDoc(year, props.settingConfData.documentId);
  }

  const { id: tableBlockId, markdown: tableBlockMarkdown } = await getTableBlockByDocId(yearDocumentId);
  const tableLines = tableBlockMarkdown
    .split("\n")
    .map(line => line.trimEnd())
    .filter(line => line.startsWith("|") && line.endsWith("|"));

  let nextTableMarkdown: string;
  if (tableLines.length < 2) {
    nextTableMarkdown = `${config2TableMDHeader(props.settingConfData.config)}\n${json2TableMDBody([ledgerData])}`;
  } else {
    const headerLines = tableLines.slice(0, 2);
    const bodyLines = tableLines.slice(2);
    const nextRows = json2TableMDBody([ledgerData]).split("\n").filter(Boolean);
    const isTargetRow = (line: string) => {
      const cols = line.slice(1, -1).split("|").map(cell => cell.trim());
      return cols[0] === (originLedgerData.time || "") && cols[1] === originLedgerData.name;
    };
    const matchedIndex = bodyLines.findIndex(isTargetRow);
    const beforeLines = matchedIndex >= 0 ? bodyLines.slice(0, matchedIndex) : bodyLines;
    const afterLines = matchedIndex >= 0 ? bodyLines.slice(matchedIndex).filter(line => !isTargetRow(line)) : [];
    nextTableMarkdown = [...headerLines, ...beforeLines, ...nextRows, ...afterLines].join("\n");
  }

  await updateBlockContent(tableBlockId, nextTableMarkdown);
  await blockDocument(yearDocumentId);
}

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
  const isAttrSaved = await setBlockAttrs(blockId, {
    "custom-pledge": JSON.stringify(pledgeData),
  });

  if (isAttrSaved) {
    showMessage("记账保存成功", 2000, "info");
    return toTimelineRecord(pledgeData);
  }

  showMessage("记账已写入，属性写入失败", 3000, "error");
  return undefined;
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

  bookkeepingRecords.value = bookkeepingRecords.value.filter(item => item.id !== record.id);
  showMessage("记账删除成功", 2000, "info");
  return true;
}

async function getCentralBookkeepingDocumentId(record: BookkeepingRecord, settingConf: SettingConfig): Promise<string> {
  const monthTitle = record.date.slice(0, 7);
  const fileList = await getFileTreeById(settingConf.bookkeepingDocumentId);
  const monthFile = fileList.find((file: any) => file.name === `${monthTitle}.sy` || file.name === monthTitle);
  if (monthFile) return monthFile.id;
  return createDoc(monthTitle, settingConf.bookkeepingDocumentId);
}

async function getDailyBookkeepingDocumentId(record: BookkeepingRecord, settingConf: SettingConfig): Promise<string> {
  const notebookId = settingConf.bookkeepingDocumentId;
  if (!notebookId) return "";

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
  if (ids.length > 0) return ids[0];
  return createDocWithMdByHPath(notebookId, dailyNotePath, "");
}

async function getAssetLedgerListByDateRange(rangeStartDate: string, rangeEndDate: string): Promise<LedgerItem[]> {
  if (getRequiredSettingMessage(props.settingConfData, "asset")) return [];

  const yearDocs = await getYearDocs(props.settingConfData.documentId);
  if (!yearDocs) return [];

  const data: LedgerItem[] = [];
  for (let year = Number(rangeStartDate.split("-")[0]); year <= Number(rangeEndDate.split("-")[0]); year++) {
    const yearDoc = yearDocs.find(item => item.name.replace(".sy", "") === String(year));
    if (!yearDoc) continue;
    const accountList = await getLedgerListByYearDocId(yearDoc.id, props.settingConfData);
    data.push(...accountList.filter(item => item.time && item.time >= rangeStartDate && item.time <= rangeEndDate));
  }
  return data;
}

function toTimelineRecord(
  record: BookkeepingRecord & { blockId?: string; displayTime?: string; createdAt?: string; documentId?: string },
  index = 0,
): TimelineRecord {
  return {
    ...record,
    id: record.blockId || `${record.date}-${index}`,
    icon: getCategoryIcon(record.parentName),
    displayTime: record.displayTime || "",
    createdAt: record.createdAt,
    documentId: record.documentId,
  };
}

function upsertBookkeepingRecord(record: TimelineRecord): void {
  bookkeepingRecords.value = [
    record,
    ...bookkeepingRecords.value.filter(item => item.id !== record.id),
  ].sort(sortBookkeepingRecord);
  selectedBookkeepingMonth.value = record.date.slice(0, 7);
}

function sortBookkeepingRecord(left: TimelineRecord, right: TimelineRecord): number {
  const dateCompare = right.date.localeCompare(left.date);
  if (dateCompare !== 0) return dateCompare;
  return (right.createdAt || right.displayTime).localeCompare(left.createdAt || left.displayTime);
}

function changeBookkeepingMonth(offset: number): void {
  selectedBookkeepingMonth.value = formatMonth(addMonths(parseMonth(selectedBookkeepingMonth.value), offset));
}

function calculateMonthStats(records: TimelineRecord[], dayCount: number) {
  const income = sumBookkeepingRecords(records, "income");
  const expense = sumBookkeepingRecords(records, "expense");
  return {
    income,
    expense,
    averageExpense: dayCount > 0 ? expense / dayCount : 0,
  };
}

function sumBookkeepingRecords(records: TimelineRecord[], type: BookkeepingRecord["type"]): number {
  return records.reduce((sum, record) => {
    if (record.type !== type) return sum;
    return currency(sum).add(Math.abs(record.amount || 0)).value;
  }, 0);
}

function getChildrenText(item: LedgerItem): string {
  const children = item.children || [];
  if (children.length === 0) return "暂无子账户";
  return children.map(child => `${child.name}:${formatAmount(child.amount || 0)}`).join("、");
}

function sumLedgerList(list: LedgerItem[]): number {
  return list.reduce((sum, item) => currency(sum).add(item.amount || 0).value, 0);
}

function getCategoryIcon(parentName: string): string {
  return bookkeepingIconMap.value.get(parentName) || "•";
}

function renderBookkeepingTrendChart(): void {
  if (activePage.value !== "bookkeeping" || !bookkeepingTrendChartRef.value) return;
  if (!bookkeepingTrendChart) {
    bookkeepingTrendChart = echarts.init(bookkeepingTrendChartRef.value);
  }

  if (!hasBookkeepingMonthData.value) {
    bookkeepingTrendChart.clear();
    return;
  }

  const data = bookkeepingTrendData.value;
  const isCompact = bookkeepingTrendChartRef.value.clientWidth < 520;
  const themeColors = getPluginThemeColors();
  bookkeepingTrendChart.setOption({
    color: ["#f45b5b", "#31b875", "#4f7df3"],
    tooltip: {
      trigger: "axis",
      backgroundColor: themeColors.background,
      borderColor: themeColors.border,
      textStyle: { color: themeColors.text },
    },
    legend: {
      top: 16,
      left: 12,
      itemWidth: 18,
      itemHeight: 4,
      selected: {
        支出: true,
        收入: false,
        结余: false,
      },
      textStyle: {
        color: themeColors.textSecondary,
      },
    },
    grid: {
      top: 58,
      right: 12,
      bottom: 24,
      left: 36,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: data.labels,
      axisLine: { lineStyle: { color: themeColors.border } },
      axisTick: { show: false },
      axisLabel: {
        color: themeColors.textSecondary,
        interval: getBookkeepingAxisInterval(data.labels.length, isCompact),
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: themeColors.textSecondary,
        margin: 6,
        formatter: (value: number) => Math.abs(value) >= 1000 ? `${value / 1000}k` : `${value}`,
      },
      splitLine: {
        lineStyle: {
          color: themeColors.border,
          type: "dashed",
        },
      },
    },
    series: [
      {
        name: "支出",
        type: "line",
        smooth: true,
        symbolSize: 7,
        data: data.expense,
      },
      {
        name: "收入",
        type: "line",
        smooth: true,
        symbolSize: 7,
        data: data.income,
      },
      {
        name: "结余",
        type: "line",
        smooth: true,
        symbolSize: 7,
        areaStyle: {
          color: "rgba(79, 125, 243, 0.11)",
        },
        data: data.balance,
      },
    ],
  }, true);
  resizeBookkeepingTrendChart();
}

function resizeBookkeepingTrendChart(): void {
  bookkeepingTrendChart?.resize();
}

function disposeBookkeepingTrendChart(): void {
  bookkeepingTrendChart?.dispose();
  bookkeepingTrendChart = null;
}

function getBookkeepingAxisInterval(labelCount: number, isCompact: boolean): number {
  const maxLabelCount = isCompact ? 4 : 6;
  if (labelCount <= maxLabelCount) return 0;
  return Math.ceil(labelCount / maxLabelCount) - 1;
}

function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let currentDate = parseDate(startDate);
  const finalDate = parseDate(endDate);
  while (currentDate <= finalDate) {
    dates.push(formatDate(currentDate));
    currentDate = addDays(currentDate, 1);
  }
  return dates;
}

function getMonthRange(month: string) {
  const date = parseMonth(month);
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const today = getCurrentSystemDateObj();
  const isCurrentMonth = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
    dayCount: isCurrentMonth ? today.getDate() : endDate.getDate(),
  };
}

function getCurrentSystemDateObj(): Date {
  return currentSystemDate.value ? parseDate(currentSystemDate.value) : new Date();
}

function renderDailyNotePath(template: string, date: string): string {
  const dateObj = new Date(`${date}T00:00:00`);
  const renderedPath = template.replace(
    /{{\s*now\s*\|\s*date\s+["']([^"']+)["']\s*}}/g,
    (_match, layout: string) => formatGoDateLayout(dateObj, layout),
  );
  if (renderedPath.includes("{{")) return "";
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
  return layout.replace(/2006|01|02|15|04|05|1|2/g, token => tokenMap[token]);
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

function getRateDiff(currentValue: number, previousValue: number): number {
  if (previousValue === 0) return currentValue === 0 ? 0 : 100;
  return (currentValue - previousValue) / Math.abs(previousValue) * 100;
}

function formatDiff(value: number): string {
  if (value === 0) return "0.0%";
  return `${value >= 0 ? "↗" : "↘"} ${formatPercent(Math.abs(value))}%`;
}

function formatPercent(value: number): string {
  return value.toFixed(1);
}

function formatAmount(value: number): string {
  return currency(value, { symbol: "" }).format();
}

function parseAmount(value: string | undefined, fallback = 0): number {
  const normalizedValue = String(value ?? "").replace(/,/g, "").trim();
  if (!normalizedValue) return fallback;

  const amount = Number(normalizedValue);
  return Number.isFinite(amount) ? amount : fallback;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function parseMonth(month: string): Date {
  const [year, monthValue] = month.split("-").map(Number);
  return new Date(year, monthValue - 1, 1);
}

function parseDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
</script>

<style scoped lang="css">
.pl-mobile-main {
  height: 100%;
  min-height: 100%;
  position: relative;
  color: var(--pl-color-text);
  background-color: var(--pl-color-surface-light);
  overflow: hidden;
}

.pl-mobile-main,
.pl-mobile-main * {
  box-sizing: border-box;
}

.pl-mobile-content {
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 1rem 1rem 5.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.pl-mobile-card,
.pl-mobile-total-card,
.pl-mobile-month-picker,
.pl-mobile-summary-card {
  flex: 0 0 auto;
  min-width: 0;
  max-width: 100%;
  background-color: var(--pl-color-background);
  border: 1px solid var(--pl-color-border);
  border-radius: 0.5rem;
  box-shadow: var(--pl-shadow);
}

.pl-mobile-month-picker {
  height: 3.5rem;
  display: grid;
  grid-template-columns: 2.75rem minmax(0, 1fr) 2.75rem;
  align-items: center;
  padding: 0 0.5rem;
}

.pl-mobile-month-picker strong {
  text-align: center;
  color: var(--pl-color-text);
  font-size: 1.05rem;
}

.pl-mobile-month-picker button {
  height: 2.5rem;
  color: var(--pl-color-text-secondary);
  background: transparent;
  border: 0;
  font-size: 1.5rem;
}

.pl-mobile-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.pl-mobile-summary-card {
  min-width: 0;
  padding: 0.9rem;
  background: linear-gradient(135deg, var(--pl-color-background) 0%, var(--summary-bg-color) 100%);
}

.pl-mobile-summary-card.expense,
.pl-mobile-summary-card.average {
  --summary-bg-color: color-mix(in srgb, var(--pl-color-error) 10%, var(--pl-color-background));
  --summary-title-color: var(--pl-color-error);
}

.pl-mobile-summary-card.income,
.pl-mobile-summary-card.budget {
  --summary-bg-color: color-mix(in srgb, var(--pl-color-primary) 10%, var(--pl-color-background));
  --summary-title-color: var(--pl-color-primary);
}

.pl-mobile-summary-card span {
  color: var(--summary-title-color);
  font-size: 0.9rem;
  font-weight: 800;
}

.pl-mobile-summary-card strong {
  display: block;
  margin-top: 0.4rem;
  color: var(--pl-color-text);
  font-size: 1.55rem;
  line-height: 1.05;
}

.pl-mobile-summary-card p {
  margin: 0.45rem 0 0;
  color: var(--pl-color-text-secondary);
  font-size: 0.85rem;
}

.pl-mobile-summary-card b {
  color: var(--pl-color-error);
  font-weight: 700;
}

.pl-mobile-total-card {
  padding: 1rem;
}

.pl-mobile-total-header,
.pl-mobile-total-body,
.pl-mobile-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.pl-mobile-total-header {
  color: var(--pl-color-text);
  font-size: 1rem;
  font-weight: 700;
}

.pl-mobile-unit {
  margin-left: 0.25rem;
  color: var(--pl-color-text-secondary);
  font-size: 0.85rem;
}

.pl-mobile-ghost-button {
  width: 2rem;
  height: 2rem;
  padding: 0;
  color: var(--pl-color-text-secondary);
  background: transparent;
  border: 0;
}

.pl-mobile-ghost-button svg {
  width: 1.1rem;
  height: 1.1rem;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
}

.pl-mobile-total-body {
  margin-top: 0.9rem;
  color: var(--pl-color-text-secondary);
  font-size: 0.95rem;
}

.pl-mobile-total-body strong {
  color: var(--pl-color-text);
  font-size: 2rem;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0;
}

.pl-mobile-account-card {
  overflow: hidden;
}

.pl-mobile-account-card {
  min-height: 8.5rem;
}

.pl-mobile-record-card {
  min-height: 9.5rem;
  overflow: hidden;
  padding-bottom: 0.75rem;
}

.pl-mobile-account-row,
.pl-mobile-record-row {
  width: 100%;
  display: grid;
  align-items: center;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--pl-color-border);
}

.pl-mobile-account-row {
  grid-template-columns: 1.75rem minmax(0, 1fr) 1.5rem;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
}

.pl-mobile-account-row:last-of-type,
.pl-mobile-record-row:last-child {
  border-bottom: 0;
}

.pl-mobile-account-icon {
  width: 1.75rem;
  height: 1.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--pl-color-text);
  background-color: transparent;
  font-size: 1.5rem;
}

.pl-mobile-account-icon :deep(svg),
.pl-mobile-account-icon :deep(.pl-icon-text) {
  width: 1.75rem;
  height: 1.75rem;
}

.pl-mobile-account-list {
  display: grid;
}

.pl-mobile-account-body {
  min-width: 0;
}

.pl-mobile-account-title {
  color: var(--pl-color-text);
  font-size: 1rem;
  font-weight: 700;
}

.pl-mobile-account-amount {
  margin-top: 0.15rem;
  color: var(--pl-color-text);
  font-size: 1rem;
  font-weight: 800;
}

.pl-mobile-account-detail {
  margin-top: 0.2rem;
  overflow: hidden;
  color: var(--pl-color-text-secondary);
  font-size: 0.78rem;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pl-mobile-edit-icon {
  width: 1rem;
  height: 1rem;
  color: var(--pl-color-text-secondary);
  fill: currentColor;
}

.pl-mobile-more-button {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.9rem;
  color: var(--pl-color-text-secondary);
  background-color: var(--pl-color-background);
  border: 0;
  border-top: 1px solid var(--pl-color-border);
  font-size: 0.95rem;
}

.pl-mobile-section-header {
  padding: 1rem 1rem 0;
}

.pl-mobile-section-header h3 {
  margin: 0;
  color: var(--pl-color-text);
  font-size: 1rem;
  font-weight: 800;
}

.pl-mobile-range-tabs {
  color: var(--pl-color-primary);
  font-size: 0.9rem;
  font-weight: 700;
  border-bottom: 2px solid var(--pl-color-primary);
}

.pl-mobile-link {
  color: var(--pl-color-text-secondary);
  font-size: 0.85rem;
  font-weight: 700;
}

.pl-mobile-badge {
  padding: 0.15rem 0.45rem;
  color: var(--pl-color-text-secondary);
  background-color: var(--pl-color-surface);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.pl-mobile-line {
  width: 100%;
  height: 13rem;
  padding: 0.75rem 0.6rem 0.9rem;
  box-sizing: border-box;
}

.pl-mobile-bookkeeping-chart {
  position: relative;
  height: 14rem;
  padding: 0.75rem 1rem 0.5rem;
  overflow: hidden;
}

.pl-mobile-bookkeeping-echart {
  width: 100%;
  height: 100%;
}

.pl-mobile-chart-empty {
  position: absolute;
  inset: 2.75rem 1rem 2.25rem;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.35rem;
  color: var(--pl-color-empty);
  pointer-events: none;
}

.pl-mobile-chart-empty svg {
  width: 3.5rem;
  height: 3.5rem;
  fill: currentColor;
}

.pl-mobile-chart-empty span {
  color: var(--pl-color-text-secondary);
  font-size: 0.85rem;
}

.pl-mobile-category-body {
  display: grid;
  grid-template-columns: minmax(0, 8.5rem) minmax(0, 1fr);
  gap: 1rem;
  align-items: center;
  padding: 1rem;
}

.pl-mobile-donut {
  width: 8.5rem;
  max-width: 100%;
  aspect-ratio: 1;
  border-radius: 999px;
  position: relative;
}

.pl-mobile-donut::after {
  content: "";
  position: absolute;
  inset: 2.15rem;
  background: var(--pl-color-background);
  border-radius: inherit;
}

.pl-mobile-category-list {
  display: grid;
  gap: 0.55rem;
}

.pl-mobile-category-list div {
  display: grid;
  grid-template-columns: 0.7rem minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: center;
  color: var(--pl-color-text-secondary);
  font-size: 0.85rem;
}

.pl-mobile-category-list span {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 0.2rem;
}

.pl-mobile-category-list b {
  overflow: hidden;
  color: var(--pl-color-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pl-mobile-category-list em {
  color: var(--pl-color-text-secondary);
  font-style: normal;
  font-weight: 700;
}

.pl-mobile-category-empty {
  grid-template-columns: 1fr !important;
  color: var(--pl-color-text-secondary);
}

.pl-mobile-card :deep(.pl-compare-main) {
  padding: 0 1rem 1rem;
}

.pl-mobile-card :deep(.pl-plan-main) {
  padding: 0.4rem 1rem 0;
}

.pl-mobile-plan-text {
  padding: 0.55rem 1rem 1rem;
  color: var(--pl-color-text-secondary);
  font-size: 0.85rem;
}

.pl-mobile-record-date {
  padding: 0.75rem 1rem 0.25rem;
  color: var(--pl-color-text);
  font-size: 0.9rem;
  font-weight: 800;
}

.pl-mobile-record-list {
  display: grid;
  padding-bottom: 0.25rem;
}

.pl-mobile-record-row {
  grid-template-columns: 2.2rem minmax(0, 1fr) auto;
  gap: 0.75rem;
  padding: 0.55rem 1rem;
}

.pl-mobile-record-icon {
  width: 2.2rem;
  height: 2.2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--pl-color-surface);
  border-radius: 999px;
}

.pl-mobile-record-icon :deep(svg),
.pl-mobile-record-icon :deep(.pl-icon-text) {
  width: 1.1rem;
  height: 1.1rem;
}

.pl-mobile-record-body {
  min-width: 0;
  display: grid;
  gap: 0.1rem;
}

.pl-mobile-record-body strong,
.pl-mobile-record-body span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pl-mobile-record-body strong {
  color: var(--pl-color-text);
  font-size: 0.88rem;
}

.pl-mobile-record-body span {
  color: var(--pl-color-text-secondary);
  font-size: 0.78rem;
}

.pl-mobile-record-row > b {
  color: var(--pl-color-error);
  font-size: 0.98rem;
}

.pl-mobile-record-row > b.income {
  color: var(--pl-color-success);
}

.pl-mobile-empty {
  min-height: 10rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: center;
  justify-content: center;
  color: var(--pl-color-empty);
}

.pl-mobile-empty svg {
  width: 4rem;
  height: 4rem;
  fill: currentColor;
}

.pl-mobile-empty span {
  color: var(--pl-color-text-secondary);
  font-size: 0.85rem;
}

.pl-mobile-record-empty {
  min-height: 7rem;
}

.pl-mobile-tabbar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  min-width: 0;
  height: 4.5rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  padding: 0.25rem 1rem 0.5rem;
  background-color: color-mix(in srgb, var(--pl-color-background) 96%, transparent);
  border-top: 1px solid var(--pl-color-border);
  box-shadow: var(--pl-shadow);
}

.pl-mobile-tabbar button {
  min-width: 0;
  display: grid;
  justify-items: center;
  gap: 0.15rem;
  color: var(--pl-color-text-secondary);
  background: transparent;
  border: 0;
  font-size: 0.75rem;
  font-weight: 700;
}

.pl-mobile-tabbar button.active {
  color: var(--pl-color-primary);
}

.pl-mobile-tabbar svg {
  width: 1.35rem;
  height: 1.35rem;
  fill: currentColor;
}

.pl-mobile-add-button {
  align-self: start;
}

.pl-mobile-add-button span {
  width: 3rem;
  height: 3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--b3-theme-on-primary, #fff);
  background-color: var(--pl-color-primary);
  border-radius: 999px;
  box-shadow: 0 0.5rem 1.25rem rgba(37, 99, 235, 0.35);
  font-size: 2rem;
  line-height: 1;
}

.pl-mobile-add-button em {
  font-style: normal;
}
</style>
