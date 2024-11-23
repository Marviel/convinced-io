'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button, TextField, Container, Typography, Box, Divider, Tab, Tabs } from '@mui/material'
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [tabValue, setTabValue] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
    setError(null)
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setError('Please check your email to confirm your account')
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
        Welcome
      </Typography>

      <Box sx={{ width: '100%', maxWidth: '400px' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          centered
          sx={{
            '& .MuiTab-root': { color: '#fff' },
            '& .Mui-selected': { color: '#1976d2' },
            '& .MuiTabs-indicator': { backgroundColor: '#1976d2' },
          }}
        >
          <Tab label="Login" />
          <Tab label="Sign Up" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box component="form" onSubmit={handleEmailLogin}>
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
              Login
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box component="form" onSubmit={handleSignUp}>
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
            <StyledTextField
              fullWidth
              margin="normal"
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button
              fullWidth
              variant="contained"
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
              Sign Up
            </Button>
          </Box>
        </TabPanel>

        <StyledDivider sx={{ width: '100%', my: 2 }}>or</StyledDivider>

        <Button
          fullWidth
          variant="outlined"
          onClick={handleGoogleLogin}
          sx={{ 
            borderColor: '#fff',
            color: '#fff',
            '&:hover': {
              borderColor: '#ccc',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          Continue with Google
        </Button>

        {error && (
          <Typography 
            sx={{ 
              mt: 2, 
              color: error.includes('check your email') ? '#4caf50' : '#ff6b6b',
              textAlign: 'center' 
            }}
          >
            {error}
          </Typography>
        )}
      </Box>
    </StyledContainer>
  )
} 