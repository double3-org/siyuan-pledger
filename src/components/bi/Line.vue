<template>
  <div class="pl-line-main">
    <div ref="chartRef" class="pl-line-chart"></div>
    <div v-if="!hasLineData" class="pl-empty">
      <svg>
        <use xlink:href="#iconD3Empty"></use>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
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
const hasLineData = computed(() => props.lineData.some(item => Number.isFinite(item.value)));

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
  if (!hasLineData.value) {
    chartInstance.clear();
    return;
  }

  // 数据排序
  const sortedData = [...props.lineData].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  )

  const option = {
    color: ['#4f7df3'],
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#64748b',
        hideOverlap: true,
        formatter: (value: number) => {
          const d = new Date(value)
          const month = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${month}-${day}`
        }
      },
      // minInterval: 24 * 60 * 60 * 1000,
      // boundaryGap: false,
      // axisLabel: {
      //   interval: 'auto',
      //   alignMinLabel: true, // ★ 关键
      //   hideOverlap: true,
      //   formatter: (value: number) => {
      //     const d = new Date(value)
      //     const y = d.getFullYear()
      //     const m = String(d.getMonth() + 1).padStart(2, '0')
      //     const day = String(d.getDate()).padStart(2, '0')
      //     return `${y}-${m}-${day}`
      //   }
      // },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },  // 轴线
      axisTick: { show: false },  // 刻度
      axisLabel: {
        color: '#64748b',
        margin: 6,
        formatter: (value: number) => Math.abs(value) >= 10000 ? `${Math.round(value / 10000)}w` : `${Math.round(value)}`,
      },
      splitNumber: 4,
      min: 0,
      max: (v: any) => getYAxisMax(v.max),
      splitLine: {
        lineStyle: {
          color: '#e5e7eb',
          type: 'dashed',
        },
      },
    },
    grid: {
      top: 26,
      bottom: 24,
      left: 36,
      right: 12
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
        symbolSize: 7,
        lineStyle: {
          width: 2.5,
        },
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

function getYAxisMax(value: number): number {
  if (value <= 0) return 100;
  const roughStep = value / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const step = Math.ceil(roughStep / magnitude) * magnitude;
  return step * 4;
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

<style scoped lang="css">
.pl-line-main {
  width: 100%;
  height: 100%;
  position: relative;
}

.pl-line-chart {
  width: 100%;
  height: 100%;
}

.pl-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  background: #fff;
}

.pl-empty svg {
  width: 4rem;
  height: 4rem;
  fill: currentColor;
}
</style>
