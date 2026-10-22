import { useEffect, useState } from 'react'

export function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(max-width: 860px)').matches,
  )

  useEffect(() => {
    const query = window.matchMedia('(max-width: 860px)')
    const onChange = () => setMobile(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return mobile
}
