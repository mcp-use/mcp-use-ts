import { useEffect, useState } from 'react'
import { BlurFade } from '@/components/ui/blur-fade'
import { RandomGradientBackground } from '@/components/ui/random-gradient-background'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

interface ServerIconProps {
  serverUrl?: string
  serverName?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ServerIcon({
  serverUrl,
  serverName,
  className,
  size = 'md',
}: ServerIconProps) {
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null)
  const [faviconError, setFaviconError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  useEffect(() => {
    if (!serverUrl)
      return

    const fetchFavicon = async () => {
      setIsLoading(true)
      setFaviconError(false)

      try {
        const encodedUrl = encodeURIComponent(serverUrl)
        const proxyUrl = `/inspector/api/favicon/${encodedUrl}`

        // Test if favicon exists
        const response = await fetch(proxyUrl)
        if (response.ok) {
          setFaviconUrl(proxyUrl)
        }
        else {
          setFaviconError(true)
        }
      }
      catch {
        setFaviconError(true)
      }
      finally {
        setIsLoading(false)
      }
    }

    fetchFavicon()
  }, [serverUrl])

  // Generate a consistent color based on server name or URL
  const getServerColor = () => {
    const seed = serverName || serverUrl || 'default'
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }

    const hue = Math.abs(hash) % 360
    return `oklch(0.4 0.2 ${hue})`
  }

  return (
    <div className={cn('rounded-full overflow-hidden flex-shrink-0', sizeClasses[size], className)}>
      {isLoading
        ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-100/20 dark:bg-gray-800">
              <Spinner className="text-gray-200" />
            </div>
          )
        : faviconUrl && !faviconError
          ? (
              <BlurFade
                duration={0.6}
                delay={0.1}
                blur="8px"
                direction="up"
                className="w-full h-full"
              >
                <img
                  src={faviconUrl}
                  alt={`${serverName || 'Server'} favicon`}
                  className="w-full h-full object-cover"
                  onError={() => setFaviconError(true)}
                />
              </BlurFade>
            )
          : (
              <RandomGradientBackground
                className="w-full h-full"
                color={getServerColor()}
              >
                <div className="w-full h-full flex items-center justify-center text-white font-semibold text-xs">
                  {serverName ? serverName.charAt(0).toUpperCase() : 'S'}
                </div>
              </RandomGradientBackground>
            )}
    </div>
  )
}
