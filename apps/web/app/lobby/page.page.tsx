'use client'

import { useEffect, useState } from 'react'
import { Container, Typography, Button } from '@mui/material'
import { createClient } from '../../utils/supabase/client'
import { useRouter } from 'next/navigation'
import { styled } from '@mui/material/styles'

const StyledContainer = styled(Container)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  gap: '20px'
})

export default function Lobby() {
  const [username, setUsername] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUsername(user?.email || 'Guest')
    }

    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleStartGame = () => {
    router.push('/game/new') // You'll need to implement this route later
  }

  return (
    <StyledContainer>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome, {username}!
      </Typography>

      <Button
        variant="contained"
        color="primary"
        onClick={handleStartGame}
        sx={{ mb: 2 }}
      >
        Start New Game
      </Button>

      <Button
        variant="outlined"
        color="secondary"
        onClick={handleLogout}
      >
        Logout
      </Button>
    </StyledContainer>
  )
} 