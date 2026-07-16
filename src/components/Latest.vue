<!-- 最新数据的展示组件，用于移动端首页和PC端左侧资产展示 -->
<template>
  <div class="pl-latest-main">
    <!-- 顶部工具栏 -->
    <div class="pl-latest-top">
      <!-- 功能切换 -->
      <div class="pl-tabs">
        <label>
          <input type="radio" name="pl-type" :checked="activePage === 'bookkeeping'" :disabled="!canChangePage"
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
        {{ latestLedgerList.length > 0 ? accountTotal : '--' }}
      </div>
      <div class="pl-card-footer">
        <svg>
          <use xlink:href="#iconD3TimeIcon"></use>
        </svg>
        {{ accountDate || '--' }}
      </div>
    </div>

    <!-- 详细列表 -->
    <div class="pl-latest-list">
      <div v-if="latestLedgerList.length === 0" class="pl-empty">
        <svg>
          <use xlink:href="#iconD3Empty"></use>
        </svg>
      </div>
      <ul v-else>
        <li v-for="(acc, index) in latestLedgerList" :key="index">
          <IconDisplay class="pl-latest-list-icon" :icon="acc.icon" fallback="iconD3List" />
          <div>
            <div class="pl-latest-list-text1">{{ acc.amount.toFixed(2) }}</div>
            <div class="pl-card-footer">{{ acc.name }}</div>
            <div class="pl-latest-list-text2">
              {{acc.children?.map(c => `${c.name}:${c.amount ?? 0}`).join(', ')}}
            </div>
          </div>
          <button @click="editLedgerItem(acc)">
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
import { config2TableMDHeader, json2TableMDBody, deepClone } from '../utils/pl-utils.js';
import { getFileTreeById, createDoc, getTableBlockByDocId, insertTableBlock, updateBlockContent, blockDocument } from '../api/siyuanApi';
const emit = defineEmits<{
  (e: "initData"): void,
  (e: "changePage", value: "asset" | "bookkeeping"): void
}>()

import LedgerEdit from './LedgerEdit.vue';
import { alert } from "../utils/dialog-utils.js"
import IconDisplay from "@/components/custom/IconDisplay.vue";

const props = defineProps<{
  settingConfData: SettingConfig, // 配置数据
  accountDate: string, // 账户日期
  latestLedgerList: LedgerItem[], // 最新资产列表
  accountTotal: string, // 资产总额
  isMobile?: boolean, // 是否为移动端
  activePage?: "asset" | "bookkeeping", // 当前页面
  canChangePage?: boolean // 是否启用页面切换
}>();

const activePage = props.activePage ?? "asset";
const canChangePage = props.canChangePage ?? false;

// 切换资产/记账页面
const changePage = (page: "asset" | "bookkeeping") => {
  if (!canChangePage) return;
  emit("changePage", page);
}

// 新增资产记录
const addLedgerItem = () => {
  openLedgerEditDialog("新增资产记录");
}

// 编辑资产记录
const editLedgerItem = (acc: LedgerItem) => {
  openLedgerEditDialog("修改资产记录", acc);
}

// 打开编辑弹窗
const openLedgerEditDialog = (title: string, ledgerData?: LedgerItem) => {
  const originalLedgerData = ledgerData ? deepClone(ledgerData) : undefined;
  const ledgerEditDialog = alert(LedgerEdit, {
    title,
    isMobile: props.isMobile,
    props: {
      confData: props.settingConfData,
      isMobile: props.isMobile,
      ledgerData: ledgerData ? [deepClone(ledgerData)] : undefined,
      onUpdate: (item: LedgerItem[]) => {
        editData(item, originalLedgerData).then(() => {
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

/**
 * 编辑资产记录
 * 如果 originLedgerData 不存在，说明是新增资产记录
 * 如果 originLedgerData 存在，说明是修改资产记录
 */
async function editData(item: LedgerItem[], originLedgerData?: LedgerItem): Promise<void> {
  const yearDate = item[0].time?.split('-')[0];
  if (!yearDate) return;

  // 没有原始数据，说明是新增资产记录，直接保存
  if (!originLedgerData) {
    await saveData(yearDate, item);
    return;
  }

  const editLedgerData = deepClone(item[0]);
  const originYear = originLedgerData.time?.split('-')[0];
  if (!originYear) return;

  // 如果年份相同，说明是修改资产记录，直接替换
  // 如果年份不同，未知异常，不处理
  if (originYear === yearDate) {
    await replaceLedgerData(yearDate, originLedgerData, editLedgerData);
    return;
  }
}

// 保存
async function saveData(yearDate: string, item: LedgerItem[]): Promise<void> {
  const itemCopy = deepClone(item);
  // 获取 documentId 下文件列表
  const fileList = await getFileTreeById(props.settingConfData.documentId);
  // 获取 year document id
  let yearDocumentId = '';
  const yearFile = fileList.find((file: any) => file.name === yearDate + '.sy' || file.name === yearDate);
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
  tableBlockMarkdown += "\n" + json2TableMDBody(itemCopy)
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

// 修改
async function replaceLedgerData(year: string, originLedgerData: LedgerItem, ledgerData: LedgerItem): Promise<void> {
  // 获取年份文档状态
  const fileList = await getFileTreeById(props.settingConfData.documentId);
  let yearDocumentId = '';
  const yearFile = fileList.find((file: any) => file.name === year + '.sy' || file.name === year);
  if (yearFile) yearDocumentId = yearFile.id;
  if (!yearDocumentId) {
    yearDocumentId = await createDoc(year, props.settingConfData.documentId);
  }
  const { id: tableBlockId, markdown: tableBlockMarkdown } = await getTableBlockByDocId(yearDocumentId);

  // 替换表格行数据
  const tableLines = tableBlockMarkdown
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith('|') && line.endsWith('|'));

  let nextTableMarkdown: string;
  if (tableLines.length < 2) {
    nextTableMarkdown = `${config2TableMDHeader(props.settingConfData.config)}\n${json2TableMDBody([ledgerData])}`;
  } else {
    const headerLines = tableLines.slice(0, 2);
    const bodyLines = tableLines.slice(2);
    
    // 分割表格行
    const splitTableRow = (line: string): string[] => {
      return line.slice(1, -1).split('|').map((cell) => cell.trim());
    };
    
    // 判断是否为目标行
    const isTargetRow = (line: string) => {
      const cols = splitTableRow(line);
      return cols[0] === (originLedgerData.time || '') && cols[1] === originLedgerData.name;
    };

    const matchedIndex = bodyLines.findIndex(isTargetRow);
    const beforeLines = matchedIndex >= 0 ? bodyLines.slice(0, matchedIndex) : bodyLines;
    const afterLines = matchedIndex >= 0 ? bodyLines.slice(matchedIndex).filter((line) => !isTargetRow(line)) : [];
    const nextRows = json2TableMDBody([ledgerData]).split('\n').filter(Boolean);

    nextTableMarkdown = [...headerLines, ...beforeLines, ...nextRows, ...afterLines].join('\n');
  }

  await updateBlockContent(tableBlockId, nextTableMarkdown);
  await blockDocument(yearDocumentId);
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

.pl-latest-list {
  overflow-y: auto;
  overflow-x: hidden;
  max-height: 624px;
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

.pl-latest-list-icon {
  height: 1.75rem;
  width: 1.75rem;
  padding-top: 0.25rem;
  font-size: 1.5rem;
}

.pl-latest-list li {
  word-break: break-word;
  grid-auto-flow: column;
  grid-template-columns: minmax(0, auto) 1fr;
  gap: 1rem;
  margin: 0 0.6rem 1rem;
  padding-bottom: 0.5rem;
  display: grid;
  border-bottom: 1px solid var(--pl-color-border);
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
  background-color: var(--pl-color-surface);
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
