<template>
  <div class="pl-pc-main">
    <template v-if="activePage === 'asset'">
      <!-- 左侧 -->
      <div class="pl-pc-main-left">
        <Latest :settingConfData="settingConfData" :latestLedgerList="latestLedgerList" :accountTotal="accountTotal"
          :accountDate="accountDate" :isMobile="false" :activePage="activePage" :canChangePage="true"
          @initData="initData" @changePage="changePage"></Latest>
      </div>

      <!-- 右侧 -->
      <div class="pl-pc-main-right">
        <!-- 顶部工具栏 -->
        <div>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div class="pl-tabs">
              <label>
                <input type="radio" name="pl-s-type" checked value="lastYeat" @change="onTabChange" />
                最近一年
              </label>

              <label>
                <input type="radio" name="pl-s-type" value="custom" @change="onTabChange" />
                自定义
              </label>
            </div>
            <div class="tab-content" style="flex: 1;">
              <!-- 第一个 div 必须有, 占位 -->
              <div></div>
              <div>
                <div class="pl-pc-search">
                  <DatePicker v-model="startDate" placeholder="起始日期" />
                  <span style="font-weight: bold; padding: 0.5rem;">至</span>
                  <DatePicker v-model="endDate" placeholder="结束日期" />
                  <button class="pl-button pl-pc-search-button" @click="search">查询</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 自定义范围选择 -->
          <div class="tab-content card bg-base-100 card-border border-base-300 w-full mt-2 py-2 px-4">
          </div>
        </div>
        <div class="pl-pc-chart">
          <!-- 走势图 -->
          <BIMain style="height: 14rem;">
            <template #title>
              <span>走势</span>
            </template>
            <Line class="pl-pc-line" :lineData="lineData"></Line>
          </BIMain>

          <div>
            <!-- 分析图 -->
            <BIMain style="height: 5.5rem;">
              <template #title>
                <span>分析</span>
                <span class="pl-pc-bi-badge">{{ accountDate }}</span>
              </template>
              <Compare class="w-full" :amountDiff="accountDiff" :rateDiff="rateDiff" :date="secondDate"></Compare>
            </BIMain>

            <!-- 计划图 -->
            <BIMain style="height: 6rem; margin-top: 1rem;">
              <template #title>
                <span>计划</span>
                <span class="pl-pc-bi-badge">{{ accountDate }}</span>
              </template>
              <Plan :blockNm="100" :value="planRate" />
            </BIMain>
          </div>

          <!-- 详情表 -->
          <BIMain style="grid-column: span 2 / span 2;">
            <Table style="width: 100%;" :times="Array.from(allTimeSet)" :data="tableData"
              :conf="settingConfData.config" />
          </BIMain>
        </div>
      </div>
    </template>

    <template v-else>
      <!-- 左侧 -->
      <div class="pl-pc-main-left">
        <BookkeepingLatest :settingConfData="settingConfData" :activePage="activePage" @changePage="changePage"
          @record-saved="refreshBookkeepingStats">
        </BookkeepingLatest>
      </div>

      <!-- 右侧 -->
      <div class="pl-pc-main-right">
        <div>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div class="pl-tabs">
              <label>
                <input type="radio" name="pl-bookkeeping-s-type" value="lastMonth" v-model="bookkeepingRange" />
                最近一月
              </label>

              <label>
                <input type="radio" name="pl-bookkeeping-s-type" value="custom" v-model="bookkeepingRange" />
                自定义
              </label>
            </div>
            <div class="tab-content" style="flex: 1;">
              <div></div>
              <div>
                <div class="pl-pc-search">
                  <DatePicker v-model="bookkeepingStartDate" placeholder="起始日期" />
                  <span style="font-weight: bold; padding: 0.5rem;">至</span>
                  <DatePicker v-model="bookkeepingEndDate" placeholder="结束日期" />
                  <button class="pl-button pl-pc-search-button" @click="searchBookkeeping">查询</button>
                </div>
              </div>
            </div>
          </div>

          <div class="tab-content card bg-base-100 card-border border-base-300 w-full mt-2 py-2 px-4">
          </div>
        </div>

        <div class="pl-bookkeeping-summary">
          <div v-for="item in bookkeepingSummaryCards" :key="item.title" class="pl-bookkeeping-stat-card"
            :class="item.tone">
            <div class="pl-bookkeeping-stat-title">{{ item.title }}</div>
            <div class="pl-bookkeeping-stat-value">{{ item.value }}</div>
            <div class="pl-bookkeeping-stat-footer">
              <span>{{ item.footerLabel }}</span>
              <span :class="item.footerClass">{{ item.footerValue }}</span>
            </div>
          </div>
        </div>

        <div class="pl-pc-chart">
          <BIMain class="pl-bookkeeping-chart-card">
            <template #title>
              <div class="pl-bookkeeping-chart-title">
                <span>收支趋势</span>
                <select v-model="bookkeepingTrendMode" class="pl-bookkeeping-trend-mode">
                  <option value="day">按天</option>
                  <option value="month">按月</option>
                </select>
              </div>
            </template>
            <div class="pl-bookkeeping-trend-card">
              <div ref="bookkeepingTrendChartRef" class="pl-bookkeeping-trend-chart"></div>
              <div v-if="!hasBookkeepingDetailData" class="pl-empty">
                <svg>
                  <use xlink:href="#iconD3Empty"></use>
                </svg>
              </div>
            </div>
          </BIMain>

          <BIMain class="pl-bookkeeping-chart-card">
            <template #title>
              <span>支出占比（按分类）</span>
            </template>
            <div class="pl-bookkeeping-category-card">
              <div ref="bookkeepingCategoryChartRef" class="pl-bookkeeping-category-chart"></div>
              <div v-if="bookkeepingCategoryStats.length === 0" class="pl-empty">
                <svg>
                  <use xlink:href="#iconD3Empty"></use>
                </svg>
              </div>
            </div>
          </BIMain>

          <BIMain style="grid-column: span 2 / span 2; min-height: 16rem;">
            <div class="pl-bookkeeping-detail-table">
              <div v-if="bookkeepingDetailRows.length === 0" class="pl-empty">
                <svg>
                  <use xlink:href="#iconD3Empty"></use>
                </svg>
              </div>
              <table v-else class="table table-xs table-pin-rows table-pin-cols">
                <thead>
                  <tr>
                    <th v-for="(column, columnIndex) in bookkeepingDetailColumns" :key="column" style="padding: 0"
                      :class="{ 'pl-bookkeeping-detail-left pl-bookkeeping-detail-top-left': columnIndex === 0 }">
                      <span>{{ column }}</span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr v-for="(row, rowIndex) in bookkeepingDetailRows" :key="row.date"
                    :class="{ 'bg-gray-100': rowIndex % 2 === 0 }">
                    <th class="pl-bookkeeping-detail-left">{{ row.date }}</th>
                    <td>{{ formatBookkeepingAmount(row.expense) }}</td>
                    <td>{{ formatBookkeepingAmount(row.income) }}</td>
                    <td v-for="(value, valueIndex) in row.categories" :key="`${row.date}-${valueIndex}`">
                      {{ formatBookkeepingAmount(value) }}
                    </td>
                  </tr>
                </tbody>

                <tfoot>
                  <tr>
                    <th class="pl-bookkeeping-detail-left pl-bookkeeping-detail-bottom-left">总计</th>
                    <td v-for="(total, index) in bookkeepingDetailTotals" :key="index">
                      {{ formatBookkeepingAmount(total) }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </BIMain>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import currency from "currency.js"

import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts/core';
import { GraphicComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { LineChart, PieChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { getBookkeepingRecordsByPledge, getCurrentDateTime, getYearDocs, getLedgerListByYearDocId } from '@/api/siyuanApi.js';
import { showMessage } from 'siyuan';

import Latest from '@/components/Latest.vue';
import BookkeepingLatest from '@/components/BookkeepingLatest.vue';
import BIMain from '@/components/bi/BIMain.vue';
import Line from '@/components/bi/Line.vue';
import Compare from '@/components/bi/Compare.vue';
import Plan from '@/components/bi/Plan.vue';
import Table from '@/components/bi/Table.vue';
import DatePicker from '@/components/custom/DatePicker.vue';
import { getRequiredSettingMessage } from '@/utils/pl-utils.js';
import { getPluginThemeColors, observeThemeChange } from '@/utils/theme-utils';

echarts.use([
  GraphicComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  LineChart,
  PieChart,
  CanvasRenderer,
]);

const props = defineProps<{
  settingConfData: SettingConfig // 配置数据
}>();

type BookkeepingTrendMode = "day" | "month";
type BookkeepingRangeMode = "lastMonth" | "custom";
type BookkeepingAppliedRange = {
  mode: BookkeepingRangeMode;
  start: string;
  end: string;
}

const bookkeepingRange = ref<BookkeepingRangeMode>("lastMonth");
const bookkeepingStartDate = ref("");
const bookkeepingEndDate = ref("");
const bookkeepingTrendMode = ref<BookkeepingTrendMode>("day");
const currentSystemDate = ref("");
const bookkeepingAppliedRange = ref<BookkeepingAppliedRange>(createLastMonthBookkeepingRange());
const bookkeepingRecords = ref<BookkeepingRecord[]>([]);
const bookkeepingMonthlyBudget = computed(() => parseBookkeepingAmount(props.settingConfData.bookkeepingMonthlyBudget, 3000));
const bookkeepingMonthStats = computed(() => {
  const currentMonth = getBookkeepingMonthRange(getCurrentSystemDateObj());
  const previousMonth = getBookkeepingMonthRange(new Date(currentMonth.startDate.getFullYear(), currentMonth.startDate.getMonth() - 1, 1));
  const current = calculateBookkeepingMonthStats(currentMonth.start, currentMonth.end, currentMonth.dayCount);
  const previous = calculateBookkeepingMonthStats(previousMonth.start, previousMonth.end, previousMonth.dayCount);

  return {
    current,
    previous,
    budgetRate: bookkeepingMonthlyBudget.value > 0 ? current.expense / bookkeepingMonthlyBudget.value * 100 : 0,
  };
});
const bookkeepingSummaryCards = computed(() => {
  const stats = bookkeepingMonthStats.value;
  const incomeDiff = getBookkeepingDiff(stats.current.income, stats.previous.income);
  const expenseDiff = getBookkeepingDiff(stats.current.expense, stats.previous.expense, true);
  const averageDiff = getBookkeepingDiff(stats.current.averageExpense, stats.previous.averageExpense, true);

  return [
    {
      title: "本月支出",
      value: formatBookkeepingAmount(stats.current.expense),
      footerLabel: "较上月",
      footerValue: expenseDiff.text,
      footerClass: expenseDiff.className,
      tone: "expense",
    },
    {
      title: "预算执行情况(本月)",
      value: `${formatBookkeepingPercent(stats.budgetRate)}%`,
      footerLabel: "预算",
      footerValue: formatBookkeepingAmount(bookkeepingMonthlyBudget.value),
      footerClass: "neutral",
      tone: "budget",
    },
    {
      title: "本月收入",
      value: formatBookkeepingAmount(stats.current.income),
      footerLabel: "较上月",
      footerValue: incomeDiff.text,
      footerClass: incomeDiff.className,
      tone: "income",
    },
    {
      title: "日均支出(本月)",
      value: formatBookkeepingAmount(stats.current.averageExpense),
      footerLabel: "较上月",
      footerValue: averageDiff.text,
      footerClass: averageDiff.className,
      tone: "average",
    },
  ];
});

const bookkeepingTrendData = computed(() => {
  if (!bookkeepingDetailRange.value) {
    return { labels: [], income: [], expense: [], balance: [] };
  }

  const keys = bookkeepingTrendMode.value === "day"
    ? getBookkeepingDateRange(bookkeepingDetailRange.value.start, bookkeepingDetailRange.value.end)
    : getBookkeepingMonthRangeKeys(bookkeepingDetailRange.value.start, bookkeepingDetailRange.value.end);
  const amountMap = new Map<string, { income: number; expense: number }>();

  for (const key of keys) {
    amountMap.set(key, { income: 0, expense: 0 });
  }

  for (const record of bookkeepingDetailRecords.value) {
    const key = bookkeepingTrendMode.value === "day" ? record.date : record.date.slice(0, 7);
    const amount = amountMap.get(key);
    if (!amount) continue;
    amount[record.type] += Math.abs(Number(record.amount) || 0);
  }

  const income = keys.map(key => amountMap.get(key)?.income || 0);
  const expense = keys.map(key => amountMap.get(key)?.expense || 0);

  return {
    labels: keys.map(key => bookkeepingTrendMode.value === "day" ? key.slice(5) : formatBookkeepingTrendMonthLabel(key)),
    income,
    expense,
    balance: keys.map((_, index) => income[index] - expense[index]),
  };
});

type BookkeepingCategoryStat = {
  name: string;
  percent: string;
  amount: number;
  color: string;
}
const bookkeepingCategoryColors = ["#f45b5b", "#5b82f1", "#55b979", "#ffaf1a", "#b9c0ca"];
const bookkeepingCategoryStats = computed<BookkeepingCategoryStat[]>(() => {
  const categoryAmountMap = new Map<string, number>();
  for (const record of bookkeepingDetailRecords.value) {
    if (record.type !== "expense") continue;
    categoryAmountMap.set(record.parentName, (categoryAmountMap.get(record.parentName) || 0) + Math.abs(Number(record.amount) || 0));
  }

  const sortedCategories = Array.from(categoryAmountMap.entries())
    .filter(([, amount]) => amount > 0)
    .sort(([, amountA], [, amountB]) => amountB - amountA);
  const topCategories = sortedCategories.slice(0, 4);
  const otherAmount = sortedCategories.slice(4).reduce((sum, [, amount]) => sum + amount, 0);
  const categoryStats = otherAmount > 0 ? [...topCategories, ["其他", otherAmount] as [string, number]] : topCategories;
  const totalAmount = categoryStats.reduce((sum, [, amount]) => sum + amount, 0);

  return categoryStats.map(([name, amount], index) => ({
    name,
    amount,
    percent: totalAmount > 0 ? `${formatBookkeepingPercent(amount / totalAmount * 100)}%` : "0.0%",
    color: bookkeepingCategoryColors[index] || bookkeepingCategoryColors[bookkeepingCategoryColors.length - 1],
  }));
});
type BookkeepingDetailRow = {
  date: string;
  dateValue: string;
  expense: number;
  income: number;
  categories: number[];
}
const bookkeepingDetailRange = computed(() => {
  return {
    start: bookkeepingAppliedRange.value.start,
    end: bookkeepingAppliedRange.value.end,
  };
});
const bookkeepingDetailRecords = computed(() => {
  if (!bookkeepingDetailRange.value) return [];
  return bookkeepingRecords.value.filter(record => {
    return record.date >= bookkeepingDetailRange.value!.start && record.date <= bookkeepingDetailRange.value!.end;
  });
});
const hasBookkeepingDetailData = computed(() => bookkeepingDetailRecords.value.length > 0);
const bookkeepingDetailCategoryNames = computed(() => {
  const categoryAmountMap = new Map<string, number>();
  for (const record of bookkeepingDetailRecords.value) {
    if (record.type !== "expense") continue;
    categoryAmountMap.set(record.parentName, (categoryAmountMap.get(record.parentName) || 0) + Math.abs(Number(record.amount) || 0));
  }
  return Array.from(categoryAmountMap.entries())
    .filter(([, amount]) => amount > 0)
    .map(([name]) => name);
});
const bookkeepingDetailColumns = computed(() => ["日期", "支出", "收入", ...bookkeepingDetailCategoryNames.value]);
const bookkeepingDetailRows = computed<BookkeepingDetailRow[]>(() => {
  if (!bookkeepingDetailRange.value) return [];

  const rows: BookkeepingDetailRow[] = [];
  for (const date of getBookkeepingDateRange(bookkeepingDetailRange.value.start, bookkeepingDetailRange.value.end).reverse()) {
    const dayRecords = bookkeepingDetailRecords.value.filter(record => record.date === date);
    const expense = sumBookkeepingRecords(dayRecords, "expense");
    const income = sumBookkeepingRecords(dayRecords, "income");
    const categories = bookkeepingDetailCategoryNames.value.map(categoryName => {
      return sumBookkeepingRecords(dayRecords.filter(record => record.parentName === categoryName), "expense");
    });

    if (expense === 0 && income === 0 && categories.every(value => value === 0)) continue;

    rows.push({
      date: formatBookkeepingDetailDate(date),
      dateValue: date,
      expense,
      income,
      categories,
    });
  }

  return rows;
});
const bookkeepingDetailTotals = computed(() => {
  return bookkeepingDetailColumns.value.slice(1).map((_, columnIndex) => {
    return bookkeepingDetailRows.value.reduce((sum, row) => {
      if (columnIndex === 0) return sum + row.expense;
      if (columnIndex === 1) return sum + row.income;
      return sum + row.categories[columnIndex - 2];
    }, 0);
  });
});

const bookkeepingTrendChartRef = ref<HTMLDivElement | null>(null);
const bookkeepingCategoryChartRef = ref<HTMLDivElement | null>(null);
type EChartsInstance = ReturnType<typeof echarts.init>;
let bookkeepingTrendChart: EChartsInstance | null = null;
let bookkeepingCategoryChart: EChartsInstance | null = null;
let bookkeepingChartResizeObserver: ResizeObserver | null = null;
let bookkeepingRenderFrame = 0;
let stopObservingTheme: (() => void) | null = null;
let observedBookkeepingTrendEl: HTMLElement | null = null;
let observedBookkeepingCategoryEl: HTMLElement | null = null;

const activePage = ref<"asset" | "bookkeeping">("bookkeeping");

// 切换资产/记账页面
const changePage = (page: "asset" | "bookkeeping") => {
  activePage.value = page;
}

watch(activePage, async (page) => {
  if (page !== "bookkeeping") {
    disposeBookkeepingCharts();
    return;
  }
  await initBookkeepingSummaryData();
  await nextTick();
  queueRenderBookkeepingCharts();
});

watch(bookkeepingRange, async (range) => {
  if (range === "lastMonth") {
    bookkeepingAppliedRange.value = createLastMonthBookkeepingRange();
    await nextTick();
    queueRenderBookkeepingCharts();
    return;
  }

  bookkeepingStartDate.value = "";
  bookkeepingEndDate.value = "";
});

watch([bookkeepingAppliedRange, bookkeepingTrendMode, bookkeepingRecords], async () => {
  await nextTick();
  queueRenderBookkeepingCharts();
});

onMounted(async () => {
  currentSystemDate.value = (await getCurrentDateTime()).date;
  bookkeepingAppliedRange.value = createLastMonthBookkeepingRange();
  window.addEventListener("resize", queueRenderBookkeepingCharts);
  if (typeof ResizeObserver !== "undefined") {
    bookkeepingChartResizeObserver = new ResizeObserver(queueRenderBookkeepingCharts);
  }
  stopObservingTheme = observeThemeChange(queueRenderBookkeepingCharts);
  if (activePage.value === "bookkeeping") {
    initBookkeepingSummaryData();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", queueRenderBookkeepingCharts);
  stopObservingTheme?.();
  cancelBookkeepingRender();
  disposeBookkeepingCharts();
});

async function initBookkeepingSummaryData(): Promise<void> {
  if (getRequiredSettingMessage(props.settingConfData, "bookkeeping")) {
    bookkeepingRecords.value = [];
    return;
  }

  try {
    bookkeepingRecords.value = await getBookkeepingRecordsByPledge(props.settingConfData.bookkeepingStorageMode);
  } catch (error) {
    console.error("初始化记账统计数据失败", error);
    bookkeepingRecords.value = [];
  }
}

async function refreshBookkeepingStats(): Promise<void> {
  await initBookkeepingSummaryData();
  await nextTick();
  queueRenderBookkeepingCharts();
}

async function searchBookkeeping(): Promise<void> {
  if (bookkeepingRange.value !== "custom") {
    bookkeepingAppliedRange.value = createLastMonthBookkeepingRange();
    await nextTick();
    queueRenderBookkeepingCharts();
    return;
  }

  if (!bookkeepingStartDate.value) {
    showMessage("起始日期不能为空", 2000, "info");
    return;
  }
  if (!bookkeepingEndDate.value) {
    showMessage("结束日期不能为空", 2000, "info");
    return;
  }
  if (bookkeepingStartDate.value > bookkeepingEndDate.value) {
    showMessage("起始日期不能晚于结束日期", 2000, "info");
    return;
  }

  bookkeepingAppliedRange.value = {
    mode: "custom",
    start: bookkeepingStartDate.value,
    end: bookkeepingEndDate.value,
  };
  await nextTick();
  queueRenderBookkeepingCharts();
}

function calculateBookkeepingMonthStats(startDate: string, endDate: string, dayCount: number) {
  const monthRecords = bookkeepingRecords.value.filter(record => record.date >= startDate && record.date <= endDate);
  const income = monthRecords.reduce((sum, record) => {
    if (record.type !== "income") return sum;
    return sum + Math.abs(Number(record.amount) || 0);
  }, 0);
  const expense = monthRecords.reduce((sum, record) => {
    if (record.type !== "expense") return sum;
    return sum + Math.abs(Number(record.amount) || 0);
  }, 0);

  return {
    income,
    expense,
    averageExpense: dayCount > 0 ? expense / dayCount : 0,
  };
}

function getBookkeepingMonthRange(date: Date) {
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const today = getCurrentSystemDateObj();
  const isCurrentMonth = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();

  return {
    startDate,
    start: formatBookkeepingDate(startDate),
    end: formatBookkeepingDate(endDate),
    dayCount: isCurrentMonth ? today.getDate() : endDate.getDate(),
  };
}

function getCurrentSystemDateObj(): Date {
  return currentSystemDate.value ? parseBookkeepingDate(currentSystemDate.value) : new Date();
}

function formatBookkeepingDate(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function createLastMonthBookkeepingRange(): BookkeepingAppliedRange {
  const today = getCurrentSystemDateObj();
  return {
    mode: "lastMonth",
    start: formatBookkeepingDate(addBookkeepingDays(today, -30)),
    end: formatBookkeepingDate(today),
  };
}

function addBookkeepingDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function parseBookkeepingDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getBookkeepingDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let currentDate = parseBookkeepingDate(startDate);
  const finalDate = parseBookkeepingDate(endDate);

  while (currentDate <= finalDate) {
    dates.push(formatBookkeepingDate(currentDate));
    currentDate = addBookkeepingDays(currentDate, 1);
  }

  return dates;
}

function getBookkeepingMonthRangeKeys(startDate: string, endDate: string): string[] {
  const months: string[] = [];
  const start = parseBookkeepingDate(startDate);
  const end = parseBookkeepingDate(endDate);
  let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  const finalMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (currentMonth <= finalMonth) {
    months.push(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`);
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  }

  return months;
}

function formatBookkeepingDetailDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

function formatBookkeepingTrendMonthLabel(month: string): string {
  const [year, monthValue] = month.split("-");
  return `${year}-${monthValue}`;
}

function getBookkeepingTrendAxisInterval(labelCount: number, isCompact: boolean): number {
  const maxLabelCount = isCompact ? 4 : 6;
  if (labelCount <= maxLabelCount) return 0;
  return Math.ceil(labelCount / maxLabelCount) - 1;
}

function sumBookkeepingRecords(records: BookkeepingRecord[], type: BookkeepingRecord["type"]): number {
  return records.reduce((sum, record) => {
    if (record.type !== type) return sum;
    return sum + Math.abs(Number(record.amount) || 0);
  }, 0);
}

function parseBookkeepingAmount(value: string | undefined, fallback = 0): number {
  const normalizedValue = String(value ?? "").replace(/,/g, "").trim();
  if (!normalizedValue) return fallback;

  const amount = Number(normalizedValue);
  return Number.isFinite(amount) ? amount : fallback;
}

function formatBookkeepingPercent(value: number): string {
  return value.toFixed(1);
}

function getBookkeepingDiff(currentValue: number, previousValue: number, lowerIsBetter = false) {
  const rate = previousValue === 0
    ? currentValue === 0 ? 0 : 100
    : (currentValue - previousValue) / Math.abs(previousValue) * 100;
  const isImproved = lowerIsBetter ? rate < 0 : rate > 0;
  const className = rate === 0 ? "neutral" : isImproved ? "up" : "down";
  const arrow = rate >= 0 ? "↗" : "↘";

  return {
    text: rate === 0 ? "0.0%" : `${arrow} ${formatBookkeepingPercent(Math.abs(rate))}%`,
    className,
  };
}

function disposeBookkeepingCharts() {
  bookkeepingChartResizeObserver?.disconnect();
  bookkeepingTrendChart?.dispose();
  bookkeepingCategoryChart?.dispose();
  bookkeepingTrendChart = null;
  bookkeepingCategoryChart = null;
  observedBookkeepingTrendEl = null;
  observedBookkeepingCategoryEl = null;
}

function cancelBookkeepingRender() {
  if (!bookkeepingRenderFrame) return;
  cancelAnimationFrame(bookkeepingRenderFrame);
  bookkeepingRenderFrame = 0;
}

function queueRenderBookkeepingCharts() {
  if (activePage.value !== "bookkeeping") return;
  cancelBookkeepingRender();
  bookkeepingRenderFrame = requestAnimationFrame(() => {
    bookkeepingRenderFrame = 0;
    renderBookkeepingCharts();
  });
}

function renderBookkeepingCharts() {
  renderBookkeepingTrendChart();
  renderBookkeepingCategoryChart();
  observeBookkeepingCharts();
}

function observeBookkeepingCharts() {
  if (!bookkeepingChartResizeObserver) return;

  if (bookkeepingTrendChartRef.value && bookkeepingTrendChartRef.value !== observedBookkeepingTrendEl) {
    observedBookkeepingTrendEl = bookkeepingTrendChartRef.value;
    bookkeepingChartResizeObserver.observe(bookkeepingTrendChartRef.value);
  }

  if (bookkeepingCategoryChartRef.value && bookkeepingCategoryChartRef.value !== observedBookkeepingCategoryEl) {
    observedBookkeepingCategoryEl = bookkeepingCategoryChartRef.value;
    bookkeepingChartResizeObserver.observe(bookkeepingCategoryChartRef.value);
  }
}

function renderBookkeepingTrendChart() {
  if (!bookkeepingTrendChartRef.value) return;
  if (!bookkeepingTrendChart) {
    bookkeepingTrendChart = echarts.init(bookkeepingTrendChartRef.value);
  }

  const trendData = bookkeepingTrendData.value;
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
      left: 0,
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
      left: 28,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: trendData.labels,
      axisLine: { lineStyle: { color: themeColors.border } },
      axisTick: { show: false },
      axisLabel: {
        color: themeColors.textSecondary,
        interval: getBookkeepingTrendAxisInterval(trendData.labels.length, isCompact),
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
        data: trendData.expense,
      },
      {
        name: "收入",
        type: "line",
        smooth: true,
        symbolSize: 7,
        data: trendData.income,
      },
      {
        name: "结余",
        type: "line",
        smooth: true,
        symbolSize: 7,
        areaStyle: {
          color: "rgba(79, 125, 243, 0.11)",
        },
        data: trendData.balance,
      },
    ],
  }, true);
  bookkeepingTrendChart.resize();
}

function renderBookkeepingCategoryChart() {
  if (!bookkeepingCategoryChartRef.value) return;
  if (!bookkeepingCategoryChart) {
    bookkeepingCategoryChart = echarts.init(bookkeepingCategoryChartRef.value);
  }
  const categoryStats = bookkeepingCategoryStats.value;
  const themeColors = getPluginThemeColors();

  const categoryLegend = {
    orient: "vertical",
    left: "58%",
    right: 0,
    top: "center",
    itemWidth: 10,
    itemHeight: 10,
    itemGap: 18,
    formatter: (name: string) => {
      const item = categoryStats.find(category => category.name === name);
      if (!item) return name;
      return `{name|${item.name}}{percent|${item.percent}}`;
    },
    textStyle: {
      color: themeColors.textSecondary,
      rich: {
        name: {
          width: 42,
          color: themeColors.text,
          fontWeight: 600,
        },
        percent: {
          width: 58,
          align: "right",
          color: themeColors.text,
        },
      },
    },
  };

  bookkeepingCategoryChart.setOption({
    color: categoryStats.map(item => item.color),
    tooltip: {
      trigger: "item",
      backgroundColor: themeColors.background,
      borderColor: themeColors.border,
      textStyle: { color: themeColors.text },
    },
    legend: categoryLegend,
    graphic: [],
    series: [
      {
        name: "支出占比",
        type: "pie",
        radius: ["39%", "64%"],
        center: ["28%", "50%"],
        avoidLabelOverlap: true,
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
        data: categoryStats.map(item => ({
          name: item.name,
          value: item.amount,
        })),
      },
    ],
  }, true);
  bookkeepingCategoryChart.resize();
}

function formatBookkeepingAmount(value: number | string): string {
  if (typeof value === "string") return value;
  return currency(value, { symbol: "" }).format();
}

// 资产记录列表 最新记录
const latestLedgerList = ref<LedgerItem[]>([])
// 资产总额 最新记录
const accountTotal = ref<string>("0");
// 日期 最新记录
const accountDate = ref<string>("");

// 折线图数据 最新一年
const lineData = ref<{ time: string; value: number }[]>([]);
// 比较日期 比较数据
const secondDate = ref<string>("");
// 差额 比较数据
const accountDiff = ref<number>(0);
// 差率 比较数据
const rateDiff = ref<number>(0);
// 计划完成率 计划数据
const planRate = ref<number>(0);
// 表格数据
const allTimeSet = ref<Set<string>>(new Set());
const tableData = ref<LedgerItem[]>([]);

// 自定义日期范围
const startDate = ref('');
const endDate = ref('');

const search = async () => {
  // 校验日期是否合法
  if (!startDate.value) {
    showMessage("起始日期不能为空", 2000, "info");
    return;
  }
  if (!endDate.value) {
    showMessage("结束日期不能为空", 2000, "info");
    return;
  }
  if (startDate.value > endDate.value) {
    showMessage("起始日期不能晚于结束日期", 2000, "info");
    return;
  }
  const data = await getAssetLedgerListByDateRange(startDate.value, endDate.value);
  applyAssetRightData(data);
}

// 获取页面数据
initData()

// 初始化数据
async function initData() {
  const today = (await getCurrentDateTime()).dateObj;
  const rangeStartDate = formatBookkeepingDate(addBookkeepingDays(today, -364));
  const rangeEndDate = formatBookkeepingDate(today);
  const accountList = await getAssetLedgerListByDateRange(rangeStartDate, rangeEndDate);
  // 根据 time 字段, 取最新的日期, 和第二新的日期
  allTimeSet.value.clear();
  const timeArr = accountList
    .map(item => item.time)
    .filter(Boolean) as string[];
  const sortedTimes = Array.from(new Set(timeArr)).sort((a, b) => b.localeCompare(a));
  sortedTimes.forEach(time => allTimeSet.value.add(time));
  let latestDate = sortedTimes[0] || "";
  let secondLatestDate = sortedTimes.length > 1 ? sortedTimes[1] || "" : sortedTimes[0];

  // 左侧总览数据赋值
  // 左侧 列表
  latestLedgerList.value = accountList.filter(
    item => item.time === latestDate
  );
  // 左侧 最新日期
  accountDate.value = latestLedgerList.value.length > 0 ? latestLedgerList.value[0].time || '' : '';
  // 左侧 总额
  const sum = latestLedgerList.value.reduce((acc, child) => {
    return currency(acc).add(child.amount || 0).value;
  }, 0);
  accountTotal.value = currency(sum, {
    symbol: "",
  }).format();

  // 右侧图标数据赋值
  applyAssetRightData(accountList);
  // 右侧比较图, 获取上一期数据
  const secondLatestLedgerList: LedgerItem[] = accountList.filter(
    item => item.time === secondLatestDate
  );
  secondDate.value = secondLatestDate;
  // 计算差额 和 差率
  const secondSum = secondLatestLedgerList.reduce((acc, child) => {
    return currency(acc).add(child.amount || 0).value;
  }, 0);
  accountDiff.value = currency(sum).subtract(secondSum).value;
  rateDiff.value = secondSum === 0 ? 0 : currency(accountDiff.value, { precision: 4 }).divide(Math.abs(secondSum)).multiply(100).value;
  // 右侧计划图, 计算计划完成率
  const planTarget = parseBookkeepingAmount(props.settingConfData.planNum, 1000000);
  planRate.value = planTarget > 0 ? sum / planTarget : 0;
}

async function getAssetLedgerListByDateRange(rangeStartDate: string, rangeEndDate: string): Promise<LedgerItem[]> {
  if (getRequiredSettingMessage(props.settingConfData, "asset")) return [];

  const startYear = rangeStartDate.split("-")[0];
  const endYear = rangeEndDate.split("-")[0];
  const yearDocs = await getYearDocs(props.settingConfData.documentId);
  if (!yearDocs) return [];

  const yearDocIds: string[] = [];
  for (let y = Number(startYear); y <= Number(endYear); y++) {
    const yearDoc = yearDocs.find(item => item.name.replace(".sy", "") == String(y));
    if (yearDoc) {
      yearDocIds.push(yearDoc.id);
    }
  }

  const data: LedgerItem[] = [];
  for (const yearDocId of yearDocIds) {
    const accountList = await getLedgerListByYearDocId(yearDocId, props.settingConfData);
    data.push(...accountList.filter(item => {
      if (!item.time) return false;
      return item.time >= rangeStartDate && item.time <= rangeEndDate;
    }));
  }
  return data;
}

function applyAssetRightData(data: LedgerItem[]): void {
  tableData.value = data;
  allTimeSet.value.clear();
  const timeArr = data
    .map(item => item.time)
    .filter(Boolean) as string[];
  const sortedTimes = Array.from(new Set(timeArr)).sort((a, b) => b.localeCompare(a));
  sortedTimes.forEach(time => allTimeSet.value.add(time));

  const map = new Map<string, number>();
  for (const item of data) {
    if (!item.time) continue;
    const prev = map.get(item.time) ?? 0;
    map.set(item.time, prev + item.amount);
  }
  lineData.value = Array.from(map.entries()).map(([time, value]) => ({ time, value }));
}

const onTabChange = (e: any) => {
  const tabValue = e.target.value;
  if (tabValue === 'lastYeat') {
    initData();
  } else if (tabValue === 'custom') {
    startDate.value = '';
    endDate.value = '';
  }
}
</script>

<style scoped lang="css">
.pl-pc-main {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 1rem;
  padding: 1rem 1.5rem;
  color: var(--pl-color-text);
  background-color: var(--pl-color-background);
}

.pl-pc-main-left {
  grid-column: span 2 / span 2;
}

.pl-pc-main-right {
  grid-column: span 5 / span 5;
}

.pl-pc-search {
  display: flex;
  padding-left: 1rem;
  border-left: 1px solid var(--pl-color-border);
}

.pl-button.pl-pc-search-button {
  background-color: var(--pl-color-primary);
  border: 0;
  color: var(--b3-theme-on-primary, #fff);
  margin-left: 1rem;
}

.pl-button.pl-pc-search-button:hover {
  background-color: var(--pl-color-primary);
  border-color: var(--pl-color-primary);
  filter: brightness(0.9);
}

.pl-pc-chart {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.pl-pc-line {
  height: 12rem;
  width: 100%;
}

.pl-pc-bi-badge {
  color: var(--pl-color-text);
  background-color: var(--pl-color-surface);
  width: fit-content;
  justify-content: center;
  align-items: center;
  font-size: .5rem;
  display: inline-flex;
  vertical-align: middle;
  padding: 0.15rem 0.35rem;
  border-radius: .5rem;
  margin-left: 0.5rem;
}

.pl-bookkeeping-panel {
  min-height: 8rem;
}

.pl-bookkeeping-detail-table {
  height: 20rem;
  overflow: auto;
  position: relative;
  background: var(--pl-color-background);
}

.pl-empty {
  position: absolute;
  inset: 0;
  min-height: 10rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--pl-color-empty);
  background: var(--pl-color-background);
}

.pl-empty svg {
  width: 4rem;
  height: 4rem;
  fill: currentColor;
}

.pl-bookkeeping-detail-table table {
  border-collapse: separate;
  border-spacing: 0;
}

.pl-bookkeeping-detail-table th,
.pl-bookkeeping-detail-table td {
  white-space: nowrap;
  text-align: right;
  border-bottom: 1px solid var(--pl-color-border);
}

.pl-bookkeeping-detail-table th {
  font-weight: 600;
  text-align: center;
  background: var(--pl-color-background);
  padding: 0.5rem;
}

.pl-bookkeeping-detail-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--pl-color-background);
}

.pl-bookkeeping-detail-table tfoot td,
.pl-bookkeeping-detail-table tfoot th {
  position: sticky;
  bottom: 0;
  z-index: 1;
  background: var(--pl-color-background);
  font-weight: 600;
  border-top: 1px solid var(--pl-color-border);
}

.pl-bookkeeping-detail-left {
  width: 90px;
  min-width: 90px;
  max-width: 90px;
  position: sticky;
  left: 0;
  z-index: 1;
  text-align: left;
  background: var(--pl-color-background);
}

.pl-bookkeeping-detail-table thead th.pl-bookkeeping-detail-top-left {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 3;
  background: var(--pl-color-background);
}

.pl-bookkeeping-detail-bottom-left {
  bottom: 0;
  z-index: 2;
}

.pl-bookkeeping-detail-table tr.bg-gray-100 td,
.pl-bookkeeping-detail-table tr.bg-gray-100 th {
  background-color: var(--pl-color-surface-light);
}

.pl-bookkeeping-detail-table td {
  padding: 0.4rem 0.5rem;
  font-variant-numeric: tabular-nums;
}

.pl-bookkeeping-detail-table tfoot td {
  color: var(--pl-color-text);
}

.pl-bookkeeping-detail-table thead span {
  margin-bottom: 0.5rem;
  display: block;
}

.pl-bookkeeping-chart-card {
  height: 14rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pl-bookkeeping-chart-card :deep(.card-body) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.pl-bookkeeping-chart-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.pl-bookkeeping-trend-mode {
  height: 1.9rem;
  min-width: 5.5rem;
  padding: 0 0.55rem;
  border: 1px solid var(--pl-color-border);
  border-radius: .4rem;
  background: var(--pl-color-surface);
  color: var(--pl-color-text);
  font-size: .85rem;
  font-weight: 600;
  outline: none;
}

.pl-bookkeeping-trend-mode:focus {
  border-color: var(--pl-color-text-secondary);
}

.pl-bookkeeping-trend-chart {
  width: 100%;
  height: 100%;
}

.pl-bookkeeping-trend-card,
.pl-bookkeeping-category-card {
  position: relative;
  flex: 1;
  min-height: 10rem;
}

.pl-bookkeeping-category-chart {
  width: 100%;
  height: 100%;
}

.pl-bookkeeping-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 0.75rem;
}

.pl-bookkeeping-stat-card {
  padding: 0.75rem;
  border: 1px solid var(--pl-color-border);
  border-radius: 0.5rem;
  background: linear-gradient(135deg, var(--pl-color-background) 0%, var(--stat-bg-color) 100%);
  box-shadow: var(--pl-shadow);
}

.pl-bookkeeping-stat-card.income {
  --stat-bg-color: color-mix(in srgb, var(--pl-color-primary) 10%, var(--pl-color-background));
  --stat-title-color: var(--pl-color-primary);
}

.pl-bookkeeping-stat-card.expense {
  --stat-bg-color: color-mix(in srgb, var(--pl-color-error) 10%, var(--pl-color-background));
  --stat-title-color: var(--pl-color-error);
}

.pl-bookkeeping-stat-card.budget {
  --stat-bg-color: color-mix(in srgb, var(--pl-color-primary) 7%, var(--pl-color-background));
  --stat-title-color: var(--pl-color-text);
}

.pl-bookkeeping-stat-card.average {
  --stat-bg-color: color-mix(in srgb, var(--pl-color-error) 7%, var(--pl-color-background));
  --stat-title-color: var(--pl-color-error);
}

.pl-bookkeeping-stat-title {
  color: var(--stat-title-color);
  font-size: 0.9rem;
  font-weight: 700;
}

.pl-bookkeeping-stat-value {
  margin-top: 0.3rem;
  color: var(--pl-color-text);
  font-size: 1.65rem;
  font-weight: 700;
  line-height: 1.1;
}

.pl-bookkeeping-stat-footer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.3rem;
  color: var(--pl-color-text-secondary);
  font-size: 0.85rem;
}

.pl-bookkeeping-stat-footer .up {
  color: var(--pl-color-success);
}

.pl-bookkeeping-stat-footer .down {
  color: var(--pl-color-error);
}

.pl-bookkeeping-stat-footer .neutral {
  color: var(--pl-color-primary);
}
</style>
