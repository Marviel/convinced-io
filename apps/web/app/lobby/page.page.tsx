'use client'

import React, { useEffect } from 'react'
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
  TextField,
  Grid,
  IconButton,
  Tooltip,
  Snackbar,
  Chip,
  Switch,
} from '@mui/material'
import { useRouter } from 'next/navigation'
import { styled } from '@mui/material/styles'
import { AVAILABLE_SPRITES } from '../../utils/sprites'
import Image from 'next/image'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import { createClient } from '@supabase/supabase-js'

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

const SpriteGrid = styled(Grid)({
  maxHeight: '200px',
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#222',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#666',
    borderRadius: '4px',
  },
})

const SpriteButton = styled(IconButton)(({ selected }: { selected?: boolean }) => ({
  padding: '4px',
  border: selected ? '2px solid #1976d2' : '2px solid transparent',
  borderRadius: '4px',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
}))

const StyledTextField = styled(TextField)({
  '& .MuiInputLabel-root': {
    color: '#fff',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#fff',
  },
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: '#666',
    },
    '&:hover fieldset': {
      borderColor: '#999',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#fff',
    },
  },
  '& .MuiOutlinedInput-input': {
    color: '#fff',
  },
})

interface GameSettings {
  numNPCs: number;
  difficulty: string;
}

interface Player {
  id: string;
  display_name: string;
  is_host: boolean;
  is_ready: boolean;
  is_spectator: boolean;
  sprite_name: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Lobby() {
  const [gameSettings, setGameSettings] = React.useState<GameSettings>({
    numNPCs: 5,
    difficulty: 'medium'
  })
  const [selectedSprite, setSelectedSprite] = React.useState<string>(AVAILABLE_SPRITES[0] || '')
  const [isReady, setIsReady] = React.useState(false)
  const [players, setPlayers] = React.useState<Player[]>([])
  const [currentUser, setCurrentUser] = React.useState<Player | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [gameId, setGameId] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('gameId')
    if (id) setGameId(id)
  }, [])

  React.useEffect(() => {
    const fetchGameData = async () => {
      if (!gameId) return

      try {
        // Fetch game settings
        const { data: gameRoom, error: gameError } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('id', gameId)
          .single()

        if (gameError) throw gameError

        setGameSettings({
          numNPCs: gameRoom.num_npcs || 5,
          difficulty: gameRoom.difficulty || 'medium'
        })

        // Fetch current user's session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        // Fetch all participants
        const { data: participants, error: participantsError } = await supabase
          .from('game_participants')
          .select('*')
          .eq('game_room_id', gameId)

        if (participantsError) throw participantsError

        setPlayers(participants)
        const currentUserData = participants.find(p => p.user_id === session?.user.id)
        if (currentUserData) {
          setCurrentUser(currentUserData)
          setSelectedSprite(currentUserData.sprite_name)
          setIsReady(currentUserData.is_ready)
        }
      } catch (error) {
        console.error('Error fetching game data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGameData()

    // Set up real-time subscriptions
    const participantsSubscription = supabase
      .channel('game_participants_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_participants',
          filter: `game_room_id=eq.${gameId}`
        },
        () => {
          fetchGameData()
        }
      )
      .subscribe()

    return () => {
      participantsSubscription.unsubscribe()
    }
  }, [gameId])

  const handleSpriteChange = async (sprite: string) => {
    if (!currentUser || !gameId) return

    try {
      const { error } = await supabase
        .from('game_participants')
        .update({ sprite_name: sprite })
        .eq('game_room_id', gameId)
        .eq('user_id', currentUser.id)

      if (error) throw error
      setSelectedSprite(sprite)
    } catch (error) {
      console.error('Error updating sprite:', error)
    }
  }

  const handleReadyToggle = async () => {
    if (!currentUser || !gameId) return

    try {
      console.log(currentUser.id)
      const { error } = await supabase
        .from('game_participants')
        .update({ is_ready: !isReady })
        .eq('game_room_id', gameId)
        .eq('user_id', currentUser.id)

      if (error) throw error
      setIsReady(!isReady)
    } catch (error) {
      console.error('Error updating ready status:', error)
    }
  }

  const handleSettingsChange = async (settings: Partial<GameSettings>) => {
    if (!currentUser?.is_host || !gameId) return

    try {
      const { error } = await supabase
        .from('game_rooms')
        .update(settings)
        .eq('id', gameId)

      if (error) throw error
      setGameSettings({ ...gameSettings, ...settings })
    } catch (error) {
      console.error('Error updating game settings:', error)
    }
  }

  const handleStartGame = async () => {
    if (!currentUser?.is_host || !gameId) return

    const allPlayersReady = players
      .filter(p => !p.is_spectator && !p.is_host)
      .every(p => p.is_ready)

    if (!allPlayersReady) {
      alert('All players must be ready to start the game')
      return
    }

    try {
      const { error } = await supabase
        .from('game_rooms')
        .update({ status: 'in_progress' })
        .eq('id', gameId)

      if (error) throw error
      router.push(`/game/${gameId}`)
    } catch (error) {
      console.error('Error starting game:', error)
    }
  }

  const handleCopyGameId = () => {
    if (gameId) {
      navigator.clipboard.writeText(gameId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <StyledContainer>
      <Typography variant="h3" component="h1" gutterBottom sx={{ color: '#fff' }}>
        Welcome, {currentUser?.display_name}!
      </Typography>

      {gameId && (
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            backgroundColor: '#222',
            padding: '8px 16px',
            borderRadius: '4px',
            marginBottom: 2,
            width: 'fit-content'
          }}
        >
          <Typography sx={{ color: '#fff' }}>
            Game ID: {gameId}
          </Typography>
          <Tooltip title={copied ? "Copied!" : "Copy Game ID"}>
            <IconButton 
              onClick={handleCopyGameId}
              size="small"
              sx={{ 
                color: copied ? '#4caf50' : '#fff',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              {copied ? <CheckIcon /> : <ContentCopyIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <StyledPaper elevation={3}>
        <SettingsSection>
          <Typography variant="h5" gutterBottom>
            Player Settings
          </Typography>

          <Box>
            <Typography gutterBottom>Select Your Sprite</Typography>
            <SpriteGrid container spacing={1}>
              {AVAILABLE_SPRITES.map((sprite) => (
                <Grid item key={sprite}>
                  <SpriteButton
                    selected={selectedSprite === sprite}
                    onClick={() => handleSpriteChange(sprite)}
                  >
                    <Image
                      src={`/assets/sprites/${sprite}_fr2.gif`}
                      alt={sprite}
                      width={32}
                      height={32}
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </SpriteButton>
                </Grid>
              ))}
            </SpriteGrid>
          </Box>

          <Divider sx={{ my: 3, backgroundColor: '#333' }} />

          <Typography variant="h5" gutterBottom>
            Game Settings {!currentUser?.is_host && '(Host Only)'}
          </Typography>

          <Box>
            <Typography gutterBottom>Number of NPCs: {gameSettings.numNPCs}</Typography>
            <Slider
              value={gameSettings.numNPCs}
              onChange={(_, value) => handleSettingsChange({ numNPCs: value as number })}
              disabled={!currentUser?.is_host}
              min={5}
              max={10}
              step={1}
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
              value={gameSettings.difficulty}
              label="Difficulty"
              onChange={(e) => handleSettingsChange({ difficulty: e.target.value })}
              disabled={!currentUser?.is_host}
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
            {loading ? (
              <ListItem>
                <Typography sx={{ color: '#fff' }}>Loading players...</Typography>
              </ListItem>
            ) : players.length === 0 ? (
              <ListItem>
                <Typography sx={{ color: '#fff' }}>No players in lobby</Typography>
              </ListItem>
            ) : (
              players.map((player) => (
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
                    <Image
                      src={`/assets/sprites/${player.sprite_name}_fr2.gif`}
                      alt={player.sprite_name}
                      width={32}
                      height={32}
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </ListItemAvatar>
                  <ListItemText 
                    primary={player.display_name}
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography sx={{ color: player.is_ready ? '#4caf50' : '#ff9800' }}>
                          {player.is_ready ? 'Ready' : 'Not Ready'} {player.is_host && '(Host)'}
                        </Typography>
                        {player.is_spectator && (
                          <Chip 
                            label="Spectator" 
                            size="small"
                            sx={{ 
                              backgroundColor: '#666',
                              color: '#fff'
                            }} 
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))
            )}
          </List>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
          {currentUser?.is_host ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleStartGame}
              fullWidth
              disabled={!players.filter(p => !p.is_spectator && !p.is_host).every(p => p.is_ready)}
              sx={{
                py: 1.5,
                backgroundColor: '#1976d2',
                '&:hover': {
                  backgroundColor: '#1565c0',
                },
                '&.Mui-disabled': {
                  backgroundColor: '#333',
                }
              }}
            >
              Start Game
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleReadyToggle}
              fullWidth
              color={isReady ? "success" : "warning"}
              sx={{
                py: 1.5,
                '&.MuiButton-containedSuccess': {
                  backgroundColor: '#4caf50',
                  '&:hover': {
                    backgroundColor: '#388e3c',
                  },
                },
                '&.MuiButton-containedWarning': {
                  backgroundColor: '#ff9800',
                  '&:hover': {
                    backgroundColor: '#f57c00',
                  },
                }
              }}
            >
              {isReady ? "Ready!" : "Click when ready"}
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={() => router.push('/')}
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

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Game ID copied to clipboard"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </StyledContainer>
  )
} 