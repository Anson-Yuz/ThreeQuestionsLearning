import { memo, useEffect, useRef, useMemo } from 'react'
import * as echarts from 'echarts'
import ErrorBoundary from '../common/ErrorBoundary'

interface GraphNode {
  id: string
  name: string
  description?: string
  bloomLevel?: string
  bloom_level?: string
  difficulty?: number
  isThresholdConcept?: boolean
  is_threshold_concept?: boolean
  x?: number
  y?: number
}

interface GraphLink {
  source: string
  target: string
  relation?: string
  strength?: number
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

const bloomLabels: Record<string, string> = {
  remember: '记忆',
  understand: '理解',
  apply: '应用',
  analyze: '分析',
  evaluate: '评价',
  create: '创造',
}

const validBloom = new Set(Object.keys(bloomColors))

const normalizeNode = (n: GraphNode): GraphNode => ({
  ...n,
  bloomLevel: (n.bloomLevel || n.bloom_level || 'understand').toLowerCase(),
  difficulty: typeof n.difficulty === 'number' ? n.difficulty : 0.5,
  isThresholdConcept: !!(n.isThresholdConcept || n.is_threshold_concept),
})

const getNodeSize = (node: GraphNode) => {
  let size = 30
  if (node.isThresholdConcept) size = 45
  const level = (node.bloomLevel || '').toLowerCase()
  switch (level) {
    case 'remember': size += 0; break
    case 'understand': size += 5; break
    case 'apply': size += 10; break
    case 'analyze': size += 15; break
    case 'evaluate': size += 20; break
    case 'create': size += 25; break
  }
  return size
}

const GraphContent = memo(({ data, loading, onNodeClick }: KnowledgeGraphProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // 数据校验 + 清洗
  const safeData = useMemo(() => {
    if (!data || !Array.isArray(data.nodes)) return { nodes: [] as GraphNode[], links: [] as GraphLink[] }
    const rawNodes = data.nodes.filter(n => n && (n.id || n.name))
    const seen = new Set<string>()
    const nodes: GraphNode[] = []
    for (const n of rawNodes) {
      const id = String(n.id || n.name || '')
      if (!id || seen.has(id)) continue
      seen.add(id)
      const normalized = normalizeNode(n)
      if (!validBloom.has(normalized.bloomLevel!)) {
        normalized.bloomLevel = 'understand'
      }
      normalized.id = id
      normalized.name = normalized.name || id
      nodes.push(normalized)
    }

    const links: GraphLink[] = []
    const linkSeen = new Set<string>()
    for (const e of (data.links || [])) {
      if (!e || !e.source || !e.target) continue
      const src = String(e.source)
      const tgt = String(e.target)
      if (src === tgt || !seen.has(src) || !seen.has(tgt)) continue
      const key = `${src}->${tgt}`
      if (linkSeen.has(key)) continue
      linkSeen.add(key)
      links.push({ source: src, target: tgt, relation: e.relation || 'related', strength: e.strength ?? 0.5 })
    }
    return { nodes, links }
  }, [data])

  if (loading) {
    return (
      <div className="w-full h-[400px] bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">正在分析知识结构...</p>
        </div>
      </div>
    )
  }

  if (safeData.nodes.length === 0) {
    return (
      <div className="w-full h-[400px] bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex flex-col items-center justify-center gap-2">
        <p className="text-gray-400 dark:text-gray-500 text-sm">暂无知识图谱数据</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs">上传学习资料后，点击刷新即可生成</p>
      </div>
    )
  }

  useEffect(() => {
    if (!chartRef.current) return
    if (!mountedRef.current) return

    if (chartInstance.current) {
      chartInstance.current.dispose()
    }

    chartInstance.current = echarts.init(chartRef.current)

    const bloomCounts: Record<string, number> = {}
    safeData.nodes.forEach(n => {
      const lvl = n.bloomLevel || 'understand'
      bloomCounts[lvl] = (bloomCounts[lvl] || 0) + 1
    })

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        confine: true,
        extraCssText: 'max-width:240px;white-space:normal;word-break:break-word;overflow-wrap:break-word;',
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const lvl = params.data.bloomLevel || 'understand'
            const desc = (params.data.description || '').slice(0, 80)
            return [
              `<div style="font-weight:600;margin-bottom:4px;word-break:break-word;">${params.data.name}</div>`,
              desc ? `<div style="font-size:12px;color:#666;margin-bottom:6px;line-height:1.4;word-break:break-word;">${desc}</div>` : '',
              `<div style="display:flex;gap:6px;flex-wrap:wrap;">`,
              `<span style="padding:2px 6px;background:${bloomColors[lvl] || '#6B7280'};color:#fff;border-radius:4px;font-size:11px;white-space:nowrap;">${bloomLabels[lvl] || lvl}</span>`,
              `<span style="padding:2px 6px;background:#f3f4f6;border-radius:4px;font-size:11px;white-space:nowrap;">难度 ${(params.data.difficulty ?? 0.5).toFixed(2)}</span>`,
              `</div>`,
            ].join('')
          }
          return ''
        },
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
      },
      animationDuration: 500,
      animationEasingUpdate: 'cubicInOut',
      series: [{
        type: 'graph',
        layout: 'force',
        force: {
          repulsion: Math.max(200, 800 - safeData.nodes.length * 10),
          edgeLength: [80, 250],
          gravity: 0.08,
          friction: 0.15,
          layoutAnimation: true,
        },
        roam: true,
        draggable: true,
        categories: Object.entries(bloomLabels).map(([key, label]) => ({
          name: label,
          itemStyle: { color: bloomColors[key] },
        })),
        data: safeData.nodes.map(node => ({
          ...node,
          category: Object.keys(bloomLabels).indexOf(node.bloomLevel || 'understand'),
          symbolSize: getNodeSize(node),
          itemStyle: {
            color: bloomColors[node.bloomLevel || 'understand'] || '#6B7280',
            borderColor: node.isThresholdConcept ? '#A855F7' : 'rgba(255,255,255,0.6)',
            borderWidth: node.isThresholdConcept ? 3 : 1.5,
            shadowBlur: node.isThresholdConcept ? 16 : 6,
            shadowColor: node.isThresholdConcept
              ? (bloomColors[node.bloomLevel || 'understand'] || '#6B7280') + '60'
              : 'rgba(0,0,0,0.06)',
          },
        })),
        links: safeData.links.map(link => ({
          source: link.source,
          target: link.target,
          lineStyle: {
            color: link.relation === 'prerequisite' ? '#3B82F6'
                 : link.relation === 'contradicts' ? '#EF4444'
                 : '#9CA3AF',
            width: Math.max(0.5, (link.strength || 0.5) * 2.5),
            curveness: 0.2,
            type: link.relation === 'contradicts' ? 'dashed' as const : 'solid' as const,
            opacity: 0.6,
          },
        })),
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 4, opacity: 1 },
          itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.2)' },
        },
        lineStyle: { color: '#9CA3AF', curveness: 0.2, opacity: 0.4 },
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          color: '#6B7280',
          formatter: (p: any) => p.name?.length > 6 ? p.name.slice(0, 6) + '…' : p.name,
        },
        edgeLabel: {
          show: false,
        },
      }],
    }

    chartInstance.current.setOption(option)

    chartInstance.current.on('click', (params: any) => {
      if (params.dataType === 'node' && onNodeClick) {
        const node = safeData.nodes.find(n => n.id === params.data.id)
        if (node) onNodeClick(node)
      }
    })

    const handleResize = () => {
      if (mountedRef.current) chartInstance.current?.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (mountedRef.current && chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [safeData, onNodeClick])

  // 按 bloom 分类统计
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {}
    safeData.nodes.forEach(n => {
      const lvl = n.bloomLevel || 'understand'
      counts[lvl] = (counts[lvl] || 0) + 1
    })
    return counts
  }, [safeData.nodes])

  return (
    <div className="relative w-full">
      <div ref={chartRef} style={{ width: '100%', height: 420 }} />

      {/* Bloom 分类图例（右下角） */}
      <div className="absolute bottom-3 right-3 bg-white/85 dark:bg-gray-800/85 backdrop-blur-sm rounded-lg px-3 py-2 text-xs shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(bloomLabels).map(([key, label]) => (
            <span key={key} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bloomColors[key] }} />
              <span className="text-gray-500 dark:text-gray-400">
                {label}{categoryStats[key] ? ` ${categoryStats[key]}` : ''}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
})

GraphContent.displayName = 'GraphContent'

const KnowledgeGraph = memo((props: KnowledgeGraphProps) => (
  <ErrorBoundary>
    <GraphContent {...props} />
  </ErrorBoundary>
))

KnowledgeGraph.displayName = 'KnowledgeGraph'

export default KnowledgeGraph
