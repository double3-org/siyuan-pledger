<template>
  <div class="pl-ai-main">
    <div class="mb-2 flex items-center justify-between p-6">
      <div class="pl-tabs">
        <!-- AI 服务 -->
        <label>
          <input type="radio" name="pl-ai-type" checked @change="handleTabChange" />
          <svg>
            <use xlink:href="#iconGraph"></use>
          </svg>
          AI 服务
        </label>

        <!-- 本地 AI -->
        <label>
          <input type="radio" name="pl-ai-type" @change="handleTabChange" />
          <svg>
            <use xlink:href="#iconInlineCode"></use>
          </svg>
          本地 AI
        </label>
      </div>

      <div class="tab-content">
        <!-- AI 服务 -->
        <div>
          <div class="pl-ai-form">
            <label class="pl-ai-label" style="margin-top: 3px;">上传图片</label>
            <div>
              <label class="pl-file-button">
                <svg>
                  <use xlink:href="#iconCloud"></use>
                </svg>
                上传
                <input type="file" style="display: none;" @change="aiRecord($event)" accept=".jpg,.jpeg,.png" />
              </label>
            </div>

            <label class="pl-ai-label">结果</label>
            <div>
              <span v-show="loading" class="pl-loading">
              </span>
              <span style="color: #e23955;">{{ errMsg }}</span>
              <pre class="result-pre">{{ aiResult }}</pre>
            </div>
          </div>
        </div>


        <!-- 本地 AI -->
        <div>
          <div class="pl-ai-form">
            <!-- 提示词 -->
            <label class="pl-ai-label">
              提示词
            </label>
            <div>
              <pre class="pl-ai-prompt-pre" :class="!isExpanded ? 'line-clamp' : ''">
{{ prompt }}
							</pre>
              <div class="flex gap-2 ">
                <!-- 展开 -->
                <button class="pl-ai-button-sm" @click="expandPrompt">
                  <svg v-show="!isExpanded">
                    <use xlink:href="#iconDown"></use>
                  </svg>
                  <svg v-show="isExpanded">
                    <use xlink:href="#iconUp"></use>
                  </svg>
                </button>
                <!-- 复制 -->
                <button class="pl-ai-button-sm" style="margin-left: 0.5rem;" @click="copyPrompt">
                  <svg>
                    <use xlink:href="#iconRestore"></use>
                  </svg>
                </button>
              </div>
            </div>

            <!-- 结果 -->
            <label class="pl-ai-label">
              结果
            </label>
            <div>
              <textarea class="pl-form-textarea" v-model="aiResult" placeholder="将本地 AI 结果的返回粘贴到这里">
              </textarea>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="pl-ai-footer">
      <button class="pl-button" @click="close">取消</button>
      <button style="color: #fff; background-color: #422ad5;" class="pl-button" @click="update">保存</button>
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
const errMsg = ref('')

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
        errMsg.value = ''
      })
      .catch(err => {
        console.error(err)
        loading.value = false
        errMsg.value = err.message
      })
  }
}
</script>

<style scoped lang="css">
.pl-ai-main {
  margin: 1rem 1.6rem;
}

.pl-ai-footer {
  margin-top: 1rem;
  display: flex;
  justify-content: end;
  gap: 1rem;
}

.pl-ai-form {
  display: grid;
  grid-template-columns: 1fr 5fr;
  gap: 1rem;
  margin-top: 1rem;
}

.pl-ai-label {
  font-weight: 700;
  margin-left: 0.75rem;
}

.pl-file-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #333;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: bold;
  padding: 0 0.5rem;
  line-height: 1.5rem;
  border: 1px solid #d0d0d0;
}

.pl-file-button svg {
  height: 0.75rem;
  width: 0.75rem;
  margin-right: 0.5rem;
}

.pl-file-button:hover {
  background-color: #d0d0d0;
}

.pl-ai-prompt-pre {
  overflow-x: auto;
  margin-top: 0;
}

.line-clamp {
  -webkit-box-orient: vertical;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 5;
  line-clamp: 5;
}

.pl-ai-button-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  border: 1px solid #dcdcdc;
  background: #f3f4f6;
  color: #374151;
  cursor: pointer;
}

.pl-ai-button-sm svg {
  height: 0.75rem;
  width: 0.75rem;
}

.pl-ai-button-sm:hover {
  background: #e5e7eb;
}
</style>
