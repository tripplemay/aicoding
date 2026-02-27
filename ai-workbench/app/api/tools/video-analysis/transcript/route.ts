import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { YoutubeTranscript } from 'youtube-transcript'
import { exec } from 'child_process'
import { promisify } from 'util'
import { createReadStream, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import OpenAI from 'openai'

const execAsync = promisify(exec)

// ─── URL helpers ──────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  )
  return m?.[1] ?? null
}

function isYouTubeUrl(url: string) {
  return /youtube\.com|youtu\.be/.test(url)
}

// ─── Strategy 1: YouTube native captions ─────────────────────────────────────

async function fetchYouTubeCaption(videoId: string): Promise<string> {
  // Try preferred languages in order
  const langs = ['zh-Hans', 'zh', 'zh-TW', 'en']

  for (const lang of langs) {
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId, { lang })
      if (items.length > 0) return formatTranscript(items)
    } catch {
      continue
    }
  }

  // Last resort: no lang preference
  const items = await YoutubeTranscript.fetchTranscript(videoId)
  return formatTranscript(items)
}

function formatTranscript(
  items: { text: string; offset: number }[],
): string {
  return items
    .map((item) => {
      const secs = Math.floor(item.offset / 1000)
      const m = Math.floor(secs / 60)
      const s = secs % 60
      return `[${m}:${s.toString().padStart(2, '0')}] ${item.text.replace(/\n/g, ' ')}`
    })
    .join('\n')
}

// ─── Strategy 2: yt-dlp + Whisper ────────────────────────────────────────────

// Resolve absolute path for a binary — avoids child_process PATH inheritance issues
function resolveBin(name: string): string {
  const candidates = [
    `/opt/homebrew/bin/${name}`,  // macOS Apple Silicon (Homebrew)
    `/usr/local/bin/${name}`,     // macOS Intel (Homebrew) / Linux pip
    `/usr/bin/${name}`,           // Linux system
    `/root/.local/bin/${name}`,   // Linux pip --user
  ]
  const found = candidates.find((p) => existsSync(p))
  if (found) return found
  // Last resort: bare name (works if shell PATH is correct)
  return name
}

async function fetchViaWhisper(url: string): Promise<string> {
  const ytdlp = resolveBin('yt-dlp')
  const ffmpeg = resolveBin('ffmpeg')
  const base = join(tmpdir(), `ytaudio_${Date.now()}`)
  const audioPath = base + '.mp3'

  try {
    // Pass --ffmpeg-location so yt-dlp finds ffmpeg regardless of its own PATH
    await execAsync(
      `"${ytdlp}" -x --audio-format mp3 --audio-quality 5 --no-playlist --ffmpeg-location "${ffmpeg}" -o "${base}.%(ext)s" "${url}"`,
      { timeout: 180_000 },
    )

    if (!existsSync(audioPath)) {
      throw new Error('yt-dlp did not produce audio file. Is ffmpeg installed?')
    }

    // Whisper transcription — configurable endpoint (default: Groq free API)
    const whisperKey = process.env.WHISPER_API_KEY ?? process.env.OPENAI_API_KEY
    const whisperBase = process.env.WHISPER_BASE_URL ?? 'https://api.groq.com/openai/v1'
    const whisperModel = process.env.WHISPER_MODEL ?? 'whisper-large-v3'
    const openai = new OpenAI({ apiKey: whisperKey, baseURL: whisperBase })
    const result = await openai.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: whisperModel,
      response_format: 'text',
    })

    return typeof result === 'string' ? result : (result as { text: string }).text
  } finally {
    if (existsSync(audioPath)) {
      try { unlinkSync(audioPath) } catch { /* ignore */ }
    }
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export interface TranscriptResponse {
  transcript: string
  source: 'caption' | 'whisper'
  truncated: boolean
}

const MAX_TRANSCRIPT_CHARS = 15_000

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { url } = await req.json()
  if (!url?.trim()) return new Response('Missing URL', { status: 400 })

  const youtubeId = isYouTubeUrl(url) ? extractYouTubeId(url) : null

  // Strategy 1: YouTube native captions
  if (youtubeId) {
    try {
      const raw = await fetchYouTubeCaption(youtubeId)
      const truncated = raw.length > MAX_TRANSCRIPT_CHARS
      return Response.json({
        transcript: truncated ? raw.slice(0, MAX_TRANSCRIPT_CHARS) : raw,
        source: 'caption',
        truncated,
      } satisfies TranscriptResponse)
    } catch {
      // Fall through to Whisper
    }
  }

  // Strategy 2: yt-dlp + Whisper
  try {
    const raw = await fetchViaWhisper(url)
    const truncated = raw.length > MAX_TRANSCRIPT_CHARS
    return Response.json({
      transcript: truncated ? raw.slice(0, MAX_TRANSCRIPT_CHARS) : raw,
      source: 'whisper',
      truncated,
    } satisfies TranscriptResponse)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // stderr is available on exec errors
    const stderr = (err as { stderr?: string }).stderr?.trim() ?? ''
    const detail = stderr || msg

    console.error('[video-analysis] fetchViaWhisper error:', detail)

    // ENOENT = binary not found on disk (genuine "not installed" case)
    if (/ENOENT|No such file or directory/i.test(msg)) {
      return new Response(
        'yt-dlp 未找到，请安装：macOS 执行 `brew install yt-dlp ffmpeg`，Linux 执行 `pip install yt-dlp && apt install ffmpeg`',
        { status: 422 },
      )
    }
    // Return the actual yt-dlp / Whisper error message
    return new Response('转录失败：' + detail.slice(0, 600), { status: 500 })
  }
}
