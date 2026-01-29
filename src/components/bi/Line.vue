<template>
  <div ref="chartRef"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import * as echarts from 'echarts/core';
import { TooltipComponent, GridComponent } from 'echarts/components';
import { LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  TooltipComponent,
  GridComponent,
  LineChart,
  CanvasRenderer
]);

const props = defineProps<{
  lineData: { time: string; value: number }[];
}>();

const chartRef = ref<HTMLDivElement | null>(null);
type EChartsInstance = ReturnType<typeof echarts.init>;

let chartInstance: EChartsInstance | null = null;

/**
 * 初始化图表
 */
function initChart() {
  if (!chartRef.value) return;
  chartInstance = echarts.init(chartRef.value);
  renderChart();
}

/**
 * 渲染图表
 */
function renderChart() {
  if (!chartInstance || !props.lineData) return;

  // 数据排序
  const sortedData = [...props.lineData].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  )

  const option = {
    xAxis: {
      type: 'time',
      minInterval: 24 * 60 * 60 * 1000,
      axisLabel: {
        interval: 'auto', // 关键
        hideOverlap: true, // 关键
        formatter: (value: number) => {
          const d = new Date(value)
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${y}-${m}-${day}`
        }
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },  // 轴线
      axisTick: { show: false },  // 刻度
      axisLabel: { show: false },  // 标签
      splitNumber: 4,
      min: (v: any) => v.min - (v.max - v.min) * 0.1,
      max: (v: any) => v.max
    },
    grid: {
      top: 20,
      bottom: 10,
      left: 4,
      right: 10
      // outerBounds: true
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const [time, value] = params[0].value
        const d = new Date(time)

        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')

        return `
      <div>
        <div>${y}-${m}-${day}</div>
        <div>数值：${value}</div>
      </div>
    `
      }
    },
    series: [
      {
        type: 'line',
        smooth: true,
        data: sortedData.map(i => [i.time, i.value])
      }
    ]
  }
  chartInstance.setOption(option, true);
}

/**
 * 监听 data 变化（接口返回后自动更新）
 */
watch(
  () => props.lineData,
  () => {
    renderChart();
  },
  { deep: true }
);

/**
 * resize 自适应
 */
function resizeChart() {
  chartInstance?.resize();
}

onMounted(() => {
  initChart();
  window.addEventListener('resize', resizeChart);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart);
  chartInstance?.dispose();
  chartInstance = null;
});

</script>

<style scoped></style>
