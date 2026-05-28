import { memo, useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface GraphNode {
  id: string
  name: string
  description: string
  bloomLevel: string
  difficulty: number
  isThresholdConcept: boolean
  x?: number
  y?: number
}

interface GraphLink {
  source: string
  target: string
  relation: string
  strength: number
}

interface KnowledgeGraphProps {
  data: { nodes: GraphNode[]; links: GraphLink[] }
  loading?: boolean
  onNodeClick?: (node: GraphNode) => void
}

const bloomColors: Record<string, string> = {
  remember: '#8B5CF6',
  understand: '#3B82F6',
  apply: '#10B981',
  analyze: '#F59E0B',
  evaluate: '#EF4444',
  create: '#EC4899',
}

const getNodeSize = (node: GraphNode) => {
  let size = 30
  if (node.isThresholdConcept) size = 45
  switch (node.bloomLevel) {
    case 'remember': size += 0; break
    case 'understand': size += 5; break
    case 'apply': size += 10; break
    case 'analyze': size += 15; break
    case 'evaluate': size += 20; break
    case 'create': size += 25; break
  }
  return size
}

export const KnowledgeGraph = memo(({ data, loading, onNodeClick }: KnowledgeGraphProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || loading) return

    chartInstance.current = echarts.init(chartRef.current)

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            return `
              <div style="padding: 8px; max-width: 200px;">
                <div style="font-weight: 600; margin-bottom: 4px;">${params.data.name}</div>
                <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${params.data.description || ''}</div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <span style="padding: 2px 6px; background: #f3f4f6; border-radius: 4px; font-size: 11px;">${params.data.bloomLevel}</span>
                  <span style="padding: 2px 6px; background: #f3f4f6; border-radius: 4px; font-size: 11px;">难度: ${params.data.difficulty}</span>
                </div>
              </div>
            `
          }
          return ''
        },
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 12,
        padding: 8,
      },
      series: [{
        type: 'graph',
        layout: 'force',
        force: {
          repulsion: 500,
          edgeLength: 150,
          gravity: 0.1,
          friction: 0.1,
          layoutAnimation: true,
        },
        roam: true,
        draggable: true,
        data: data.nodes.map(node => ({
          id: node.id,
          name: node.name,
          description: node.description,
          bloomLevel: node.bloomLevel,
          difficulty: node.difficulty,
          symbolSize: getNodeSize(node),
          itemStyle: {
            color: bloomColors[node.bloomLevel] || '#6B7280',
            borderColor: node.isThresholdConcept ? '#9333EA' : '#fff',
            borderWidth: node.isThresholdConcept ? 3 : 2,
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.1)',
          },
          x: node.x,
          y: node.y,
        })),
        links: data.links.map(link => ({
          source: link.source,
          target: link.target,
          lineStyle: {
            color: link.relation === 'prerequisite' ? '#3B82F6' : '#9CA3AF',
            width: link.strength * 3,
            curveness: 0.3,
            type: link.relation === 'contradicts' ? 'dashed' : 'solid',
          },
          label: {
            show: link.relation === 'prerequisite',
            formatter: '依赖',
            fontSize: 10,
          },
        })),
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 4 },
        },
        lineStyle: { color: '#9CA3AF', curveness: 0.3 },
        label: { show: true, position: 'right', fontSize: 12 },
      }],
    }

    chartInstance.current.setOption(option)

    chartInstance.current.on('click', (params: any) => {
      if (params.dataType === 'node' && onNodeClick) {
        const node = data.nodes.find(n => n.id === params.data.id)
        if (node) onNodeClick(node)
      }
    })

    const handleResize = () => chartInstance.current?.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.dispose()
    }
  }, [data, loading, onNodeClick])

  if (loading) {
    return (
      <div className="w-full h-[400px] bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">正在分析知识结构...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <div ref={chartRef} style={{ width: '100%', height: 400 }} />

      {/* 图例 */}
      <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#8B5CF6]"></span>记忆</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span>理解</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10B981]"></span>应用</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>分析</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>评价</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EC4899]"></span>创造</span>
        </div>
      </div>
    </div>
  )
})

KnowledgeGraph.displayName = 'KnowledgeGraph'

export default KnowledgeGraph