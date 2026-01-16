import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  // Always redirect to /start
  useEffect(() => {
    navigate('/start')
  }, [navigate])

  return null
}
