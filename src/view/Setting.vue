<template>
  <div class="pl-setting-main">
    <div class="pl-setting-body">
      <nav class="pl-setting-sidebar">
        <button :class="{ active: activeSettingSection === 'asset' }" @click="activeSettingSection = 'asset'">
          资产配置
        </button>
        <button :class="{ active: activeSettingSection === 'bookkeeping' }" @click="activeSettingSection = 'bookkeeping'">
          记账配置
        </button>
        <button :class="{ active: activeSettingSection === 'icon' }" @click="activeSettingSection = 'icon'">
          图标配置
        </button>
      </nav>

      <div v-if="activeSettingSection === 'asset'" class="pl-setting-panel">
        <div class="pl-setting-row">
          <label>
            数据存放位置
            <p>请复制文档id到此处, 请不要频繁调整该配置</p>
          </label>
          <input type="text" v-model="localSetting.documentId" placeholder="文档id" class="pl-form-input" />
        </div>

        <div class="pl-setting-row">
          <label>
            目标金额
            <p>请填写目标金额，默认100W</p>
          </label>
          <input type="text" v-model="localSetting.planNum" placeholder="目标金额" class="pl-form-input" />
        </div>

        <div class="pl-setting-row pl-setting-row-top">
          <label>
            配置
            <p>请按照如下格式填入配置</p>
            <pre class="overflow-x-auto">
<code>[{
  "name": "支付宝",
  "icon": "iconAlipayIcon", // or "💵"
  "children": [
    { "name": "余额宝" },
    { "name": "定期" }
  ]
}]</code></pre>
          </label>
          <textarea v-model="localSetting.config" type="text" placeholder="请填入配置" class="pl-form-textarea" />
        </div>
      </div>

      <div v-if="activeSettingSection === 'bookkeeping'" class="pl-setting-panel">
        <div class="pl-setting-row">
          <label>
            数据存放位置
            <p>集中存放请填写文档 ID；按日期存放请填写笔记本 ID</p>
          </label>
          <input type="text" v-model="localSetting.bookkeepingDocumentId" placeholder="记账数据存放位置" class="pl-form-input" />
        </div>

        <div class="pl-setting-row">
          <label>
            存放方式
            <p>请选择记账数据的存放方式
              <br />
              <span class="pl-setting-help">- 集中存放: 记账数据将按 yyyy-MM 格式存放于指定文档中</span>
              <br />
              <span class="pl-setting-help">- 按日期存放: 会按日记配置按天存放记账数据</span>
            </p>
          </label>
          <select v-model="localSetting.bookkeepingStorageMode" class="pl-form-input">
            <option value="central">集中存放</option>
            <option value="date">按日期存放</option>
          </select>
        </div>

        <div class="pl-setting-row">
          <label>
            每月预算
            <p>用于后续记账统计，默认 3000 每月</p>
          </label>
          <input type="text" v-model="localSetting.bookkeepingMonthlyBudget" placeholder="每月预算" class="pl-form-input" />
        </div>

        <div class="pl-setting-row pl-setting-row-top">
          <label>
            标签配置
            <pre class="overflow-x-auto"><code>[{
  "name": "餐饮",
  "icon": "🍔",
  "children": [
    { "name": "早餐" },
    { "name": "午餐" },
    { "name": "晚餐" },
    { "name": "零食" },
    { "name": "其他" }
  ]
}]</code></pre>
          </label>
          <textarea v-model="localSetting.bookkeepingConfig" type="text" placeholder="请填入记账配置" class="pl-form-textarea" />
        </div>
      </div>

      <div v-if="activeSettingSection === 'icon'" class="pl-setting-panel">
        <div class="pl-setting-row pl-setting-row-top">
          <label>
            新增图标
            <p>粘贴完整的 symbol 标签，系统会自动解析图标名称和预览</p>
          </label>
          <div class="pl-icon-editor">
            <textarea v-model="newIconSymbol" type="text" placeholder="<symbol id=&quot;iconExample&quot; viewBox=&quot;0 0 1024 1024&quot;>...</symbol>" class="pl-form-textarea" />
            <div class="pl-icon-editor-footer">
              <div v-if="parsedIcon" class="pl-icon-preview-card">
                <span class="pl-icon-preview" v-html="getIconPreview(parsedIcon.symbol)"></span>
                <code>{{ parsedIcon.name }}</code>
              </div>
              <span v-else-if="newIconSymbol" class="pl-icon-error">{{ iconError }}</span>
              <button class="pl-button" :disabled="!parsedIcon" @click="addIcon">添加图标</button>
            </div>
          </div>
        </div>

        <div class="pl-setting-row pl-setting-row-top">
          <label>
            已有图标
            <p>用户维护的图标</p>
          </label>
          <div class="pl-icon-list">
            <div v-if="!iconList.length" class="pl-icon-empty">暂无自定义图标</div>
            <div v-for="item in iconList" :key="item.name" class="pl-icon-item">
              <span class="pl-icon-preview" v-html="getIconPreview(item.symbol)"></span>
              <div class="pl-icon-info">
                <strong>{{ item.name }}</strong>
                <p>{{ getSymbolViewBox(item.symbol) }}</p>
              </div>
              <button class="pl-button" @click="removeIcon(item.name)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="pl-setting-footer">
      <button class="pl-button" @click="closeSetting">取消</button>
      <button class="pl-button pl-setting-primary-button" @click="saveSettingData">保存</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { defaultIconSymbols } from '@/config/defaultIcons';
import { sanitizeSvgSymbol } from '@/utils/pl-utils';

const props = defineProps<{
  // 关闭设置面板
  closeSetting: () => void,
  // 保存设置
  saveSetting: (settingData: SettingConfig) => void,
  settingConfData: SettingConfig
}>();

const defaultIconNames = new Set(defaultIconSymbols.map(getSymbolName).filter(Boolean));

// 初始化本地设置数据
const localSetting = ref<SettingConfig>({
  bookkeepingDocumentId: "",
  bookkeepingStorageMode: "",
  bookkeepingMonthlyBudget: "3000",
  bookkeepingConfig: "",
  iconConfig: "[]",
  ...props.settingConfData
});
const activeSettingSection = ref<"asset" | "bookkeeping" | "icon">("asset");
const iconList = ref<IconConfigItem[]>(parseIconConfig(localSetting.value.iconConfig));
const newIconSymbol = ref("");
const parsedIcon = computed(() => parseIconSymbol(newIconSymbol.value));
const iconError = computed(() => {
  if (!newIconSymbol.value.trim()) return "";
  if (!newIconSymbol.value.includes("<symbol")) return "请粘贴完整的 symbol 标签";
  if (!getSymbolName(newIconSymbol.value)) return "没有解析到 symbol 的 id";
  if (!getSymbolName(newIconSymbol.value).startsWith("icon")) return "图标 id 需要以 icon 开头";
  if (defaultIconNames.has(getSymbolName(newIconSymbol.value))) return "该图标是内置默认图标，不需要重复维护";
  return "图标内容无法解析";
});

// 保存设置数据
const saveSettingData = () => {
  syncIconConfig();
  props.saveSetting(localSetting.value);
};

function addIcon() {
  if (!parsedIcon.value) return;

  const icon = parsedIcon.value;
  const index = iconList.value.findIndex(item => item.name === icon.name);
  if (index >= 0) {
    iconList.value[index] = icon;
  } else {
    iconList.value.push(icon);
  }
  syncIconConfig();
  newIconSymbol.value = "";
}

function removeIcon(name: string) {
  iconList.value = iconList.value.filter(item => item.name !== name);
  syncIconConfig();
}

function syncIconConfig() {
  localSetting.value.iconConfig = JSON.stringify(iconList.value, null, 2);
}

function parseIconConfig(iconConfig: string): IconConfigItem[] {
  try {
    const data = JSON.parse(iconConfig || "[]");
    if (!Array.isArray(data)) return [];

    return data
      .map((item: IconConfigItem) => parseIconSymbol(item?.symbol || ""))
      .filter((item: IconConfigItem | undefined): item is IconConfigItem => !!item);
  } catch (error) {
    console.error("图标配置解析失败，用户自定义图标将显示为空", error);
    return [];
  }
}

function parseIconSymbol(symbol: string): IconConfigItem | undefined {
  const symbolText = sanitizeSvgSymbol(symbol);
  const name = getSymbolName(symbolText);
  if (!symbolText || !name || !name.startsWith("icon") || defaultIconNames.has(name)) return undefined;

  return {
    name,
    symbol: symbolText,
  };
}

function getSymbolName(symbol: string): string {
  return symbol.match(/\bid=["']([^"']+)["']/)?.[1] || "";
}

function getSymbolViewBox(symbol: string): string {
  return symbol.match(/\bviewBox=["']([^"']+)["']/)?.[1] || "未设置 viewBox";
}

function getIconPreview(symbol: string): string {
  const safeSymbol = sanitizeSvgSymbol(symbol);
  const viewBox = safeSymbol.match(/\bviewBox=["']([^"']+)["']/)?.[1] || "0 0 1024 1024";
  const content = safeSymbol
    .replace(/<symbol[^>]*>/, "")
    .replace(/<\/symbol>/, "")
    .trim();

  return `<svg viewBox="${viewBox}" aria-hidden="true">${content}</svg>`;
}
</script>

<style scoped lang="css">
.pl-setting-main {
  padding: 1rem 1.5rem;
  color: var(--pl-color-text);
  background-color: var(--pl-color-background);
}

.pl-setting-body {
  display: flex;
  gap: 0.75rem;
  min-height: 28rem;
}

.pl-setting-sidebar {
  width: 10rem;
  flex-shrink: 0;
  background-color: var(--pl-color-surface);
  border-radius: 0.5rem;
}

.pl-setting-sidebar button {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 0;
  border-radius: 0.4rem;
  text-align: left;
  color: var(--pl-color-text-secondary);
  background-color: transparent;
  cursor: pointer;
  font-size: 1rem;
  font-weight: bold;
}

.pl-setting-sidebar button.active {
  color: var(--pl-color-text);
  background-color: var(--pl-color-surface-light);
}

.pl-setting-panel {
  flex: 1;
  padding: 0 1.25rem;
  background-color: var(--pl-color-background);
  border-radius: 0.5rem;
}

.pl-setting-row {
  display: grid;
  grid-template-columns: 2fr 4fr;
  gap: 1.5rem;
  align-items: center;
  border-bottom: 1px solid var(--pl-color-border);
  padding: 1rem 0;
}

.pl-setting-row:last-child {
  border-bottom: 0;
}

.pl-setting-row-top {
  align-items: start;
}

.pl-setting-row label {
  color: var(--pl-color-primary);
  font-size: 1rem;
  font-weight: bold;
}

.pl-setting-row p,
.pl-setting-row pre,
.pl-setting-intro p {
  font-weight: lighter;
  color: var(--pl-color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0.25rem 0 0;
}

.pl-setting-row pre {
  color: var(--pl-color-text-secondary);
  font-size: 0.75rem;
  margin-top: 0.5rem;
}

.pl-setting-row code {
  color: var(--pl-color-text-secondary);
}

.pl-setting-row input,
.pl-setting-row select,
.pl-setting-row textarea {
  width: 26rem;
  color: var(--pl-color-text);
  background-color: var(--pl-color-surface);
  border-color: transparent;
}

.pl-setting-row textarea {
  height: 12rem;
  resize: none;
}

.pl-icon-editor {
  display: grid;
  gap: 0.75rem;
  width: 26rem;
}

.pl-icon-editor textarea {
  width: 100%;
  height: 8rem;
}

.pl-icon-editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.pl-icon-editor-footer button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.pl-icon-list {
  display: grid;
  gap: 0.5rem;
  width: 26rem;
  max-height: 22rem;
  overflow: auto;
}

.pl-icon-empty {
  color: var(--pl-color-text-secondary);
  font-size: 0.9rem;
  padding: 0.75rem 0;
}

.pl-icon-item,
.pl-icon-preview-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pl-icon-item {
  border: 1px solid var(--pl-color-border);
  border-radius: 0.5rem;
  padding: 0.5rem;
}

.pl-icon-info {
  flex: 1;
  min-width: 0;
}

.pl-icon-info strong {
  color: var(--pl-color-text);
  font-size: 0.9rem;
}

.pl-icon-info p {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
}

.pl-icon-preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--pl-color-text);
  background-color: var(--pl-color-surface);
  border-radius: 0.4rem;
  flex-shrink: 0;
}

.pl-icon-preview :deep(svg) {
  width: 1.2rem;
  height: 1.2rem;
  fill: currentColor;
}

.pl-icon-error {
  color: var(--pl-color-error);
  font-size: 0.85rem;
}

.pl-setting-intro {
  border-bottom: 1px solid var(--pl-color-border);
  padding: 1rem 0;
}

.pl-setting-intro h3 {
  margin: 0;
  color: var(--pl-color-primary);
  font-size: 1rem;
}

.pl-setting-footer {
  display: flex;
  justify-content: end;
  gap: 1rem;
  padding-top: 1rem;
}

.pl-setting-help {
  color: var(--pl-color-text-secondary);
  font-size: 0.75rem;
}

.pl-setting-primary-button {
  color: var(--b3-theme-on-primary, #fff);
  background-color: var(--pl-color-primary);
  border-color: var(--pl-color-primary);
}
</style>
