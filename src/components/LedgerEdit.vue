<template>
  <div class="pl-ledger-edit-main">
    <div>
      <div class="pl-ledger-edit-label">
        <svg>
          <use xlink:href="#iconCalendar"></use>
        </svg>
        登记时间
        <span class="pl-ledger-badge">must</span>
      </div>
      <!-- 日期 -->
      <DatePicker class="pl-ledger-edit-input" v-model="selectedDate" />
    </div>

    <div>
      <div v-for="(lItem, index) in ledgerForm" :key="index">
        <div class="pl-ledger-edit-label">
          <svg>
            <use :xlink:href="`#${lItem.icon}`"></use>
          </svg>
          {{ lItem.name }}
          <button class="pl-button pl-ai-button" @click="aiRecord(lItem)">
            <svg>
              <use xlink:href="#iconD3AI"></use>
            </svg>
            AI 记
          </button>
        </div>
        <div class="pl-ledger-edit-form">
          <div class="" v-for="(lc, index) in lItem.children" :key="index">
            <fieldset>
              <legend>{{ lc.name }}</legend>
              <input class="pl-form-input" type="number" v-model="lc.amount" />
            </fieldset>
          </div>
        </div>
      </div>
    </div>

    <div class="pl-ledger-edit-footer">
      <button class="pl-button" @click="close">取消</button>
      <button style="color: #fff; background-color: #422ad5;" class="pl-button" @click="update">保存</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import currency from "currency.js";
import { ref } from 'vue';
import { getCurrentTime } from "@/api/siyuanApi"
import { alert } from "@/utils/dialog-utils"
import AI from '@/components/AI.vue'
import DatePicker from "@/components/custom/DatePicker.vue";

const emit = defineEmits<{
  (e: "update", value: LedgerItem[]): void
  (e: "close"): void
}>()

const ledgerForm = ref<LedgerItem[]>([])

const props = defineProps<{
  ledgerData?: LedgerItem[], // 账本数据
  confData: SettingConfig, // 配置数据
  isMobile?: boolean // 是否为移动端
}>();

const selectedDate = ref('')
getCurrentTime().then(res => selectedDate.value = res)

if (props.ledgerData) {
  ledgerForm.value = props.ledgerData
  selectedDate.value = props.ledgerData[0].time || ''
} else {
  newLedgerForm()
}

// 根据 confData.config 初始化 newLedgerItem
function newLedgerForm() {
  ledgerForm.value = JSON.parse(props.confData.config).map((conf: any) => ({
    time: selectedDate.value,
    name: conf.name,
    amount: 0,
    icon: conf.icon,
    children: conf.children.map((child: any) => ({
      name: child.name,
      amount: 0
    }))
  }))
}

const update = () => {
  ledgerForm.value.forEach(item => {
    // 统一时间
    item.time = selectedDate.value
    // 计算子项金额汇总
    const total = (item.children || []).reduce(
      (sum, citem) => {
        citem.time = selectedDate.value
        return sum.add(citem.amount || 0)
      },
      currency(0)
    )
    // 父级金额 = 子项汇总
    item.amount = total.value
  })
  emit('update', ledgerForm.value)
}

const close = () => {
  emit('close')
}

// 处理 AI 记录上传
const aiRecord = (item: LedgerItem) => {
  // 打开 AI 组件
  const dialog = alert(AI, {
    title: 'AI 记',
    width: props.isMobile ? "100%" : "700px",
    height: props.isMobile ? "100%" : "500px",
    props: {
      settingConfData: props.confData,
      itemName: item.name,
      onAiUpdate: (res: any) => {
        // 如果 res 是 json 字符串需要转为对象
        if (typeof res === 'string') {
          try {
            res = JSON.parse(res)
          } catch (error) {
            console.error('JSON 解析错误:', error)
            return
          }
        }
        // 赋值给 ledgerForm
        ledgerForm.value.forEach(
          (lItem) => {
            if (lItem.name === item.name) {
              for (const child of lItem.children) {
                child.amount = res[child.name] || 0
              }
            }
          }
        )
        dialog?.destroy()
      }
    }
  })
}
</script>

<style scoped lang="css">
.pl-ledger-edit-main {
  margin: 1rem 1.6rem;
}

.pl-ledger-edit-label {
  font-weight: bold;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.pl-ledger-edit-label svg {
  height: 1.2rem;
  width: 1.2rem;
}

.pl-ledger-edit-input {
  margin: 0.5rem 0.75rem 1rem;
  display: block;
  padding-left: 1rem;
  border-left: 1px solid #e5e7eb;
}

.pl-ledger-badge {
  background-color: #000;
  color: #fff;
  width: fit-content;
  justify-content: center;
  align-items: center;
  font-size: .5rem;
  display: inline-flex;
  vertical-align: middle;
  padding: 0.15rem 0.35rem;
  border-radius: .5rem;
  margin-left: 0.5rem;
}

.pl-ai-button {
  background-color: #edf0fe;
  color: #422ad5;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.pl-ai-button svg {
  height: 1rem;
  width: 1rem;
}

.pl-ai-button:hover {
  background-color: #422ad5;
  color: #fff;
}

.pl-ledger-edit-form fieldset {
  border: 0;
  display: grid;
}

.pl-ledger-edit-form {
  margin: 0.5rem 0.75rem 1rem;
  border-left: 1px solid #e5e7eb;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 768px) {
  .pl-ledger-edit-form {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}

.pl-ledger-edit-form legend {
  color: #000;
  justify-content: space-between;
  align-items: center;
  gap: .5rem;
  margin-bottom: -.25rem;
  padding-block: .5rem;
  font-weight: 600;
  display: flex;
}

.pl-ledger-edit-footer {
  display: flex;
  justify-content: end;
  gap: 1rem;
}
</style>