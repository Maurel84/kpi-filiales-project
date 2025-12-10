import React from 'react'

const baseEmbedUrl = (import.meta.env.VITE_PBI_EMBED_URL as string) || ''

export const PowerBIPage: React.FC<{ filiale?: string; year?: number; month?: number }> = ({
  filiale,
  year,
  month
}) => {
  const url = React.useMemo(() => {
    if (!baseEmbedUrl) return ''
    const filters: string[] = []
    if (filiale) filters.push(`Filiale/Code eq '${filiale}'`)
    if (year) filters.push(`DateTable/Year eq ${year}`)
    if (month) filters.push(`DateTable/MonthNumber eq ${month}`)
    let u = baseEmbedUrl
    if (filters.length) {
      const sep = u.includes('?') ? '&' : '?'
      u = `${u}${sep}filter=${encodeURIComponent(filters.join(' and '))}`
    }
    const sep2 = u.includes('?') ? '&' : '?'
    u = `${u}${sep2}navContentPaneEnabled=false&filterPaneEnabled=false&pageView=FitToWidth`
    return u
  }, [filiale, year, month])

  if (!baseEmbedUrl) return <div className="p-4 text-sm text-amber-300">VITE_PBI_EMBED_URL non configurée</div>
  return <iframe title="PowerBI" src={url} className="w-full h-[70vh]" style={{ border: 'none' }} />
}
