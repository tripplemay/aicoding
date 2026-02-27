import { ToolManifest } from '@/lib/tool-manifest'
import { SeoAssistantTool } from './component'

export const seoAssistantTool: ToolManifest = {
  id: 'seo-assistant',
  name: 'SEO Assistant',
  description: '生成 SEO 标题、描述与关键词建议',
  icon: 'PenLine',
  category: 'writing',
  tags: ["SEO","写作","关键词"],
  component: SeoAssistantTool,
  enabled: true,
  route: '/tools/seo-assistant',
}
