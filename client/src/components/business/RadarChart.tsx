import { memo, useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface RadarChartProps {
  data: {
    dimensions: { name: string; max: number }[]
    values: number[]
    average?: number
    strongest?: string
    weakest?: string
  }
  size?: 'small' | 'large'
}

export const RadarChart = memo(({ data, size = 'large' }: RadarChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  const isSmall = size === 'small'
  const chartHeight = isSmall ? 200 : 300

  useEffect(() => {
    if (!chartRef.current) return

    chartInstance.current = echarts.init(chartRef.current)

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        textStyle: { color: '#374151' },
      },
      radar: {
        indicator: data.dimensions.map(d => ({
          name: d.name,
          max: d.max,
        })),
        shape: 'polygon',
        splitNumber: 4,
        axisName: {
          color: '#6B7280',
          fontSize: isSmall ? 10 : 12,
          padding: [3, 5],
        },
        splitLine: {
          lineStyle: {
            color: '#E5E7EB',
            type: 'dashed',
          },
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(59, 130, 246, 0.02)', 'rgba(59, 130, 246, 0.05)'],
          },
        },
        axisLine: {
          lineStyle: { color: '#D1D5DB' },
        },
        radius: isSmall ? '60%' : '70%',
      },
      series: [{
        type: 'radar',
        data: [{
          value: data.values,
          name: '能力雷达',
          lineStyle: {
            color: '#3B82F6',
            width: 2,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.4)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.1)' },
            ]),
          },
          symbol: 'circle',
          symbolSize: isSmall ? 4 : 6,
          itemStyle: {
            color: '#3B82F6',
            borderColor: '#fff',
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: 'rgba(59, 130, 246, 0.3)',
          },
        }],
      }],
    }

    chartInstance.current.setOption(option)

    const handleResize = () => chartInstance.current?.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.dispose()
    }
  }, [data, isSmall])

  if (isSmall) {
    return (
      <div className="flex gap-4">
        <div ref={chartRef} style={{ width: 120, height: chartHeight }} />
        <div className="flex flex-col justify-center text-xs text-gray-500">
          <div>平均: {data.average?.toFixed(1) || 0}</div>
          {data.strongest && <div className="text-green-600">最强: {data.strongest}</div>}
          {data.weakest && <div className="text-orange-500">最弱: {data.weakest}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div ref={chartRef} style={{ width: '100%', height: chartHeight }} />

      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{data.average?.toFixed(1) || 0}</div>
          <div className="text-gray-500">综合能力</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{data.strongest || '-'}</div>
          <div className="text-gray-500">最强维度</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-500">{data.weakest || '-'}</div>
          <div className="text-gray-500">最弱维度</div>
        </div>
      </div>
    </div>
  )
})

RadarChart.displayName = 'RadarChart'

export default RadarChart