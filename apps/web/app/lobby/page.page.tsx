'use client'

import React from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Slider,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';

import { AVAILABLE_SPRITES } from '../../utils/sprites';
import { supabase } from '../sdk/supabase';

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
  num_npcs: number;
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

export default function Lobby() {
  const [gameSettings, setGameSettings] = React.useState<GameSettings>({
    num_npcs: 5,
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
          num_npcs: gameRoom.num_npcs || 5,
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

        // If game has started, redirect to game
        if (gameRoom.status === 'in_progress') {
          router.push(`/game/${gameId}`)
        }
      } catch (error) {
        console.error('Error fetching game data:', error)
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchGameData()

    // Set up real-time subscriptions
    // const participantsSubscription = supabase
    //   .channel('game_participants_changes')
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: '*',
    //       schema: 'public',
    //       table: 'game_participants',
    //       filter: `game_room_id=eq.${gameId}`
    //     },
    //     () => {
    //       fetchGameData()
    //     }
    //   )
    //   .subscribe()
    // Set up polling interval
    // const gameRoomSubscription = supabase
    //   .channel('game_room_changes')
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: '*',
    //       schema: 'public',
    //       table: 'game_rooms',
    //       filter: `id=eq.${gameId}`
    //     },
    //     () => {
    //       fetchGameData()
    //     }
    //   )
    //   .subscribe()
    const interval = setInterval(fetchGameData, 1000)

    // return () => {
    //   participantsSubscription.unsubscribe()
    //   gameRoomSubscription.unsubscribe()
    // }
    // Cleanup
    return () => clearInterval(interval)
  }, [gameId, router])

  const handleSpriteChange = async (sprite: string) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.user?.id || !gameId) {
        console.error('Error getting session:', sessionError)
        return
      }

      const { error } = await supabase
        .from('game_participants')
        .update({ sprite_name: sprite })
        .eq('game_room_id', gameId)
        .eq('user_id', session.user.id)

      if (error) throw error
      setSelectedSprite(sprite)
    } catch (error) {
      console.error('Error updating sprite:', error)
    }
  }

  const handleReadyToggle = async () => {
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Error getting session:', sessionError)
        return
      }

      if (!session?.user?.id || !gameId) {
        console.error('No user session or game ID')
        return
      }

      // Update ready status
      const { error: updateError } = await supabase
        .from('game_participants')
        .update({ is_ready: !isReady })
        .eq('game_room_id', gameId)
        .eq('user_id', session.user.id)

      if (updateError) {
        console.error('Error updating ready status:', updateError)
        return
      }

      setIsReady(!isReady)
    } catch (error) {
      console.error('Error updating ready status:', error)
    }
  }

  const handleSettingsChange = async (settings: Partial<GameSettings>) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.user?.id || !gameId) {
        console.error('Error getting session:', sessionError)
        return
      }

      // Verify user is host
      const { data: participant, error: participantError } = await supabase
        .from('game_participants')
        .select('is_host')
        .eq('game_room_id', gameId)
        .eq('user_id', session.user.id)
        .single()

      if (participantError || !participant?.is_host) {
        console.error('User is not host')
        return
      }

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
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.user?.id || !gameId) {
        console.error('Error getting session:', sessionError)
        return
      }

      // Verify user is host
      const { data: participant, error: participantError } = await supabase
        .from('game_participants')
        .select('is_host')
        .eq('game_room_id', gameId)
        .eq('user_id', session.user.id)
        .single()

      if (participantError || !participant?.is_host) {
        console.error('User is not host')
        return
      }

      // Check if all players are ready
      const { data: players, error: playersError } = await supabase
        .from('game_participants')
        .select('*')
        .eq('game_room_id', gameId)
        .eq('is_spectator', false)

      if (playersError) throw playersError

      const allPlayersReady = players
        .filter(p => !p.is_host)
        .every(p => p.is_ready)

      if (!allPlayersReady) {
        alert('All players must be ready to start the game')
        return
      }

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

  const handleLeaveLobby = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.user?.id || !gameId) {
        console.error('Error getting session:', sessionError)
        return
      }

      // Remove participant
      const { error: removeError } = await supabase
        .from('game_participants')
        .delete()
        .eq('game_room_id', gameId)
        .eq('user_id', session.user.id)

      if (removeError) {
        console.error('Error removing participant:', removeError)
        return
      }

      // If user was not a spectator, decrease current_players count
      if (!currentUser?.is_spectator) {
        const { error: updateError } = await supabase
          .from('game_rooms')
          .update({
            current_players: supabase.rpc('decrement_current_players', { game_room_id: gameId })
          })
          .eq('id', gameId)

        if (updateError) {
          console.error('Error updating player count:', updateError)
        }
      }

      // If user was host, delete the game room
      if (currentUser?.is_host) {
        const { error: deleteError } = await supabase
          .from('game_rooms')
          .delete()
          .eq('id', gameId)

        if (deleteError) {
          console.error('Error deleting game room:', deleteError)
        }
      }

      router.push('/')
    } catch (error) {
      console.error('Error leaving lobby:', error)
    }
  }

  const handleKickPlayer = async (userId: string) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.user?.id || !gameId) {
        console.error('Error getting session:', sessionError)
        return
      }

      // Verify user is host
      const { data: host, error: hostError } = await supabase
        .from('game_participants')
        .select('is_host')
        .eq('game_room_id', gameId)
        .eq('user_id', session.user.id)
        .single()

      if (hostError || !host?.is_host) {
        console.error('User is not host')
        return
      }

      // Remove participant
      const { error: removeError } = await supabase
        .from('game_participants')
        .delete()
        .eq('game_room_id', gameId)
        .eq('user_id', userId)

      if (removeError) {
        console.error('Error kicking player:', removeError)
        return
      }

      // Update player count if not a spectator
      const kickedPlayer = players.find(p => p.id === userId)
      if (kickedPlayer && !kickedPlayer.is_spectator) {
        const { error: updateError } = await supabase
          .from('game_rooms')
          .update({
            current_players: supabase.rpc('decrement_current_players', { game_room_id: gameId })
          })
          .eq('id', gameId)

        if (updateError) {
          console.error('Error updating player count:', updateError)
        }
      }
    } catch (error) {
      console.error('Error kicking player:', error)
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
          component="span"
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
          <Typography component="span" sx={{ color: '#fff' }}>
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
            Game Settings {!currentUser?.is_host && '(View Only)'}
          </Typography>

          <Box>
            <Typography component="span" gutterBottom>
              Number of NPCs: {gameSettings.num_npcs}
            </Typography>
            <Slider
              value={gameSettings.num_npcs}
              onChange={(_, value) => handleSettingsChange({ num_npcs: value as number })}
              disabled={!currentUser?.is_host}
              min={5}
              max={10}
              step={1}
              marks
              sx={{
                color: currentUser?.is_host ? '#1976d2' : '#666',
                '& .MuiSlider-mark': {
                  backgroundColor: '#666',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: '#444',
                },
                '& .Mui-disabled': {
                  color: '#666',
                }
              }}
            />
          </Box>

          <FormControl fullWidth sx={{
            '& .MuiInputLabel-root': { color: '#fff' },
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': { borderColor: '#666' },
              '&:hover fieldset': { borderColor: currentUser?.is_host ? '#999' : '#666' },
              '&.Mui-focused fieldset': { borderColor: currentUser?.is_host ? '#fff' : '#666' },
              '&.Mui-disabled': {
                color: '#fff',
                '& fieldset': { borderColor: '#666' },
              }
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
            ) : (
              <>
                {/* Active Players */}
                {players
                  .filter(player => !player.is_spectator)
                  .map((player) => (
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
                        primary={
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {player.display_name}
                            {player.is_host && (
                              <Chip
                                component="span"
                                label="Host"
                                size="small"
                                sx={{
                                  backgroundColor: '#1976d2',
                                  color: '#fff'
                                }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography
                            component="span"
                            sx={{ color: player.is_ready ? '#4caf50' : '#ff9800' }}
                          >
                            {player.is_ready ? 'Ready' : 'Not Ready'}
                          </Typography>
                        }
                      />
                      {currentUser?.is_host && !player.is_host && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => handleKickPlayer(player.id)}
                          sx={{
                            ml: 1,
                            borderColor: '#d32f2f',
                            color: '#d32f2f',
                            '&:hover': {
                              borderColor: '#f44336',
                              backgroundColor: 'rgba(244, 67, 54, 0.1)',
                            }
                          }}
                        >
                          Kick
                        </Button>
                      )}
                    </ListItem>
                  ))}

                {/* Spectators Section */}
                {players.some(player => player.is_spectator) && (
                  <>
                    <Typography component="span" variant="h6" sx={{ mt: 3, mb: 1, color: '#666' }}>
                      Spectators
                    </Typography>
                    {players
                      .filter(player => player.is_spectator)
                      .map((spectator) => (
                        <ListItem
                          key={spectator.id}
                          sx={{
                            backgroundColor: '#1a1a1a',
                            mb: 1,
                            borderRadius: 1,
                            '&:hover': {
                              backgroundColor: '#2a2a2a',
                            }
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ backgroundColor: '#666' }}>
                              <VisibilityIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={spectator.display_name}
                            sx={{
                              '& .MuiListItemText-primary': {
                                color: '#999'
                              }
                            }}
                            primaryTypographyProps={{
                              component: 'span'
                            }}
                          />
                          {currentUser?.is_host && (
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => handleKickPlayer(spectator.id)}
                              sx={{
                                ml: 1,
                                borderColor: '#d32f2f',
                                color: '#d32f2f',
                                '&:hover': {
                                  borderColor: '#f44336',
                                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                }
                              }}
                            >
                              Kick
                            </Button>
                          )}
                        </ListItem>
                      ))}
                  </>
                )}
              </>
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
            onClick={handleLeaveLobby}
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ position: 'fixed' }}
      >
        <Box
          sx={{
            backgroundColor: '#333',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          Game ID copied to clipboard
        </Box>
      </Snackbar>
    </StyledContainer>
  )
} 