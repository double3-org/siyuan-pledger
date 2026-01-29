<template>
  <div class="m-4 double3-main">
    <div class="m-3">
      <div class="font-bold inline-flex items-center gap-2">
        <svg class="h-4 w-4 stroke-current">
          <use xlink:href="#iconCalendar"></use>
        </svg>
        登记时间
        <span class="badge badge-neutral badge-xs">must</span>
      </div>
      <!-- 日期 -->
      <DatePicker class="ml-2 pl-4 mx-3 mt-2 mb-4 border-l border-gray-400" v-model="selectedDate" />
    </div>

    <div>
      <div v-for="(lItem, index) in ledgerForm" :key="index" class="m-3">
        <div class="font-bold inline-flex items-center gap-2">
          <svg class="h-4 w-4 stroke-current">
            <use :xlink:href="`#${lItem.icon}`"></use>
          </svg>
          {{ lItem.name }}

          <button class="btn btn-soft btn-primary btn-xs" @click="aiRecord(lItem)">
            <svg class="h-4 w-4 stroke-current">
              <use xlink:href="#iconD3AI"></use>
            </svg>
            AI 记
          </button>
        </div>
        <div class="ml-2 pl-4 border-l border-gray-400 grid grid-cols-1 md:grid-cols-3 mx-3 mt-2 mb-4">
          <div class="col-span-1" v-for="(lc, index) in lItem.children" :key="index">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">{{ lc.name }}</legend>
              <input type="number" v-model="lc.amount" class="input input-sm w-[168px]" />
            </fieldset>
          </div>
        </div>

      </div>
    </div>

    <div class="flex justify-end gap-5 p-6">
      <button class="btn btn-outline btn-sm" @click="close">取消</button>
      <button class="btn btn-sm btn bg-[#1A77F2] text-white border-[#005fd8]" @click="update">保存</button>
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
  confData: SettingConfig // 配置数据
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
    width: window.PersonalLedgerPlugHandler.isMobile ? "100%" : "700px",
    height: window.PersonalLedgerPlugHandler.isMobile ? "100%" : "500px",
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