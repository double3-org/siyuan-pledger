<template>
  <div class="pl-bookkeeping-edit-main" @keydown="onKeydown">
    <section class="pl-bookkeeping-hero">
      <div class="pl-bookkeeping-type-tabs">
        <label :class="{ active: bookkeepingType === 'expense' }">
          <input type="radio" name="pl-bookkeeping-type" value="expense" v-model="bookkeepingType" />
          支出
        </label>
        <label :class="{ active: bookkeepingType === 'income' }">
          <input type="radio" name="pl-bookkeeping-type" value="income" v-model="bookkeepingType" />
          收入
        </label>
      </div>

      <div class="pl-bookkeeping-amount">
        <span>{{ amountText }}</span>
      </div>
    </section>

    <section class="pl-bookkeeping-category-panel">
      <div class="pl-bookkeeping-category">
        <button v-for="(item, index) in bookkeepingConfigList" :key="index" class="pl-bookkeeping-parent-tag"
          :class="{ active: selectedParentIndex === index }" @click="selectParent(index)">
          <IconDisplay class="pl-bookkeeping-parent-icon" :icon="item.icon" fallback="iconD3List" />
          {{ item.name }}
        </button>
      </div>

      <div class="pl-bookkeeping-children">
        <button v-for="(item, index) in childConfigList" :key="index" class="pl-bookkeeping-child-tag"
          :class="{ active: selectedChildIndex === index }" @click="selectedChildIndex = index">
          {{ item.name }}
        </button>
      </div>
    </section>

    <section class="pl-bookkeeping-action-area">
      <div class="pl-bookkeeping-calculator">
        <div class="pl-bookkeeping-keypad">
          <button v-for="key in keypadKeys" :key="key.value"
            :class="[key.className, { danger: key.value === 'clear' && isEditMode }]"
            :disabled="key.value === 'save' && !canSave" @click="handleKey(key.value)">
            <template v-if="key.value === 'backspace'">⌫</template>
            <template v-else-if="key.value === 'clear'">
              <span>{{ isEditMode ? "×" : "↻" }}</span>
              <span>{{ isEditMode ? "删除" : "再记" }}</span>
            </template>
            <template v-else>{{ key.label }}</template>
          </button>
        </div>
      </div>

      <button class="pl-bookkeeping-confirm" :disabled="!canSave" @click="confirm">
        ✓ 保存记录
      </button>
    </section>

    <section class="pl-bookkeeping-footer">
      <div class="pl-bookkeeping-meta">
        <DatePicker v-model="selectedDate" placement="top" />
        <button v-if="!isRemarkOpen" class="pl-bookkeeping-remark-toggle" @click="isRemarkOpen = true">
          添加备注
        </button>
        <input v-else class="pl-bookkeeping-remark" v-model="remark" placeholder="添加备注..." />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import currency from "currency.js";
import { computed, onMounted, ref } from 'vue';
import { showMessage } from 'siyuan';
import { getCurrentTime } from "@/api/siyuanApi"
import DatePicker from "@/components/custom/DatePicker.vue";
import IconDisplay from "@/components/custom/IconDisplay.vue";

const emit = defineEmits<{
  (e: "update", value: BookkeepingRecord): void
  (e: "saveAgain", value: BookkeepingRecord, reset: () => void): void
  (e: "deleteRecord"): void
  (e: "close"): void
}>();

const props = defineProps<{
  confData: SettingConfig // 配置数据
  initialRecord?: BookkeepingRecord // 编辑时传入的原记录
  isMobile?: boolean // 是否为移动端
}>();

const bookkeepingType = ref<"expense" | "income">("expense");
const selectedParentIndex = ref(0);
const selectedChildIndex = ref(0);
const amountExpression = ref("0");
const selectedDate = ref("");
const remark = ref("");
const isRemarkOpen = ref(false);
const isEditMode = computed(() => !!props.initialRecord);

const desktopKeypadKeys = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "backspace", label: "退格", className: "delete" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "+", label: "+", className: "operator" },
  { value: "-", label: "-", className: "operator" },
  { value: "7", label: "7" },
  { value: "8", label: "8" },
  { value: "9", label: "9" },
  { value: "*", label: "×", className: "operator" },
  { value: "/", label: "÷", className: "operator" },
  { value: "clear", label: "再记", className: "clear" },
  { value: "0", label: "0" },
  { value: ".", label: "." },
  { value: "=", label: "=", className: "equal" },
];

const mobileKeypadKeys = [
  { value: "clear", label: "再记", className: "clear" },
  { value: "backspace", label: "退格", className: "delete" },
  { value: "/", label: "÷", className: "operator" },
  { value: "7", label: "7" },
  { value: "8", label: "8" },
  { value: "9", label: "9" },
  { value: "*", label: "×", className: "operator" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "-", label: "-", className: "operator" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "+", label: "+", className: "operator" },
  { value: "=", label: "=", className: "equal" },
  { value: "0", label: "0" },
  { value: ".", label: "." },
  { value: "save", label: "保存", className: "save" },
];
const keypadKeys = computed(() => props.isMobile ? mobileKeypadKeys : desktopKeypadKeys);

// 记账配置分类
const bookkeepingConfigList = computed<LedgerItem[]>(() => {
  try {
    const config = JSON.parse(props.confData.bookkeepingConfig || "[]");
    return Array.isArray(config) ? config : [];
  } catch {
    return [];
  }
});

const childConfigList = computed<LedgerItem[]>(() => {
  return bookkeepingConfigList.value[selectedParentIndex.value]?.children || [];
});

// 计算表达式求值函数
function calculateExpression(expression: string): number {
  const normalizedExpression = expression.replace(/[+\-*/.]$/, "");
  const tokens = normalizedExpression.match(/\d+(?:\.\d+)?|[+\-*/]/g) || [];
  if (tokens.length === 0) return 0;
  if (tokens.join("") !== normalizedExpression || tokens.length % 2 === 0) {
    throw new Error("invalid expression");
  }

  type Operator = "+" | "-" | "*" | "/";
  const values: number[] = [];
  const operators: Operator[] = [];
  const priority: Record<Operator, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

  // 每次从栈中取出左右操作数，确保连续乘除也会按从左到右完整计算。
  const applyOperator = () => {
    const operator = operators.pop();
    const right = values.pop();
    const left = values.pop();
    if (!operator || left === undefined || right === undefined) throw new Error("invalid expression");
    if (operator === "/" && right === 0) throw new Error("divide by zero");

    const leftValue = currency(left, { precision: 8 });
    const result = operator === "+"
      ? leftValue.add(right).value
      : operator === "-"
        ? leftValue.subtract(right).value
        : operator === "*"
          ? leftValue.multiply(right).value
          : leftValue.divide(right).value;
    values.push(result);
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (index % 2 === 0) {
      const value = Number(token);
      if (!Number.isFinite(value)) throw new Error("invalid number");
      values.push(value);
      continue;
    }

    const operator = token as Operator;
    if (!(operator in priority)) throw new Error("invalid operator");
    while (operators.length && priority[operators[operators.length - 1]] >= priority[operator]) {
      applyOperator();
    }
    operators.push(operator);
  }

  while (operators.length) applyOperator();
  if (values.length !== 1) throw new Error("invalid expression");

  return Number(values[0].toFixed(2));
}

const currentAmount = computed(() => {
  try {
    return calculateExpression(amountExpression.value);
  } catch {
    return 0;
  }
});

const amountText = computed(() => amountExpression.value.replace(/\*/g, "×").replace(/\//g, "÷"));
const canSave = computed(() => currentAmount.value > 0);

const selectParent = (index: number) => {
  selectedParentIndex.value = index;
  selectedChildIndex.value = 0;
}

function initFormByRecord(record: BookkeepingRecord): void {
  bookkeepingType.value = record.type;
  selectedDate.value = record.date;
  amountExpression.value = formatAmount(record.amount);
  remark.value = record.remark || "";
  isRemarkOpen.value = !!record.remark;

  const parentIndex = bookkeepingConfigList.value.findIndex(item => item.name === record.parentName);
  if (parentIndex >= 0) {
    selectedParentIndex.value = parentIndex;
    const childIndex = (bookkeepingConfigList.value[parentIndex].children || []).findIndex(item => item.name === record.childName);
    selectedChildIndex.value = childIndex >= 0 ? childIndex : 0;
  }
}

const handleKey = (key: string) => {
  if (/^\d$/.test(key)) {
    inputNumber(key);
    return;
  }

  if (key === ".") {
    inputDecimal();
    return;
  }

  if (["+", "-", "*", "/"].includes(key)) {
    inputOperator(key);
    return;
  }

  if (key === "=") {
    calculate();
    return;
  }

  if (key === "backspace") {
    deleteAmount();
    return;
  }

  if (key === "save") {
    confirm();
    return;
  }

  if (key === "clear") {
    if (isEditMode.value) {
      emit("deleteRecord");
      return;
    }
    saveAgain();
  }
}

const inputNumber = (value: string) => {
  amountExpression.value = amountExpression.value === "0" ? value : amountExpression.value + value;
}

const inputDecimal = () => {
  const currentNumber = amountExpression.value.split(/[+\-*/]/).pop() || "";
  if (currentNumber.includes(".")) return;
  amountExpression.value += currentNumber ? "." : "0.";
}

const inputOperator = (value: string) => {
  if (/[+\-*/.]$/.test(amountExpression.value)) {
    amountExpression.value = amountExpression.value.slice(0, -1) + value;
    return;
  }
  amountExpression.value += value;
}

const calculate = () => {
  try {
    amountExpression.value = formatAmount(calculateExpression(amountExpression.value));
  } catch (error) {
    showMessage("金额计算错误", 2000, "error");
  }
}

const deleteAmount = () => {
  amountExpression.value = amountExpression.value.length > 1 ? amountExpression.value.slice(0, -1) : "0";
}

const confirm = () => {
  const data = getBookkeepingRecord();
  if (!data) return;

  emit("update", data);
}

const saveAgain = () => {
  const data = getBookkeepingRecord();
  if (!data) return;

  emit("saveAgain", data, resetForm);
}

function getBookkeepingRecord(): BookkeepingRecord | undefined {
  const amount = currentAmount.value;
  const parent = bookkeepingConfigList.value[selectedParentIndex.value];
  const child = childConfigList.value[selectedChildIndex.value];

  if (!parent || !child) {
    showMessage("请选择记账标签", 2000, "info");
    return;
  }

  if (amount <= 0) {
    showMessage("金额必须大于 0", 2000, "info");
    return;
  }

  return {
    type: bookkeepingType.value,
    date: selectedDate.value,
    parentName: parent.name,
    childName: child.name,
    amount,
    remark: remark.value,
  };
}

function resetForm() {
  amountExpression.value = "0";
  remark.value = "";
  isRemarkOpen.value = false;
}

const onKeydown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") {
    if (event.key === "Escape") emit("close");
    return;
  }

  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    handleKey(event.key);
    return;
  }

  if (["+", "-", "*", "/", "."].includes(event.key)) {
    event.preventDefault();
    handleKey(event.key);
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    confirm();
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    deleteAmount();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
  }
}

onMounted(() => {
  if (props.initialRecord) {
    initFormByRecord(props.initialRecord);
  } else {
    getCurrentTime().then(res => selectedDate.value = res);
  }
});

function formatAmount(value: number): string {
  const fixed = value.toFixed(2);
  return fixed.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}
</script>

<style scoped lang="css">
.pl-bookkeeping-edit-main {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 0.8rem;
  padding: 0.6rem 1.2rem;
  color: var(--pl-color-text);
  background-color: var(--pl-color-background);
  height: calc(100% - 1.2rem);
  border-radius: 0 0 14px 14px;
}

.pl-bookkeeping-hero {
  display: grid;
  grid-template-columns: 10rem minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
}

.pl-bookkeeping-type-tabs {
  display: flex;
  height: 33px;
  overflow: hidden;
  padding: 0.25rem;
  background-color: var(--pl-color-surface);
  border-radius: 10px;
}

.pl-bookkeeping-type-tabs input {
  display: none;
}

.pl-bookkeeping-type-tabs label {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--pl-color-text-secondary);
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
}

.pl-bookkeeping-type-tabs label:has(input[value="expense"]:checked) {
  color: var(--b3-theme-on-primary, #fff);
  background-color: var(--pl-color-error);
}

.pl-bookkeeping-type-tabs label:has(input[value="income"]:checked) {
  color: var(--b3-theme-on-primary, #fff);
  background-color: var(--pl-color-success);
}

.pl-bookkeeping-amount {
  display: flex;
  align-items: center;
  justify-content: end;
  height: 50px;
  min-width: 0;
  padding: 0 1.25rem;
  color: var(--pl-color-text);
  background-color: var(--pl-color-surface-light);
  border: 1px solid var(--pl-color-border);
  border-radius: 12px;
  font-size: 2rem;
  font-weight: 600;
  word-break: break-all;
}

.pl-bookkeeping-category-panel {
  display: grid;
  gap: 0.2rem;
  padding: 0 0.25rem;
}

.pl-bookkeeping-category {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.3rem;
  margin-bottom: 0.4rem;
}

.pl-bookkeeping-children {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pl-bookkeeping-parent-tag,
.pl-bookkeeping-child-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 33px;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  white-space: nowrap;
}

.pl-bookkeeping-parent-tag {
  flex-shrink: 0;
  padding: 0 12px;
  color: var(--pl-color-primary);
  background-color: var(--pl-color-primary-light);
  font-size: 0.875rem;
}

.pl-bookkeeping-parent-icon {
  width: 1rem;
  height: 1rem;
  font-size: 1rem;
}

.pl-bookkeeping-parent-tag.active {
  color: var(--b3-theme-on-primary, #fff);
  background-color: var(--pl-color-primary);
}

.pl-bookkeeping-child-tag {
  height: 33px;
  padding: 0 20px;
  color: var(--pl-color-text);
  background-color: var(--pl-color-surface);
  font-size: 0.875rem;
}

.pl-bookkeeping-child-tag:hover {
  background-color: var(--pl-color-primary-light);
}

.pl-bookkeeping-child-tag.active {
  color: var(--b3-theme-on-primary, #fff);
  background-color: var(--pl-color-primary);
}

.pl-bookkeeping-action-area {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 8rem;
  gap: 0.75rem;
  align-items: stretch;
  min-height: 0;
}

.pl-bookkeeping-calculator {
  display: flex;
  padding: 1rem;
  background-color: var(--pl-color-surface);
  border: 1px solid var(--pl-color-border);
  border-radius: 12px;
  min-height: 0;
}

.pl-bookkeeping-keypad {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(0, 1fr));
  gap: 1rem 2rem;
  min-height: 0;
}

.pl-bookkeeping-keypad button {
  min-height: 0;
  color: var(--b3-theme-on-primary, #fff);
  background-color: #2b2b2b;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  font-size: 30px;
  font-weight: 600;
}

.pl-bookkeeping-keypad button:hover {
  background-color: #3a3a3a;
}

.pl-bookkeeping-keypad button:active {
  background-color: #4a4a4a;
}

.pl-bookkeeping-keypad button.delete {
  grid-column: span 2 / span 2;
  background-color: #374151;
}

.pl-bookkeeping-keypad button.operator {
  background-color: #3b4252;
}

.pl-bookkeeping-keypad button.clear {
  display: grid;
  place-items: center;
  font-size: 0.9rem;
}

.pl-bookkeeping-keypad button.clear.danger {
  background-color: var(--pl-color-error);
}

.pl-bookkeeping-keypad button.equal {
  grid-column: span 2 / span 2;
  background-color: var(--pl-color-primary);
  font-size: 32px;
}

.pl-bookkeeping-footer {
  display: block;
}

.pl-bookkeeping-meta {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
}

.pl-bookkeeping-remark-toggle,
.pl-bookkeeping-remark {
  min-width: 0;
  height: 36px;
  color: var(--pl-color-text-secondary);
  background-color: var(--pl-color-surface);
  border: 1px solid var(--pl-color-border);
  border-radius: 10px;
  outline: none;
  font-size: 0.875rem;
}

.pl-bookkeeping-remark-toggle {
  text-align: left;
  padding: 0 0.75rem;
  cursor: pointer;
}

.pl-bookkeeping-remark {
  padding: 0 0.75rem;
}

.pl-bookkeeping-confirm {
  width: 100%;
  height: 100%;
  min-height: 72px;
  color: var(--b3-theme-on-primary, #fff);
  background-color: var(--pl-color-success);
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
}

.pl-bookkeeping-confirm:hover {
  background-color: #15803d;
}

.pl-bookkeeping-confirm:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

@media (max-width: 768px) {
  .pl-bookkeeping-edit-main {
    height: 100%;
    min-height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    overflow-x: hidden;
    overflow-y: auto;
    border-radius: 0;
    box-sizing: border-box;
  }

  .pl-bookkeeping-hero {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .pl-bookkeeping-type-tabs {
    height: 2.55rem;
    padding: 0.25rem;
    border-radius: 0.5rem;
  }

  .pl-bookkeeping-type-tabs label {
    border-radius: 0.4rem;
    font-size: 0.95rem;
  }

  .pl-bookkeeping-amount {
    height: 4rem;
    justify-content: end;
    padding: 0 1rem;
    border-radius: 0.5rem;
    font-size: 2.4rem;
    line-height: 1;
  }

  .pl-bookkeeping-category-panel {
    gap: 0.55rem;
    padding: 0;
  }

  .pl-bookkeeping-category {
    gap: 0.5rem;
    padding-bottom: 0.35rem;
  }

  .pl-bookkeeping-children {
    gap: 0.45rem;
  }

  .pl-bookkeeping-parent-tag,
  .pl-bookkeeping-child-tag {
    height: 2rem;
    min-width: 0;
    border-radius: 0.45rem;
    font-size: 0.85rem;
  }

  .pl-bookkeeping-parent-tag {
    padding: 0 0.6rem;
  }

  .pl-bookkeeping-child-tag {
    min-width: 3.8rem;
    padding: 0 0.55rem;
  }

  .pl-bookkeeping-action-area {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    align-items: start;
    min-height: auto;
  }

  .pl-bookkeeping-calculator {
    padding: 0.75rem;
    border-radius: 0.5rem;
  }

  .pl-bookkeeping-keypad {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-template-rows: none;
    grid-auto-rows: 3.25rem;
    gap: 0.55rem;
    min-height: auto;
  }

  .pl-bookkeeping-keypad button {
    min-height: 3.25rem;
    border-radius: 0.5rem;
    font-size: 1.35rem;
    line-height: 1;
  }

  .pl-bookkeeping-keypad button.delete,
  .pl-bookkeeping-keypad button.equal {
    grid-column: span 1 / span 1;
  }

  .pl-bookkeeping-keypad button.clear {
    grid-column: span 2 / span 2;
  }

  .pl-bookkeeping-keypad button.clear {
    font-size: 0.85rem;
  }

  .pl-bookkeeping-keypad button.save {
    background-color: var(--pl-color-success);
    font-size: 0.95rem;
  }

  .pl-bookkeeping-confirm {
    display: none;
  }

  .pl-bookkeeping-meta {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .pl-bookkeeping-meta :deep(.pl-datepicker),
  .pl-bookkeeping-meta :deep(.pl-datepicker .pl-button),
  .pl-bookkeeping-remark-toggle,
  .pl-bookkeeping-remark {
    width: 100%;
  }

  .pl-bookkeeping-remark-toggle,
  .pl-bookkeeping-remark {
    height: 3rem;
    border-radius: 0.5rem;
  }
}
</style>
