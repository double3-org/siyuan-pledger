<template>
  <Latest class="m-2" :settingConfData="settingConfData" :latestLedgerList="latestLedgerList" :accountTotal="accountTotal"
    :accountDate="accountDate" @initData="initData"></Latest>
</template>

<script setup lang="ts">
import currency from "currency.js"
import { ref } from 'vue';
import { getYearDocs, getLedgerListByYearDocId } from '@/api/siyuanApi.js';
import Latest from '@/components/Latest.vue';

const props = defineProps<{
  settingConfData: SettingConfig // 配置数据
}>();

// 资产记录列表 最新记录
const latestLedgerList = ref<LedgerItem[]>([])
// 资产总额 最新记录
const accountTotal = ref<string>("0");
// 日期 最新记录
const accountDate = ref<string>("");
const allTimeSet = ref<Set<string>>(new Set());

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
}

</script>

<style lang="css"></style>
