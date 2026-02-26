import { ToolManifest } from '@/types/tool'
import { DataAnalysisTool } from './component'

export const dataAnalysisTool: ToolManifest = {
  id: 'data-analysis',
  name: '数据分析',
  description: '上传 CSV/Excel，用自然语言提问，自动生成图表与洞察报告',
  icon: 'BarChart2',
  category: 'analysis',
  tags: ['数据', '图表', 'CSV', '洞察'],
  component: DataAnalysisTool,
  enabled: true,
  route: '/tools/data-analysis',
  accentColor: 'emerald',
}
