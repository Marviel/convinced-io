'use client'

import { useEffect, useState } from 'react'
import { 
  Container, 
  Typography, 
  Button, 
  Slider, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar,
  Box,
  Divider,
  CircularProgress
} from '@mui/material'
import { createClient } from '../../utils/supabase/client'
import { useRouter } from 'next/navigation'
import { styled } from '@mui/material/styles'

const StyledContainer = styled(Container)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minHeight: '100vh',
  gap: '20px',
  padding: '2rem',
  backgroundColor: '#000',
  color: '#fff'
})

const StyledPaper = styled(Paper)({
  padding: '2rem',
  backgroundColor: '#111',
  color: '#fff',
  width: '100%',
  maxWidth: '800px',
})

const SettingsSection = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  marginBottom: '2rem',
})

// Mock data for players (will be replaced with real data later)
const mockPlayers = [
  { id: 1, name: 'Player 1', status: 'Ready', avatar: '🎮' },
  { id: 2, name: 'Player 2', status: 'Not Ready', avatar: '🎲' },
  { id: 3, name: 'Player 3', status: 'Ready', avatar: '🎯' },
]

export default function Lobby() {
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [numNPCs, setNumNPCs] = useState<number>(20)
  const [difficulty, setDifficulty] = useState<string>('medium')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setUsername(user.user_metadata?.full_name || user.email || 'Guest')
        setLoading(false)
      } else {
        router.push('/login')
      }
    }

    fetchUser()
  }, [router])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleStartGame = () => {
    router.push('/game/new')
  }

  if (loading) {
    return (
      <StyledContainer>
        <CircularProgress sx={{ color: 'white' }} />
      </StyledContainer>
    )
  }

  return (
    <StyledContainer>
      <Typography variant="h3" component="h1" gutterBottom sx={{ color: '#fff' }}>
        Welcome, {username}!
      </Typography>

      <StyledPaper elevation={3}>
        <SettingsSection>
          <Typography variant="h5" gutterBottom>
            Game Settings
          </Typography>

          <Box>
            <Typography gutterBottom>Number of NPCs: {numNPCs}</Typography>
            <Slider
              value={numNPCs}
              onChange={(_, value) => setNumNPCs(value as number)}
              min={5}
              max={50}
              step={5}
              marks
              sx={{
                color: '#1976d2',
                '& .MuiSlider-mark': {
                  backgroundColor: '#666',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: '#444',
                }
              }}
            />
          </Box>

          <FormControl fullWidth sx={{ 
            '& .MuiInputLabel-root': { color: '#fff' },
            '& .MuiOutlinedInput-root': { 
              color: '#fff',
              '& fieldset': { borderColor: '#666' },
              '&:hover fieldset': { borderColor: '#999' },
              '&.Mui-focused fieldset': { borderColor: '#fff' },
            }
          }}>
            <InputLabel>Difficulty</InputLabel>
            <Select
              value={difficulty}
              label="Difficulty"
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <MenuItem value="easy">Easy</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="hard">Hard</MenuItem>
              <MenuItem value="expert">Expert</MenuItem>
            </Select>
          </FormControl>
        </SettingsSection>

        <Divider sx={{ my: 3, backgroundColor: '#333' }} />

        <Box>
          <Typography variant="h5" gutterBottom>
            Players in Lobby
          </Typography>
          <List>
            {mockPlayers.map((player) => (
              <ListItem 
                key={player.id}
                sx={{
                  backgroundColor: '#222',
                  mb: 1,
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: '#333',
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ backgroundColor: '#1976d2' }}>
                    {player.avatar}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={player.name}
                  secondary={
                    <Typography sx={{ color: player.status === 'Ready' ? '#4caf50' : '#ff9800' }}>
                      {player.status}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleStartGame}
            fullWidth
            sx={{
              py: 1.5,
              backgroundColor: '#1976d2',
              '&:hover': {
                backgroundColor: '#1565c0',
              }
            }}
          >
            Start Game
          </Button>
          <Button
            variant="outlined"
            onClick={handleLogout}
            fullWidth
            sx={{
              py: 1.5,
              borderColor: '#666',
              color: '#fff',
              '&:hover': {
                borderColor: '#999',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            Leave Lobby
          </Button>
        </Box>
      </StyledPaper>
    </StyledContainer>
  )
} 