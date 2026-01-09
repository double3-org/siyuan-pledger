<template>
  <div data-theme="emerald" class="double3-main grid grid-cols-3 gap-4 p-4">
    <div class="col-span-3 px-6">
      <!-- <div role="tablist" class="tabs tabs-box ">
        <span role="tab" class="tab">Tab 1</span>
        <span role="tab" class="tab tab-active">Tab 2</span>
        <span role="tab" class="tab">Tab 3</span>
      </div> -->
      <button class="btn" @click="addLedgerItem">add</button>
      <button class="btn" @click="syncItemToAcc">sync</button>
    </div>

    <div class=" col-span-1 px-6">
      <!-- 顶部预览 -->
      <div class="card bg-base-100 card-border border-base-300 w-full">
        <div class="stats bg-base-100 w-full overflow-hidden shadow-[0_.1rem_.5rem_-.3rem_#0003]">
          <div class="stat py-2 px-4">
            <div class="font-semibold">总资产</div>
            <div class="stat-value text-2xl text-right leading-none">
              22,200,00.10
            </div>
            <div class="stat-desc flex items-center gap-1">
              <svg class="h-3 w-3 stroke-current">
                <use xlink:href="#iconD3TimeIcon"></use>
              </svg>
              2025-10-10
            </div>
          </div>
        </div>
      </div>
      <!-- 目标记录 -->
      <!-- 详细列表 -->
      <div class="mt-4">
        <ul class="list bg-base-100">
          <li class="list-row gap-x-3 gap-y-1 items-center" v-for="(acc, index) in accList" :key="index">
            <div>
              <svg class="h-7 w-7 stroke-current">
                <use :xlink:href="`#${acc.icon}`"></use>
              </svg>
            </div>
            <div>
              <div class="font-semibold">{{ acc.amount.toFixed(2) }}</div>
              <div class="text-xs uppercase opacity-60">{{ acc.name }}</div>
            </div>
            <p class="list-col-wrap text-xs col-start-2 col-end-5">
              余额宝:5183, 定期: 1716,基金:13807,券商理财:9677
            </p>
            <button class="btn btn-square btn-ghost">
              <svg class="h-4 w-4 stroke-current">
                <use xlink:href="#iconD3FluIcon"></use>
              </svg>
            </button>
            <button class="btn btn-square btn-ghost">
              <svg class="h-4 w-4 stroke-current">
                <use xlink:href="#iconD3EidtIcon"></use>
              </svg>
            </button>
          </li>
        </ul>
      </div>
    </div>
    <div class="col-span-2">
      <div class="overflow-x-auto">
        <table class="table">
          <!-- head -->
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Job</th>
              <th>Favorite Color</th>
            </tr>
          </thead>
          <tbody>
            <!-- row 1 -->
            <tr v-for="(acc, index) in accList" :key="index">
              <th>{{ acc.name }}</th>
              <td>{{ acc.amount.toFixed(2) }}</td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>



</template>

<script setup lang="ts">
import { showMessage } from 'siyuan'
import { ref } from 'vue';
import { config2TableMDHeader, json2TableMDBody } from '../utils/pl-utils.ts';
import { getFileTreeById, createDoc, getTableBlockByDocId, insertTableBlock, updateBlockContent, blockDocument } from '../api/siyuanApi.ts';
import LedgerEdit from './LedgerEdit.vue';
import { open } from "../utils/dialog-utils.ts"
import { extractTablesArr, extractTablesJson } from '../utils/parse-ast-tuil.ts';

const props = defineProps<{
  settingConfData: SettingConfig // 配置数据
}>();

// // 获取页面数据
// const a = await getFileTreeById(props.settingConfData.documentId)
// console.log(a);

const accList = ref<LedgerItem[]>()

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
  let { id: tableBlockId1, markdown: tableBlockMarkdown1 } = await getTableBlockByDocId(yearDocumentId, 1);
  if (!tableBlockId1) {
    tableBlockMarkdown1 = config2TableMDHeader(props.settingConfData.config, 1)
  }

  // 获取 year document 下第二个 table block
  let { id: tableBlockId2, markdown: tableBlockMarkdown2 } = await getTableBlockByDocId(yearDocumentId, 2);
  // 如果没有 table block, 则需要初始化 tableBlockMarkdown
  if (!tableBlockId2) {
    tableBlockMarkdown2 = config2TableMDHeader(props.settingConfData.config)
  }

  // 追加新的数据行
  tableBlockMarkdown2 += json2TableMDBody(item)
  if (tableBlockId2) {
    // 更新已有 table block
    tableBlockId2 = await updateBlockContent(tableBlockId2, tableBlockMarkdown2);
  } else {
    // 插入新的 table block
    tableBlockId2 = await insertTableBlock(yearDocumentId, tableBlockMarkdown2);
  }
  tableBlockMarkdown1 += json2TableMDBody(item, 1)
  if (tableBlockId1) {
    // 更新已有 table block
    tableBlockId1 = await updateBlockContent(tableBlockId1, tableBlockMarkdown1);
  } else {
    // 插入新的 table block
    tableBlockId1 = await insertTableBlock(yearDocumentId, tableBlockMarkdown1);
  }

  // 锁定文件
  blockDocument(yearDocumentId)
}

// 将 year document 的记录汇总成总数, 存入 document
function syncItemToAcc() {
  // 遍历 dcoument 下的 year document
  // 
  getLatestLedgerItems()
}

async function getLatestLedgerItems() {
  // 获取最新的 yearDocId
  const fileList = await getFileTreeById(props.settingConfData.documentId);

  // 按文件名排序，获取最新的年份文档（假设文件名格式为 YYYY.sy）
  const latestYearDoc = fileList.reduce((latest, file) => {
    if (!file.name.endsWith(".sy")) return latest;
    if (!latest) return file;
    return file.name.localeCompare(latest.name) > 0 ? file : latest;
  }, null as typeof fileList[number] | null);

  const yearDocId = latestYearDoc?.id ?? '';

  if (yearDocId) {
    console.log(yearDocId, "yearDocId");
    // getFirstTableBlockByDocId()
  }
  // // 获取文档内容
  // const docContent = await getDocContentById(yearDocId);
  // if (!docContent) {
  //   console.warn('无法获取文档内容');
  //   return;
  // }

  // // 提取表格数据
  // const tables = extractTablesJson(docContent);
  // if (tables.length === 0) {
  //   console.warn('文档中没有找到表格数据');
  //   return;
  // }

  // // 使用第一个表格的数据
  // const tableData = tables[0];

  // // 将表格数据转换为 LedgerItem 格式
  // const ledgerItems: LedgerItem[] = [];
  // const config = JSON.parse(props.settingConfData.config);
  // const depth = getObjectDepth(config);

  // // 按日期分组数据
  // const dateGroups: Record<string, any[]> = {};
  // tableData.forEach(row => {
  //   const date = row['日期'] || '';
  //   if (!date) return;

  //   if (!dateGroups[date]) {
  //     dateGroups[date] = [];
  //   }
  //   dateGroups[date].push(row);
  // });

  // // 获取最新日期的数据
  // const latestDate = Object.keys(dateGroups).sort((a, b) => b.localeCompare(a))[0];
  // if (!latestDate || !dateGroups[latestDate]) {
  //   console.warn('没有找到有效数据');
  //   return;
  // }

  // // 将最新日期的数据转换为 LedgerItem 结构
  // const latestData = dateGroups[latestDate];
  // const itemMap: Record<string, LedgerItem> = {};

  // latestData.forEach(row => {
  //   const amount = parseFloat(row['金额']) || 0;
  //   if (amount === 0) return;

  //   // 构建类型路径
  //   const typePath: string[] = [];
  //   for (let i = 0; i < depth; i++) {
  //     const typeValue = row[`类型${i + 1}`];
  //     if (typeValue && typeValue.trim()) {
  //       typePath.push(typeValue.trim());
  //     }
  //   }

  //   if (typePath.length === 0) return;

  //   // 构建嵌套结构
  //   let currentLevel = itemMap;
  //   for (let i = 0; i < typePath.length; i++) {
  //     const typeName = typePath[i];
  //     const isLast = i === typePath.length - 1;

  //     if (!currentLevel[typeName]) {
  //       currentLevel[typeName] = {
  //         name: typeName,
  //         amount: 0,
  //         time: latestDate
  //       };
  //     }

  //     if (isLast) {
  //       currentLevel[typeName].amount += amount;
  //     }

  //     if (!currentLevel[typeName].children) {
  //       currentLevel[typeName].children = [];
  //     }

  //     // 转换为数组结构
  //     if (i === typePath.length - 1) {
  //       continue;
  //     }

  //     const nextLevel = currentLevel[typeName].children!;
  //     let found = false;
  //     for (const child of nextLevel) {
  //       if (child.name === typePath[i + 1]) {
  //         currentLevel = child as any;
  //         found = true;
  //         break;
  //       }
  //     }

  //     if (!found) {
  //       // 将在下一次迭代中创建
  //       currentLevel = {} as any;
  //     }
  //   }
  // });

  // // 转换为数组格式并计算汇总
  // function convertToArray(itemMap: Record<string, LedgerItem>): LedgerItem[] {
  //   return Object.values(itemMap).map(item => {
  //     if (item.children && Object.keys(item.children as any).length > 0) {
  //       item.children = convertToArray(item.children as any);
  //     }
  //     return item;
  //   });
  // }

  // const result = convertToArray(itemMap);

  // // 更新 accList 用于显示
  // accList.value = result;

  // return result;
}


// 获取最新资产记录
// function fetchLatestLedgerItems() {
//   getDocContentById(props.settingConfData.documentId).then((content) => {
//     // 解析 content 获取最新的 LedgerItem 列表
//     // 假设 content 是 JSON 格式的字符串
//     console.log(content);

//     try {
//       const ledgerItems: LedgerItem[] = JSON.parse(content);
//       accList.value = ledgerItems;
//     } catch (error) {
//       console.error('解析文档内容失败:', error);
//     }
//   });
// }


</script>

<style lang="css"></style>
