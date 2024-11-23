'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button, TextField, Container, Typography, Box, Divider } from '@mui/material'
import { createClient } from '../../utils/supabase/client'
import { styled } from '@mui/material/styles'

const StyledContainer = styled(Container)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  gap: '20px',
  backgroundColor: '#000',
  color: '#fff'
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

const StyledDivider = styled(Divider)({
  '&.MuiDivider-root': {
    '&::before, &::after': {
      borderColor: '#666',
    },
    color: '#fff',
  },
})

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      router.push('/lobby')
    }
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    }
  }

  return (
    <StyledContainer maxWidth="sm">
      <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#fff' }}>
        Login
      </Typography>

      <Box component="form" onSubmit={handleEmailLogin} sx={{ width: '100%', maxWidth: '400px' }}>
        <StyledTextField
          fullWidth
          margin="normal"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <StyledTextField
          fullWidth
          margin="normal"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          fullWidth
          variant="contained"
          color="primary"
          type="submit"
          sx={{ 
            mt: 2,
            backgroundColor: '#1976d2',
            color: '#fff',
            '&:hover': {
              backgroundColor: '#1565c0',
            }
          }}
        >
          Login with Email
        </Button>
      </Box>

      <StyledDivider sx={{ width: '100%', maxWidth: '400px', my: 2 }}>or</StyledDivider>

      <Button
        fullWidth
        variant="outlined"
        onClick={handleGoogleLogin}
        sx={{ 
          maxWidth: '400px',
          borderColor: '#fff',
          color: '#fff',
          '&:hover': {
            borderColor: '#ccc',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }
        }}
      >
        Login with Google
      </Button>

      {error && (
        <Typography color="error" sx={{ mt: 2, color: '#ff6b6b' }}>
          {error}
        </Typography>
      )}
    </StyledContainer>
  )
} 