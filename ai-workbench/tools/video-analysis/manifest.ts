import { ToolManifest } from '@/types/tool'
import { VideoAnalysisTool } from './component'

export const videoAnalysisTool: ToolManifest = {
  id: 'video-analysis',
  name: '视频分析',
  description: '输入 YouTube / B站 URL，自动转录、生成摘要与章节',
  icon: 'Video',
  category: 'media',
  tags: ['视频', '转录', 'YouTube', '摘要'],
  component: VideoAnalysisTool,
  enabled: true,
  route: '/tools/video-analysis',
  accentColor: 'rose',
}
