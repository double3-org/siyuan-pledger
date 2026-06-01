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
  openLedgerEditDialog("新增资产记录");
}

// 编辑资产记录
const editLedgerItem = (acc: LedgerItem) => {
  openLedgerEditDialog("修改资产记录", acc);
}

const openLedgerEditDialog = (title: string, ledgerData?: LedgerItem) => {
  const originalLedgerData = ledgerData ? cloneLedgerItem(ledgerData) : undefined;
  const ledgerEditDialog = alert(LedgerEdit, {
    title,
    isMobile: props.isMobile,
    props: {
      confData: props.settingConfData,
      isMobile: props.isMobile,
      ledgerData: ledgerData ? [cloneLedgerItem(ledgerData)] : undefined,
      onUpdate: (item: LedgerItem[]) => {
        saveData(item, originalLedgerData).then(() => {
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
async function saveData(item: LedgerItem[], originLedgerData?: LedgerItem): Promise<void> {
  const nextLedgerData = cloneLedgerItem(item[0]);
  const nextYear = nextLedgerData.time?.split('-')[0];
  if (!nextYear) return;

  if (!originLedgerData) {
    await appendLedgerData(nextYear, nextLedgerData);
    return;
  }

  const originYear = originLedgerData.time?.split('-')[0];
  if (!originYear) return;

  if (originYear === nextYear) {
    await replaceLedgerData(nextYear, originLedgerData, nextLedgerData);
    return;
  }

  await removeLedgerData(originYear, originLedgerData);
  await appendLedgerData(nextYear, nextLedgerData);
}

async function appendLedgerData(year: string, ledgerData: LedgerItem): Promise<void> {
  const { yearDocumentId, tableBlockId, tableBlockMarkdown } = await getYearTableState(year);
  const rowMarkdown = json2TableMDBody([ledgerData]);
  const baseMarkdown = tableBlockId && tableBlockMarkdown
    ? tableBlockMarkdown.trimEnd()
    : config2TableMDHeader(props.settingConfData.config);
  const nextTableMarkdown = `${baseMarkdown}\n${rowMarkdown}`;
  if (tableBlockId) {
    await updateBlockContent(tableBlockId, nextTableMarkdown);
  } else {
    await insertTableBlock(yearDocumentId, nextTableMarkdown);
  }
  await blockDocument(yearDocumentId)
}

async function replaceLedgerData(
  year: string,
  originLedgerData: LedgerItem,
  ledgerData: LedgerItem
): Promise<void> {
  const { yearDocumentId, tableBlockId, tableBlockMarkdown } = await getYearTableState(year);
  if (!tableBlockId) {
    await appendLedgerData(year, ledgerData);
    return;
  }
  const nextTableMarkdown = replaceLedgerRows(tableBlockMarkdown, originLedgerData, ledgerData);
  await updateBlockContent(tableBlockId, nextTableMarkdown);
  await blockDocument(yearDocumentId)
}

async function removeLedgerData(year: string, originLedgerData: LedgerItem): Promise<void> {
  const { yearDocumentId, tableBlockId, tableBlockMarkdown } = await getYearTableState(year);
  if (!tableBlockId) {
    return;
  }
  const nextTableMarkdown = replaceLedgerRows(tableBlockMarkdown, originLedgerData);
  await updateBlockContent(tableBlockId, nextTableMarkdown);
  await blockDocument(yearDocumentId)
}

async function getYearTableState(year: string): Promise<{ yearDocumentId: string; tableBlockId: string; tableBlockMarkdown: string }> {
  const fileList = await getFileTreeById(props.settingConfData.documentId);
  let yearDocumentId = '';
  const yearFile = fileList.find((file: any) => file.name === year + '.sy' || file.name === year);
  if (yearFile) yearDocumentId = yearFile.id;
  if (!yearDocumentId) {
    yearDocumentId = await createDoc(year, props.settingConfData.documentId);
  }
  const { id: tableBlockId, markdown: tableBlockMarkdown } = await getTableBlockByDocId(yearDocumentId);
  return { yearDocumentId, tableBlockId, tableBlockMarkdown };
}

function cloneLedgerItem(item: LedgerItem): LedgerItem {
  return JSON.parse(JSON.stringify(item));
}

function replaceLedgerRows(tableMarkdown: string, originLedgerData: LedgerItem, nextLedgerData?: LedgerItem): string {
  const tableLines = tableMarkdown
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith('|') && line.endsWith('|'));

  if (tableLines.length < 2) {
    return nextLedgerData
      ? `${config2TableMDHeader(props.settingConfData.config)}\n${json2TableMDBody([nextLedgerData])}`
      : config2TableMDHeader(props.settingConfData.config);
  }

  const headerLines = tableLines.slice(0, 2);
  const bodyLines = tableLines.slice(2);
  const isTargetRow = (line: string) => {
    const cols = splitTableRow(line);
    return cols[0] === (originLedgerData.time || '') && cols[1] === originLedgerData.name;
  };

  const matchedIndex = bodyLines.findIndex(isTargetRow);
  const beforeLines = matchedIndex >= 0 ? bodyLines.slice(0, matchedIndex) : bodyLines;
  const afterLines = matchedIndex >= 0 ? bodyLines.slice(matchedIndex).filter((line) => !isTargetRow(line)) : [];
  const nextRows = nextLedgerData ? json2TableMDBody([nextLedgerData]).split('\n').filter(Boolean) : [];

  return [...headerLines, ...beforeLines, ...nextRows, ...afterLines].join('\n');
}

function splitTableRow(line: string): string[] {
  return line
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
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
