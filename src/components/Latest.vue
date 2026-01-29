<!-- 最新数据的展示组件，用于移动端首页和PC端左侧资产展示 -->
<template>
  <div class="grid">
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
        <div class="stat py-2 px-4 w-auto">
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
</template>

<script setup lang="ts">
import { showMessage } from 'siyuan'
import { config2TableMDHeader, json2TableMDBody } from '../utils/pl-utils.js';
import { getFileTreeById, createDoc, getTableBlockByDocId, insertTableBlock, updateBlockContent, blockDocument } from '../api/siyuanApi.js';
const emit = defineEmits<{
  (e: "initData"): void
}>()

import LedgerEdit from './LedgerEdit.vue';
import { alert } from "../utils/dialog-utils.js"

const props = defineProps<{
  settingConfData: SettingConfig, // 配置数据
  accountDate: string, // 账户日期
  latestLedgerList: LedgerItem[], // 最新资产列表
  accountTotal: string // 资产总额
}>();

// 新增资产记录
const addLedgerItem = () => {
  const ledgerEditDialog = alert(LedgerEdit, {
    title: "新增资产记录",
    props: {
      confData: props.settingConfData,
      onUpdate: (item: LedgerItem[]) => {
        saveData(item).then(() => {
          showMessage("保存成功", 3000, "info");
          ledgerEditDialog?.destroy()
          setTimeout(() => {
            emit("initData");
          }, 500);
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
}

</script>

<style lang="css">
.tabs-box> :is(label:has(:checked)) {
  color: #fff;
  background-color: #000000;
}
</style>
