export const CATEGORIES = [
  { value: 'nextjs',   label: 'Next.js' },
  { value: 'react',    label: 'React' },
  { value: 'nodejs',   label: 'Node.js' },
  { value: 'python',   label: 'Python' },
  { value: 'devops',   label: 'DevOps' },
  { value: 'ai',       label: 'AI / ML' },
  { value: 'cli',      label: 'CLI Tool' },
  { value: 'template', label: 'Template' },
  { value: 'ebook',    label: 'eBook' },
  { value: 'other',    label: 'Other' },
]

export const TECH_STACK_OPTIONS = [
  'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust',
  'React', 'Next.js', 'Vue', 'Svelte', 'Astro',
  'Node.js', 'Express', 'Fastify', 'NestJS',
  'Tailwind CSS', 'Shadcn/ui', 'Prisma', 'Drizzle',
  'Supabase', 'Firebase', 'PostgreSQL', 'MongoDB',
  'Docker', 'Kubernetes', 'AWS', 'Vercel', 'Cloudflare',
  'OpenAI', 'LangChain', 'Stripe', 'Razorpay',
]

export function getCategoryLabel(value: string) {
  return CATEGORIES.find(c => c.value === value)?.label || value
}