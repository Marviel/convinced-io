'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FcGoogle } from 'react-icons/fc'
import { createClient } from '../../utils/supabase/component'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    const { error: authError } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    
    if (authError) {
      setError(authError.message)
      setIsLoading(false)
      return
    }
    
    router.push('/private')
  }

  async function signInWithGoogle() {
    setIsLoading(true)
    setError(null)
    
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (googleError) {
      setError(googleError.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa] flex flex-col items-center justify-start font-[-apple-system,BlinkMacSystemFont,Segoe_UI,Helvetica,Arial,sans-serif,Apple_Color_Emoji,Segoe_UI_Emoji]">
      {/* Header */}
      <div className="w-full px-6 py-4 bg-white border-b border-gray-200">
        <div className="max-w-[1012px] mx-auto flex justify-center">
          {/* Replace with your logo */}
          <div className="h-8 w-8 bg-indigo-600 rounded-md"></div>
        </div>
      </div>

      <div className="w-full max-w-[1012px] mx-auto mt-10 px-4 flex flex-col items-center">
        <div className="w-full max-w-[308px]">
          <div className="text-center mb-6">
            <h1 className="text-[24px] font-semibold text-[#24292f]">
              {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </h1>
          </div>

          <div className="bg-white border border-[#d0d7de] rounded-lg p-6 space-y-4 shadow-sm">
            {error && (
              <div className="p-3 bg-red-50 border rounded-md border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#24292f]">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="Enter your email"
                  className="mt-1 block w-full px-3 py-2 bg-white border border-[#d0d7de] rounded-md text-[14px]
                           placeholder-[#6e7781] focus:outline-none focus:ring-1 focus:ring-blue-500 
                           focus:border-blue-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#24292f]">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="Enter your password"
                  className="mt-1 block w-full px-3 py-2 bg-white border border-[#d0d7de] rounded-md text-[14px]
                           placeholder-[#6e7781] focus:outline-none focus:ring-1 focus:ring-blue-500 
                           focus:border-blue-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-[6px] px-4 border border-transparent rounded-md shadow-sm text-[14px]
                         font-semibold text-white bg-[#2da44e] hover:bg-[#2c974b] focus:outline-none 
                         focus:ring-2 focus:ring-offset-2 focus:ring-[#2da44e] disabled:opacity-50
                         transition-colors duration-200"
              >
                {isLoading ? 'Loading...' : isSignUp ? 'Sign up' : 'Sign in'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#d0d7de]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-[#6e7781]">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-[6px] border border-[#d0d7de]
                       rounded-md shadow-sm text-[14px] font-semibold text-[#24292f] bg-white 
                       hover:bg-[#f6f8fa] focus:outline-none focus:ring-2 focus:ring-offset-2 
                       focus:ring-[#2da44e] transition-colors duration-200"
            >
              <FcGoogle className="w-5 h-5 mr-2" />
              Continue with Google
            </button>
          </div>

          <div className="mt-4 text-center bg-white border border-[#d0d7de] rounded-lg p-4 shadow-sm">
            <p className="text-[14px] text-[#24292f]">
              {isSignUp ? 'Already have an account?' : "New to our platform?"}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="ml-1 text-[#0969da] hover:underline font-semibold"
              >
                {isSignUp ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          </div>

          {/* Footer links */}
          <div className="mt-8 text-center">
            <nav className="flex justify-center space-x-4 text-xs text-[#6e7781]">
              <a href="#" className="hover:text-[#24292f] hover:underline">Terms</a>
              <a href="#" className="hover:text-[#24292f] hover:underline">Privacy</a>
              <a href="#" className="hover:text-[#24292f] hover:underline">Security</a>
              <a href="#" className="hover:text-[#24292f] hover:underline">Contact</a>
            </nav>
          </div>
        </div>
      </div>
    </div>
  )
}