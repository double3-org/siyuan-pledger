<template>
  <div data-theme="emerald" class="double3-main grid grid-cols-3 gap-4 pr-4 pt-6 pb-4">
    <!-- 左侧 -->
    <div class="col-span-1 lg:px-6">
      <Latest :settingConfData="settingConfData" :latestLedgerList="latestLedgerList" :accountTotal="accountTotal"
        :accountDate="accountDate" @initData="initData"></Latest>
    </div>

    <!-- 右侧 -->
    <div class="col-span-2">
      <!-- 顶部工具栏 -->
      <div class="mb-2 items-center justify-between">
        <div class="tabs tabs-box tabs-sm p-0 bg-transparent">
          <label class="tab font-bold">
            <input type="radio" name="pl-s-type" checked value="lastYeat" @change="onTabChange" />
            最近一年
          </label>

          <label class="tab font-bold">
            <input type="radio" name="pl-s-type" value="custom" @change="onTabChange" />
            自定义
          </label>
          <!-- 自定义范围选择 -->
          <div class="tab-content card bg-base-100 card-border border-base-300 w-full mt-2 py-2 px-4">
            <DatePicker class="inline-block" v-model="startDate" placeholder="起始日期" />
            <span class="px-2 font-bold">至</span>
            <DatePicker class="inline-block mr-6" v-model="endDate" placeholder="结束日期" />
            <button class="btn btn-sm bg-[#03C755] text-white border-[#00b544]" @click="search">查询</button>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4 items-start">
        <!-- 走势图 -->
        <BIMain class="h-60">
          <template #title>
            <span>走势</span>
          </template>
          <Line class="h-50 w-full" :lineData="lineData"></Line>
        </BIMain>

        <div class="grid grid-cols-1 gap-4">
          <!-- 分析图 -->
          <BIMain class="h-28">
            <template #title>
              <span>分析</span>
              <span class="badge badge-ghost badge-xs">{{ accountDate }}</span>
            </template>
            <Compare class="w-full" :amountDiff="accountDiff" :rateDiff="rateDiff" :date="secondDate"></Compare>
          </BIMain>

          <!-- 计划图 -->
          <BIMain class="h-28">
            <template #title>
              <span>计划</span>
              <span class="badge badge-ghost badge-xs">{{ accountDate }}</span>
            </template>
            <Plan :blockNm="100" :value="planRate" />
          </BIMain>
        </div>

        <!-- 详情表 -->
        <BIMain class="col-span-2">
          <Table class="w-full" :times="Array.from(allTimeSet)" :data="tableData" :conf="settingConfData.config" />
        </BIMain>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import currency from "currency.js"

import { ref } from 'vue';
import { getYearDocs, getLedgerListByYearDocId } from '@/api/siyuanApi.js';
import { showMessage } from 'siyuan';

import Latest from '@/components/Latest.vue';
import BIMain from '@/components/bi/BIMain.vue';
import Line from '@/components/bi/Line.vue';
import Compare from '@/components/bi/Compare.vue';
import Plan from '@/components/bi/Plan.vue';
import Table from '@/components/bi/Table.vue';
import DatePicker from '@/components/custom/DatePicker.vue';

const props = defineProps<{
  settingConfData: SettingConfig // 配置数据
}>();

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
  // 查询数据，查询到的数据只渲染走势图和表格
  // 获取年份
  const startYear = startDate.value.split("-")[0];
  const endYear = endDate.value.split("-")[0];
  // 获取对应年份的文档
  const yearDocs = await getYearDocs(props.settingConfData.documentId);
  // 将起始和截至的年份变成连续的数组
  const yearDocIds: string[] = [];
  for (let y = Number(startYear); y <= Number(endYear); y++) {
    const yearDoc = yearDocs.find(item => item.name.replace(".sy", "") == String(y));
    if (yearDoc) {
      yearDocIds.push(yearDoc.id);
    }
  }
  // 循环获取数据
  const data: LedgerItem[] = [];
  for (const yearDocId of yearDocIds) {
    const accountList = await getLedgerListByYearDocId(yearDocId, props.settingConfData);
    // 遍历 accountList, 筛选出在日期范围内的数据
    const filteredList = accountList.filter(item => {
      if (!item.time) return false;
      return item.time >= startDate.value && item.time <= endDate.value;
    });
    data.push(...filteredList);
  }

  tableData.value = data;
  allTimeSet.value.clear();
  const timeArr = data
    .map(item => item.time)
    .filter(Boolean) as string[];
  const sortedTimes = [...new Set(timeArr)].sort((a, b) => b.localeCompare(a));
  sortedTimes.forEach(time => allTimeSet.value.add(time));
  // 计算折线图数据
  const map = new Map<string, number>();
  for (const item of data) {
    if (!item.time) continue;
    const prev = map.get(item.time) ?? 0;
    map.set(item.time, prev + item.amount);
  }
  lineData.value = Array.from(map.entries()).map(([time, value]) => ({ time, value }));
  console.log(lineData.value);
}

// 获取页面数据
initData()

// 初始化数据
async function initData() {
  // 获取最新的 yearDocId
  const yearDocs = await getYearDocs(props.settingConfData.documentId);
  if (!yearDocs) return;
  const latestYearDoc = yearDocs[0];
  const accountList = await getLedgerListByYearDocId(latestYearDoc.id, props.settingConfData)
  // 根据 time 字段, 取最新的日期, 和第二新的日期
  allTimeSet.value.clear();
  const timeArr = accountList
    .map(item => item.time)
    .filter(Boolean) as string[];
  const sortedTimes = [...new Set(timeArr)].sort((a, b) => b.localeCompare(a));
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
  // 右侧表格数据
  tableData.value = accountList;
  // 右侧折线图
  const map = new Map<string, number>();
  for (const item of accountList) {
    if (!item.time) continue;
    const prev = map.get(item.time) ?? 0;
    map.set(item.time, prev + item.amount);
  }
  lineData.value = Array.from(map.entries()).map(([time, value]) => ({ time, value }));
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
  planRate.value = sum / (Number(props.settingConfData.planNum) ?? 1000000);
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

<style lang="css">
.tabs-box> :is(label:has(:checked)) {
  color: #fff;
  background-color: #000000;
}
</style>
