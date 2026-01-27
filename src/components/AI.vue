<template>
  <div>
    <div class="mb-2 flex items-center justify-between p-6">
      <div class="tabs tabs-box tabs-sm w-fit bg-transparent border-none shadow-none">
        <!-- AI 服务 -->
        <label class="tab font-bold">
          <input type="radio" name="pl-ai-type" checked @change="handleTabChange" />
          <svg class="h-3 w-3 mr-1 stroke-current">
            <use xlink:href="#iconGraph"></use>
          </svg>
          AI 服务
        </label>
        <div class="tab-content mt-6">
          <div class="grid grid-cols-6 gap-4 items-stretch">
            <!-- 提示词 -->
            <label class="col-span-1 text-sm font-medium text-gray-700 pl-2 mt-[2px]">
              上传图片
            </label>
            <div class="col-span-5">
              <label class="btn btn-soft btn-primary btn-xs">
                <svg class="h-4 w-4 stroke-current">
                  <use xlink:href="#iconCloud"></use>
                </svg>
                上传
                <input type="file" class="hidden" @change="aiRecord($event)" />
              </label>
            </div>
            <!-- 结果 -->
            <label class="col-span-1 text-sm font-medium text-gray-700 pl-2">
              结果
            </label>
            <div class="col-span-5">
              <span v-show="loading" class="loading loading-spinner loading-xs"></span>
              <pre>{{ aiResult }}</pre>
            </div>
          </div>
        </div>

        <!-- 本地 AI -->
        <label class="tab font-bold">
          <input type="radio" name="pl-ai-type" @change="handleTabChange" />
          <svg class="h-3 w-3 mr-1 stroke-current">
            <use xlink:href="#iconInlineCode"></use>
          </svg>
          本地 AI
        </label>
        <div class="tab-content mt-6">
          <div class="grid grid-cols-6 gap-4 items-stretch">
            <!-- 提示词 -->
            <label class="col-span-1 text-sm font-medium text-gray-700 pl-2">
              提示词
            </label>
            <div class="col-span-5">
              <pre class="overflow-x-auto" :class="!isExpanded ? 'line-clamp-2' : ''">
{{ prompt }}
							</pre>
              <div class="flex gap-2 ">
                <!-- 展开 -->
                <button class="btn btn-xs btn-square" @click="expandPrompt">
                  <svg class="h-3 w-3 mr-1 stroke-current" v-show="!isExpanded">
                    <use xlink:href="#iconDown"></use>
                  </svg>
                  <svg class="h-3 w-3 mr-1 stroke-current" v-show="isExpanded">
                    <use xlink:href="#iconUp"></use>
                  </svg>
                </button>
                <!-- 复制 -->
                <button class="btn btn-xs btn-square" @click="copyPrompt">
                  <svg class="h-3 w-3 mr-1 stroke-current">
                    <use xlink:href="#iconRestore"></use>
                  </svg>
                </button>
              </div>
            </div>

            <!-- 结果 -->
            <label class="col-span-1 text-sm font-medium text-gray-700 pl-2">
              结果
            </label>
            <div class="col-span-5">
              <textarea class="textarea textarea-bordered h-24" v-model="aiResult"
                placeholder="将本地 AI 结果的返回粘贴到这里"></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex justify-end gap-5 px-6 pb-6">
      <button class="btn btn-outline btn-sm" @click="close">取消</button>
      <button class="btn btn-info btn-sm" @click="update">保存</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getPrompt } from '@/utils/ai.ts'
import { ref } from 'vue'
import { showMessage } from 'siyuan'
import { chatWithQwen } from "@/api/aiApi"

const emit = defineEmits<{
  (e: "ai-update", value: string): void
  (e: "close"): void
}>()

const props = defineProps<{
  settingConfData: SettingConfig, // 配置数据
  itemName: string
}>();

const prompt = ref(getPrompt(props.settingConfData, props.itemName))
const aiResult = ref('')
const isExpanded = ref(false)
const loading = ref(false)

const close = () => {
  emit('close')
}

const update = () => {
  emit('ai-update', aiResult.value)
}

// 监听 tab 切换
const handleTabChange = () => {
  aiResult.value = ''
}

const copyPrompt = () => {
  navigator.clipboard.writeText(prompt.value)
  showMessage("已复制提示词到剪切板", 3000, "info");
}

// 折叠 or 展开提示词，正常展示
const expandPrompt = () => {
  isExpanded.value = !isExpanded.value
}

const aiRecord = (event: Event) => {
  const fileInput = event.target as HTMLInputElement
  if (fileInput.files && fileInput.files.length > 0) {
    const imageFile = fileInput.files[0]
    // 检查文件是否为图片
    if (!imageFile.type.startsWith('image/')) {
      console.log('请上传图片文件')
      return
    }
    // 调用 AI 接口
    loading.value = true
    chatWithQwen(props.settingConfData, prompt.value, imageFile)
      .then(res => {
        aiResult.value = res
        loading.value = false
      })
      .catch(err => {
        console.error(err)
        loading.value = false 
      })
  }
}
</script>

<style scoped></style>
