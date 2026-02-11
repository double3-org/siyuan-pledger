<!-- 最新数据的展示组件，用于移动端首页和PC端左侧资产展示 -->
<template>
  <div class="pl-latest-main">
    <!-- 顶部工具栏 -->
    <div class="pl-latest-top">
      <!-- 功能切换 -->
      <div class="pl-tabs">
        <label>
          <input type="radio" name="pl-type" checked />
          <svg>
            <use xlink:href="#iconD3DB"></use>
          </svg>
          资产
        </label>

        <label>
          <input type="radio" name="pl-type" disabled />
          <svg>
            <use xlink:href="#iconD3List"></use>
          </svg>
          记账
        </label>
      </div>

      <!-- 添加按钮, 靠右 -->
      <button class="pl-button" style="margin-left: auto;" @click="addLedgerItem">
        <svg>
          <use xlink:href="#iconAdd"></use>
        </svg>
        新建
      </button>
    </div>

    <!-- 资产总览 -->
    <div class="pl-card">
      <div class="pl-card-title">总资产</div>
      <div class="pl-card-content">
        {{ accountTotal }}
      </div>
      <div class="pl-card-footer">
        <svg>
          <use xlink:href="#iconD3TimeIcon"></use>
        </svg>
        {{ accountDate }}
      </div>
    </div>

    <!-- 详细列表 -->
    <div class="pl-latest-list">
      <ul>
        <li v-for="(acc, index) in latestLedgerList" :key="index">
          <svg>
            <use :xlink:href="`#${acc.icon}`"></use>
          </svg>
          <div>
            <div class="pl-latest-list-text1">{{ acc.amount.toFixed(2) }}</div>
            <div class="pl-card-footer">{{ acc.name }}</div>
            <div class="pl-latest-list-text2">
              {{acc.children?.map(c => `${c.name}:${c.amount ?? 0}`).join(', ')}}
            </div>
          </div>
          <button>
            <svg>
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
  accountTotal: string, // 资产总额
  isMobile?: boolean // 是否为移动端
}>();

// 新增资产记录
const addLedgerItem = () => {
  const ledgerEditDialog = alert(LedgerEdit, {
    title: "新增资产记录",
    isMobile: props.isMobile,
    props: {
      confData: props.settingConfData,
      isMobile: props.isMobile,
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

<style scoped lang="css">
.pl-latest-main {
  display: grid;
  gap: 0.75rem;
}

.pl-latest-top {
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

.pl-latest-list {
  overflow-y: auto;
  overflow-x: hidden;
  max-height: 624px;
}

.pl-latest-list svg {
  height: 1.75rem;
  width: 1.75rem;
  padding-top: 0.25rem;
}

.pl-latest-list li {
  word-break: break-word;
  grid-auto-flow: column;
  grid-template-columns: minmax(0, auto) 1fr;
  gap: 1rem;
  margin: 0 1rem 1rem;
  padding-bottom: 0.5rem;
  display: grid;
  border-bottom: 1px solid #e5e7eb;
}

.pl-latest-list button {
  height: 2rem;
  width: 2rem;
  border: none;
  background-color: transparent;
  border-radius: 0.25rem;
}

.pl-latest-list button:hover {
  border: none;
  background-color: #e5e7eb;
}

.pl-latest-list button svg {
  height: 1rem;
  width: 1rem;
}

.pl-latest-list-text1 {
  font-weight: bold;
  margin-bottom: 0.25rem;
  font-size: 1rem;
}

.pl-latest-list-text2 {
  font-size: 0.75rem;
  margin-top: 0.25rem;
}
</style>
