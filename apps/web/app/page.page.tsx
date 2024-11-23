'use client';

import React from 'react'
import { 
  Container, 
  Typography, 
  Button, 
  Paper, 
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  ButtonGroup,
} from '@mui/material'
import { useRouter } from 'next/navigation'
import { styled } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import GroupIcon from '@mui/icons-material/Group'
import VisibilityIcon from '@mui/icons-material/Visibility'
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

interface Game {
  id: string;
  _name: string;
  current_players: number;
  max_players: number;
  status: string;
  spectators_count?: number;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
)

interface CreateGameDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (gameName: string, displayName: string) => void;
}

const CreateGameDialog = ({ open, onClose, onSubmit }: CreateGameDialogProps) => {
  const [gameName, setGameName] = React.useState('')
  const [displayName, setDisplayName] = React.useState('')

  const handleSubmit = () => {
    onSubmit(gameName, displayName)
    setGameName('')
    setDisplayName('')
  }

  const handleClose = React.useCallback(() => {
    setGameName('')
    setDisplayName('')
    onClose()
  }, [onClose])

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      slotProps={{
        backdrop: {
          style: { backgroundColor: 'rgba(0, 0, 0, 0.8)' }
        }
      }}
      PaperProps={{
        sx: {
          backgroundColor: '#222',
          color: '#fff',
        }
      }}
    >
      <DialogTitle>Create New Game</DialogTitle>
      <DialogContent>
        <StyledTextField
          autoFocus
          margin="dense"
          label="Your Display Name"
          fullWidth
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <StyledTextField
          margin="dense"
          label="Game Name"
          fullWidth
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={handleClose}
          sx={{ color: '#fff' }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={!gameName.trim() || !displayName.trim()}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}

interface JoinGameDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (gameId: string, displayName: string) => void;
}

const JoinGameDialog = ({ open, onClose, onSubmit }: JoinGameDialogProps) => {
  const [gameId, setGameId] = React.useState('')
  const [displayName, setDisplayName] = React.useState('')

  const handleSubmit = () => {
    onSubmit(gameId, displayName)
    setGameId('')
    setDisplayName('')
  }

  const handleClose = React.useCallback(() => {
    setGameId('')
    setDisplayName('')
    onClose()
  }, [onClose])

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      slotProps={{
        backdrop: {
          style: { backgroundColor: 'rgba(0, 0, 0, 0.8)' }
        }
      }}
      PaperProps={{
        sx: {
          backgroundColor: '#222',
          color: '#fff',
        }
      }}
    >
      <DialogTitle>Join Game</DialogTitle>
      <DialogContent>
        <StyledTextField
          autoFocus
          margin="dense"
          label="Your Display Name"
          fullWidth
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <StyledTextField
          margin="dense"
          label="Game Code"
          fullWidth
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={handleClose}
          sx={{ color: '#fff' }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={!gameId.trim() || !displayName.trim()}
        >
          Join
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function Home() {
  const router = useRouter()
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [joinDialogOpen, setJoinDialogOpen] = React.useState(false)
  const [gameCode, setGameCode] = React.useState('')
  const [games, setGames] = React.useState<Game[]>([])
  const [loading, setLoading] = React.useState(true)

  // Fetch available games
  React.useEffect(() => {
    const fetchGames = async () => {
      try {
        // Get games with player and spectator counts
        const { data: games, error } = await supabase
          .from('game_rooms')
          .select(`
            id,
            _name,
            current_players,
            max_players,
            status,
            spectators_count:game_participants!inner(count)
          `)
          .eq('is_public', true)
          .eq('game_participants.is_spectator', true)
          .order('created_date', { ascending: false })

        if (error) {
          console.error('Error fetching games:', error)
          return
        }

        // Transform the data with proper type checking
        const transformedGames = (games || []).map(game => ({
          id: game.id,
          _name: game._name,
          current_players: game.current_players,
          max_players: game.max_players,
          status: game.status,
          spectators_count: game.spectators_count[0]?.count || 0
        }))

        setGames(transformedGames)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGames()

    // Set up real-time subscription
    // const gamesSubscription = supabase
    //   .channel('game_rooms_changes')
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: '*',
    //       schema: 'public',
    //       table: 'game_rooms'
    //     },
    //     () => {
    //       fetchGames()
    //     }
    //   )
    //   .subscribe()

    // const participantsSubscription = supabase
    //   .channel('game_participants_changes')
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: '*',
    //       schema: 'public',
    //       table: 'game_participants'
    //     },
    //     () => {
    //       fetchGames()
    //     }
    //   )
    //   .subscribe()

    // return () => {
    //   gamesSubscription.unsubscribe()
    //   participantsSubscription.unsubscribe()
    // }
    const interval = setInterval(fetchGames, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleCreateGame = async (gameName: string, displayName: string) => {
    try {
      // 1. Sign in anonymously
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously()

      if (authError) {
        console.error('Error signing in anonymously:', authError)
        return
      }

      // 2. Create game room
      const { data: gameRoom, error: gameError } = await supabase
        .from('game_rooms')
        .insert([
          {
            _name: gameName,
            created_by: authData.user?.id,
          }
        ])
        .select()
        .single()

      if (gameError) {
        console.error('Error creating game room:', gameError)
        return
      }

      // 3. Create game participants
      const { data: gameParticipants, error: gameParticipantsError } = await supabase
        .from('game_participants')
        .insert([
          {
            game_room_id: gameRoom.id,
            user_id: authData.user?.id,
            display_name: displayName,
            is_host: true,
          }
        ])

      if (gameParticipantsError) {
        console.error('Error creating participant:', gameParticipantsError)
        return
      }

      // 4. Redirect to lobby with game ID
      router.push(`/lobby?gameId=${gameRoom.id}`)
      setCreateDialogOpen(false)
    } catch (error) {
      console.error('Error:', error)
      // You might want to show an error message to the user here
    }
  }

  const handleJoinGame = async (gameId: string, displayName: string) => {
    try {
      // 1. Check if game exists and is joinable
      const { data: gameRoom, error: gameError } = await supabase
        .from('game_rooms')
        .select('*, game_participants(count)')
        .eq('id', gameId)
        .single()

      if (gameError || !gameRoom) {
        console.error('Error finding game:', gameError)
        alert('Game not found')
        return
      }

      if (gameRoom.status !== 'waiting') {
        alert('This game has already started')
        return
      }

      if (gameRoom.current_players >= gameRoom.max_players) {
        alert('Game is full')
        return
      }

      // 2. Sign in anonymously
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously()

      if (authError) {
        console.error('Error signing in anonymously:', authError)
        return
      }

      // 3. Join game as participant
      const { error: participantError } = await supabase
        .from('game_participants')
        .insert([
          {
            game_room_id: gameId,
            user_id: authData.user?.id,
            display_name: displayName,
            is_host: false,
          }
        ])

      if (participantError) {
        console.error('Error joining game:', participantError)
        return
      }

      // 4. Update current_players count
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ 
          current_players: gameRoom.current_players + 1 
        })
        .eq('id', gameId)

      if (updateError) {
        console.error('Error updating player count:', updateError)
        return
      }

      // 5. Redirect to lobby
      router.push(`/lobby?gameId=${gameId}`)
      setJoinDialogOpen(false)
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to join game')
    }
  }

  const handleSpectateGame = async (gameId: string) => {
    try {
      // 1. Sign in anonymously
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously()

      if (authError) {
        console.error('Error signing in anonymously:', authError)
        return
      }

      // 2. Join game as spectator
      const { error: participantError } = await supabase
        .from('game_participants')
        .insert([
          {
            game_room_id: gameId,
            user_id: authData.user?.id,
            display_name: `Spectator ${Math.floor(Math.random() * 1000)}`,
            is_spectator: true,
          }
        ])

      if (participantError) {
        console.error('Error joining as spectator:', participantError)
        return
      }

      router.push(`/game/${gameId}?mode=spectate`)
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to join as spectator')
    }
  }

  const handleCreateDialogClose = React.useCallback(() => {
    setCreateDialogOpen(false)
  }, [])

  const handleJoinDialogClose = React.useCallback(() => {
    setJoinDialogOpen(false)
  }, [])

  return (
    <StyledContainer>
      <Typography variant="h2" component="h1" gutterBottom sx={{ color: '#fff' }}>
        Welcome to Convinced.io
      </Typography>

      <StyledPaper elevation={3}>
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              py: 2,
              backgroundColor: '#1976d2',
              '&:hover': {
                backgroundColor: '#1565c0',
              }
            }}
          >
            Create New Game
          </Button>
          <Button
            variant="outlined"
            startIcon={<GroupIcon />}
            onClick={() => setJoinDialogOpen(true)}
            sx={{
              py: 2,
              borderColor: '#666',
              color: '#fff',
              '&:hover': {
                borderColor: '#999',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            Join Game
          </Button>
        </Box>

        <Typography variant="h5" gutterBottom>
          Available Games
        </Typography>

        <List>
          {loading ? (
            <ListItem>
              <Typography sx={{ color: '#fff' }}>Loading games...</Typography>
            </ListItem>
          ) : games.length === 0 ? (
            <ListItem>
              <Typography sx={{ color: '#fff' }}>No games available</Typography>
            </ListItem>
          ) : (
            games.map((game) => (
              <ListItem
                key={game.id}
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
                    <GroupIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<span>{game._name}</span>}
                  secondary={
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#999' }}>
                        Players: {game.current_players}/{game.max_players}
                      </span>
                      <Chip
                        label={game.status}
                        size="small"
                        sx={{
                          backgroundColor: game.status === 'waiting' ? '#4caf50' : '#ff9800',
                          color: '#fff'
                        }}
                      />
                      <span style={{ color: '#999' }}>
                        Spectators: {game.spectators_count}
                      </span>
                    </span>
                  }
                />
                <ButtonGroup variant="outlined" size="small">
                  <Button
                    onClick={() => handleJoinGame(game.id, `Player ${Math.floor(Math.random() * 1000)}`)}
                    disabled={game.status !== 'waiting' || game.current_players >= game.max_players}
                    sx={{
                      borderColor: '#666',
                      color: '#fff',
                      '&:hover': {
                        borderColor: '#999',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: '#333',
                      }
                    }}
                  >
                    Join
                  </Button>
                  <Button
                    onClick={() => handleSpectateGame(game.id)}
                    startIcon={<VisibilityIcon />}
                    sx={{
                      borderColor: '#666',
                      color: '#fff',
                      '&:hover': {
                        borderColor: '#999',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      }
                    }}
                  >
                    Spectate
                  </Button>
                </ButtonGroup>
              </ListItem>
            ))
          )}
        </List>
      </StyledPaper>

      <CreateGameDialog
        open={createDialogOpen}
        onClose={handleCreateDialogClose}
        onSubmit={handleCreateGame}
      />

      <JoinGameDialog
        open={joinDialogOpen}
        onClose={handleJoinDialogClose}
        onSubmit={handleJoinGame}
      />
    </StyledContainer>
  )
}
