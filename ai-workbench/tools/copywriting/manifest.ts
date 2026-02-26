import { ToolManifest } from '@/types/tool'
import { CopywritingTool } from './component'

export const copywritingTool: ToolManifest = {
  id: 'copywriting',
  name: '文案撰写',
  description: '一键生成博客、社媒文案、邮件、广告语，支持润色与翻译',
  icon: 'PenLine',
  category: 'writing',
  tags: ['写作', '文案', 'AI生成', '翻译'],
  component: CopywritingTool,
  enabled: true,
  route: '/tools/copywriting',
  accentColor: 'violet',
}
