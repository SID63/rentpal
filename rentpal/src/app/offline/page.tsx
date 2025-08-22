import OfflineContent from './OfflineContent'

export default function OfflinePage() {
  // Server component wrapper: renders client UI inside
  return <OfflineContent />
}

export const metadata = {
  title: 'Offline - RentPal',
  description: 'You are currently offline. Some features may not be available.',
}