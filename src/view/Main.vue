<template>
  <div data-theme="emerald" class="double3-main grid grid-cols-3 gap-4 p-4 pt-6">
    <!-- 左侧 -->
    <div class="col-span-1 lg:px-6">
      <!-- 顶部工具栏 -->
      <div class="mb-2 flex items-center justify-between">
        <!-- 功能切换 -->
        <div class="tabs tabs-box tabs-sm w-fit bg-transparent">
          <label class="tab font-bold">
            <input type="radio" name="pl-type" checked />
            <svg class="h-3 w-3 mr-1 stroke-current">
              <use xlink:href="#iconD3DB"></use>
            </svg>
            资产
          </label>

          <label class="tab font-bold">
            <input type="radio" name="pl-type" disabled />
            <svg class="h-3 w-3 mr-1 stroke-current">
              <use xlink:href="#iconD3List"></use>
            </svg>
            记账
          </label>
        </div>

        <!-- 添加按钮 -->
        <button class="btn btn-sm" @click="addLedgerItem">
          <svg class="h-3 w-3 mr-1 stroke-current">
            <use xlink:href="#iconAdd"></use>
          </svg>
          新建
        </button>
      </div>

      <!-- 资产总览 -->
      <div class="card bg-base-100 card-border border-base-300 w-full">
        <div class="stats bg-base-100 w-full overflow-hidden shadow-[0_.1rem_.5rem_-.3rem_#0003]">
          <div class="stat py-2 px-4">
            <div class="font-semibold">总资产</div>
            <div class="stat-value text-2xl text-right leading-none">
              {{ accountTotal }}
            </div>
            <div class="stat-desc flex items-center gap-1">
              <svg class="h-3 w-3 stroke-current">
                <use xlink:href="#iconD3TimeIcon"></use>
              </svg>
              {{ accountDate }}
            </div>
          </div>
        </div>
      </div>
      <!-- 详细列表 -->
      <div class="mt-2">
        <ul class="list bg-base-100">
          <li class="list-row gap-x-3 gap-y-1 items-center px-[6px] py-[10px]" v-for="(acc, index) in latestLedgerList"
            :key="index">
            <div>
              <svg class="h-6 w-6 stroke-current">
                <use :xlink:href="`#${acc.icon}`"></use>
              </svg>
            </div>
            <div>
              <div class="font-semibold">{{ acc.amount.toFixed(2) }}</div>
              <div class="text-xs uppercase opacity-60">{{ acc.name }}</div>
            </div>
            <p class="list-col-wrap text-xs col-start-2 col-end-5">
              {{acc.children?.map(c => `${c.name}:${c.amount ?? 0}`).join(', ')}}
            </p>

            <button class="btn btn-square btn-ghost">
              <svg class="h-4 w-4 stroke-current">
                <use xlink:href="#iconD3EidtIcon"></use>
              </svg>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- 右侧 -->
    <div class="col-span-2">
      <!-- 顶部工具栏 -->
      <div class="mb-2 flex items-center justify-between">
        <div class="tabs tabs-box tabs-sm w-fit bg-transparent">
          <label class="tab font-bold">
            <input type="radio" name="pl-s-type" checked />
            最近记录
          </label>

          <label class="tab font-bold">
            <input type="radio" name="pl-s-type" disabled />
            自定义
          </label>

          <div class="tab-content">
            <form>
              <input class="btn" type="checkbox" name="frameworks" aria-label="Svelte" />
              <input class="btn" type="checkbox" name="frameworks" aria-label="Vue" />
              <input class="btn" type="checkbox" name="frameworks" aria-label="React" />
              <input class="btn btn-square" type="reset" value="×" />
            </form>
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
import { showMessage, IFile } from 'siyuan'
import { ref } from 'vue';
import { config2TableMDHeader, json2TableMDBody, tableMD2json } from '../utils/pl-utils.ts';
import { getFileTreeById, createDoc, getTableBlockByDocId, insertTableBlock, updateBlockContent, blockDocument } from '../api/siyuanApi.ts';
import LedgerEdit from './LedgerEdit.vue';
import { open } from "../utils/dialog-utils.ts"
import currency from "currency.js"
import BIMain from './bi/BIMain.vue';
import Line from './bi/Line.vue';
import Compare from './bi/Compare.vue';
import Plan from './bi/Plan.vue';
import Table from './bi/Table.vue';

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

// 获取页面数据
initData()

// 新增资产记录
const addLedgerItem = () => {
  const ledgerEditDialog = open(LedgerEdit, {
    title: "新增资产记录",
    props: {
      confData: props.settingConfData,
      onUpdate: (item: LedgerItem[]) => {
        saveData(item).then(() => {
          showMessage("保存成功", 3000, "info");
          ledgerEditDialog?.destroy()
        });
      }
    }
  });
}

// 保存
async function saveData(item: LedgerItem[]): Promise<void> {
  // 获取 date
  const yearDate = item[0].time?.split('-')[0];
  // 获取 documentId 下文件列表
  const fileList = await getFileTreeById(props.settingConfData.documentId);
  // 获取 year document id
  let yearDocumentId = '';
  const yearFile = fileList.find((file: any) => file.name === yearDate + '.sy');
  if (yearFile) yearDocumentId = yearFile.id;
  if (!yearDocumentId) {
    yearDocumentId = await createDoc(yearDate ?? '', props.settingConfData.documentId);
  }
  // 获取 year document 下第一个 table block
  let { id: tableBlockId, markdown: tableBlockMarkdown } = await getTableBlockByDocId(yearDocumentId);
  if (!tableBlockId) {
    tableBlockMarkdown = config2TableMDHeader(props.settingConfData.config)
  }
  // 追加新的数据行
  tableBlockMarkdown += "\n" + json2TableMDBody(item)
  if (tableBlockId) {
    // 更新已有 table block
    tableBlockId = await updateBlockContent(tableBlockId, tableBlockMarkdown);
  } else {
    // 插入新的 table block
    tableBlockId = await insertTableBlock(yearDocumentId, tableBlockMarkdown);
  }
  // 锁定文件
  blockDocument(yearDocumentId)
  initData();
}

// 初始化数据
async function initData() {
  // 获取最新的 yearDocId
  const yearDocs = await getYearDocs();
  if (!yearDocs) return;
  const latestYearDoc = yearDocs[0];
  const accountList = await getLedgerListByYearDocId(latestYearDoc.id)
  // 根据 time 字段, 取最新的日期, 和第二新的日期
  let latestDate = "";
  let secondLatestDate = "";
  allTimeSet.value.clear();
  for (const item of accountList) {
    if (!item.time) continue;
    if (item.time > latestDate) {
      latestDate = item.time ?? '';
    }
    if (item.time < latestDate && item.time > secondLatestDate) {
      secondLatestDate = item.time ?? '';
    }
    allTimeSet.value.add(item.time);
  }

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
  console.log(accountList, 'accountList');

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

// 根据文档编号获取全年数据
async function getLedgerListByYearDocId(yearDocId: string): Promise<LedgerItem[]> {
  if (yearDocId) {
    let { markdown: tableBlockMarkdown } = await getTableBlockByDocId(yearDocId);
    const accountList: LedgerItem[] = tableMD2json(tableBlockMarkdown, props.settingConfData.config)
    return accountList;
  } else {
    return [];
  }
}

// 根据年份获取年文件id列表, 降序, 文件名称为 xxxx.sy, 例如 2025.sy
async function getYearDocs(): Promise<IFile[]> {
  function extractYear(file: IFile): number {
    return Number(file.name.replace('.sy', ''));
  }
  const fileList = await getFileTreeById(props.settingConfData.documentId);
  return fileList
    .filter(
      (file): file is IFile =>
        typeof file?.name === 'string' &&
        /^\d{4}\.sy$/.test(file.name)
    )
    .sort((a, b) => extractYear(b) - extractYear(a));
}

</script>

<style lang="css">
.tabs-box> :is(label:has(:checked)) {
  color: #fff;
  background-color: #000000;
}
</style>
